import express from 'express';
import {
  generateInvoice,
  generatePenaltyInvoice,
  getInvoices,
  getInvoice,
  updateInvoiceStatus,
  sendInvoice,
  recordPayment,
  getInvoiceStats,
  getUserInvoices
} from '../controllers/invoiceController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// User routes
router.get('/my-invoices', getUserInvoices);
router.get('/:id', validateObjectId, getInvoice);

// Admin routes
router.post('/generate', authorize('admin', 'super_admin'), generateInvoice);
router.post('/generate-penalty', authorize('admin', 'super_admin'), generatePenaltyInvoice);
router.get('/', authorize('admin', 'super_admin'), getInvoices);
router.patch('/:id/status', authorize('admin', 'super_admin'), validateObjectId, updateInvoiceStatus);
router.post('/:id/send', authorize('admin', 'super_admin'), validateObjectId, sendInvoice);
router.post('/:id/payment', authorize('admin', 'super_admin'), validateObjectId, recordPayment);
router.get('/stats/overview', authorize('admin', 'super_admin'), getInvoiceStats);

export default router;