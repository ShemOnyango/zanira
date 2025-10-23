import express from 'express';
import {
  register,
  login,
  adminLogin,
  createSuperAdmin,
  verify2FA,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  setup2FA,
  verify2FASetup,
  disable2FA,
  getMe
} from '../controllers/authController.js';
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  // validateUpdatePassword
} from '../middleware/validation.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/admin/login', validateLogin, adminLogin);
router.post('/admin/create-super-admin', createSuperAdmin);
router.post('/verify-2fa', verify2FA);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.patch('/reset-password/:token', validateResetPassword, resetPassword);
router.patch('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);

// Protected routes
router.use(protect); // All routes below this middleware are protected

router.post('/logout', logout);
router.get('/me', getMe);
router.post('/setup-2fa', setup2FA);
router.post('/verify-2fa-setup', verify2FASetup);
router.post('/disable-2fa', disable2FA);

export default router;