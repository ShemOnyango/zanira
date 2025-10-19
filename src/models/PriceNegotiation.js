import mongoose from 'mongoose'

const PriceNegotiationSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalPrice: { type: Number, required: true },
  proposedPrice: { type: Number, required: true },
  reason: { type: String },
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  handledAt: { type: Date }
}, { timestamps: true })

export default mongoose.model('PriceNegotiation', PriceNegotiationSchema)
