import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  placeBid,
  getJobBids,
  acceptBid,
  rejectBid
} from '../controllers/biddingController.js';

const router = express.Router();

router.use(protect);

router.post('/', restrictTo('fundi'), placeBid);
router.get('/:jobId', getJobBids);
router.post('/:jobId/bids/:bidId/accept', restrictTo('client'), acceptBid);
router.post('/:jobId/bids/:bidId/reject', restrictTo('client'), rejectBid);

export default router;
