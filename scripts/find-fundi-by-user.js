#!/usr/bin/env node
import dotenv from 'dotenv';
import connectDB from '../src/config/database.js';
import mongoose from 'mongoose';
import Fundi from '../src/models/Fundi.js';

dotenv.config();

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node scripts/find-fundi-by-user.js <userId>');
    process.exit(1);
  }

  await connectDB();
  try {
    const fundi = await Fundi.findOne({ user: userId }).select('_id operatingCounties operatingTowns user').lean();
    if (!fundi) {
      console.error('No Fundi document found for user', userId);
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('Fundi found:');
    console.log(JSON.stringify(fundi, null, 2));
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error querying Fundi:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

main();