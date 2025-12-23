import express from 'express';
import {
  getDashboardStats,
  getVerificationRequests,
  assignVerification,
  approveVerification,
  rejectVerification,
  requestAdditionalInfo,
  getFundiVerification,
  verifyFundi,
  rejectFundi,
  getSystemAnalytics,
  getEscrowAccount,
  updateSystemSettings,
  getSystemConfig,
  updateSystemConfig,
  getRoleManagement,
  createRole,
  updateRole,
  deleteRole,
  adminUpdateUserRole,
  getRecentActivities
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';
import priceNegotiationsRoutes from './priceNegotiations.js';

const router = express.Router();

// All routes require admin access
router.use(protect);
router.use(authorize('admin', 'super_admin'));

// Dashboard and analytics
router.get('/dashboard', getDashboardStats);
router.get('/analytics', getSystemAnalytics);
router.get('/activities', getRecentActivities);

// Verification management
router.get('/verifications', getVerificationRequests);
// Friendly route for pending verifications used by frontend
router.get('/verifications/pending', (req, res, next) => {
  // Default to pending/under_review statuses and return via getVerificationRequests
  req.query.status = req.query.status || 'submitted,under_review';
  return getVerificationRequests(req, res, next);
});
router.patch('/verifications/:id/assign', validateObjectId, assignVerification);
router.patch('/verifications/:id/approve', validateObjectId, approveVerification);
router.patch('/verifications/:id/reject', validateObjectId, rejectVerification);
router.patch('/verifications/:id/request-info', validateObjectId, requestAdditionalInfo);

// Single fundi verification review endpoints
router.get('/fundis/:id/verification', validateObjectId, getFundiVerification);
router.post('/fundis/:id/verify', validateObjectId, verifyFundi);
router.post('/fundis/:id/reject', validateObjectId, rejectFundi);

// Financial management
router.get('/escrow', getEscrowAccount);

// System settings (Super admin only)
router.patch('/settings', authorize('super_admin'), updateSystemSettings);

// System configuration UI endpoints
router.get('/system/config', getSystemConfig);
router.patch('/system/config', updateSystemConfig);

// Role management
router.get('/roles', getRoleManagement);
router.post('/roles', authorize('super_admin'), createRole);
router.patch('/roles/:key', authorize('super_admin'), updateRole);
router.delete('/roles/:key', authorize('super_admin'), deleteRole);

// Admin user role update
router.patch('/users/:id/role', adminUpdateUserRole);

// Mount price negotiations under admin namespace
router.use('/price-negotiations', priceNegotiationsRoutes);

export default router;