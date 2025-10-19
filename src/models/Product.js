import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  price: { type: Number, required: true, min: 0 },
  sku: { type: String, index: true },
  images: [String],
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
  metadata: { type: Object }
}, { timestamps: true });

productSchema.index({ name: 'text', sku: 1 });

export default mongoose.model('Product', productSchema);
