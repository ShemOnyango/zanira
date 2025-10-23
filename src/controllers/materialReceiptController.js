import MaterialReceipt from '../models/MaterialReceipt.js'
//import Booking from '../models/Booking.js'
//import Shop from '../models/Shop.js'

export const listMaterialReceipts = async (req, res, next) => {
  try {
    const { status, q, page = 1, limit = 25 } = req.query
    const filter = {}
    if (status) filter.status = status
    if (q) filter.$text = { $search: q }

    const receipts = await MaterialReceipt.find(filter)
      .populate('uploader', 'firstName lastName email')
      .populate('booking', 'service client')
      .populate('shop', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))

    const total = await MaterialReceipt.countDocuments(filter)

    res.status(200).json({ success: true, data: receipts, meta: { total, page: parseInt(page), limit: parseInt(limit) } })
  } catch (err) {
    next(err)
  }
}

export const getMaterialReceipt = async (req, res, next) => {
  try {
    const receipt = await MaterialReceipt.findById(req.params.id)
      .populate('uploader', 'firstName lastName email')
      .populate('booking', 'service client')
      .populate('shop', 'name')

    if (!receipt) return res.status(404).json({ success: false, error: 'Receipt not found' })

    res.status(200).json({ success: true, data: receipt })
  } catch (err) {
    next(err)
  }
}

export const verifyMaterialReceipt = async (req, res, next) => {
  try {
    const receipt = await MaterialReceipt.findById(req.params.id)
    if (!receipt) return res.status(404).json({ success: false, error: 'Receipt not found' })

    receipt.status = 'verified'
    receipt.verifiedBy = req.user._id
    receipt.verifiedAt = new Date()
    await receipt.save()

    res.status(200).json({ success: true, data: receipt })
  } catch (err) {
    next(err)
  }
}

export const rejectMaterialReceipt = async (req, res, next) => {
  try {
    const receipt = await MaterialReceipt.findById(req.params.id)
    if (!receipt) return res.status(404).json({ success: false, error: 'Receipt not found' })

    receipt.status = 'rejected'
    receipt.notes = req.body.reason || req.body.notes || receipt.notes
    await receipt.save()

    res.status(200).json({ success: true, data: receipt })
  } catch (err) {
    next(err)
  }
}
