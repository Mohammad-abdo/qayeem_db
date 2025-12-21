import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const { unreadOnly, userId: targetUserId } = req.query;
    
    // Admin can see all notifications or filter by userId
    // Regular users can only see their own notifications
    const where: any = {};
    
    if (userRole === 'ADMIN' || userRole === 'MANAGER') {
      // Admin can see all notifications or filter by specific userId
      if (targetUserId) {
        where.userId = parseInt(targetUserId as string);
      }
    } else {
      // Regular users can only see their own notifications
      where.userId = userId;
    }
    
    if (unreadOnly === 'true') {
      where.isRead = false;
    }
    
    const notifications = await prisma.notification.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Increased limit for admin
    });
    
    res.json({ notifications });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Admin can mark any notification as read, users can only mark their own
    const where: any = { id: parseInt(id) };
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      where.userId = userId;
    }
    
    const notification = await prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });
    
    if (notification.count === 0) {
      return res.status(404).json({ error: 'Notification not found or unauthorized' });
    }
    
    res.json({ message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const { userId: targetUserId } = req.query;
    
    // Admin can mark all notifications as read or filter by userId
    const where: any = { isRead: false };
    
    if (userRole === 'ADMIN' || userRole === 'MANAGER') {
      if (targetUserId) {
        where.userId = parseInt(targetUserId as string);
      }
    } else {
      where.userId = userId;
    }
    
    const result = await prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });
    
    res.json({ 
      message: 'All notifications marked as read',
      count: result.count 
    });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Admin can delete any notification, users can only delete their own
    const where: any = { id: parseInt(id) };
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      where.userId = userId;
    }
    
    const result = await prisma.notification.deleteMany({
      where,
    });
    
    if (result.count === 0) {
      return res.status(404).json({ error: 'Notification not found or unauthorized' });
    }
    
    res.json({ message: 'Notification deleted' });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create notification (for admin)
export const createNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, title, titleAr, message, messageAr, type, link } = req.body;
    const userRole = req.user!.role;
    
    // Only admin and manager can create notifications
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      return res.status(403).json({ error: 'Unauthorized: Only admins can create notifications' });
    }
    
    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'userId, title, and message are required' });
    }
    
    const notification = await prisma.notification.create({
      data: {
        userId: parseInt(userId),
        title,
        titleAr,
        message,
        messageAr,
        type: type || 'INFO',
        link,
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
    
    res.status(201).json({ notification });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update notification (for admin)
export const updateNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, titleAr, message, messageAr, type, link, isRead } = req.body;
    const userRole = req.user!.role;
    
    // Only admin and manager can update notifications
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      return res.status(403).json({ error: 'Unauthorized: Only admins can update notifications' });
    }
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (titleAr !== undefined) updateData.titleAr = titleAr;
    if (message !== undefined) updateData.message = message;
    if (messageAr !== undefined) updateData.messageAr = messageAr;
    if (type !== undefined) updateData.type = type;
    if (link !== undefined) updateData.link = link;
    if (isRead !== undefined) updateData.isRead = isRead;
    
    const notification = await prisma.notification.update({
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
    
    res.json({ notification });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: error.message });
  }
};
