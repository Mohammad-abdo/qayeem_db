import express from 'express';
import {
  getAllBookReviews,
  getBookReviewById,
  createBookReview,
  updateBookReview,
  deleteBookReview,
  approveBookReview,
} from '../controllers/bookReviewController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// Public routes (only approved reviews)
router.get('/', getAllBookReviews);
router.get('/:id', getBookReviewById);

// User routes (authenticated users)
router.post('/', authenticate, createBookReview);
router.put('/:id', authenticate, updateBookReview);
router.delete('/:id', authenticate, deleteBookReview);

// Admin routes
router.patch('/:id/approve', authenticate, requireRole('ADMIN'), approveBookReview);

export default router;













