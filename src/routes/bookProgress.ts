import { Router } from 'express';
import {
  getUserProgress,
  updateProgress,
  getBookProgress,
} from '../controllers/bookProgressController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/my-progress', authenticate, getUserProgress);
router.get('/book/:bookId', authenticate, getBookProgress);
router.post('/update', authenticate, updateProgress);

export default router;











