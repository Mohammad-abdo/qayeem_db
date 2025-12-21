import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getAllBookReviews = async (req: Request, res: Response) => {
  try {
    const { bookId, userId, isApproved, rating, page = '1', limit = '10' } = req.query;
    
    const where: any = {};
    if (bookId) where.bookId = parseInt(bookId as string);
    if (userId) where.userId = parseInt(userId as string);
    if (isApproved !== undefined) where.isApproved = isApproved === 'true';
    if (rating) where.rating = parseInt(rating as string);
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);
    
    const [reviews, total] = await Promise.all([
      prisma.bookReview.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              email: true,
              avatar: true,
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
        skip,
        take,
      }),
      prisma.bookReview.count({ where }),
    ]);
    
    res.json({
      reviews,
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

export const getBookReviewById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const review = await prisma.bookReview.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            email: true,
            avatar: true,
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
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    res.json({ review });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createBookReview = async (req: AuthRequest, res: Response) => {
  try {
    const { bookId, rating, comment, commentAr } = req.body;
    const userId = req.user!.userId;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Check if user already reviewed this book
    const existingReview = await prisma.bookReview.findUnique({
      where: {
        bookId_userId: {
          bookId: parseInt(bookId),
          userId,
        },
      },
    });
    
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this book' });
    }
    
    // Check if book exists
    const book = await prisma.book.findUnique({
      where: { id: parseInt(bookId) },
    });
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const review = await prisma.bookReview.create({
      data: {
        bookId: parseInt(bookId),
        userId,
        rating: parseInt(rating),
        comment,
        commentAr,
        isApproved: false, // Requires admin approval
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            email: true,
            avatar: true,
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
    });
    
    res.status(201).json({ review });
  } catch (error: any) {
    console.error('Review creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create review' });
  }
};

export const updateBookReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment, commentAr } = req.body;
    const userId = req.user!.userId;
    
    const review = await prisma.bookReview.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Check if user owns this review or is admin
    if (review.userId !== userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only update your own reviews' });
    }
    
    const updateData: any = {};
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }
      updateData.rating = parseInt(rating);
    }
    if (comment !== undefined) updateData.comment = comment;
    if (commentAr !== undefined) updateData.commentAr = commentAr;
    
    const updatedReview = await prisma.bookReview.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            email: true,
            avatar: true,
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
    });
    
    res.json({ review: updatedReview });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteBookReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    const review = await prisma.bookReview.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Check if user owns this review or is admin
    if (review.userId !== userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }
    
    await prisma.bookReview.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const approveBookReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const review = await prisma.bookReview.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    const updatedReview = await prisma.bookReview.update({
      where: { id: parseInt(id) },
      data: { isApproved: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            email: true,
            avatar: true,
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
    });
    
    res.json({ review: updatedReview });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};










