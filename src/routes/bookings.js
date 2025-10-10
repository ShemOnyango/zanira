import express from 'express';
import {
  createBooking,
  getUserBookings,
  getBooking,
  updateBookingStatus,
  confirmCompletion,
  initiatePayment,
  releasePayment
} from '../controllers/bookingController.js';
import { protect, authorize, hasPermission } from '../middleware/auth.js';
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

export default router;