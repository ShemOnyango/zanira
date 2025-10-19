import PriceNegotiation from '../models/PriceNegotiation.js'

export const listPriceNegotiations = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 25 } = req.query
    const filter = {}
    if (status) filter.status = status

    const negotiations = await PriceNegotiation.find(filter)
      .populate('booking')
      .populate('client', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))

    const total = await PriceNegotiation.countDocuments(filter)

    res.status(200).json({ success: true, data: negotiations, meta: { total, page: parseInt(page), limit: parseInt(limit) } })
  } catch (err) {
    next(err)
  }
}

export const getPriceNegotiation = async (req, res, next) => {
  try {
    const negotiation = await PriceNegotiation.findById(req.params.id).populate('booking client')
    if (!negotiation) return res.status(404).json({ success: false, error: 'Not found' })
    res.status(200).json({ success: true, data: negotiation })
  } catch (err) {
    next(err)
  }
}

export const approveNegotiation = async (req, res, next) => {
  try {
    const negotiation = await PriceNegotiation.findById(req.params.id)
    if (!negotiation) return res.status(404).json({ success: false, error: 'Not found' })
    negotiation.status = 'approved'
    negotiation.handledBy = req.user?._id
    negotiation.handledAt = new Date()
    await negotiation.save()
    res.status(200).json({ success: true, data: negotiation })
  } catch (err) {
    next(err)
  }
}

export const rejectNegotiation = async (req, res, next) => {
  try {
    const negotiation = await PriceNegotiation.findById(req.params.id)
    if (!negotiation) return res.status(404).json({ success: false, error: 'Not found' })
    negotiation.status = 'rejected'
    negotiation.handledBy = req.user?._id
    negotiation.handledAt = new Date()
    await negotiation.save()
    res.status(200).json({ success: true, data: negotiation })
  } catch (err) {
    next(err)
  }
}
