import Testimonial from '../models/Testimonial.js'

// GET /api/v1/testimonials?status=pending|approved|rejected|all
export const listTestimonials = async (req, res, next) => {
  try {
    const { status = 'pending', q, page = 1, limit = 25 } = req.query
    const filter = {}

    if (status && status !== 'all') filter.status = status
    if (q) filter.$text = { $search: q }

    const testimonials = await Testimonial.find(filter)
      .populate('author', 'firstName lastName role profilePhoto')
      .populate({ path: 'booking', select: 'service scheduledDate', populate: { path: 'service', select: 'name' } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))

    const total = await Testimonial.countDocuments(filter)

    res.status(200).json({ success: true, data: testimonials, meta: { total, page: parseInt(page), limit: parseInt(limit) } })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/v1/testimonials/:id/approve
export const approveTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id)
    if (!testimonial) return res.status(404).json({ success: false, error: 'Testimonial not found' })

    testimonial.status = 'approved'
    testimonial.rejectionReason = undefined
    testimonial.moderatedBy = req.user?._id
    testimonial.moderatedAt = new Date()
    await testimonial.save()

    res.status(200).json({ success: true, data: testimonial })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/v1/testimonials/:id/reject
export const rejectTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id)
    if (!testimonial) return res.status(404).json({ success: false, error: 'Testimonial not found' })

    testimonial.status = 'rejected'
    testimonial.rejectionReason = req.body?.reason || req.body?.message || 'Rejected'
    testimonial.moderatedBy = req.user?._id
    testimonial.moderatedAt = new Date()
    await testimonial.save()

    res.status(200).json({ success: true, data: testimonial })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/v1/testimonials/:id
export const deleteTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id)
    if (!testimonial) return res.status(404).json({ success: false, error: 'Testimonial not found' })

    res.status(200).json({ success: true, data: null })
  } catch (err) {
    next(err)
  }
}
