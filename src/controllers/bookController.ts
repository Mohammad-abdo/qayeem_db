import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getAllBooks = async (req: Request | AuthRequest, res: Response) => {
  try {
    const { status, category, categoryId, search, page = '1', limit = '10', includeStats } = req.query;
    const userId = (req as AuthRequest).user?.userId;
    
    console.log('📚 getAllBooks called with params:', { status, category, categoryId, search, page, limit, includeStats });
    
    const where: any = {};
    if (status) where.status = status;
    // Support both category (string) and categoryId (int) for filtering
    if (categoryId) {
      where.categoryId = parseInt(categoryId as string);
      console.log('🔍 Filtering by categoryId:', categoryId);
    } else if (category) {
      // Try to match by category string field first
      where.category = category;
      console.log('🔍 Filtering by category (string):', category);
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { titleAr: { contains: search as string } },
        { author: { contains: search as string } },
        { authorAr: { contains: search as string } },
        { isbn: { contains: search as string } },
      ];
      console.log('🔍 Filtering by search:', search);
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);
    
    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              email: true,
            },
          },
          bookCategory: {
            select: {
              id: true,
              name: true,
              nameAr: true,
            },
          },
          evaluations: {
            include: {
              evaluation: {
                select: {
                  id: true,
                  title: true,
                  titleAr: true,
                  status: true,
                },
              },
            },
          },
          _count: {
            select: {
              items: true,
              payments: true,
              reviews: true,
            },
          },
          reviews: {
            where: { isApproved: true },
            select: {
              rating: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.book.count({ where }),
    ]);
    
    // Fetch statistics in bulk if requested
    let purchaseStatsMap: Map<number, number> = new Map();
    let achievementStatsMap: Map<number, number> = new Map();
    let userPurchaseMap: Map<number, boolean> = new Map();
    let userProgressMap: Map<number, any> = new Map();

    if (includeStats === 'true' || userId) {
      const bookIds = books.map(b => b.id);

      if (includeStats === 'true') {
        // Get purchase counts for all books
        const purchaseCounts = await prisma.payment.groupBy({
          by: ['bookId'],
          where: {
            bookId: { in: bookIds },
            status: 'COMPLETED',
          },
          _count: true,
        });

        purchaseCounts.forEach((item: any) => {
          if (item.bookId !== null && item.bookId !== undefined) {
            purchaseStatsMap.set(item.bookId, item._count);
          }
        });

        // Get achievement counts for all books
        const achievementCounts = await prisma.bookProgress.groupBy({
          by: ['bookId'],
          where: {
            bookId: { in: bookIds },
            percentage: { gte: 100 },
          },
          _count: true,
        });

        achievementCounts.forEach((item: any) => {
          if (item.bookId !== null && item.bookId !== undefined) {
            achievementStatsMap.set(item.bookId, item._count);
          }
        });
      }

      if (userId) {
        // Get user purchases for all books
        const userPurchases = await prisma.payment.findMany({
          where: {
            userId,
            bookId: { in: bookIds },
            status: 'COMPLETED',
          },
          select: { bookId: true },
        });

        userPurchases.forEach((p: any) => {
          if (p.bookId !== null && p.bookId !== undefined) {
            userPurchaseMap.set(p.bookId, true);
          }
        });

        // Get user progress for all books
        const userProgresses = await prisma.bookProgress.findMany({
          where: {
            userId,
            bookId: { in: bookIds },
          },
        });

        userProgresses.forEach((p: any) => {
          if (p.bookId !== null && p.bookId !== undefined) {
            userProgressMap.set(p.bookId, p);
          }
        });
      }
    }

    // Calculate average rating and add statistics for each book
    const booksWithRatings = books.map((book) => {
      const averageRating = book.reviews.length > 0
        ? book.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / book.reviews.length
        : 0;
      
      const bookData: any = {
        ...book,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        reviewsCount: book._count.reviews,
      };

      // Include statistics if requested (for dashboard/admin views)
      if (includeStats === 'true') {
        const purchaseCount = purchaseStatsMap.get(book.id) || 0;
        const achievementCount = achievementStatsMap.get(book.id) || 0;

        bookData.stats = {
          purchaseCount,
          achievementCount,
          purchasePercentage: purchaseCount > 0 ? Math.round((achievementCount / purchaseCount) * 100) : 0,
        };
      }

      // Include user-specific metadata if user is authenticated
      if (userId) {
        const userProgress = userProgressMap.get(book.id);

        bookData.userMetadata = {
          isPurchased: userPurchaseMap.has(book.id),
          hasAchievement: userProgress ? Number(userProgress.percentage) >= 100 : false,
          progress: userProgress ? Number(userProgress.percentage) : 0,
        };
      }
      
      return bookData;
    });
    
    console.log('📊 Books with ratings calculated:', booksWithRatings.length);
    
    res.json({
      books: booksWithRatings,
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

// Get book statistics (payments, readers, progress, etc.)
export const getBookStatistics = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bookId = parseInt(id);

    // Get payment statistics
    const payments = await prisma.payment.findMany({
      where: {
        bookId,
        status: 'COMPLETED',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get reading progress statistics
    const progressRecords = await prisma.bookProgress.findMany({
      where: {
        bookId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            email: true,
          },
        },
      },
      orderBy: { lastReadAt: 'desc' },
    });

    // Calculate statistics
    const totalPayments = payments.length;
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalReaders = new Set(progressRecords.map(p => p.userId)).size;
    const totalProgressRecords = progressRecords.length;
    const completedReaders = progressRecords.filter(p => Number(p.percentage) >= 100).length;
    const inProgressReaders = progressRecords.filter(p => Number(p.percentage) > 0 && Number(p.percentage) < 100).length;
    const notStartedReaders = progressRecords.filter(p => Number(p.percentage) === 0).length;
    
    // Average progress percentage
    const avgProgress = progressRecords.length > 0
      ? progressRecords.reduce((sum, p) => sum + Number(p.percentage), 0) / progressRecords.length
      : 0;

    // Get reviews statistics
    const reviews = await prisma.bookReview.findMany({
      where: {
        bookId,
        isApproved: true,
      },
    });

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({
      statistics: {
        payments: {
          total: totalPayments,
          revenue: totalRevenue,
          averageAmount: totalPayments > 0 ? totalRevenue / totalPayments : 0,
        },
        readers: {
          total: totalReaders,
          totalProgressRecords,
          completed: completedReaders,
          inProgress: inProgressReaders,
          notStarted: notStartedReaders,
          averageProgress: avgProgress,
        },
        reviews: {
          total: reviews.length,
          averageRating: avgRating,
        },
      },
      payments: payments.map(p => ({
        id: p.id,
        userId: p.userId,
        user: p.user,
        amount: Number(p.amount),
        status: p.status,
        createdAt: p.createdAt,
      })),
      progressRecords: progressRecords.map(p => ({
        id: p.id,
        userId: p.userId,
        user: p.user,
        percentage: Number(p.percentage),
        pagesRead: p.pagesRead,
        totalPages: p.totalPages,
        startDate: p.startDate,
        lastReadAt: p.lastReadAt,
        completedAt: p.completedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getBookById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const book = await prisma.book.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            email: true,
          },
        },
        bookCategory: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            evaluationId: true,
          },
        },
        evaluations: {
          include: {
            evaluation: {
              include: {
                criteria: {
                  select: {
                    id: true,
                    title: true,
                    titleAr: true,
                  },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json({ book });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createBook = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      titleAr,
      description,
      descriptionAr,
      author,
      authorAr,
      isbn,
      price,
      discountPercentage,
      coverImage,
      category,
      categoryAr,
      categoryId,
      status,
      stock,
      publishedAt,
      items,
    } = req.body;
    
    const userId = req.user!.userId;
    
    // Handle ISBN: convert empty string to null to avoid unique constraint issues
    const isbnValue = isbn && isbn.trim() !== '' ? isbn.trim() : null;
    
    // Check if ISBN already exists (only if provided)
    if (isbnValue) {
      const existingBook = await prisma.book.findUnique({
        where: { isbn: isbnValue },
      });
      
      if (existingBook) {
        return res.status(400).json({ 
          error: 'ISBN already exists. Please use a different ISBN or leave it empty.' 
        });
      }
    }
    
    const book = await prisma.book.create({
      data: {
        title,
        titleAr,
        description,
        descriptionAr,
        author,
        authorAr,
        isbn: isbnValue,
        price: parseFloat(price),
        discountPercentage: discountPercentage ? parseFloat(discountPercentage) : 0,
        coverImage,
        category: category || null,
        categoryAr: categoryAr || null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        status: status || 'ACTIVE',
        stock: parseInt(stock) || 0,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        createdBy: userId,
        items: items && Array.isArray(items) ? {
          create: items.map((item: any, index: number) => ({
            title: item.title,
            titleAr: item.titleAr,
            content: item.content,
            contentAr: item.contentAr,
            itemType: item.itemType || 'CHAPTER',
            order: item.order || index,
            pageNumber: item.pageNumber,
            isFree: item.isFree || false,
            fileUrl: item.fileUrl,
          })),
        } : undefined,
      },
      include: {
        items: true,
      },
    });
    
    res.status(201).json({ book });
  } catch (error: any) {
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(400).json({ 
        error: `This ${field} already exists. Please use a different value.` 
      });
    }
    console.error('Error creating book:', error);
    res.status(500).json({ error: error.message || 'Failed to create book' });
  }
};

export const updateBook = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      titleAr,
      description,
      descriptionAr,
      author,
      authorAr,
      isbn,
      price,
      discountPercentage,
      coverImage,
      category,
      categoryAr,
      categoryId,
      status,
      stock,
      publishedAt,
    } = req.body;
    
    const book = await prisma.book.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    // Handle ISBN: convert empty string to null to avoid unique constraint issues
    let isbnValue = undefined;
    if (isbn !== undefined) {
      isbnValue = isbn && isbn.trim() !== '' ? isbn.trim() : null;
      
      // Check if ISBN already exists (only if provided and different from current)
      if (isbnValue && isbnValue !== book.isbn) {
        const existingBook = await prisma.book.findUnique({
          where: { isbn: isbnValue },
        });
        
        if (existingBook) {
          return res.status(400).json({ 
            error: 'ISBN already exists. Please use a different ISBN or leave it empty.' 
          });
        }
      }
    }
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (titleAr !== undefined) updateData.titleAr = titleAr;
    if (description !== undefined) updateData.description = description;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    if (author !== undefined) updateData.author = author;
    if (authorAr !== undefined) updateData.authorAr = authorAr;
    if (isbn !== undefined) updateData.isbn = isbnValue;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (discountPercentage !== undefined) updateData.discountPercentage = discountPercentage ? parseFloat(discountPercentage) : 0;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (category !== undefined) updateData.category = category;
    if (categoryAr !== undefined) updateData.categoryAr = categoryAr;
    if (categoryId !== undefined) updateData.categoryId = categoryId ? parseInt(categoryId) : null;
    if (status !== undefined) updateData.status = status;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (publishedAt !== undefined) updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
    
    const updatedBook = await prisma.book.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        items: true,
      },
    });
    
    res.json({ book: updatedBook });
  } catch (error: any) {
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(400).json({ 
        error: `This ${field} already exists. Please use a different value.` 
      });
    }
    console.error('Error updating book:', error);
    res.status(500).json({ error: error.message || 'Failed to update book' });
  }
};

export const deleteBook = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const book = await prisma.book.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    await prisma.book.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ message: 'Book deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

