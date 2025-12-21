import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Get all book categories
export const getAllBookCategories = async (req: Request | AuthRequest, res: Response) => {
  try {
    const { evaluationId, isActive } = req.query;
    const userId = (req as AuthRequest).user?.userId;
    
    const where: any = {};
    if (evaluationId) where.evaluationId = parseInt(evaluationId as string);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const categories = await prisma.bookCategory.findMany({
      where,
      include: {
        evaluation: {
          select: {
            id: true,
            title: true,
            titleAr: true,
          },
        },
        _count: {
          select: {
            books: true,
          },
        },
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });
    
    // If user is authenticated, calculate completion percentage for each category
    if (userId) {
      const categoriesWithCompletion = await Promise.all(
        categories.map(async (category) => {
          let completionPercentage = 0;
          let isCompleted = false;
          
          if (category.evaluationId) {
            // Check if user has completed the evaluation linked to this category
            const userRating = await prisma.rating.findUnique({
              where: {
                evaluationId_userId: {
                  evaluationId: category.evaluationId,
                  userId,
                },
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
            
            if (userRating && userRating.status === 'SUBMITTED') {
              // Calculate completion percentage
              if (userRating.items && userRating.items.length > 0) {
                const maxPossibleScore = userRating.evaluation.criteria.reduce(
                  (sum: number, criterion: any) => sum + (criterion.weight || 1),
                  0
                );
                
                let actualWeightedScore = 0;
                userRating.items.forEach((item: any) => {
                  const criterion = item.criterion;
                  if (criterion) {
                    const normalizedScore = (item.score / (criterion.maxScore || 10)) * (criterion.weight || 1);
                    actualWeightedScore += normalizedScore;
                  }
                });
                
                completionPercentage = maxPossibleScore > 0 
                  ? (actualWeightedScore / maxPossibleScore) * 100 
                  : 0;
              } else if (userRating.totalScore !== null) {
                const maxPossibleScore = userRating.evaluation.criteria.reduce(
                  (sum: number, criterion: any) => sum + (criterion.weight || 1),
                  0
                );
                completionPercentage = maxPossibleScore > 0 
                  ? (userRating.totalScore / maxPossibleScore) * 100 
                  : 0;
              }
              
              isCompleted = completionPercentage >= 100;
            }
          }
          
          return {
            ...category,
            completionPercentage: Math.round(completionPercentage * 100) / 100,
            isCompleted,
          };
        })
      );
      
      return res.json({ categories: categoriesWithCompletion });
    }
    
    res.json({ categories });
  } catch (error: any) {
    console.error('❌ [CATEGORY] Error getting categories:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get category by ID
export const getBookCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const category = await prisma.bookCategory.findUnique({
      where: { id: parseInt(id) },
      include: {
        evaluation: {
          select: {
            id: true,
            title: true,
            titleAr: true,
          },
        },
        books: {
          select: {
            id: true,
            title: true,
            titleAr: true,
          },
        },
      },
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ category });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Create book category
export const createBookCategory = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      nameAr,
      description,
      descriptionAr,
      evaluationId,
      order,
      isActive,
    } = req.body;
    
    const category = await prisma.bookCategory.create({
      data: {
        name,
        nameAr,
        description,
        descriptionAr,
        evaluationId: evaluationId ? parseInt(evaluationId) : null,
        order: order || 0,
        isActive: isActive !== false,
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
    
    res.status(201).json({ category });
  } catch (error: any) {
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(400).json({ 
        error: `This ${field} already exists. Please use a different value.` 
      });
    }
    console.error('Error creating book category:', error);
    res.status(500).json({ error: error.message || 'Failed to create book category' });
  }
};

// Update book category
export const updateBookCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      nameAr,
      description,
      descriptionAr,
      evaluationId,
      order,
      isActive,
    } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (nameAr !== undefined) updateData.nameAr = nameAr;
    if (description !== undefined) updateData.description = description;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    if (evaluationId !== undefined) updateData.evaluationId = evaluationId ? parseInt(evaluationId) : null;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const category = await prisma.bookCategory.update({
      where: { id: parseInt(id) },
      data: updateData,
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
    
    res.json({ category });
  } catch (error: any) {
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(400).json({ 
        error: `This ${field} already exists. Please use a different value.` 
      });
    }
    console.error('Error updating book category:', error);
    res.status(500).json({ error: error.message || 'Failed to update book category' });
  }
};

// Delete book category
export const deleteBookCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if category has books
    const booksCount = await prisma.book.count({
      where: { categoryId: parseInt(id) },
    });
    
    if (booksCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It has ${booksCount} book(s) assigned. Please reassign books first.` 
      });
    }
    
    await prisma.bookCategory.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};










