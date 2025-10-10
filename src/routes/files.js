import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  uploadProfilePhoto as uploadProfilePhotoMW,
  uploadVerification as uploadVerificationMW,
  uploadPortfolio as uploadPortfolioMW,
  handleUploadError
} from '../middleware/upload.js';
import {
  uploadProfilePhoto,
  uploadVerificationDocuments,
  uploadPortfolio,
  deleteFile,
  getFileInfo,
  generateUploadUrl
} from '../controllers/fileController.js';

const router = express.Router();

// All file routes require authentication
router.use(protect);

// Upload a profile photo
router.post('/upload-profile-photo', uploadProfilePhotoMW, handleUploadError, uploadProfilePhoto);

// Upload verification documents (multiple fields)
router.post('/upload-verification', uploadVerificationMW, handleUploadError, uploadVerificationDocuments);

// Upload portfolio items (fundi only)
router.post('/upload-portfolio', authorize('fundi'), uploadPortfolioMW, handleUploadError, uploadPortfolio);

// Delete a file
router.delete('/delete', deleteFile);

// Get file metadata/info
router.get('/info/:publicId', getFileInfo);

// Generate a signed upload URL (client can upload directly to Cloudinary)
router.post('/generate-upload-url', generateUploadUrl);

export default router;
