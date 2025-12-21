import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getEvaluationReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: parseInt(id) },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
        },
        ratings: {
          where: { status: 'SUBMITTED' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              include: {
                criterion: true,
              },
            },
          },
        },
      },
    });
    
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    
    // Calculate statistics
    const totalRatings = evaluation.ratings.length;
    const averageScore = evaluation.ratings.length > 0
      ? evaluation.ratings.reduce((sum, r) => sum + (r.totalScore || 0), 0) / totalRatings
      : 0;
    
    // Calculate average score per criterion
    const criterionStats = evaluation.criteria.map((criterion) => {
      const criterionRatings = evaluation.ratings
        .flatMap((r) => r.items)
        .filter((item) => item.criterionId === criterion.id);
      
      const avgScore = criterionRatings.length > 0
        ? criterionRatings.reduce((sum, item) => sum + item.score, 0) / criterionRatings.length
        : 0;
      
      return {
        criterionId: criterion.id,
        criterionTitle: criterion.title,
        averageScore: avgScore,
        maxScore: criterion.maxScore,
        totalRatings: criterionRatings.length,
      };
    });
    
    const report = {
      evaluation: {
        id: evaluation.id,
        title: evaluation.title,
        titleAr: evaluation.titleAr,
      },
      summary: {
        totalRatings,
        averageScore: parseFloat(averageScore.toFixed(2)),
        criteriaCount: evaluation.criteria.length,
      },
      criterionStats,
      ratings: evaluation.ratings,
    };
    
    res.json({ report });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get most popular books in evaluations
