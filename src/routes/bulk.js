import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  bulkUserAction,
  bulkSendNotification,
  bulkSendEmail,
  bulkVerifyFundis,
  bulkUpdateBookingStatus,
  bulkExportData
} from '../controllers/bulkOperationsController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin', 'super_admin'));

router.post('/users', bulkUserAction);
router.post('/notifications', bulkSendNotification);
router.post('/emails', bulkSendEmail);
router.post('/fundis/verify', bulkVerifyFundis);
router.post('/bookings/status', bulkUpdateBookingStatus);
router.post('/export', bulkExportData);

export default router;
