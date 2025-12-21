import express from 'express';
import {
  getAllRatings,
  getRatingById,
  createRating,
  createRatingFromBody,
  updateRating,
  submitRating,
} from '../controllers/ratingController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', getAllRatings);
router.get('/:id', getRatingById);
router.post('/', authenticate, createRatingFromBody); // POST /api/ratings
router.post('/evaluation/:evaluationId', authenticate, createRating); // POST /api/ratings/evaluation/:evaluationId
router.put('/:id', authenticate, updateRating);
router.post('/:id/submit', authenticate, submitRating);

export default router;



