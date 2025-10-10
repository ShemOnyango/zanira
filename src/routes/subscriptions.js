import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getAvailablePlans,
  createSubscription,
  getUserSubscription,
  upgradeSubscription,
  cancelSubscription,
  processSubscriptionPayment,
  confirmSubscriptionPayment
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.get('/plans', getAvailablePlans);

router.use(protect);

router.post('/', createSubscription);
router.get('/me', getUserSubscription);
router.get('/:userId', getUserSubscription);
router.patch('/upgrade', upgradeSubscription);
router.patch('/cancel', cancelSubscription);
router.post('/payment', processSubscriptionPayment);
router.post('/payment/confirm', confirmSubscriptionPayment);

export default router;
