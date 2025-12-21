import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { includeDetails } = req.query;
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        name: true,
        nameAr: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData: any = { ...user };
    
    // Include detailed information if requested (for admin dashboard)
    if (includeDetails === 'true') {
      // Get all achievements (completed books with progress >= 100%)
      const achievements = await prisma.bookProgress.findMany({
        where: {
          userId: parseInt(id),
          percentage: { gte: 100 },
        },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              titleAr: true,
              coverImage: true,
              bookType: true,
              category: true,
              categoryAr: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
      });
      
      // Get purchases by bookType
      const purchases = await prisma.payment.findMany({
        where: {
          userId: parseInt(id),
          status: 'COMPLETED',
          bookId: { not: null },
        },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              titleAr: true,
              bookType: true,
            },
          },
        },
      });
      
      // Group achievements by bookType
      const achievementsByType: any = {};
      achievements.forEach((achievement) => {
        const bookType = achievement.book?.bookType || 'UNKNOWN';
        if (!achievementsByType[bookType]) {
          achievementsByType[bookType] = [];
        }
        achievementsByType[bookType].push({
          bookId: achievement.bookId,
          bookTitle: achievement.book?.title || achievement.book?.titleAr,
          bookTitleAr: achievement.book?.titleAr,
          coverImage: achievement.book?.coverImage,
          percentage: Number(achievement.percentage),
          completedAt: achievement.completedAt,
          pagesRead: achievement.pagesRead,
          totalPages: achievement.totalPages,
        });
      });
      
      // Group purchases by bookType
      const purchasesByType: any = {};
      purchases.forEach((payment) => {
        const bookType = payment.book?.bookType || payment.bookType || 'UNKNOWN';
        if (!purchasesByType[bookType]) {
          purchasesByType[bookType] = [];
        }
        purchasesByType[bookType].push({
          bookId: payment.bookId,
          bookTitle: payment.book?.title || payment.book?.titleAr,
          bookTitleAr: payment.book?.titleAr,
          amount: Number(payment.amount),
          paymentDate: payment.paymentDate,
        });
      });
      
      // Calculate stats
      const totalAchievements = achievements.length;
      const totalPurchases = purchases.length;
      const achievementsByBookType = Object.keys(achievementsByType).map((type) => ({
        bookType: type,
        count: achievementsByType[type].length,
        achievements: achievementsByType[type],
      }));
      
      // Get all book progress (including in-progress)
      const allProgress = await prisma.bookProgress.findMany({
        where: {
          userId: parseInt(id),
        },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              titleAr: true,
              coverImage: true,
              bookType: true,
              category: true,
              categoryAr: true,
            },
          },
        },
        orderBy: { lastReadAt: 'desc' },
      });

      // Get all payments (all statuses)
      const allPayments = await prisma.payment.findMany({
        where: {
          userId: parseInt(id),
        },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              titleAr: true,
              coverImage: true,
              bookType: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate total amount spent
      const totalSpent = allPayments
        .filter(p => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      // Calculate reading stats
      const totalPagesRead = allProgress.reduce((sum, p) => sum + (p.pagesRead || 0), 0);
      const inProgressBooks = allProgress.filter(p => Number(p.percentage) < 100).length;
      const completedBooks = allProgress.filter(p => Number(p.percentage) >= 100).length;

      userData.achievements = {
        total: totalAchievements,
        totalPurchases,
        byBookType: achievementsByBookType,
        allAchievements: achievements.map((a) => ({
          bookId: a.bookId,
          bookTitle: a.book?.title || a.book?.titleAr,
          bookTitleAr: a.book?.titleAr,
          bookType: a.book?.bookType,
          coverImage: a.book?.coverImage,
          percentage: Number(a.percentage),
          completedAt: a.completedAt,
          pagesRead: a.pagesRead,
          totalPages: a.totalPages,
        })),
        purchasesByBookType: Object.keys(purchasesByType).map((type) => ({
          bookType: type,
          count: purchasesByType[type].length,
          purchases: purchasesByType[type],
        })),
      };

      userData.progress = {
        allProgress: allProgress.map((p) => ({
          bookId: p.bookId,
          bookTitle: p.book?.title || p.book?.titleAr,
          bookTitleAr: p.book?.titleAr,
          bookType: p.book?.bookType,
          coverImage: p.book?.coverImage,
          category: p.book?.category,
          categoryAr: p.book?.categoryAr,
          percentage: Number(p.percentage),
          pagesRead: p.pagesRead,
          totalPages: p.totalPages,
          startDate: p.startDate,
          lastReadAt: p.lastReadAt,
          completedAt: p.completedAt,
        })),
        stats: {
          totalPagesRead,
          inProgressBooks,
          completedBooks,
          totalBooks: allProgress.length,
        },
      };

      userData.payments = {
        all: allPayments.map((p) => ({
          id: p.id,
          bookId: p.bookId,
          bookTitle: p.book?.title || p.book?.titleAr,
          bookTitleAr: p.book?.titleAr,
          bookType: p.book?.bookType || p.bookType,
          coverImage: p.book?.coverImage,
          amount: Number(p.amount),
          status: p.status,
          paymentDate: p.paymentDate,
          createdAt: p.createdAt,
        })),
        stats: {
          total: allPayments.length,
          completed: allPayments.filter(p => p.status === 'COMPLETED').length,
          pending: allPayments.filter(p => p.status === 'PENDING').length,
          failed: allPayments.filter(p => p.status === 'FAILED').length,
          totalSpent,
        },
      };
    }
    
    res.json({ user: userData });
  } catch (error: any) {
    console.error('❌ [USER] Error getting user by ID:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;
    const currentUser = req.user;
    
    // Check if user can update (own profile or admin)
    if (currentUser?.userId !== parseInt(id) && currentUser?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (currentUser?.role === 'ADMIN') {
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
    }
    
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
    
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.user.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const currentUser = req.user;
    
    // Check if user can change password (own password or admin)
    if (currentUser?.userId !== parseInt(id) && currentUser?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password (unless admin)
    if (currentUser?.userId === parseInt(id)) {
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword },
    });
    
    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};



