import express from 'express';
import {
  createBooking,
  getUserBookings,
  getBooking,
  updateBookingStatus,
  confirmCompletion,
  initiatePayment,
  releasePayment,
  assignFundiToBooking,
  findMatchingFundis
  , pushBookingToFundis
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';
import { paymentRateLimit, fraudDetection, validatePaymentRequest } from '../middleware/paymentSecurity.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Client routes
router.post('/', authorize('client'), createBooking);
router.get('/', getUserBookings);
router.get('/:id', validateObjectId, getBooking);
router.patch('/:id/confirm-completion', authorize('client'), validateObjectId, confirmCompletion);

// Payment routes with security
router.post(
  '/:id/payment', 
  authorize('client'), 
  validateObjectId, 
  paymentRateLimit,
  fraudDetection,
  validatePaymentRequest,
  initiatePayment
);

// Fundi routes
router.patch('/:id/status', authorize('fundi'), validateObjectId, updateBookingStatus);

// Admin routes
router.patch('/:id/release-payment', authorize('admin', 'super_admin'), validateObjectId, releasePayment);

// Add these routes after the existing ones:

// Admin routes for fundi assignment
router.get('/:id/matching-fundis', authorize('admin', 'super_admin'), validateObjectId, findMatchingFundis);
router.post('/:id/assign-fundi', authorize('admin', 'super_admin'), validateObjectId, assignFundiToBooking);
// Push booking to matching fundis (notify them to apply)
router.post('/:id/push-to-fundis', authorize('admin', 'super_admin'), validateObjectId, pushBookingToFundis);

export default router;