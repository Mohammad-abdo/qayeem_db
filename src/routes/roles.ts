import express from 'express';
import {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
} from '../controllers/roleController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

router.get('/permissions', authenticate, getAllPermissions);
router.get('/', authenticate, requireRole('ADMIN'), getAllRoles);
router.post('/', authenticate, requireRole('ADMIN'), createRole);
router.put('/:id', authenticate, requireRole('ADMIN'), updateRole);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteRole);

export default router;



