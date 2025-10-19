import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  template: { type: String },
  params: { type: Object, default: {} },
  status: { type: String, enum: ['pending', 'processing', 'ready', 'failed'], default: 'pending' },
  resultUrl: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const Report = mongoose.model('Report', ReportSchema);

export default Report;
