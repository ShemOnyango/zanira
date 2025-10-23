// frontend/src/pages/dashboard/FundiDashboard.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Briefcase, 
  DollarSign, 
  Star, 
  TrendingUp,
  Clock,
  CheckCircle2,
  MapPin,
  Calendar,
  MessageSquare,
  Award,
  Users
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useSocket } from '../../contexts/SocketContext'
import { useApi } from '../../hooks/useApi'
import { analyticsAPI, bookingAPI, walletAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils'

export default function FundiDashboard() {
  const { user } = useAuthStore()
  const socket = useSocket()
  const [stats, setStats] = useState(null)
  const [availableJobs, setAvailableJobs] = useState([])
  const [activeBookings, setActiveBookings] = useState([])
  const [walletBalance, setWalletBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // API hooks
  const { execute: fetchStats } = useApi(analyticsAPI.getFundiStats, { showToast: false })
  const { execute: fetchAvailableJobs } = useApi(bookingAPI.getAll, { showToast: false })
  const { execute: fetchActiveBookings } = useApi(bookingAPI.getAll, { showToast: false })
  const { execute: fetchWalletBalance } = useApi(walletAPI.getBalance, { showToast: false })

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
  }, [])

  // Listen for real-time notifications (e.g. job_pushed) and refresh available jobs
  useEffect(() => {
    if (!socket) return

    const handleNewNotification = (notification) => {
      try {
        console.log('Received notification:', notification)
        if (notification && (
          notification.notificationType === 'job_available' || 
          notification.notificationType === 'job_pushed' ||
          notification.type === 'job_available' ||
          notification.notificationType === 'job_assigned'
        )) {
          console.log('Job available notification received, refreshing dashboard...')
          loadDashboardData()
        }
      } catch (e) {
        console.error('Error handling notification:', e)
      }
    }

    const handleBookingUpdate = (data) => {
      try {
        if (data && data.bookingId) {
          console.log('Booking update received:', data)
          loadDashboardData()
        }
      } catch (e) {
        console.error('Error handling booking update:', e)
      }
    }

    socket.on('notification', handleNewNotification)
    socket.on('notification:new', handleNewNotification)
    socket.on('booking:updated', handleBookingUpdate)
    socket.on('job:available', handleNewNotification)

    return () => {
      socket.off('notification', handleNewNotification)
      socket.off('notification:new', handleNewNotification)
      socket.off('booking:updated', handleBookingUpdate)
      socket.off('job:available', handleNewNotification)
    }
  }, [socket])

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch data in parallel with better error handling
      const [statsData, jobsData, bookingsData, walletData] = await Promise.allSettled([
        fetchStats(),
        fetchAvailableJobs({ 
          status: 'pending', 
          limit: 5, // Increased limit
          available: true 
        }),
        fetchActiveBookings({ 
          status: ['confirmed', 'in_progress'], 
          limit: 5 
        }),
        fetchWalletBalance()
      ]);

      // Handle stats
      if (statsData.status === 'fulfilled') {
        const normalizedStats = statsData.value?.data ?? statsData.value ?? null;
        if (normalizedStats) setStats(normalizedStats);
      }

      // Handle available jobs - with better normalization
      if (jobsData.status === 'fulfilled') {
        let normalizedJobs = [];
        const jobsResponse = jobsData.value;
        
        if (Array.isArray(jobsResponse)) {
          normalizedJobs = jobsResponse;
        } else if (jobsResponse?.data?.bookings) {
          normalizedJobs = jobsResponse.data.bookings;
        } else if (jobsResponse?.data && Array.isArray(jobsResponse.data)) {
          normalizedJobs = jobsResponse.data;
        } else if (Array.isArray(jobsResponse?.bookings)) {
          normalizedJobs = jobsResponse.bookings;
        } else if (jobsResponse?.data) {
          // If it's a single booking object, wrap in array
          normalizedJobs = [jobsResponse.data].filter(Boolean);
        }
        
        console.log('Available jobs loaded:', normalizedJobs.length);
        setAvailableJobs(normalizedJobs);
      } else {
        console.error('Failed to load available jobs:', jobsData.reason);
        setAvailableJobs([]);
      }

      // Handle active bookings
      if (bookingsData.status === 'fulfilled') {
        const normalizedBookings = bookingsData.value?.data?.bookings ?? 
                                bookingsData.value?.bookings ?? 
                                bookingsData.value ?? [];
        setActiveBookings(Array.isArray(normalizedBookings) ? normalizedBookings : []);
      }

      // Handle wallet balance
      if (walletData.status === 'fulfilled') {
        const walletResponse = walletData.value;
        const balance = walletResponse?.data?.balance ?? 
                      walletResponse?.balance ?? 
                      walletResponse?.data?.wallet?.balance ?? null;
        setWalletBalance(balance);
      }

    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Quick stats cards
  const quickStats = [
    {
      label: 'Active Jobs',
      value: stats?.activeJobs || 0,
      icon: Briefcase,
      color: 'from-primary-500 to-primary-600',
      change: '+2 this week'
    },
    {
      label: 'Total Earnings',
      value: formatCurrency(stats?.totalEarnings || 0),
      icon: DollarSign,
      color: 'from-teal-500 to-teal-600',
      change: 'KES 45K this month'
    },
    {
      label: 'Rating',
      value: stats?.averageRating ? stats.averageRating.toFixed(1) : '0.0',
      icon: Star,
      color: 'from-gold-500 to-gold-600',
      change: 'Based on 47 reviews'
    },
    {
      label: 'Completion Rate',
      value: stats?.completionRate ? `${stats.completionRate}%` : '0%',
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      change: '98% on-time delivery'
    }
  ]

  // Performance metrics
  const performanceMetrics = [
    { label: 'Response Time', value: '15 min', trend: 'positive' },
    { label: 'Job Acceptance', value: '92%', trend: 'positive' },
    { label: 'Client Satisfaction', value: '4.8/5', trend: 'positive' },
    { label: 'Repeat Clients', value: '67%', trend: 'neutral' }
  ]

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
            Track your jobs, earnings, and performance
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
            {/* Available Jobs */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 font-heading">Available Jobs {availableJobs.length > 0 && `(${availableJobs.length})`}</h2>
                <Link
                  to="/bookings?status=pending"
                  className="text-teal-600 hover:text-teal-700 font-medium text-sm"
                >
                  View All
                </Link>
              </div>
              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
                  <p>Debug: Found {availableJobs.length} available jobs</p>
                  <p>User: {user?.firstName} (Fundi)</p>
                </div>
              )}

              {availableJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No available jobs at the moment</p>
                  <p className="text-gray-400 text-sm">New jobs will appear here when clients book services matching your skills</p>
                  <button 
                    onClick={loadDashboardData}
                    className="mt-4 text-teal-600 hover:text-teal-700 text-sm font-medium"
                  >
                    Refresh Jobs
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableJobs.map((job) => (
                    <div
                      key={job._id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {job.service?.name}
                          </h3>
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                            URGENT
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{job.location.town}, {job.location.county}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(job.scheduledDate)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-teal-600">
                            {formatCurrency(job.totalAmount)}
                          </span>
                          <div className="flex items-center space-x-2">
                            <Link
                              to={`/bookings/${job._id}`}
                              className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                            >
                              View Details
                            </Link>
                            <button className="bg-teal-500 text-white px-3 py-1 rounded text-sm hover:bg-teal-600 transition-colors">
                              Accept Job
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Jobs */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 font-heading">Active Jobs</h2>
                <Link
                  to="/bookings"
                  className="text-teal-600 hover:text-teal-700 font-medium text-sm"
                >
                  View All
                </Link>
              </div>

              {activeBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No active jobs</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeBookings.map((booking) => (
                    <div
                      key={booking._id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          booking.status === 'in_progress' ? 'bg-purple-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {booking.service?.name}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <span>{booking.client?.firstName} {booking.client?.lastName}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{booking.location.town}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">
                          {formatDate(booking.scheduledDate)}
                        </span>
                        <Link
                          to={`/bookings/${booking._id}`}
                          className="text-teal-600 hover:text-teal-700 font-medium text-sm"
                        >
                          Manage
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
            {/* Wallet & Earnings */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <h2 className="text-2xl font-bold text-gray-900 font-heading mb-6">Earnings</h2>
              
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
                        {formatCurrency(stats?.weeklyEarnings || 0)}
                      </div>
                      <div className="text-gray-600">This Week</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(stats?.monthlyEarnings || 0)}
                      </div>
                      <div className="text-gray-600">This Month</div>
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
                      to="/wallet?action=withdraw"
                      className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-center block text-sm"
                    >
                      Withdraw Funds
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Wallet not set up</p>
                  <Link
                    to="/wallet"
                    className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors text-sm"
                  >
                    Set Up Wallet
                  </Link>
                </div>
              )}
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <h2 className="text-2xl font-bold text-gray-900 font-heading mb-6">Performance</h2>
              
              <div className="space-y-4">
                {performanceMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">{metric.label}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900">{metric.value}</span>
                      {metric.trend === 'positive' && (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <Link
                  to="/profile?tab=performance"
                  className="flex items-center space-x-2 text-teal-600 hover:text-teal-700 text-sm"
                >
                  <Award className="w-4 h-4" />
                  <span>View Detailed Analytics</span>
                </Link>
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <h2 className="text-2xl font-bold text-gray-900 font-heading mb-6">Today's Schedule</h2>
              
              {activeBookings.filter(b => 
                b.scheduledDate === new Date().toISOString().split('T')[0]
              ).length === 0 ? (
                <div className="text-center py-4">
                  <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No jobs scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeBookings
                    .filter(booking => booking.scheduledDate === new Date().toISOString().split('T')[0])
                    .map((booking) => (
                      <div key={booking._id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                        <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {booking.service?.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {booking.scheduledTime} • {booking.location.town}
                          </p>
                        </div>
                        <Link
                          to={`/bookings/${booking._id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Start
                        </Link>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <h2 className="text-2xl font-bold text-gray-900 font-heading mb-6">Quick Actions</h2>
              
              <div className="space-y-3">
                <Link
                  to="/profile?tab=availability"
                  className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Set Availability</span>
                </Link>

                <Link
                  to="/messages"
                  className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Check Messages</span>
                </Link>

                <Link
                  to="/profile?tab=portfolio"
                  className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Award className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Update Portfolio</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}