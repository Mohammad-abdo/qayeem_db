import express from 'express';
import {
  linkBookToEvaluation,
  unlinkBookFromEvaluation,
  getBookEvaluations,
  getEvaluationBooks,
  updateBookEvaluationLink,
} from '../controllers/bookEvaluationController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// Public routes
router.get('/book/:bookId', getBookEvaluations);
router.get('/evaluation/:evaluationId', getEvaluationBooks);

// Admin routes
router.post('/', authenticate, requireRole('ADMIN'), linkBookToEvaluation);
router.put('/:bookId/:evaluationId', authenticate, requireRole('ADMIN'), updateBookEvaluationLink);
router.delete('/:bookId/:evaluationId', authenticate, requireRole('ADMIN'), unlinkBookFromEvaluation);

export default router;









