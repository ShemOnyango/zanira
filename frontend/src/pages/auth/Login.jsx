import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import { authAPI } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth, syncWithLocalStorage, isAuthenticated } = useAuthStore()

  const from = location.state?.from?.pathname || '/dashboard'

  // Check if we're already logged in
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const user = localStorage.getItem('user')
    
    if (token && user) {
      console.log('Already logged in, syncing store...')
      const syncSuccess = syncWithLocalStorage()
      if (syncSuccess && isAuthenticated) {
        console.log('Sync successful, redirecting...')
        navigate(from, { replace: true })
      }
    }
  }, [navigate, from, syncWithLocalStorage, isAuthenticated])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Sending login request...', formData)
      const response = await authAPI.login(formData)
      console.log('Full login response:', response)
      console.log('Response data:', response.data)

      // Server uses envelope { success, message, data: { user, token, refreshToken } }
      const payload = response.data?.data || response.data || {}
      const user = payload.user || null
      const token = payload.token || null
      const refreshToken = payload.refreshToken || payload.refresh || null

      console.log('Extracted data:', { hasUser: !!user, hasToken: !!token, hasRefresh: !!refreshToken })

      // Use setAuth which updates both Zustand and localStorage
      if (!user || !token) {
        console.error('Login response missing user or token:', payload)
        toast.error('Login failed: missing credentials from server response')
        return
      }

      setAuth(user, token, refreshToken)
      
      // Debug: Check what was actually stored
      console.log('After setAuth - localStorage:', {
        accessToken: localStorage.getItem('accessToken'),
        user: localStorage.getItem('user')
      })

      // Check auth store state
      const authState = useAuthStore.getState()
      console.log('Auth store after setAuth:', {
        user: authState.user,
        token: !!authState.token,
        isAuthenticated: authState.isAuthenticated
      })
      
      // Try to fetch full profile (populated shopProfile) so we can make
      // a routing decision for shop owners who haven't created a shop yet.
      try {
        const { data: meResp } = await authAPI.getMe()
        const meUser = meResp?.data?.user || null
        if (meUser) {
          // update state with fresh profile
          useAuthStore.getState().setAuth(meUser, token, refreshToken)

          // If it's a shop_owner with no shopProfile, send them to create shop
          const urlParams = new URLSearchParams(location.search)
          const nextParam = urlParams.get('next')

          if (meUser.role === 'shop_owner' && !meUser.shopProfile) {
            toast.success('Welcome! Please complete your shop profile')
            navigate(nextParam || '/shops/create', { replace: true })
            return
          }
        }
      } catch (err) {
        console.debug('Failed to fetch /auth/me after login:', err)
      }

      toast.success('Welcome back!')
      console.log('Navigating to:', from)
      navigate(from, { replace: true })
    } catch (error) {
      console.error('Login error:', error)
      console.error('Error response:', error.response)
      toast.error(error.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-soft-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 font-heading">Welcome Back</h2>
            <p className="mt-2 text-gray-600">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  autoComplete="email"
                />
              </div>
            </div>

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
                  autoComplete="current-password" // Fix for the DOM warning
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

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <Link
                to="/forgot-password"
                className="text-sm font-medium text-teal-600 hover:text-teal-500"
              >
                Forgot password?
              </Link>
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
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-teal-600 hover:text-teal-500">
                Sign up
              </Link>
            </p>
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Join as:</p>
              <div className="flex gap-2 justify-center">
                <Link
                  to="/register?role=client"
                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Client
                </Link>
                <Link
                  to="/register?role=fundi"
                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Fundi
                </Link>
                <Link
                  to="/register?role=shop_owner"
                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Shop Owner
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}