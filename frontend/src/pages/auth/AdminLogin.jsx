import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react'
import { authAPI } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export default function AdminLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth, syncWithLocalStorage, isAuthenticated } = useAuthStore()

  const from = location.state?.from?.pathname || '/dashboard' // Redirect to main dashboard route

  // Check if we're already logged in
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const user = localStorage.getItem('user')
    
    if (token && user) {
      console.log('Already logged in, syncing store...')
      const syncSuccess = syncWithLocalStorage()
      if (syncSuccess && isAuthenticated) {
        console.log('Sync successful, redirecting to admin...')
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
      console.log('Sending admin login request...', formData)
      const response = await authAPI.adminLogin(formData)
      console.log('Full admin login response:', response)
      console.log('Response data:', response.data)

      // Use the same response structure as Login.jsx
      const payload = response.data?.data || response.data || {}
      const user = payload.user || null
      const token = payload.token || null
      const refreshToken = payload.refreshToken || payload.refresh || null

      console.log('Extracted admin data:', { hasUser: !!user, hasToken: !!token, hasRefresh: !!refreshToken })

      if (!user || !token) {
        console.error('Admin login response missing user or token:', payload)
        toast.error('Admin login failed: missing credentials from server response')
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
      
      toast.success('Welcome back, Admin!')
      console.log('Navigating to:', from)
      navigate(from, { replace: true })
    } catch (error) {
      console.error('Admin login error:', error)
      console.error('Error response:', error.response)
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Admin login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-600 rounded-full">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white font-heading">Admin Access</h2>
            <p className="mt-2 text-slate-400">Secure Administrator Login</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  placeholder="admin@zanira.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 bg-slate-700 border border-slate-600 text-white rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>Access Admin Panel</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Restricted access only. Unauthorized access is prohibited.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}