import express from 'express';
import {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
} from '../controllers/permissionController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// All routes require authentication and ADMIN role
router.get('/', authenticate, requireRole('ADMIN'), getAllPermissions);
router.get('/:id', authenticate, requireRole('ADMIN'), getPermissionById);
router.post('/', authenticate, requireRole('ADMIN'), createPermission);
router.put('/:id', authenticate, requireRole('ADMIN'), updatePermission);
router.delete('/:id', authenticate, requireRole('ADMIN'), deletePermission);

export default router;












