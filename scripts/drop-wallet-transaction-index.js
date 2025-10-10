import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not set in environment. Please set it in .env before running this script.');
  process.exit(1);
}

(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = mongoose.connection.db;
    const coll = db.collection('wallets');

    const indexes = await coll.indexes();
    console.log('Current indexes on wallets:', indexes.map(i => ({ name: i.name, key: i.key })));

    const target = indexes.find(i => i.key && i.key['transactions.transactionId'] === 1);
    if (!target) {
      console.log('No index found for transactions.transactionId. Nothing to drop.');
    } else {
      console.log('Found index:', target.name, 'dropping it...');
      await coll.dropIndex(target.name);
      console.log('Index dropped successfully.');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error while dropping index:', err);
    try { await mongoose.disconnect(); } catch(e){}
    process.exit(1);
  }
})();
