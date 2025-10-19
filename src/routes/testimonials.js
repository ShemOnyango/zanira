import express from 'express'
import { protect, authorize } from '../middleware/auth.js'
import {
  listTestimonials,
  approveTestimonial,
  rejectTestimonial,
  deleteTestimonial
} from '../controllers/testimonialController.js'

const router = express.Router()

// All testimonial moderation routes require admin/super_admin
router.use(protect, authorize('admin', 'super_admin'))

router.get('/', listTestimonials)
router.patch('/:id/approve', approveTestimonial)
router.patch('/:id/reject', rejectTestimonial)
router.delete('/:id', deleteTestimonial)

export default router
