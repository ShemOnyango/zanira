import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../src/models/User.js'
import Admin from '../src/models/Admin.js'

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    const regex = process.argv[2] || 'onyango'
    const users = await User.find({
      $or: [
        { email: { $regex: regex, $options: 'i' } },
        { phone: { $regex: regex, $options: 'i' } }
      ]
    }).lean()

    console.log('Users matching', regex, users)

    const admins = await Admin.find().lean()
    console.log('Total admins:', admins.length)
    for (const a of admins) {
      const u = await User.findById(a.user).lean()
      console.log('Admin:', a, 'User:', u?.email)
    }

    await mongoose.disconnect()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()
