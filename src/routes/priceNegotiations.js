import express from 'express'
import {
  listPriceNegotiations,
  getPriceNegotiation,
  approveNegotiation,
  rejectNegotiation
} from '../controllers/priceNegotiationController.js'
import { protect, authorize } from '../middleware/auth.js'

const router = express.Router()

router.use(protect)

// admin access required
router.get('/', authorize('admin', 'super_admin'), listPriceNegotiations)
router.get('/:id', authorize('admin', 'super_admin'), getPriceNegotiation)
router.patch('/:id/approve', authorize('admin', 'super_admin'), approveNegotiation)
router.patch('/:id/reject', authorize('admin', 'super_admin'), rejectNegotiation)

export default router
