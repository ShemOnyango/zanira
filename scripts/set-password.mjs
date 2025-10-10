import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../src/models/User.js'

const [,, email, newPassword] = process.argv
if (!email || !newPassword) {
  console.error('Usage: node scripts/set-password.mjs <email> <newPassword>')
  process.exit(2)
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    const user = await User.findOne({ email })
    if (!user) {
      console.error('User not found')
      process.exit(1)
    }
    user.password = newPassword
    await user.save()
    console.log('Password updated for', email)
    await mongoose.disconnect()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()
