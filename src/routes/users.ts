import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

router.get('/', authenticate, requireRole('ADMIN'), getAllUsers);
router.get('/:id', authenticate, getUserById);
router.put('/:id', authenticate, updateUser);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteUser);
router.post('/:id/change-password', authenticate, changePassword);

export default router;



