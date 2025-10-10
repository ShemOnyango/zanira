import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../src/models/User.js'
import bcrypt from 'bcryptjs'

const [,, email, candidate] = process.argv
if (!email || !candidate) {
  console.error('Usage: node scripts/test-auth.mjs <email> <password>')
  process.exit(2)
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      console.error('User not found')
      process.exit(1)
    }
    console.log('Stored hashed password:', user.password)
    const ok = await bcrypt.compare(candidate, user.password)
    console.log('Password match:', ok)
    console.log('User role:', user.role)
    await mongoose.disconnect()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()
