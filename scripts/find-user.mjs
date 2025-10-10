import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../src/models/User.js'
import Admin from '../src/models/Admin.js'

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/find-user.mjs <email>')
  process.exit(2)
}

async function main() {
  try {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error('MONGODB_URI not set in .env')
    }
    await mongoose.connect(uri, { dbName: new URL(uri).searchParams.get('appName') || undefined })
    console.log('Connected to MongoDB')

    const user = await User.findOne({ email }).lean()
    console.log('User:', user)

    if (user) {
      const admin = await Admin.findOne({ user: user._id }).lean()
      console.log('Admin profile:', admin)
    }

    await mongoose.disconnect()
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

main()
