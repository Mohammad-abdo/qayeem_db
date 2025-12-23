import express from 'express';
import {
  getAllActivityLogs,
  getActivityLogById,
  createActivityLog,
} from '../controllers/activityLogController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// All routes require authentication and ADMIN role
router.get('/', authenticate, requireRole('ADMIN'), getAllActivityLogs);
router.get('/:id', authenticate, requireRole('ADMIN'), getActivityLogById);
router.post('/', authenticate, createActivityLog); // Can be called by any authenticated user

export default router;














