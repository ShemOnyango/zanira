import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, User, Phone, MapPin, Eye, EyeOff, UserPlus } from 'lucide-react'
import { authAPI } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const counties = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale',
  'Garissa', 'Kakamega', 'Meru', 'Nyeri', 'Machakos', 'Kiambu', 'Kajiado', 'Naivasha'
]

export default function Register() {
  const [searchParams] = useSearchParams()
  const initialRole = searchParams.get('role') || 'client'

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    role: initialRole,
    county: '',
    town: '',
    terms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Client-side name validation to match server rules: letters, spaces and hyphens only, 2-50 chars
    const nameRe = /^[A-Za-z\- ]{2,50}$/
    if (!nameRe.test(formData.firstName)) {
      toast.error('First name must be 2-50 letters and may include spaces or hyphens')
      return
    }

    if (!nameRe.test(formData.lastName)) {
      toast.error('Last name must be 2-50 letters and may include spaces or hyphens')
      return
    }

    // Enforce phone pattern used on server: +2541XXXXXXXX or +2547XXXXXXXX
    const phoneRe = /^\+254[17]\d{8}$/
    if (!phoneRe.test(formData.phone)) {
      toast.error('Please provide a valid Kenyan phone number (e.g. +254712345678)')
      return
    }

    if (!formData.terms) {
      toast.error('You must accept the Terms of Service')
      return
    }

    if (formData.password !== formData.passwordConfirm) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (!formData.phone.startsWith('+254')) {
      toast.error('Phone number must start with +254')
      return
    }

    setLoading(true)

    try {
    // send full formData so server validation (passwordConfirm) receives the field
    const registerData = formData
    const { data } = await authAPI.register(registerData)
      console.debug('Register response:', data)
      setAuth(data.user, data.token, data.refreshToken)
      // Ensure we have a full user profile
      try {
        const { data: meData } = await (await import('../../lib/api')).authAPI.getMe()
        if (meData?.user) {
          useAuthStore.getState().setAuth(meData.user, data.token, data.refreshToken)
        }
      } catch (err) {
        console.debug('Failed to fetch /auth/me after register:', err)
      }
      toast.success('Account created successfully!')
      navigate('/dashboard')
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-soft-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 font-heading">Create Your Account</h2>
            <p className="mt-2 text-gray-600">
              Join as a {formData.role === 'client' ? 'Client' : 'Fundi'}
            </p>
          </div>

          <div className="flex gap-4 mb-8">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'client' })}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                formData.role === 'client'
                  ? 'bg-gradient-to-r from-teal-500 to-primary-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              I need a Fundi
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'fundi' })}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                formData.role === 'fundi'
                  ? 'bg-gradient-to-r from-teal-500 to-primary-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              I am a Fundi
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                    placeholder="John"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                  placeholder="+254712345678"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Format: +254XXXXXXXXX</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="county" className="block text-sm font-medium text-gray-700 mb-2">
                  County
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    id="county"
                    name="county"
                    required
                    value={formData.county}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 appearance-none"
                  >
                    <option value="">Select County</option>
                    {counties.map((county) => (
                      <option key={county} value={county}>
                        {county}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="town" className="block text-sm font-medium text-gray-700 mb-2">
                  Town
                </label>
                <input
                  id="town"
                  name="town"
                  type="text"
                  required
                  value={formData.town}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter town"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.passwordConfirm}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                checked={formData.terms}
                onChange={handleChange}
                className="h-4 w-4 mt-1 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                I agree to the{' '}
                <Link to="/terms" className="text-teal-600 hover:text-teal-500 font-medium">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-teal-600 hover:text-teal-500 font-medium">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-primary-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-teal-600 hover:text-teal-500">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
