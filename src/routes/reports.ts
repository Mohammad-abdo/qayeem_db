import express from 'express';
import { 
  getEvaluationReport, 
  getMostPopularBooksReport, 
  getComprehensiveStatistics,
  generateReport,
  getAllReports,
  getReportById,
  deleteReport,
  exportReport,
} from '../controllers/reportController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// Public routes
router.get('/evaluation/:id', authenticate, getEvaluationReport);

// Admin routes - specific routes must come before dynamic routes
router.post('/generate', authenticate, requireRole('ADMIN'), generateReport);
router.get('/popular-books', authenticate, requireRole('ADMIN'), getMostPopularBooksReport);
router.get('/statistics', authenticate, requireRole('ADMIN'), getComprehensiveStatistics);
router.get('/', authenticate, requireRole('ADMIN'), getAllReports);
router.get('/:id/export', authenticate, requireRole('ADMIN'), exportReport);
router.get('/:id', authenticate, requireRole('ADMIN'), getReportById);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteReport);

export default router;



