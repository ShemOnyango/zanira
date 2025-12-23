#!/usr/bin/env node
import dotenv from 'dotenv';
import connectDB from '../src/config/database.js';
import mongoose from 'mongoose';
import Fundi from '../src/models/Fundi.js';
import User from '../src/models/User.js';
import Verification from '../src/models/Verification.js';

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { _raw: args };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

async function main() {
  const argv = parseArgs();
  const fundiId = argv._raw && argv._raw[0] ? argv._raw[0] : null;

  if (!fundiId) {
    console.error('Usage: node scripts/update-fundi-profile.js <fundiId> [--counties "County1,County2"] [--towns "Town1,Town2"] [--lat <latitude>] [--lng <longitude>] [--county <county>] [--town <town>]');
    process.exit(1);
  }

  await connectDB();

  try {
    const fundi = await Fundi.findById(fundiId).populate('user');
    if (!fundi) {
      console.error(`Fundi not found for id ${fundiId}`);
      process.exit(1);
    }

    const user = await User.findById(fundi.user._id);

    // Sync verification status from Verification collection if present
    const verification = await Verification.findOne({ applicant: user._id, applicantType: 'fundi' }).sort({ updatedAt: -1 });
    if (verification) {
      // Map verification.status -> fundi.verification.overallStatus
      if (verification.status === 'approved' || verification.status === 'under_review' || verification.status === 'submitted') {
        fundi.verification = fundi.verification || {};
        if (verification.status === 'approved') fundi.verification.overallStatus = 'verified';
        else if (verification.status === 'submitted' || verification.status === 'under_review') fundi.verification.overallStatus = 'pending';
        else if (verification.status === 'rejected') fundi.verification.overallStatus = 'rejected';
        fundi.verification.verificationDate = verification.completionDate || verification.updatedAt || new Date();
      }
    }

    // Apply counties and towns if provided
    if (argv.counties) {
      const arr = String(argv.counties).split(',').map(s => s.trim()).filter(Boolean);
      fundi.operatingCounties = arr;
      console.log('Set operatingCounties ->', arr);
    }

    if (argv.towns) {
      const arr = String(argv.towns).split(',').map(s => s.trim()).filter(Boolean);
      fundi.operatingTowns = arr;
      console.log('Set operatingTowns ->', arr);
    }

    // Update user profile county/town
    let userUpdated = false;
    if (argv.county) {
      user.county = argv.county;
      userUpdated = true;
      console.log('Set user.county ->', argv.county);
    }
    if (argv.town) {
      user.town = argv.town;
      userUpdated = true;
      console.log('Set user.town ->', argv.town);
    }

    // Update coordinates
    if (argv.lat && argv.lng) {
      const lat = parseFloat(argv.lat);
      const lng = parseFloat(argv.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        user.coordinates = { latitude: lat, longitude: lng };
        userUpdated = true;
        console.log('Set user.coordinates ->', user.coordinates);
      }
    }

    // Optional: set servicesOffered from a simple CSV format: serviceId:basePrice;serviceId2:basePrice2
    if (argv.services) {
      const svcStr = String(argv.services);
      const items = svcStr.split(';').map(s => s.trim()).filter(Boolean);
      const servicesOffered = items.map(it => {
        const [serviceId, basePrice] = it.split(':').map(x => x.trim());
        return { service: mongoose.Types.ObjectId(serviceId), basePrice: basePrice ? parseFloat(basePrice) : 0 };
      });
      fundi.servicesOffered = servicesOffered;
      console.log('Set servicesOffered ->', servicesOffered);
    }

    await fundi.save();
    if (userUpdated) await user.save();

    console.log('Fundi profile updated successfully');
    console.log('Fundi:', {
      id: fundi._id.toString(),
      operatingCounties: fundi.operatingCounties,
      operatingTowns: fundi.operatingTowns,
      verification: fundi.verification
    });

    if (userUpdated) {
      console.log('User updated:', { id: user._id.toString(), county: user.county, town: user.town, coordinates: user.coordinates });
    }

    // Close DB
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error updating fundi profile:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

main();
