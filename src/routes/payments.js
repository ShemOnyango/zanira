import express from 'express';
import {
  processPaymentCallback
} from '../controllers/bookingController.js';
import { verifyPaymentCallback } from '../middleware/paymentSecurity.js';

const router = express.Router();

// M-Pesa callback route (public - called by Safaricom)
router.post('/callback/mpesa', verifyPaymentCallback, processPaymentCallback);

export default router;