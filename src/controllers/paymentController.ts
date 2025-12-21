import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const { status, userId, bookId, paymentMethod, page = '1', limit = '10' } = req.query;
    
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = parseInt(userId as string);
    if (bookId) where.bookId = parseInt(bookId as string);
    if (paymentMethod) where.paymentMethod = paymentMethod;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);
    
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              email: true,
            },
          },
          book: {
            select: {
              id: true,
              title: true,
              titleAr: true,
              price: true,
            },
          },
          _count: {
            select: {
              history: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.payment.count({ where }),
    ]);
    
    res.json({
      payments,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            email: true,
          },
        },
        book: {
          include: {
            items: true,
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json({ payment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { bookId, amount, currency, paymentMethod, notes, notesAr, couponCode } = req.body;
    const userId = req.user!.userId;
    
    // Validate required fields
    if (!bookId || !amount) {
      return res.status(400).json({ error: 'Book ID and amount are required' });
    }
    
    // Map payment methods to valid enum values
    const validPaymentMethods = [
      'CREDIT_CARD',
      'DEBIT_CARD',
      'BANK_TRANSFER',
      'PAYPAL',
      'APPLE_PAY',
      'GOOGLE_PAY',
      'MADA',
      'CASH'
    ];
    
    const paymentMethodMap: { [key: string]: string } = {
      'VISA': 'CREDIT_CARD',
      'MASTERCARD': 'CREDIT_CARD',
    };
    
    let finalPaymentMethod = paymentMethodMap[paymentMethod] || paymentMethod || 'CREDIT_CARD';
    
    if (!validPaymentMethods.includes(finalPaymentMethod)) {
      finalPaymentMethod = 'CREDIT_CARD';
    }
    
    // Get book to extract bookType, price, and discount
    let bookType = null;
    let originalPrice = parseFloat(amount.toString());
    let finalAmount = originalPrice;
    let discountApplied = false;
    let couponId = null;
    let couponDiscountAmount = 0;
    let bookDiscountAmount = 0;
    
    if (bookId) {
      const book = await prisma.book.findUnique({
        where: { id: parseInt(bookId.toString()) },
        select: { bookType: true, price: true, discountPercentage: true },
      });
      bookType = book?.bookType || null;
      
      // Apply book discount if exists
      if (book && book.discountPercentage && Number(book.discountPercentage) > 0) {
        const bookDiscount = Number(book.discountPercentage);
        bookDiscountAmount = (originalPrice * bookDiscount) / 100;
        finalAmount = originalPrice - bookDiscountAmount;
        discountApplied = true;
        console.log(`💰 [PAYMENT] Book discount applied: ${bookDiscount}% off. Original: ${originalPrice}, Discount: ${bookDiscountAmount}, Final: ${finalAmount}`);
      }
      
      // Check if book is recommended for this user and apply discount
      try {
        // Get discount setting
        const discountSetting = await prisma.setting.findUnique({
          where: { key: 'recommended_book_discount' },
        });
        const discountPercentage = discountSetting 
          ? parseFloat(discountSetting.value) || 0 
          : 0;
        
        if (discountPercentage > 0 && book) {
          // Check if book is recommended by checking book evaluations and user ratings
          const bookEvaluations = await prisma.bookEvaluation.findMany({
            where: {
              OR: [
                { bookId: parseInt(bookId.toString()) },
                { bookType: book.bookType },
              ],
            },
            include: {
              evaluation: {
                include: {
                  criteria: true,
                },
              },
            },
          });

          if (bookEvaluations.length > 0) {
            // Get user's submitted ratings for these evaluations
            const evaluationIds = bookEvaluations.map(be => be.evaluationId);
            const userRatings = await prisma.rating.findMany({
              where: {
                userId,
                evaluationId: { in: evaluationIds },
                status: 'SUBMITTED',
              },
              include: {
                items: {
                  include: {
                    criterion: true,
                  },
                },
                evaluation: {
                  include: {
                    criteria: true,
                  },
                },
              },
            });

            // Calculate if book is recommended
            let isRecommended = false;
            if (userRatings.length > 0) {
              const evaluationResults = bookEvaluations.map((bookEval) => {
                const rating = userRatings.find((r) => r.evaluationId === bookEval.evaluationId);
                let userScore = 0;
                
                if (rating && rating.items && rating.items.length > 0) {
                  const maxPossibleWeightedScore = rating.evaluation.criteria.reduce((sum: number, criterion: any) => {
                    return sum + (criterion.weight || 1);
                  }, 0);
                  
                  let actualWeightedScore = 0;
                  rating.items.forEach((item: any) => {
                    const criterion = item.criterion;
                    if (criterion) {
                      const normalizedScore = (item.score / (criterion.maxScore || 10)) * (criterion.weight || 1);
                      actualWeightedScore += normalizedScore;
                    }
                  });
                  
                  userScore = maxPossibleWeightedScore > 0 
                    ? (actualWeightedScore / maxPossibleWeightedScore) * 100 
                    : 0;
                }

                const minRequired = bookEval.minScorePercentage || 70.0;
                return {
                  isPassed: userScore >= minRequired,
                  isRequired: bookEval.isRequired,
                };
              });

              const requiredEvaluations = evaluationResults.filter((er) => er.isRequired);
              const hasAllRequiredPassed = requiredEvaluations.length === 0 || 
                requiredEvaluations.every((er) => er.isPassed);
              
              const totalScore = evaluationResults.reduce((sum, er) => sum + (er.isPassed ? 1 : 0), 0);
              const avgScore = evaluationResults.length > 0 ? (totalScore / evaluationResults.length) * 100 : 0;
              
              isRecommended = hasAllRequiredPassed && avgScore >= 70;
            }

            if (isRecommended) {
              // Apply recommended book discount (only if book doesn't have its own discount)
              if (!book.discountPercentage || Number(book.discountPercentage) === 0) {
                const recommendedDiscountAmount = (originalPrice * discountPercentage) / 100;
                finalAmount = originalPrice - recommendedDiscountAmount;
                discountApplied = true;
                console.log(`💰 [PAYMENT] Recommended book discount applied: ${discountPercentage}% off. Original: ${originalPrice}, Final: ${finalAmount}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking book recommendation for discount:', error);
        // Continue with original amount if check fails
      }
      
      // Apply coupon discount if provided
      if (couponCode) {
        try {
          const coupon = await prisma.discountCoupon.findUnique({
            where: { code: couponCode.toUpperCase() },
          });
          
          if (coupon) {
            // Validate coupon
            const now = new Date();
            if (coupon.isActive && 
                coupon.validFrom <= now && 
                (!coupon.validUntil || coupon.validUntil >= now) &&
                (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) &&
                (!coupon.userId || coupon.userId === userId) &&
                (!coupon.minPurchaseAmount || finalAmount >= Number(coupon.minPurchaseAmount))) {
              
              // Calculate coupon discount
              let couponDiscount = 0;
              if (coupon.discountType === 'PERCENTAGE') {
                couponDiscount = (finalAmount * Number(coupon.discountValue)) / 100;
                if (coupon.maxDiscountAmount) {
                  couponDiscount = Math.min(couponDiscount, Number(coupon.maxDiscountAmount));
                }
              } else {
                couponDiscount = Number(coupon.discountValue);
              }
              
              finalAmount = Math.max(0, finalAmount - couponDiscount);
              couponDiscountAmount = couponDiscount;
              couponId = coupon.id;
              discountApplied = true;
              
              // Update coupon used count
              await prisma.discountCoupon.update({
                where: { id: coupon.id },
                data: { usedCount: { increment: 1 } },
              });
              
              console.log(`💰 [PAYMENT] Coupon discount applied: ${coupon.code}. Discount: ${couponDiscount}, Final: ${finalAmount}`);
            }
          }
        } catch (error) {
          console.error('Error applying coupon:', error);
          // Continue without coupon if validation fails
        }
      }
    }
    
    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    // Add discount info to notes
    let paymentNotes = notes;
    let paymentNotesAr = notesAr;
    const discountNotes = [];
    const discountNotesAr = [];
    
    if (bookDiscountAmount > 0) {
      discountNotes.push(`Book discount: ${bookDiscountAmount.toFixed(2)} SAR`);
      discountNotesAr.push(`خصم الكتاب: ${bookDiscountAmount.toFixed(2)} ر.س`);
    }
    
    if (couponDiscountAmount > 0) {
      discountNotes.push(`Coupon discount: ${couponDiscountAmount.toFixed(2)} SAR (${couponCode})`);
      discountNotesAr.push(`خصم الكوبون: ${couponDiscountAmount.toFixed(2)} ر.س (${couponCode})`);
    }
    
    if (discountNotes.length > 0) {
      paymentNotes = notes ? `${notes}\n${discountNotes.join('\n')}` : discountNotes.join('\n');
      paymentNotesAr = notesAr ? `${notesAr}\n${discountNotesAr.join('\n')}` : discountNotesAr.join('\n');
    }
    
    const payment = await prisma.payment.create({
      data: {
        userId,
        bookId: bookId ? parseInt(bookId.toString()) : null,
        bookType: bookType as any,
        amount: finalAmount,
        currency: currency || 'SAR',
        paymentMethod: finalPaymentMethod as any,
        transactionId,
        couponCode: couponCode ? couponCode.toUpperCase() : null,
        couponId: couponId,
        discountAmount: (bookDiscountAmount + couponDiscountAmount) > 0 ? (bookDiscountAmount + couponDiscountAmount) : null,
        status: 'PENDING',
        notes: paymentNotes,
        notesAr: paymentNotesAr,
        history: {
          create: {
            status: 'PENDING',
            notes: discountApplied ? 'Payment initiated with discount' : 'Payment initiated',
            notesAr: discountApplied ? 'بدء الدفع مع خصم' : 'بدء الدفع',
          },
        },
      },
      include: {
        book: true,
        user: true,
      },
    });
    
    res.status(201).json({ payment });
  } catch (error: any) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment' });
  }
};

export const updatePaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, notesAr } = req.body;
    
    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const updateData: any = {
      status,
    };
    
    if (notes !== undefined) updateData.notes = notes;
    if (notesAr !== undefined) updateData.notesAr = notesAr;
    
    if (status === 'COMPLETED' && !payment.paymentDate) {
      updateData.paymentDate = new Date();
    }
    
    const updatedPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id: parseInt(id) },
        data: updateData,
      });
      
      await tx.paymentHistory.create({
        data: {
          paymentId: parseInt(id),
          status,
          notes: notes || `Status changed to ${status}`,
          notesAr: notesAr || `تم تغيير الحالة إلى ${status}`,
        },
      });
      
      return payment;
    });
    
    res.json({ payment: updatedPayment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserPayments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { status, page = '1', limit = '10' } = req.query;
    
    const where: any = { userId };
    if (status) where.status = status;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);
    
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          book: {
            select: {
              id: true,
              title: true,
              titleAr: true,
              coverImage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.payment.count({ where }),
    ]);
    
    res.json({
      payments,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

