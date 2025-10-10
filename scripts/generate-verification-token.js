import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import User from '../src/models/User.js';

dotenv.config({ path: process.cwd() + '/.env' });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

const run = async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const email = 'shemonyango06@gmail.com';
    const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpires');
    if (!user) {
      console.log('User not found for', email);
      return;
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashData(verificationToken);
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    console.log('New verification token generated and saved for', email);
    console.log('Raw token (clickable URL):');
    console.log(`${frontend}/verify-email?token=${verificationToken}`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
