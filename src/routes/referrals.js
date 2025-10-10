import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createReferral,
  getUserReferrals,
  applyReferralCode,
  updateReferralProgress,
  claimReferralReward
} from '../controllers/referralController.js';

const router = express.Router();

router.use(protect);

router.post('/', createReferral);
router.get('/me', getUserReferrals);
router.post('/apply', applyReferralCode);
router.patch('/progress', updateReferralProgress);
router.post('/claim', claimReferralReward);

export default router;
