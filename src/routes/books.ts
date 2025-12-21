import express from 'express';
import {
  getAllBooks,
  getBookById,
  getBookStatistics,
  createBook,
  updateBook,
  deleteBook,
} from '../controllers/bookController';
import {
  getBookItems,
  createBookItem,
  updateBookItem,
  deleteBookItem,
} from '../controllers/bookItemController';
import {
  getRecommendedBooks,
  getBookRecommendationDetails,
} from '../controllers/bookRecommendationController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// Book routes
router.get('/', getAllBooks);
router.get('/recommended', authenticate, getRecommendedBooks);
router.get('/:id/statistics', authenticate, requireRole('ADMIN'), getBookStatistics);
router.get('/:id', getBookById);
router.get('/:bookId/recommendation', authenticate, getBookRecommendationDetails);
router.post('/', authenticate, requireRole('ADMIN'), createBook);
router.put('/:id', authenticate, requireRole('ADMIN'), updateBook);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteBook);

// Book item routes
router.get('/:bookId/items', getBookItems);
router.post('/:bookId/items', authenticate, requireRole('ADMIN'), createBookItem);
router.put('/items/:id', authenticate, requireRole('ADMIN'), updateBookItem);
router.delete('/items/:id', authenticate, requireRole('ADMIN'), deleteBookItem);

export default router;



