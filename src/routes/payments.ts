import express from 'express';
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePaymentStatus,
  getUserPayments,
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// Admin routes (all payments)
router.get('/', authenticate, requireRole('ADMIN'), getAllPayments);
router.get('/:id', authenticate, getPaymentById);
router.put('/:id/status', authenticate, requireRole('ADMIN'), updatePaymentStatus);

// User routes (own payments)
router.get('/user/my-payments', authenticate, getUserPayments);
router.post('/', authenticate, createPayment);

export default router;



