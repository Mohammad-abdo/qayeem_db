import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getAllActivityLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, entity, entityId, limit = 100, page = 1 } = req.query;
    
    const where: any = {};
    if (userId) where.userId = parseInt(userId as string);
    if (entity) where.entity = entity;
    if (entityId) where.entityId = parseInt(entityId as string);
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip,
      }),
      prisma.activityLog.count({ where }),
    ]);
    
    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getActivityLogById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const log = await prisma.activityLog.findUnique({
      where: { id: parseInt(id) },
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
    
    if (!log) {
      return res.status(404).json({ error: 'Activity log not found' });
    }
    
    res.json({ log });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createActivityLog = async (req: AuthRequest, res: Response) => {
  try {
    const { action, actionAr, entity, entityAr, entityId, details, ipAddress, userAgent } = req.body;
    
    const log = await prisma.activityLog.create({
      data: {
        userId: req.user?.userId,
        action,
        actionAr,
        entity,
        entityAr,
        entityId,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
        ipAddress,
        userAgent,
      },
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
    
    res.status(201).json({ log });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

