import express from 'express';
import {
  getCriteriaByEvaluation,
  createCriterion,
  updateCriterion,
  deleteCriterion,
} from '../controllers/criterionController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/evaluation/:evaluationId', getCriteriaByEvaluation);
router.post('/evaluation/:evaluationId', authenticate, createCriterion);
router.post('/', authenticate, createCriterion); // Allow creating without evaluationId in URL
router.put('/:id', authenticate, updateCriterion);
router.delete('/:id', authenticate, deleteCriterion);

export default router;




