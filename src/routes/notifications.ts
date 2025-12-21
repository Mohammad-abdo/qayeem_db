import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  updateNotification,
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// All routes require authentication
router.get('/', authenticate, getNotifications);
router.put('/:id/read', authenticate, markAsRead);
router.put('/read-all', authenticate, markAllAsRead);
router.delete('/:id', authenticate, deleteNotification);

// Admin-only routes
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), createNotification);
router.put('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), updateNotification);

export default router;
