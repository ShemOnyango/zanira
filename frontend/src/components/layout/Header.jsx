import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, User, LogOut, Bell, MessageSquare, Wallet, LayoutDashboard, Building2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { authAPI } from '../../lib/api'
import toast from 'react-hot-toast'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const { isAuthenticated, user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    try {
      await authAPI.logout()
      logout()
      toast.success('Logged out successfully')
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
      logout()
      navigate('/')
    }
  }

  const navLinks = [
    { name: 'Services', path: '/services' },
    { name: 'How it Works', path: '/how-it-works' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-soft'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="bg-gradient-to-br from-teal-500 to-primary-600 p-2 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold font-heading bg-gradient-to-r from-teal-700 to-primary-700 bg-clip-text text-transparent">
                ZANIRA
              </span>
              <div className="text-xs font-semibold text-gold-600 tracking-wider">
                BUILDLINK
              </div>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(link.path)
                    ? 'text-teal-600 bg-teal-50'
                    : scrolled
                    ? 'text-gray-700 hover:text-teal-600 hover:bg-teal-50'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/messages"
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    scrolled
                      ? 'text-gray-700 hover:text-teal-600 hover:bg-teal-50'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                </Link>
                <Link
                  to="/notifications"
                  className={`p-2 rounded-lg transition-all duration-200 relative ${
                    scrolled
                      ? 'text-gray-700 hover:text-teal-600 hover:bg-teal-50'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      scrolled
                        ? 'text-gray-700 hover:bg-teal-50'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {user?.profilePhoto ? (
                      <img
                        src={user.profilePhoto}
                        alt={user.firstName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-primary-500 flex items-center justify-center text-white font-semibold text-sm">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                    )}
                    <span className="text-sm font-medium hidden lg:inline">
                      {user?.firstName}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-soft-lg border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
                        <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-teal-100 text-teal-700 rounded-full">
                          {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                        </span>
                      </div>

                      <Link
                        to="/dashboard"
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Dashboard</span>
                      </Link>

                      <Link
                        to="/profile"
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>

                      <Link
                        to="/wallet"
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Wallet className="w-4 h-4" />
                        <span>Wallet</span>
                      </Link>

                      <hr className="my-2" />

                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    scrolled
                      ? 'text-gray-700 hover:text-teal-600'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-teal-500 to-primary-600 text-white hover:from-teal-600 hover:to-primary-700 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden p-2 rounded-lg ${
              scrolled ? 'text-gray-700' : 'text-white'
            }`}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 bg-white/95 backdrop-blur-md">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    isActive(link.path)
                      ? 'text-teal-600 bg-teal-50'
                      : 'text-gray-700 hover:text-teal-600 hover:bg-teal-50'
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              {isAuthenticated ? (
                <>
                  <hr className="my-2" />
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-teal-600"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-teal-600"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsOpen(false)
                    }}
                    className="px-4 py-2 text-sm font-medium text-red-600 text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <hr className="my-2" />
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-primary-600 rounded-lg"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
