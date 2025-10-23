// Simplified AdminDashboard.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  AlertCircle,
  TrendingUp,
  ShoppingCart,
  MessageSquare,
  Calendar,
  Star,
  RefreshCw
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { analyticsAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import { formatCurrency } from '../../lib/utils'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { execute: fetchStats } = useApi(analyticsAPI.getDashboard, { showToast: false })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const statsData = await fetchStats()

      // `fetchStats()` (useApi) returns response.data where the backend body is
      // { success: true, data: { overview: { users, bookings, revenue }, ... } }
      // Normalize into the `stats` shape the UI expects.
      let overview = null
      if (statsData) {
        overview = statsData.data?.overview || statsData.overview || statsData.data || statsData
      }

      const normalized = {
        totalUsers: overview?.users?.total ?? overview?.users ?? overview?.totalUsers ?? 0,
        activeBookings: overview?.bookings?.active ?? overview?.activeBookings ?? 0,
        platformRevenue: overview?.revenue?.total ?? overview?.totalRevenue ?? 0,
        pendingActions: overview?.pendingVerifications ?? 0,
      }

      setStats(normalized)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const platformStats = [
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'blue',
      change: '+124 this month'
    },
    {
      label: 'Active Bookings',
      value: stats?.activeBookings || 0,
      icon: Briefcase,
      color: 'teal',
      change: '+45 today'
    },
    {
      label: 'Platform Revenue',
      value: formatCurrency(stats?.platformRevenue || 0),
      icon: DollarSign,
      color: 'green',
      change: 'KES 2.5M this month'
    },
    {
      label: 'Pending Actions',
      value: stats?.pendingActions || 0,
      icon: AlertCircle,
      color: 'orange',
      change: 'Requires attention'
    }
  ]

  const quickActions = [
    {
      title: 'Manage Shops',
      description: 'Verify new shops and set commissions',
      icon: ShoppingCart,
      link: '/admin/shop-verification',
      color: 'purple'
    },
    {
      title: 'View Bookings',
      description: 'Monitor and manage all bookings',
      icon: Calendar,
      link: '/admin/bookings',
      color: 'blue'
    },
    {
      title: 'User Management',
      description: 'Manage fundis and clients',
      icon: Users,
      link: '/admin/fundi-allocation',
      color: 'green'
    },
    {
      title: 'Chat Support',
      description: 'Assist users in real-time',
      icon: MessageSquare,
      link: '/admin/chat',
      color: 'pink'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage message={error} onRetry={loadDashboardData} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
              <p className="text-gray-600 mt-2">Welcome back! Here's what's happening today.</p>
            </div>
            <button 
              onClick={loadDashboardData}
              className="flex items-center space-x-2 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw size={18} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {platformStats.map((stat, index) => {
            const Icon = stat.icon
            const colorClasses = {
              blue: 'from-blue-500 to-blue-600',
              teal: 'from-teal-500 to-teal-600',
              green: 'from-green-500 to-green-600',
              orange: 'from-orange-500 to-orange-600'
            }
            
            return (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[stat.color]} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600 mb-2">{stat.label}</div>
                <div className="text-xs text-gray-500 flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>{stat.change}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              const colorClasses = {
                purple: 'bg-purple-50 border-purple-200 text-purple-700',
                blue: 'bg-blue-50 border-blue-200 text-blue-700',
                green: 'bg-green-50 border-green-200 text-green-700',
                pink: 'bg-pink-50 border-pink-200 text-pink-700'
              }
              
              return (
                <Link
                  key={index}
                  to={action.link}
                  className={`block p-4 rounded-xl border-2 ${colorClasses[action.color]} hover:scale-105 transition-transform duration-200`}
                >
                  <Icon className="w-8 h-8 mb-3" />
                  <h3 className="font-semibold mb-1">{action.title}</h3>
                  <p className="text-sm opacity-80">{action.description}</p>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-gray-500">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Recent activities will appear here</p>
          </div>
        </div>
      </div>
    </div>
  )
}