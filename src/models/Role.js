import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  permissions: { type: [String], default: [] }
});

const Role = mongoose.model('Role', RoleSchema);
export default Role;
