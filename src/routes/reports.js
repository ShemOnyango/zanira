import express from 'express';
import {
  getReportTemplates,
  generateReport,
  getReport,
  downloadReport
} from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Templates and generation are protected endpoints
router.use(protect);

// Public-ish: list available templates to admins
router.get('/templates', authorize('admin', 'super_admin'), getReportTemplates);
router.post('/generate', authorize('admin', 'super_admin'), generateReport);
router.get('/:id', authorize('admin', 'super_admin'), getReport);
router.get('/:id/download', authorize('admin', 'super_admin'), downloadReport);

export default router;
