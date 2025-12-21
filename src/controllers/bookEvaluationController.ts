import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Link book or bookType to evaluation (controlled from dashboard)
export const linkBookToEvaluation = async (req: AuthRequest, res: Response) => {
  try {
    const { bookId, bookType, evaluationId, isRequired, minScorePercentage, order } = req.body;
    
    // Either bookId OR bookType must be provided
    if (!bookId && !bookType) {
      return res.status(400).json({ error: 'Either bookId or bookType must be provided' });
    }
    
    // If bookId is provided, check if book exists
    if (bookId) {
      const book = await prisma.book.findUnique({
        where: { id: parseInt(bookId) },
      });
      
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
    }
    
    // Check if evaluation exists
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: parseInt(evaluationId) },
    });
    
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    
    // Create or update the link
    // If bookId is provided, use bookId_evaluationId unique constraint
    // If bookType is provided, use bookType_evaluationId unique constraint
    const whereClause = bookId 
      ? { bookId_evaluationId: { bookId: parseInt(bookId), evaluationId: parseInt(evaluationId) } }
      : { bookType_evaluationId: { bookType: bookType as any, evaluationId: parseInt(evaluationId) } };
    
    const bookEvaluation = await prisma.bookEvaluation.upsert({
      where: whereClause as any,
      update: {
        isRequired: isRequired !== undefined ? isRequired : false,
        minScorePercentage: minScorePercentage !== undefined ? parseFloat(minScorePercentage) : 70.0,
        order: order || 0,
      },
      create: {
        bookId: bookId ? parseInt(bookId) : null,
        bookType: bookType ? (bookType as any) : null,
        evaluationId: parseInt(evaluationId),
        isRequired: isRequired !== undefined ? isRequired : false,
        minScorePercentage: minScorePercentage !== undefined ? parseFloat(minScorePercentage) : 70.0,
        order: order || 0,
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            titleAr: true,
          },
        },
        evaluation: {
          select: {
            id: true,
            title: true,
            titleAr: true,
            status: true,
          },
        },
      },
    });
    
    res.status(201).json({ bookEvaluation });
  } catch (error: any) {
    console.error('❌ [BOOK_EVALUATION] Error linking book to evaluation:', error);
    res.status(500).json({ error: error.message });
  }
};

// Unlink book from evaluation
export const unlinkBookFromEvaluation = async (req: AuthRequest, res: Response) => {
  try {
    const { bookId, evaluationId } = req.params;
    
    await prisma.bookEvaluation.delete({
      where: {
        bookId_evaluationId: {
          bookId: parseInt(bookId),
          evaluationId: parseInt(evaluationId),
        },
      },
    });
    
    res.json({ message: 'Book unlinked from evaluation successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get all evaluations for a book
export const getBookEvaluations = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    
    const bookEvaluations = await prisma.bookEvaluation.findMany({
      where: { bookId: parseInt(bookId) },
      include: {
        evaluation: {
          include: {
            criteria: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });
    
    // Return both the BookEvaluation data and the evaluation details
    res.json({ 
      evaluations: bookEvaluations.map(be => ({
        id: be.evaluation.id,
        title: be.evaluation.title,
        titleAr: be.evaluation.titleAr,
        status: be.evaluation.status,
        minScorePercentage: be.minScorePercentage,
        isRequired: be.isRequired,
        order: be.order,
      })),
      bookEvaluations: bookEvaluations,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get all books for an evaluation
export const getEvaluationBooks = async (req: Request, res: Response) => {
  try {
    const { evaluationId } = req.params;
    
    const bookEvaluations = await prisma.bookEvaluation.findMany({
      where: { evaluationId: parseInt(evaluationId) },
      include: {
        book: {
          include: {
            bookCategory: {
              select: {
                id: true,
                name: true,
                nameAr: true,
              },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });
    
    res.json({ books: bookEvaluations.map(be => be.book) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update book-evaluation link
export const updateBookEvaluationLink = async (req: AuthRequest, res: Response) => {
  try {
    const { bookId, evaluationId } = req.params;
    const { isRequired, minScorePercentage, order } = req.body;
    
    const updateData: any = {};
    if (isRequired !== undefined) updateData.isRequired = isRequired;
    if (minScorePercentage !== undefined) updateData.minScorePercentage = parseFloat(minScorePercentage);
    if (order !== undefined) updateData.order = order;
    
    const bookEvaluation = await prisma.bookEvaluation.update({
      where: {
        bookId_evaluationId: {
          bookId: parseInt(bookId),
          evaluationId: parseInt(evaluationId),
        },
      },
      data: updateData,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            titleAr: true,
          },
        },
        evaluation: {
          select: {
            id: true,
            title: true,
            titleAr: true,
          },
        },
      },
    });
    
    res.json({ bookEvaluation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};





