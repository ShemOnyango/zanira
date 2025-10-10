#!/usr/bin/env node
import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set. Aborting.');
  process.exit(1);
}

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  try {
    const collections = await db.listCollections().toArray();

    for (const c of collections) {
      const name = c.name;
      try {
        const indexes = await db.collection(name).indexes();
        if (!indexes || !indexes.length) continue;

        // Fetch a sample document to inspect field types
        const sample = await db.collection(name).findOne() || {};

        for (const idx of indexes) {
          // skip _id index
          if (idx.name === '_id_') continue;

          const keyPaths = Object.keys(idx.key || {});
          if (keyPaths.length < 2) continue; // single-field indexes are fine

          // Count how many indexed paths point to array values in the sample doc
          let arrayCount = 0;
          for (const path of keyPaths) {
            const parts = path.split('.');
            let cursor = sample;
            for (const p of parts) {
              if (cursor == null) break;
              cursor = cursor[p];
            }
            if (Array.isArray(cursor)) arrayCount += 1;
          }

          if (arrayCount > 1) {
            console.warn(`Collection ${name} index ${idx.name} appears to index ${arrayCount} array fields. Dropping index.`);
            try {
              await db.collection(name).dropIndex(idx.name);
              console.info(`Dropped index ${idx.name} on ${name}`);
            } catch (dropErr) {
              console.error(`Failed to drop index ${idx.name} on ${name}:`, dropErr.message);
            }
          }
        }
      } catch (err) {
        console.error(`Error processing collection ${name}:`, err.message);
      }
    }

    console.log('Index reconciliation complete');
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(err => { console.error(err); process.exit(1) });
