import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Get user's reading progress for all books
export const getUserProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get all purchased books first
    const purchasedPayments = await prisma.payment.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            titleAr: true,
            coverImage: true,
            category: true,
            categoryAr: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const purchasedBookIds = purchasedPayments.map(p => p.bookId).filter((id): id is number => id !== null);

    // Get all progress records for the user
    const progressRecords = await prisma.bookProgress.findMany({
      where: { userId },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            titleAr: true,
            coverImage: true,
            category: true,
            categoryAr: true,
            price: true,
          },
        },
      },
      orderBy: { lastReadAt: 'desc' },
    });

    // Create progress records for purchased books that don't have progress yet
    const booksWithoutProgress = purchasedBookIds.filter(
      (bookId): bookId is number => bookId !== null && !progressRecords.some(p => p.bookId === bookId)
    );

    // Get book details for books without progress
    const booksToInitialize = await prisma.book.findMany({
      where: {
        id: { in: booksWithoutProgress },
      },
      include: {
        items: {
          where: { itemType: 'CHAPTER' },
          orderBy: { order: 'asc' },
        },
      },
    });

    // Initialize progress records with 0% for purchased books without progress
    if (booksToInitialize.length > 0) {
      for (const book of booksToInitialize) {
        try {
          const totalPages = book.items && book.items.length > 0
            ? Math.max(...book.items.map((item: { pageNumber: number | null }) => item.pageNumber || 0), 300)
            : 300;

          await prisma.bookProgress.create({
            data: {
              userId,
              bookId: book.id,
              bookType: book.bookType as any,
              pagesRead: 0,
              totalPages,
              percentage: 0,
            },
          });
        } catch (error) {
          // Skip if progress record already exists (race condition)
          console.error(`Error creating progress for book ${book.id}:`, error);
        }
      }
    }

    // Fetch updated progress records
    const allProgressRecords = await prisma.bookProgress.findMany({
      where: { userId },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            titleAr: true,
            coverImage: true,
            category: true,
            categoryAr: true,
            price: true,
          },
        },
      },
      orderBy: { lastReadAt: 'desc' },
    });

    // Calculate overall stats
    const totalPagesRead = allProgressRecords.reduce((sum, p) => sum + p.pagesRead, 0);
    const completedBooks = allProgressRecords.filter(p => Number(p.percentage) >= 100).length;
    
    // Calculate reading days (sum of all reading days from all books)
    let totalReadingDays = 0;
    if (allProgressRecords.length > 0) {
      const uniqueDates = new Set();
      allProgressRecords.forEach(p => {
        const start = new Date(p.startDate);
        const end = p.lastReadAt ? new Date(p.lastReadAt) : new Date();
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // Count unique days
        for (let i = 0; i < days; i++) {
          const date = new Date(start);
          date.setDate(date.getDate() + i);
          uniqueDates.add(date.toDateString());
        }
      });
      totalReadingDays = uniqueDates.size;
    }

    // Separate current reading (not completed) and completed books
    const currentBooks = allProgressRecords
      .filter(p => Number(p.percentage) < 100)
      .slice(0, 4);
    
    const previousBooks = allProgressRecords.filter(p => Number(p.percentage) >= 100);

    res.json({
      stats: {
        pagesRead: totalPagesRead,
        booksRead: completedBooks,
        readingDays: totalReadingDays || 0,
      },
      currentBooks: currentBooks.map(p => ({
        ...p.book,
        progress: Number(p.percentage),
        pagesRead: p.pagesRead,
        totalPages: p.totalPages,
        startDate: p.startDate,
        lastReadAt: p.lastReadAt,
      })),
      previousBooks: previousBooks.map(p => ({
        ...p.book,
        progress: Number(p.percentage),
        pagesRead: p.pagesRead,
        totalPages: p.totalPages,
        startDate: p.startDate,
        completedAt: p.completedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update reading progress for a book
export const updateProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { bookId, pagesRead } = req.body;

    if (!bookId || pagesRead === undefined) {
      return res.status(400).json({ error: 'Book ID and pages read are required' });
    }

    // Get book to find total pages (assuming book has pages field or calculate from items)
    const book = await prisma.book.findUnique({
      where: { id: parseInt(bookId) },
      include: {
        items: {
          where: { itemType: 'CHAPTER' },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Calculate total pages (if book has pageNumber in items, or use default 300)
    const totalPages = book.items.length > 0
      ? Math.max(...book.items.map(item => item.pageNumber || 0), 300)
      : 300;

    const percentage = Math.min(100, (parseInt(pagesRead) / totalPages) * 100);
    const isCompleted = percentage >= 100;

    // Find or create progress record
    const progress = await prisma.bookProgress.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId: parseInt(bookId),
        },
      },
      update: {
        pagesRead: parseInt(pagesRead),
        totalPages,
        percentage,
        lastReadAt: new Date(),
        completedAt: isCompleted ? new Date() : undefined,
      },
      create: {
        userId,
        bookId: parseInt(bookId),
        pagesRead: parseInt(pagesRead),
        totalPages,
        percentage,
        lastReadAt: new Date(),
        completedAt: isCompleted ? new Date() : undefined,
      },
    });

    res.json({ progress });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get progress for a specific book
export const getBookProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { bookId } = req.params;

    const progress = await prisma.bookProgress.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId: parseInt(bookId),
        },
      },
      include: {
        book: {
          include: {
            items: {
              where: { itemType: 'CHAPTER' },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    // Calculate reading days for this book
    const start = new Date(progress.startDate);
    const end = progress.lastReadAt ? new Date(progress.lastReadAt) : new Date();
    const readingDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    res.json({ 
      progress: {
        ...progress,
        readingDays,
        totalPages: progress.totalPages,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};




