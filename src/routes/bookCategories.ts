import express from 'express';
import {
  getAllBookCategories,
  getBookCategoryById,
  createBookCategory,
  updateBookCategory,
  deleteBookCategory,
} from '../controllers/bookCategoryController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// Public routes
router.get('/', getAllBookCategories);
router.get('/:id', getBookCategoryById);

// Admin routes
router.post('/', authenticate, requireRole('ADMIN'), createBookCategory);
router.put('/:id', authenticate, requireRole('ADMIN'), updateBookCategory);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteBookCategory);

export default router;







