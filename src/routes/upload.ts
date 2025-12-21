import express from 'express';
import { uploadImage, deleteImage, upload } from '../controllers/uploadController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Upload single image
router.post('/image', authenticate, upload.single('image'), uploadImage);

// Delete image
router.delete('/image/:filename', authenticate, deleteImage);

export default router;






