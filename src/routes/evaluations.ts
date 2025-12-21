import express from 'express';
import {
  getAllEvaluations,
  getEvaluationById,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
  activateEvaluation,
  archiveEvaluation,
  cloneEvaluation,
} from '../controllers/evaluationController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', getAllEvaluations);
router.get('/:id', getEvaluationById);
router.post('/', authenticate, createEvaluation);
router.put('/:id', authenticate, updateEvaluation);
router.delete('/:id', authenticate, deleteEvaluation);
router.post('/:id/activate', authenticate, activateEvaluation);
router.post('/:id/archive', authenticate, archiveEvaluation);
router.post('/:id/clone', authenticate, cloneEvaluation);

export default router;



