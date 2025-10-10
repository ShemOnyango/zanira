// frontend/src/pages/dashboard/AdminDashboard.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Shield,
  BarChart3,
  Download,
  Clock
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { analyticsAPI, adminAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [pendingVerifications, setPendingVerifications] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // API hooks
  const { execute: fetchStats } = useApi(analyticsAPI.getDashboard, { showToast: false })
  const { execute: fetchPendingVerifications } = useApi(adminAPI.getPendingVerifications, { showToast: false })
  const { execute: fetchRecentActivities } = useApi(adminAPI.getRecentActivities, { showToast: false })

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch data in parallel
      const [statsData, verificationsData, activitiesData] = await Promise.all([
        fetchStats(),
        fetchPendingVerifications(),
        fetchRecentActivities({ limit: 10 })
      ])

      if (statsData) setStats(statsData)

      if (verificationsData) {
        // Backend returns { success, data: { verifications: [], pagination: {...} } }
        if (Array.isArray(verificationsData)) {
          setPendingVerifications(verificationsData)
        } else if (verificationsData?.data) {
          setPendingVerifications(verificationsData.data.verifications || [])
        } else {
          setPendingVerifications([])
        }
      }
      if (activitiesData) {
        // Normalize backend response into an array the UI expects.
        // Backend returns { success, data: { bookings: [], payments: [], verifications: [] } }
        let activitiesList = []

        // If backend already returned an array, use it directly.
        if (Array.isArray(activitiesData)) {
          activitiesList = activitiesData
        } else if (activitiesData?.data) {
          const d = activitiesData.data

          // If data is already an array
          if (Array.isArray(d)) {
            activitiesList = d
          } else {
            const bookings = d.bookings || []
            const payments = d.payments || []
            const verifications = d.verifications || []

            // Map each type into a unified activity shape expected by the UI
            const mappedBookings = bookings.map((b) => ({
              type: 'info',
              description: `Booking ${b.service || ''}`.trim(),
              user: {
                name: b.client?.firstName ? `${b.client.firstName} ${b.client.lastName || ''}`.trim() : (b.client || '')
              },
              timestamp: b.createdAt || b.created_at || b.createdAt,
              action: b.status || 'booking'
            }))

            const mappedPayments = payments.map((p) => ({
              type: 'success',
              description: `Payment ${formatCurrency(p.amount || p.platformFee || 0)}`,
              user: {
                name: p.client?.firstName ? `${p.client.firstName} ${p.client.lastName || ''}`.trim() : (p.client || '')
              },
              timestamp: p.createdAt || p.created_at,
              action: p.status || 'payment'
            }))

            const mappedVerifications = verifications.map((v) => ({
              type: v.status === 'approved' ? 'success' : (v.status === 'rejected' ? 'error' : 'warning'),
              description: `${v.applicantType || 'User'} verification ${v.status || ''}`.trim(),
              user: {
                name: v.applicant?.firstName ? `${v.applicant.firstName} ${v.applicant.lastName || ''}`.trim() : (v.applicant || '')
              },
              timestamp: v.createdAt || v.created_at,
              action: v.status || 'verification'
            }))

            activitiesList = [...mappedPayments, ...mappedBookings, ...mappedVerifications]

            // Sort by timestamp desc
            activitiesList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          }
        }

        setRecentActivities(activitiesList)
      }

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Platform stats cards
  const platformStats = [
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'from-primary-500 to-primary-600',
      change: '+124 this month',
      trend: 'up'
    },
    {
      label: 'Active Bookings',
      value: stats?.activeBookings || 0,
      icon: Briefcase,
      color: 'from-teal-500 to-teal-600',
      change: '+45 today',
      trend: 'up'
    },
    {
      label: 'Platform Revenue',
      value: formatCurrency(stats?.platformRevenue || 0),
      icon: DollarSign,
      color: 'from-gold-500 to-gold-600',
      change: 'KES 2.5M this month',
      trend: 'up'
    },
    {
      label: 'Growth Rate',
      value: `${stats?.growthRate || 0}%`,
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      change: '+12% from last month',
      trend: 'up'
    }
  ]

  // Quick metrics
  const quickMetrics = [
    { label: 'Pending Verifications', value: pendingVerifications.length, color: 'text-yellow-600' },
    { label: 'Active Disputes', value: stats?.activeDisputes || 0, color: 'text-red-600' },
    { label: 'Completed Today', value: stats?.completedToday || 0, color: 'text-green-600' },
    { label: 'New Registrations', value: stats?.newRegistrations || 0, color: 'text-blue-600' }
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2 font-heading">Admin Dashboard</h1>
          <p className="text-gray-600">Platform overview and management</p>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {platformStats.map((stat, index) => {
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
            {/* Quick Metrics & Actions */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 font-heading">Quick Overview</h2>
                <Link
                  to="/admin/analytics"
                  className="text-teal-600 hover:text-teal-700 font-medium text-sm flex items-center space-x-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>View Analytics</span>
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {quickMetrics.map((metric, index) => (
                  <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className={`text-2xl font-bold ${metric.color} mb-1`}>
                      {metric.value}
                    </div>
                    <div className="text-sm text-gray-600">{metric.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  to="/admin/verifications"
                  className="flex items-center space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors group"
                >
                  <Shield className="w-8 h-8 text-yellow-600" />
                  <div>
                    <span className="font-semibold text-gray-900">Pending Verifications</span>
                    <p className="text-yellow-700 text-sm">
                      {pendingVerifications.length} users waiting approval
                    </p>
                  </div>
                </Link>

                <Link
                  to="/admin/disputes"
                  className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors group"
                >
                  <AlertCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <span className="font-semibold text-gray-900">Active Disputes</span>
                    <p className="text-red-700 text-sm">
                      {stats?.activeDisputes || 0} disputes need resolution
                    </p>
                  </div>
                </Link>

                <Link
                  to="/admin/users"
                  className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors group"
                >
                  <Users className="w-8 h-8 text-blue-600" />
                  <div>
                    <span className="font-semibold text-gray-900">User Management</span>
                    <p className="text-blue-700 text-sm">
                      Manage {stats?.totalUsers || 0} platform users
                    </p>
                  </div>
                </Link>

                <Link
                  to="/admin/finance"
                  className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors group"
                >
                  <DollarSign className="w-8 h-8 text-green-600" />
                  <div>
                    <span className="font-semibold text-gray-900">Revenue Report</span>
                    <p className="text-green-700 text-sm">
                      {formatCurrency(stats?.platformRevenue || 0)} total revenue
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 font-heading">Recent Activities</h2>
                <Link
                  to="/admin/activities"
                  className="text-teal-600 hover:text-teal-700 font-medium text-sm"
                >
                  View All
                </Link>
              </div>

              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No recent activities</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === 'success' ? 'bg-green-500' :
                        activity.type === 'warning' ? 'bg-yellow-500' :
                        activity.type === 'error' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`} />
                      
                      <div className="flex-1">
                        <p className="text-gray-900">{activity.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span>{activity.user?.name}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(activity.timestamp)}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          activity.type === 'success' ? 'bg-green-100 text-green-800' :
                          activity.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          activity.type === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {activity.action}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Pending Verifications */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 font-heading">Pending Verifications</h2>
                <Link
                  to="/admin/verifications"
                  className="text-teal-600 hover:text-teal-700 font-medium text-sm"
                >
                  Manage
                </Link>
              </div>

              {pendingVerifications.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-4" />
                  <p className="text-gray-500">No pending verifications</p>
                  <p className="text-gray-400 text-sm mt-1">All users are verified</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingVerifications.slice(0, 5).map((verification) => (
                    <div key={verification._id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img
                          src={verification.user.profilePhoto || '/default-avatar.png'}
                          alt={verification.user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {verification.user.firstName} {verification.user.lastName}
                          </p>
                          <p className="text-yellow-700 text-sm capitalize">
                            {verification.user.role} • {formatRelativeTime(verification.createdAt)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button className="bg-green-500 text-white p-1 rounded hover:bg-green-600 transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button className="bg-red-500 text-white p-1 rounded hover:bg-red-600 transition-colors">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {pendingVerifications.length > 5 && (
                    <div className="text-center pt-2">
                      <Link
                        to="/admin/verifications"
                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                      >
                        + {pendingVerifications.length - 5} more pending
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* System Health */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <h2 className="text-2xl font-bold text-gray-900 font-heading mb-6">System Health</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">API Response Time</span>
                  <span className="font-semibold text-green-600">128ms</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Database</span>
                  <span className="font-semibold text-green-600">Healthy</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Payment Gateway</span>
                  <span className="font-semibold text-green-600">Operational</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Uptime</span>
                  <span className="font-semibold text-green-600">99.98%</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <Link
                  to="/admin/system"
                  className="flex items-center space-x-2 text-teal-600 hover:text-teal-700 text-sm"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>View Detailed Metrics</span>
                </Link>
              </div>
            </div>

            {/* Quick Reports */}
            <div className="bg-white rounded-2xl shadow-soft p-8">
              <h2 className="text-2xl font-bold text-gray-900 font-heading mb-6">Quick Reports</h2>
              
              <div className="space-y-3">
                <Link
                  to="/admin/reports?type=revenue"
                  className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <DollarSign className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Revenue Report</span>
                </Link>

                <Link
                  to="/admin/reports?type=users"
                  className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">User Growth</span>
                </Link>

                <Link
                  to="/admin/reports?type=bookings"
                  className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Briefcase className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Booking Analytics</span>
                </Link>

                <button className="w-full flex items-center space-x-3 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  <Download className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Export All Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}