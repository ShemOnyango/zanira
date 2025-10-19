import mongoose from 'mongoose'

const MaterialReceiptSchema = new mongoose.Schema({
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'KES' },
  files: [{ type: String }],
  status: { type: String, enum: ['pending','verified','rejected'], default: 'pending' },
  notes: { type: String },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date }
}, { timestamps: true })

export default mongoose.model('MaterialReceipt', MaterialReceiptSchema)
