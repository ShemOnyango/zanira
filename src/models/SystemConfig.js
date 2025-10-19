import mongoose from 'mongoose';

const SystemConfigSchema = new mongoose.Schema({
  general: { type: Object, default: {} },
  security: { type: Object, default: {} },
  notifications: { type: Object, default: {} },
  payments: { type: Object, default: {} },
  email: { type: Object, default: {} },
  database: { type: Object, default: {} },
  updatedAt: { type: Date, default: Date.now }
});

// Singleton pattern: use a fixed _id for the single config document if desired
const SystemConfig = mongoose.model('SystemConfig', SystemConfigSchema);

export default SystemConfig;
