import express from 'express';
import {
  getProfile,
  updateProfile,
  updatePassword,
  deactivateAccount,
  uploadProfilePhotoController,
  getUser,
  getUsers,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import {
  uploadProfilePhoto,
  // uploadSingleFile (removed) - not present in upload middleware
} from '../middleware/upload.js';
import {
  validateUpdateProfile,
  validateUpdatePassword,
  validateObjectId
} from '../middleware/validation.js';
import { protect, authorize } from '../middleware/auth.js';


const router = express.Router();

// All routes are protected
router.use(protect);

// User routes
router.get('/profile', getProfile);
router.post('/profile/photo', uploadProfilePhoto, uploadProfilePhotoController);
router.patch('/profile', validateUpdateProfile, updateProfile);
router.patch('/update-password', validateUpdatePassword, updatePassword);
router.patch('/deactivate', deactivateAccount);

// Admin routes
router.use(authorize('super_admin', 'admin'));

router.get('/', getUsers);
router.get('/:id', validateObjectId, getUser);
router.patch('/:id', validateObjectId, validateUpdateProfile, updateUser);
router.delete('/:id', validateObjectId, deleteUser);

export default router;
