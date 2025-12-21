import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getAllRatings = async (req: Request, res: Response) => {
  try {
    const { evaluationId, userId, status } = req.query;
    
    const where: any = {};
    if (evaluationId) where.evaluationId = parseInt(evaluationId as string);
    if (userId) where.userId = parseInt(userId as string);
    if (status) where.status = status;
    
    const ratings = await prisma.rating.findMany({
      where,
      include: {
        evaluation: {
          select: {
            id: true,
            title: true,
            titleAr: true,
          },
        },
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
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ ratings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getRatingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const rating = await prisma.rating.findUnique({
      where: { id: parseInt(id) },
      include: {
        evaluation: {
          include: {
            criteria: true,
          },
        },
        user: true,
        items: {
          include: {
            criterion: true,
          },
        },
      },
    });
    
    if (!rating) {
      return res.status(404).json({ error: 'Rating not found' });
    }
    
    res.json({ rating });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createRatingFromBody = async (req: AuthRequest, res: Response) => {
  try {
    const { evaluationId, answers } = req.body;
    const userId = req.user!.userId;
    
    console.log('📝 [RATING] Creating rating:', {
      userId,
      evaluationId,
      answersCount: Array.isArray(answers) ? answers.length : Object.keys(answers || {}).length,
      answers: answers
    });
    
    if (!evaluationId) {
      console.error('❌ [RATING] Error: evaluationId is required');
      return res.status(400).json({ error: 'evaluationId is required' });
    }
    
    // Convert answers to items format
    const items = Array.isArray(answers) 
      ? answers.map((answer: any) => ({
          criterionId: answer.criterionId,
          score: answer.score || answer.value || 0,
        }))
      : Object.entries(answers || {}).map(([criterionId, value]: [string, any]) => ({
          criterionId: parseInt(criterionId),
          score: value || 0,
        }));
    
    // Check if rating already exists
    const existingRating = await prisma.rating.findUnique({
      where: {
        evaluationId_userId: {
          evaluationId: parseInt(evaluationId),
          userId,
        },
      },
    });
    
    if (existingRating) {
      // Update existing rating instead of creating new one
      return updateRatingFromBody(req, res, existingRating.id);
    }
    
    // Calculate total score
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: parseInt(evaluationId) },
      include: { criteria: true },
    });
    
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    
    let totalScore = 0;
    items.forEach((item: any) => {
      const criterion = evaluation.criteria.find((c) => c.id === item.criterionId);
      if (criterion) {
        const itemScore = (item.score * (criterion.weight || 1)) / (criterion.maxScore || 10);
        totalScore += itemScore;
        console.log(`  📊 [RATING] Criterion ${item.criterionId}: score=${item.score}, weight=${criterion.weight}, maxScore=${criterion.maxScore}, calculated=${itemScore.toFixed(2)}`);
      } else {
        console.warn(`  ⚠️ [RATING] Criterion ${item.criterionId} not found in evaluation`);
      }
    });
    
    console.log(`✅ [RATING] Total score calculated: ${totalScore.toFixed(2)}`);
    
    const rating = await prisma.rating.create({
      data: {
        evaluationId: parseInt(evaluationId),
        userId,
        status: 'SUBMITTED',
        totalScore,
        submittedAt: new Date(),
        items: {
          create: items.map((item: any) => ({
            criterionId: item.criterionId,
            score: item.score,
          })),
        },
      },
      include: {
        items: {
          include: {
            criterion: true,
          },
        },
      },
    });
    
    console.log(`✅ [RATING] Rating created successfully:`, {
      ratingId: rating.id,
      evaluationId: rating.evaluationId,
      userId: rating.userId,
      status: rating.status,
      totalScore: rating.totalScore,
      itemsCount: rating.items.length
    });
    
    res.status(201).json({ rating });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const updateRatingFromBody = async (req: AuthRequest, res: Response, ratingId: number) => {
  try {
    const { evaluationId, answers } = req.body;
    const userId = req.user!.userId;
    
    // Convert answers to items format
    const items = Array.isArray(answers) 
      ? answers.map((answer: any) => ({
          criterionId: answer.criterionId,
          score: answer.score || answer.value || 0,
        }))
      : Object.entries(answers || {}).map(([criterionId, value]: [string, any]) => ({
          criterionId: parseInt(criterionId),
          score: value || 0,
        }));
    
    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
      include: {
        evaluation: {
          include: { criteria: true },
        },
      },
    });
    
    if (!rating || rating.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Delete existing items
    await prisma.ratingItem.deleteMany({
      where: { ratingId },
    });
    
    // Create new items
    await prisma.ratingItem.createMany({
      data: items.map((item: any) => ({
        ratingId,
        criterionId: item.criterionId,
        score: item.score,
      })),
    });
    
    // Recalculate total score
    let totalScore = 0;
    items.forEach((item: any) => {
      const criterion = rating.evaluation.criteria.find((c) => c.id === item.criterionId);
      if (criterion) {
        totalScore += (item.score * (criterion.weight || 1)) / (criterion.maxScore || 10);
      }
    });
    
    const updatedRating = await prisma.rating.update({
      where: { id: ratingId },
      data: {
        totalScore,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: {
        items: {
          include: {
            criterion: true,
          },
        },
      },
    });
    
    console.log(`✅ [RATING] Rating updated successfully:`, {
      ratingId: updatedRating.id,
      evaluationId: updatedRating.evaluationId,
      userId: updatedRating.userId,
      status: updatedRating.status,
      totalScore: updatedRating.totalScore,
      itemsCount: updatedRating.items.length
    });
    
    res.status(200).json({ rating: updatedRating });
  } catch (error: any) {
    console.error('❌ [RATING] Error updating rating:', error);
    console.error('❌ [RATING] Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const createRating = async (req: AuthRequest, res: Response) => {
  try {
    const { evaluationId } = req.params;
    const { items } = req.body;
    const userId = req.user!.userId;
    
    // Check if rating already exists
    const existingRating = await prisma.rating.findUnique({
      where: {
        evaluationId_userId: {
          evaluationId: parseInt(evaluationId),
          userId,
        },
      },
    });
    
    if (existingRating) {
      return res.status(400).json({ error: 'Rating already exists' });
    }
    
    // Calculate total score
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: parseInt(evaluationId) },
      include: { criteria: true },
    });
    
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    
    let totalScore = 0;
    items.forEach((item: any) => {
      const criterion = evaluation.criteria.find((c) => c.id === item.criterionId);
      if (criterion) {
        totalScore += (item.score * criterion.weight) / criterion.maxScore;
      }
    });
    
    const rating = await prisma.rating.create({
      data: {
        evaluationId: parseInt(evaluationId),
        userId,
        status: 'DRAFT',
        totalScore,
        items: {
          create: items.map((item: any) => ({
            criterionId: item.criterionId,
            score: item.score,
            comment: item.comment,
            commentAr: item.commentAr,
          })),
        },
      },
      include: {
        items: {
          include: {
            criterion: true,
          },
        },
      },
    });
    
    res.status(201).json({ rating });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateRating = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { items, status } = req.body;
    const userId = req.user!.userId;
    
    const rating = await prisma.rating.findUnique({
      where: { id: parseInt(id) },
      include: {
        evaluation: {
          include: { criteria: true },
        },
      },
    });
    
    if (!rating) {
      return res.status(404).json({ error: 'Rating not found' });
    }
    
    if (rating.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Update items if provided
    if (items) {
      // Delete existing items
      await prisma.ratingItem.deleteMany({
        where: { ratingId: parseInt(id) },
      });
      
      // Create new items
      await prisma.ratingItem.createMany({
        data: items.map((item: any) => ({
          ratingId: parseInt(id),
          criterionId: item.criterionId,
          score: item.score,
          comment: item.comment,
          commentAr: item.commentAr,
        })),
      });
      
      // Recalculate total score
      let totalScore = 0;
      items.forEach((item: any) => {
        const criterion = rating.evaluation.criteria.find((c) => c.id === item.criterionId);
        if (criterion) {
          totalScore += (item.score * criterion.weight) / criterion.maxScore;
        }
      });
      
      await prisma.rating.update({
        where: { id: parseInt(id) },
        data: { totalScore },
      });
    }
    
    // Update status if provided
    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'SUBMITTED') {
        updateData.submittedAt = new Date();
      }
    }
    
    const updatedRating = await prisma.rating.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        items: {
          include: {
            criterion: true,
          },
        },
      },
    });
    
    res.json({ rating: updatedRating });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const submitRating = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    const rating = await prisma.rating.update({
      where: {
        id: parseInt(id),
        userId,
      },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
    
    res.json({ rating });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};



