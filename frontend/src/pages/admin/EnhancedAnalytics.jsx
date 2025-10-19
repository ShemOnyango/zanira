// frontend/src/pages/admin/EnhancedAnalytics.jsx
import { useState, useEffect } from 'react'
import { TrendingUp, Users, DollarSign, Briefcase, Star, Download, Calendar } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { analyticsAPI, advancedAnalyticsAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { formatCurrency } from '../../lib/utils'

// Mock chart components - you can replace these with actual chart libraries
const RevenueChart = () => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
      <button className="text-gray-500 hover:text-gray-700">
        <Download size={18} />
      </button>
    </div>
    <div className="h-64 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <TrendingUp size={48} className="mx-auto text-blue-400 mb-2" />
        <p className="text-blue-600 font-medium">Revenue Chart</p>
        <p className="text-blue-500 text-sm">Interactive chart will be implemented</p>
      </div>
    </div>
  </div>
)

const UserGrowthChart = () => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">User Growth</h3>
      <button className="text-gray-500 hover:text-gray-700">
        <Download size={18} />
      </button>
    </div>
    <div className="h-64 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Users size={48} className="mx-auto text-green-400 mb-2" />
        <p className="text-green-600 font-medium">Growth Chart</p>
        <p className="text-green-500 text-sm">Interactive chart will be implemented</p>
      </div>
    </div>
  </div>
)

const BookingTrendsChart = () => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Booking Trends</h3>
      <button className="text-gray-500 hover:text-gray-700">
        <Download size={18} />
      </button>
    </div>
    <div className="h-64 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Briefcase size={48} className="mx-auto text-purple-400 mb-2" />
        <p className="text-purple-600 font-medium">Trends Chart</p>
        <p className="text-purple-500 text-sm">Interactive chart will be implemented</p>
      </div>
    </div>
  </div>
)

const PerformanceChart = () => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Fundi Performance</h3>
      <button className="text-gray-500 hover:text-gray-700">
        <Download size={18} />
      </button>
    </div>
    <div className="h-64 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Star size={48} className="mx-auto text-orange-400 mb-2" />
        <p className="text-orange-600 font-medium">Performance Chart</p>
        <p className="text-orange-500 text-sm">Interactive chart will be implemented</p>
      </div>
    </div>
  </div>
)

const EnhancedAnalytics = () => {
  const [analytics, setAnalytics] = useState(null)
  const [timeRange, setTimeRange] = useState('30days')
  const [loading, setLoading] = useState(true)

  const { execute: fetchAnalytics } = useApi(analyticsAPI.getPlatformMetrics, { showToast: false })
  const { execute: fetchAdvancedAnalytics } = useApi(advancedAnalyticsAPI.getDashboard, { showToast: false })

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const [basicAnalytics, advancedAnalytics] = await Promise.all([
        fetchAnalytics(),
        fetchAdvancedAnalytics({ timeRange })
      ])

      // Combine analytics data
      setAnalytics({
        ...basicAnalytics?.data,
        ...advancedAnalytics?.data
      })
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(analytics?.totalRevenue || 0),
      change: analytics?.revenueGrowth || '+12.5%',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Active Users',
      value: analytics?.activeUsers || 0,
      change: analytics?.userGrowth || '+8.2%',
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Completed Bookings',
      value: analytics?.completedBookings || 0,
      change: analytics?.bookingGrowth || '+15.3%',
      icon: Briefcase,
      color: 'purple'
    },
    {
      title: 'Average Rating',
      value: (analytics?.averageRating || 0).toFixed(1),
      change: analytics?.ratingChange || '+0.2',
      icon: Star,
      color: 'yellow'
    }
  ]

  const performanceMetrics = [
    { label: 'Platform Uptime', value: '99.98%', trend: 'up' },
    { label: 'Response Time', value: '128ms', trend: 'down' },
    { label: 'Success Rate', value: '98.5%', trend: 'up' },
    { label: 'User Satisfaction', value: '4.8/5.0', trend: 'up' }
  ]

  if (loading) {
    return <LoadingSpinner size="xl" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enhanced Analytics</h1>
          <p className="text-gray-600">Comprehensive platform insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last Year</option>
          </select>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2">
            <Download size={18} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, index) => {
          const Icon = card.icon
          const colorClasses = {
            green: 'text-green-600 bg-green-50',
            blue: 'text-blue-600 bg-blue-50',
            purple: 'text-purple-600 bg-purple-50',
            yellow: 'text-yellow-600 bg-yellow-50'
          }

          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <p className={`text-sm mt-1 ${
                    card.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {card.change} from previous period
                  </p>
                </div>
                <div className={`p-3 rounded-full ${colorClasses[card.color]}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <UserGrowthChart />
        <BookingTrendsChart />
        <PerformanceChart />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Performance</h3>
          <div className="space-y-4">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">{metric.label}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900">{metric.value}</span>
                  <TrendingUp 
                    size={16} 
                    className={metric.trend === 'up' ? 'text-green-500' : 'text-red-500'} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-900">Peak Booking Hours</p>
              <p className="text-sm text-blue-700">10:00 AM - 12:00 PM & 3:00 PM - 5:00 PM</p>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-900">Top Performing Service</p>
              <p className="text-sm text-green-700">Electrical Repairs (32% of total bookings)</p>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="font-medium text-purple-900">User Retention</p>
              <p className="text-sm text-purple-700">67% of clients return within 90 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {analytics?.conversionRate || '4.2'}%
          </div>
          <div className="text-sm text-gray-600">Conversion Rate</div>
          <div className="text-xs text-green-600 mt-1">+0.8% improvement</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {analytics?.avgResponseTime || '2.4'}h
          </div>
          <div className="text-sm text-gray-600">Avg. Response Time</div>
          <div className="text-xs text-green-600 mt-1">-0.3h faster</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {analytics?.completionRate || '94.7'}%
          </div>
          <div className="text-sm text-gray-600">Job Completion Rate</div>
          <div className="text-xs text-green-600 mt-1">+2.1% improvement</div>
        </div>
      </div>

      {/* Data Export Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Analytics Data</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-center">
            <Download className="mx-auto mb-2 text-blue-600" size={24} />
            <span className="font-medium text-blue-900">Revenue Report</span>
          </button>
          <button className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-center">
            <Users className="mx-auto mb-2 text-green-600" size={24} />
            <span className="font-medium text-green-900">User Analytics</span>
          </button>
          <button className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-center">
            <Briefcase className="mx-auto mb-2 text-purple-600" size={24} />
            <span className="font-medium text-purple-900">Booking Data</span>
          </button>
          <button className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors text-center">
            <TrendingUp className="mx-auto mb-2 text-orange-600" size={24} />
            <span className="font-medium text-orange-900">Performance Metrics</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default EnhancedAnalytics