export const getMostPopularBooksReport = async (req: Request, res: Response) => {
  try {
    // Get all book-evaluation links with counts
    const bookEvaluations = await prisma.bookEvaluation.findMany({
      include: {
        book: {
          select: {
            id: true,
            title: true,
            titleAr: true,
            coverImage: true,
            category: true,
            categoryAr: true,
            bookCategory: {
              select: {
                id: true,
                name: true,
                nameAr: true,
              },
            },
          },
        },
        evaluation: {
          select: {
            id: true,
            title: true,
            titleAr: true,
            status: true,
            _count: {
              select: {
                ratings: true,
              },
            },
          },
        },
      },
    });

    // Group by book and count evaluations
    const bookStats: any = {};
    
    bookEvaluations.forEach(be => {
      // Skip if book is null (bookType-based evaluation)
      if (!be.book) {
        return;
      }
      
      const bookId = be.book.id;
      if (!bookStats[bookId]) {
        bookStats[bookId] = {
          book: be.book,
          evaluationCount: 0,
          totalRatings: 0,
          evaluations: [],
          isRequiredCount: 0,
        };
      }
      
      bookStats[bookId].evaluationCount++;
      bookStats[bookId].totalRatings += be.evaluation._count.ratings;
      bookStats[bookId].evaluations.push({
        id: be.evaluation.id,
        title: be.evaluation.title,
        titleAr: be.evaluation.titleAr,
        status: be.evaluation.status,
        isRequired: be.isRequired,
        ratingsCount: be.evaluation._count.ratings,
      });
      
      if (be.isRequired) {
        bookStats[bookId].isRequiredCount++;
      }
    });

    // Convert to array and sort by evaluation count
    const popularBooks = Object.values(bookStats)
      .map((stat: any) => ({
        ...stat,
        averageRatings: stat.evaluationCount > 0 ? (stat.totalRatings / stat.evaluationCount) : 0,
      }))
      .sort((a: any, b: any) => b.evaluationCount - a.evaluationCount);

    res.json({
      popularBooks,
      summary: {
        totalBooks: popularBooks.length,
        averageEvaluationsPerBook: popularBooks.length > 0 
          ? (popularBooks.reduce((sum: number, book: any) => sum + book.evaluationCount, 0) / popularBooks.length).toFixed(2)
          : 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get comprehensive statistics report
export const getComprehensiveStatistics = async (req: Request, res: Response) => {
  try {
    const [
      totalBooks,
      totalEvaluations,
      totalUsers,
      totalRatings,
      activeEvaluations,
      bookEvaluations,
      categoryStats,
    ] = await Promise.all([
      prisma.book.count(),
      prisma.evaluation.count(),
      prisma.user.count(),
      prisma.rating.count({ where: { status: 'SUBMITTED' } }),
      prisma.evaluation.count({ where: { status: 'ACTIVE' } }),
      prisma.bookEvaluation.findMany({
        include: {
          book: true,
          evaluation: true,
        },
      }),
      prisma.bookCategory.findMany({
        include: {
          _count: {
            select: {
              books: true,
            },
          },
        },
      }),
    ]);

    // Most popular evaluations (by ratings count)
    const popularEvaluations = await prisma.evaluation.findMany({
      include: {
        _count: {
          select: {
            ratings: true,
            books: true,
          },
        },
      },
      orderBy: {
        ratings: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    // Books by category
    const booksByCategory = await prisma.book.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
      where: {
        category: {
          not: null,
        },
      },
    });

    res.json({
      overview: {
        totalBooks,
        totalEvaluations,
        activeEvaluations,
        totalUsers,
        totalRatings,
        totalBookEvaluationLinks: bookEvaluations.length,
      },
      popularEvaluations: popularEvaluations.map(e => ({
        id: e.id,
        title: e.title,
        titleAr: e.titleAr,
        ratingsCount: e._count.ratings,
        booksCount: e._count.books,
      })),
      categoryStatistics: categoryStats.map(c => ({
        id: c.id,
        name: c.name,
        nameAr: c.nameAr,
        booksCount: c._count.books,
      })),
      booksByCategory: booksByCategory.map(bc => ({
        category: bc.category,
        count: bc._count.id,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Generate a new report
export const generateReport = async (req: AuthRequest, res: Response) => {
  try {
    const { evaluationId, type } = req.body;
    const userId = req.user!.userId;

    if (!evaluationId) {
      return res.status(400).json({ error: 'evaluationId is required' });
    }

    // Get evaluation with ratings
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: parseInt(evaluationId) },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
        },
        ratings: {
          where: { status: 'SUBMITTED' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              include: {
                criterion: true,
              },
            },
          },
        },
      },
    });

    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    // Calculate statistics
    const totalRatings = evaluation.ratings.length;
    const averageScore = evaluation.ratings.length > 0
      ? evaluation.ratings.reduce((sum, r) => sum + (r.totalScore || 0), 0) / totalRatings
      : 0;

    // Calculate average score per criterion
    const criterionStats = evaluation.criteria.map((criterion) => {
      const criterionRatings = evaluation.ratings
        .flatMap((r) => r.items)
        .filter((item) => item.criterionId === criterion.id);

      const avgScore = criterionRatings.length > 0
        ? criterionRatings.reduce((sum, item) => sum + item.score, 0) / criterionRatings.length
        : 0;

      return {
        criterionId: criterion.id,
        criterionTitle: criterion.title,
        averageScore: parseFloat(avgScore.toFixed(2)),
        maxScore: criterion.maxScore,
        totalRatings: criterionRatings.length,
      };
    });

    // Prepare report data
    const reportData = {
      evaluation: {
        id: evaluation.id,
        title: evaluation.title,
        titleAr: evaluation.titleAr,
      },
      summary: {
        totalRatings,
        averageScore: parseFloat(averageScore.toFixed(2)),
        criteriaCount: evaluation.criteria.length,
      },
      criterionStats,
      ratings: type === 'DETAILED' ? evaluation.ratings.map(r => ({
        id: r.id,
        userId: r.userId,
        userName: r.user.name,
        userEmail: r.user.email,
        totalScore: r.totalScore,
        submittedAt: r.submittedAt,
        items: r.items,
      })) : undefined,
      generatedAt: new Date().toISOString(),
    };

    // Save report to database
    const report = await prisma.report.create({
      data: {
        evaluationId: parseInt(evaluationId),
        type: (type || 'SUMMARY') as any,
        title: `${evaluation.titleAr || evaluation.title} - ${type || 'SUMMARY'}`,
        titleAr: `${evaluation.titleAr || evaluation.title} - ${type === 'SUMMARY' ? 'ملخص' : type === 'DETAILED' ? 'تفصيلي' : type === 'COMPARATIVE' ? 'مقارن' : 'إحصائي'}`,
        data: reportData as any,
        generatedBy: userId,
      },
      include: {
        evaluation: {
          select: {
            id: true,
            title: true,
            titleAr: true,
          },
        },
      },
    });

    res.status(201).json({ report });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get all reports
export const getAllReports = async (req: AuthRequest, res: Response) => {
  try {
    const { evaluationId, type, page = '1', limit = '10' } = req.query;

    const where: any = {};
    if (evaluationId) where.evaluationId = parseInt(evaluationId as string);
    if (type) where.type = type;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          evaluation: {
            select: {
              id: true,
              title: true,
              titleAr: true,
            },
          },
        },
        orderBy: { generatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.report.count({ where }),
    ]);

    res.json({
      reports,
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

// Get report by ID
export const getReportById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { id: parseInt(id) },
      include: {
        evaluation: {
          select: {
            id: true,
            title: true,
            titleAr: true,
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Delete report
export const deleteReport = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.report.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Report deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Export report
export const exportReport = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;

    const report = await prisma.report.findUnique({
      where: { id: parseInt(id) },
      include: {
        evaluation: {
          select: {
            id: true,
            title: true,
            titleAr: true,
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="report-${id}.json"`);
      return res.json(report);
    } else if (format === 'pdf') {
      // For PDF, we'll return JSON for now
      // In a production environment, you would use a library like pdfkit or puppeteer
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="report-${id}.pdf"`);
      // For now, return JSON as PDF is complex and requires additional libraries
      return res.json({
        message: 'PDF export not yet implemented. Please use JSON format.',
        report,
      });
    } else if (format === 'excel') {
      // For Excel, return JSON for now
      // In a production environment, you would use a library like exceljs
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="report-${id}.xlsx"`);
      // For now, return JSON as Excel export requires additional libraries
      return res.json({
        message: 'Excel export not yet implemented. Please use JSON format.',
        report,
      });
    } else {
      return res.status(400).json({ error: 'Invalid format. Supported formats: json, pdf, excel' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

