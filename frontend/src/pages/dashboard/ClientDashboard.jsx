// frontend/src/pages/dashboard/ClientDashboard.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  DollarSign,
  Star,
  Calendar,
  MapPin,
  AlertCircle,
  MessageSquare,
  Download
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useApi } from '../../hooks/useApi'
import { bookingAPI, analyticsAPI, walletAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils'

export default function ClientDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [recentBookings, setRecentBookings] = useState([])
  const [walletBalance, setWalletBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // API hooks
  const { execute: fetchStats } = useApi(analyticsAPI.getClientStats, { showToast: false })
  const { execute: fetchRecentBookings } = useApi(bookingAPI.getAll, { showToast: false })
  const { execute: fetchWalletBalance } = useApi(walletAPI.getBalance, { showToast: false })

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch data in parallel
      const [statsData, bookingsDataResp, walletData] = await Promise.all([
        fetchStats(),
        fetchRecentBookings({ limit: 5, sort: '-createdAt' }),
        fetchWalletBalance()
      ])

      // Normalize bookings response to always be an array
      let bookingsArray = []
      if (bookingsDataResp) {
        // If hook returned axios response.data shape
        if (Array.isArray(bookingsDataResp)) {
          bookingsArray = bookingsDataResp
        } else if (bookingsDataResp.data && Array.isArray(bookingsDataResp.data.bookings)) {
          bookingsArray = bookingsDataResp.data.bookings
        } else if (Array.isArray(bookingsDataResp.bookings)) {
          bookingsArray = bookingsDataResp.bookings
        } else if (bookingsDataResp.data && Array.isArray(bookingsDataResp.data)) {
          bookingsArray = bookingsDataResp.data
        } else {
          // Fallback: try to find array value anywhere on the object
          const maybeArray = Object.values(bookingsDataResp).find(v => Array.isArray(v))
          if (Array.isArray(maybeArray)) bookingsArray = maybeArray
        }
      }

      if (statsData) setStats(statsData)
      setRecentBookings(bookingsArray)
      if (walletData) setWalletBalance(walletData)

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Quick stats cards
  const quickStats = [
    {
      label: 'Active Bookings',
      value: stats?.activeBookings || 0,
      icon: Clock,
      color: 'from-primary-500 to-primary-600',
      change: '+2 from last week'
    },
    {
      label: 'Completed',
      value: stats?.completedBookings || 0,
      icon: CheckCircle2,
      color: 'from-teal-500 to-teal-600',
      change: '+5 this month'
    },
    {
      label: 'Total Spent',
      value: formatCurrency(stats?.totalSpent || 0),
      icon: DollarSign,
      color: 'from-gold-500 to-gold-600',
      change: 'KES 12,500 this month'
    },
    {
      label: 'Avg Rating',
      value: stats?.averageRating ? stats.averageRating.toFixed(1) : '0.0',
      icon: Star,
      color: 'from-green-500 to-green-600',
      change: 'Based on 23 reviews'
    }
  ]

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20 flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <ErrorMessage message={error} onRetry={loadDashboardData} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 font-heading">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your bookings today
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-soft">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600 mb-2">{stat.label}</div>
                <div className="text-xs text-gray-500 flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>{stat.change}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 font-heading">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  to="/bookings/new"
                  className="flex items-center space-x-3 p-4 bg-gradient-to-r from-teal-500 to-primary-600 text-white rounded-xl hover:shadow-lg transition-all group"
                >
                  <Plus className="w-6 h-6" />
                  <div>
                    <span className="font-semibold">New Booking</span>
                    <p className="text-teal-100 text-sm">Book a new service</p>
                  </div>
                </Link>

                <Link
                  to="/bookings"
                  className="flex items-center space-x-3 p-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all group"
                >
                  <Clock className="w-6 h-6" />
                  <div>
                    <span className="font-semibold">View Bookings</span>
                    <p className="text-gray-600 text-sm">Manage all bookings</p>
                  </div>
                </Link>

                <Link
                  to="/messages"
                  className="flex items-center space-x-3 p-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all group"
                >
                  <MessageSquare className="w-6 h-6" />
                  <div>
                    <span className="font-semibold">Messages</span>
                    <p className="text-gray-600 text-sm">Chat with fundis</p>
                  </div>
                </Link>

                <Link
                  to="/wallet"
                  className="flex items-center space-x-3 p-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all group"
                >
                  <DollarSign className="w-6 h-6" />
                  <div>
                    <span className="font-semibold">Wallet</span>
                    <p className="text-gray-600 text-sm">
                      {walletBalance ? formatCurrency(walletBalance.available) : 'KES 0'}
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 font-heading">Recent Bookings</h2>
                <Link
                  to="/bookings"
                  className="text-teal-600 hover:text-teal-700 font-medium text-sm"
                >
                  View All
                </Link>
              </div>

              {recentBookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No bookings yet</p>
                  <Link
                    to="/bookings/new"
                    className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors inline-flex items-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create Your First Booking</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking._id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          booking.status === 'completed' ? 'bg-green-500' :
                          booking.status === 'in_progress' ? 'bg-purple-500' :
                          booking.status === 'confirmed' ? 'bg-blue-500' :
                          'bg-yellow-500'
                        }`} />
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {booking.service?.name}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(booking.scheduledDate)}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{booking.location.town}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <Link
                          to={`/bookings/${booking._id}`}
                          className="text-teal-600 hover:text-teal-700 font-medium text-sm"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Wallet Summary */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <h2 className="text-2xl font-bold text-gray-900 font-heading mb-6">Wallet Summary</h2>
              
              {walletBalance ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {formatCurrency(walletBalance.available)}
                    </div>
                    <p className="text-gray-600">Available Balance</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(walletBalance.pending || 0)}
                      </div>
                      <div className="text-gray-600">Pending</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(walletBalance.locked || 0)}
                      </div>
                      <div className="text-gray-600">Locked</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link
                      to="/wallet"
                      className="w-full bg-teal-500 text-white py-2 px-4 rounded-lg hover:bg-teal-600 transition-colors text-center block"
                    >
                      Manage Wallet
                    </Link>
                    <Link
                      to="/wallet?action=topup"
                      className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-center block text-sm"
                    >
                      Add Funds
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No wallet activity yet</p>
                  <Link
                    to="/wallet"
                    className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors text-sm"
                  >
                    Set Up Wallet
                  </Link>
                </div>
              )}
            </div>

            {/* Upcoming Bookings */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <h2 className="text-2xl font-bold text-gray-900 font-heading mb-6">Upcoming</h2>
              
              {recentBookings.filter(b => ['confirmed', 'in_progress'].includes(b.status)).length === 0 ? (
                <div className="text-center py-4">
                  <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No upcoming bookings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBookings
                    .filter(booking => ['confirmed', 'in_progress'].includes(booking.status))
                    .slice(0, 3)
                    .map((booking) => (
                      <div key={booking._id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                        <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {booking.service?.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatDate(booking.scheduledDate)} at {booking.scheduledTime}
                          </p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Quick Stats Chart */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <h2 className="text-2xl font-bold text-gray-900 font-heading mb-6">Monthly Overview</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Bookings Completed</span>
                  <span className="font-semibold">{stats?.monthlyCompleted || 0}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total Spent</span>
                  <span className="font-semibold">{formatCurrency(stats?.monthlySpent || 0)}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Active Fundis</span>
                  <span className="font-semibold">{stats?.activeFundis || 0}</span>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <Link
                    to="/bookings?export=pdf"
                    className="flex items-center space-x-2 text-teal-600 hover:text-teal-700 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Monthly Report</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}