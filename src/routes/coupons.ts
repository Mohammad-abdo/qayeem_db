import { Router } from 'express';
import {
  getAllCoupons,
  getCouponById,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} from '../controllers/couponController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

// Public route - validate coupon (requires authentication)
router.post('/validate', authenticate, validateCoupon);

// Public route - get coupon by code (requires authentication)
router.get('/code/:code', authenticate, getCouponByCode);

// Admin routes
router.get('/', authenticate, requireRole('ADMIN', 'MANAGER'), getAllCoupons);
router.get('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), getCouponById);
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), createCoupon);
router.put('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), updateCoupon);
router.delete('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), deleteCoupon);

export default router;

