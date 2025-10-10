import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config({ path: process.cwd() + '/.env' });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const email = 'shemonyango06@gmail.com';
    const user = await User.findOne({ email }).select('email emailVerificationToken emailVerificationExpires isEmailVerified');
    if (!user) {
      console.log('User not found for', email);
    } else {
      console.log('User:', {
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        emailVerificationToken: user.emailVerificationToken,
        emailVerificationExpires: user.emailVerificationExpires,
      });
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
