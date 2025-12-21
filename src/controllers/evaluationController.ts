import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getAllEvaluations = async (req: Request, res: Response) => {
  try {
    const { status, type, search } = req.query;
    
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }
    
    const evaluations = await prisma.evaluation.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        criteria: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { ratings: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ evaluations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getEvaluationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: parseInt(id) },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        criteria: {
          orderBy: { order: 'asc' },
        },
        ratings: {
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
    
    res.json({ evaluation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createEvaluation = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      titleAr,
      description,
      descriptionAr,
      image,
      type,
      startDate,
      endDate,
      practicesPercentage,
      patternsPercentage,
    } = req.body;
    
    const userId = req.user!.userId;
    
    const evaluation = await prisma.evaluation.create({
      data: {
        title,
        titleAr,
        description,
        descriptionAr,
        image,
        type,
        status: 'ACTIVE', // Auto-activate new evaluations
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        practicesPercentage: practicesPercentage ? parseFloat(practicesPercentage) : 50,
        patternsPercentage: patternsPercentage ? parseFloat(patternsPercentage) : 50,
        createdBy: userId,
      },
      include: {
        criteria: true,
      },
    });
    
    res.status(201).json({ evaluation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateEvaluation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      titleAr,
      description,
      descriptionAr,
      image,
      type,
      status,
      startDate,
      endDate,
    } = req.body;
    
    const evaluation = await prisma.evaluation.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(titleAr !== undefined && { titleAr }),
        ...(description !== undefined && { description }),
        ...(descriptionAr !== undefined && { descriptionAr }),
        ...(image !== undefined && { image }),
        ...(type && { type }),
        ...(status && { status }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
    });
    
    res.json({ evaluation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteEvaluation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.evaluation.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ message: 'Evaluation deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const activateEvaluation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const evaluation = await prisma.evaluation.update({
      where: { id: parseInt(id) },
      data: { status: 'ACTIVE' },
    });
    
    res.json({ evaluation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const archiveEvaluation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const evaluation = await prisma.evaluation.update({
      where: { id: parseInt(id) },
      data: { status: 'ARCHIVED' },
    });
    
    res.json({ evaluation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const cloneEvaluation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    const original = await prisma.evaluation.findUnique({
      where: { id: parseInt(id) },
      include: { criteria: true },
    });
    
    if (!original) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    
    const cloned = await prisma.evaluation.create({
      data: {
        title: `${original.title} (نسخة)`,
        titleAr: original.titleAr ? `${original.titleAr} (نسخة)` : null,
        description: original.description,
        descriptionAr: original.descriptionAr,
        type: original.type,
        status: 'DRAFT',
        createdBy: userId,
        criteria: {
          create: original.criteria.map(c => ({
            title: c.title,
            titleAr: c.titleAr,
            description: c.description,
            descriptionAr: c.descriptionAr,
            weight: c.weight,
            maxScore: c.maxScore,
            order: c.order,
            isRequired: c.isRequired,
          })),
        },
      },
      include: { criteria: true },
    });
    
    res.status(201).json({ evaluation: cloned });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};



