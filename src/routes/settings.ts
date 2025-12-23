import express from 'express';
import {
  getAllSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  updateSettingByKey,
  deleteSetting,
} from '../controllers/settingController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// All routes require authentication
router.get('/', authenticate, getAllSettings);
router.get('/:key', authenticate, getSettingByKey);
router.post('/', authenticate, requireRole('ADMIN'), createSetting);
router.put('/:id', authenticate, requireRole('ADMIN'), updateSetting);
router.put('/key/:key', authenticate, requireRole('ADMIN'), updateSettingByKey);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteSetting);

export default router;














