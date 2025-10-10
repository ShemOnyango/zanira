import express from 'express';
import {
  raiseDispute,
  getUserDisputes,
  getDispute,
  assignDispute,
  resolveDispute,
  addEvidence,
  escalateDispute,
  getDisputeStats
} from '../controllers/disputeController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// User routes
router.post('/', raiseDispute);
router.get('/', getUserDisputes);
router.get('/:id', validateObjectId, getDispute);
router.patch('/:id/evidence', validateObjectId, addEvidence);

// Admin routes
router.patch('/:id/assign', authorize('admin', 'super_admin'), validateObjectId, assignDispute);
router.patch('/:id/resolve', authorize('admin', 'super_admin'), validateObjectId, resolveDispute);
router.patch('/:id/escalate', authorize('admin', 'super_admin'), validateObjectId, escalateDispute);
router.get('/stats/overview', authorize('admin', 'super_admin'), getDisputeStats);

export default router;