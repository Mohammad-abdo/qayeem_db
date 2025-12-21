import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getAllCoupons = async (req: Request, res: Response) => {
  try {
    const { isActive, userId, code } = req.query;
    
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (userId) where.userId = parseInt(userId as string);
    if (code) where.code = { contains: code as string };
    
    const coupons = await prisma.discountCoupon.findMany({
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
        creator: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            email: true,
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ coupons });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCouponById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const coupon = await prisma.discountCoupon.findUnique({
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
        creator: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            email: true,
          },
        },
        payments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            book: {
              select: {
                id: true,
                title: true,
                titleAr: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    
    res.json({ coupon });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCouponByCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const userId = (req as AuthRequest).user?.userId;
    
    const coupon = await prisma.discountCoupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    
    // Check if coupon is valid
    const now = new Date();
    if (!coupon.isActive) {
      return res.status(400).json({ error: 'Coupon is not active' });
    }
    
    if (coupon.validFrom > now) {
      return res.status(400).json({ error: 'Coupon is not yet valid' });
    }
    
    if (coupon.validUntil && coupon.validUntil < now) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }
    
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }
    
    if (coupon.userId && coupon.userId !== userId) {
      return res.status(403).json({ error: 'This coupon is not available for your account' });
    }
    
    res.json({ coupon });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const {
      code,
      description,
      descriptionAr,
      discountType,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      userId,
      usageLimit,
      validFrom,
      validUntil,
      isActive,
    } = req.body;
    
    const createdBy = req.user!.userId;
    
    // Validate discount value
    if (discountType === 'PERCENTAGE' && (discountValue < 0 || discountValue > 100)) {
      return res.status(400).json({ error: 'Percentage discount must be between 0 and 100' });
    }
    
    if (discountType === 'FIXED_AMOUNT' && discountValue < 0) {
      return res.status(400).json({ error: 'Fixed amount discount must be positive' });
    }
    
    const coupon = await prisma.discountCoupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        descriptionAr,
        discountType,
        discountValue: parseFloat(discountValue),
        minPurchaseAmount: minPurchaseAmount ? parseFloat(minPurchaseAmount) : null,
        maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
        userId: userId ? parseInt(userId) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive: isActive !== false,
        createdBy,
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
    });
    
    res.status(201).json({ coupon });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Convert numeric fields
    if (updateData.discountValue !== undefined) {
      updateData.discountValue = parseFloat(updateData.discountValue);
    }
    if (updateData.minPurchaseAmount !== undefined) {
      updateData.minPurchaseAmount = updateData.minPurchaseAmount ? parseFloat(updateData.minPurchaseAmount) : null;
    }
    if (updateData.maxDiscountAmount !== undefined) {
      updateData.maxDiscountAmount = updateData.maxDiscountAmount ? parseFloat(updateData.maxDiscountAmount) : null;
    }
    if (updateData.userId !== undefined) {
      updateData.userId = updateData.userId ? parseInt(updateData.userId) : null;
    }
    if (updateData.usageLimit !== undefined) {
      updateData.usageLimit = updateData.usageLimit ? parseInt(updateData.usageLimit) : null;
    }
    if (updateData.validFrom) {
      updateData.validFrom = new Date(updateData.validFrom);
    }
    if (updateData.validUntil) {
      updateData.validUntil = updateData.validUntil ? new Date(updateData.validUntil) : null;
    }
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }
    
    const coupon = await prisma.discountCoupon.update({
      where: { id: parseInt(id) },
      data: updateData,
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
    });
    
    res.json({ coupon });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.discountCoupon.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const validateCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const { code, amount } = req.body;
    const userId = req.user!.userId;
    
    if (!code || !amount) {
      return res.status(400).json({ error: 'Coupon code and amount are required' });
    }
    
    const coupon = await prisma.discountCoupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    
    // Validate coupon
    const now = new Date();
    if (!coupon.isActive) {
      return res.status(400).json({ error: 'Coupon is not active' });
    }
    
    if (coupon.validFrom > now) {
      return res.status(400).json({ error: 'Coupon is not yet valid' });
    }
    
    if (coupon.validUntil && coupon.validUntil < now) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }
    
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }
    
    if (coupon.userId && coupon.userId !== userId) {
      return res.status(403).json({ error: 'This coupon is not available for your account' });
    }
    
    const purchaseAmount = parseFloat(amount);
    if (coupon.minPurchaseAmount && purchaseAmount < Number(coupon.minPurchaseAmount)) {
      return res.status(400).json({ 
        error: `Minimum purchase amount of ${coupon.minPurchaseAmount} SAR is required` 
      });
    }
    
    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (purchaseAmount * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
      }
    } else {
      discountAmount = Number(coupon.discountValue);
    }
    
    const finalAmount = Math.max(0, purchaseAmount - discountAmount);
    
    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discountAmount: Math.round(discountAmount * 100) / 100,
      originalAmount: purchaseAmount,
      finalAmount: Math.round(finalAmount * 100) / 100,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};



