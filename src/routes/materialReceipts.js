import express from 'express'
import {
  listMaterialReceipts,
  getMaterialReceipt,
  verifyMaterialReceipt,
  rejectMaterialReceipt
} from '../controllers/materialReceiptController.js'
import { protect, authorize } from '../middleware/auth.js'

const router = express.Router()

// All routes require auth
router.use(protect)

// Listing and viewing can be done by admin/support
router.get('/', authorize('admin', 'super_admin', 'support'), listMaterialReceipts)
router.get('/:id', authorize('admin', 'super_admin', 'support'), getMaterialReceipt)

// Verify/reject actions are admin-only
router.patch('/:id/verify', authorize('admin', 'super_admin'), verifyMaterialReceipt)
router.patch('/:id/reject', authorize('admin', 'super_admin'), rejectMaterialReceipt)

export default router
