// frontend/src/pages/bookings/Bookings.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  MessageSquare,
  Calendar,
  MapPin,
  DollarSign,
  MoreVertical,
  Plus
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { bookingAPI } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import Modal from '../../components/common/Modal'
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils'

export default function Bookings() {
  const { user } = useAuthStore()
  const [bookings, setBookings] = useState([])
  const [filteredBookings, setFilteredBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)

  // API hook
  const { execute: fetchBookings } = useApi(bookingAPI.getAll, { showToast: false })

  // Load bookings
  useEffect(() => {
    loadBookings()
  }, [])

  // In Bookings.jsx, update the loadBookings function:
  const loadBookings = async () => {
    try {
      setLoading(true)
      const params = {}
      
      // Add role-specific filters
      if (user?.role === 'client') {
        params.clientId = user._id
      } else if (user?.role === 'fundi') {
        params.fundiId = user._id
      }

      const response = await fetchBookings(params)
      let bookingsData = []
      
      // Handle different response structures
      if (response) {
        if (Array.isArray(response)) {
          bookingsData = response
        } else if (response.data && Array.isArray(response.data)) {
          bookingsData = response.data
        } else if (response.data && Array.isArray(response.data.bookings)) {
          bookingsData = response.data.bookings
        } else if (Array.isArray(response.bookings)) {
          bookingsData = response.bookings
        }
      }

      setBookings(bookingsData)
      setFilteredBookings(bookingsData)
    } catch (err) {
      console.error('Bookings load error:', err)
      setError(err.response?.data?.error || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  useEffect(() => {
    let filtered = bookings

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(booking => booking.status === filters.status)
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(booking =>
        booking.service?.name.toLowerCase().includes(searchLower) ||
        booking._id.toLowerCase().includes(searchLower) ||
        booking.location?.address.toLowerCase().includes(searchLower)
      )
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(booking => 
        new Date(booking.createdAt) >= new Date(filters.dateFrom)
      )
    }
    if (filters.dateTo) {
      filtered = filtered.filter(booking => 
        new Date(booking.createdAt) <= new Date(filters.dateTo + 'T23:59:59')
      )
    }

    setFilteredBookings(filtered)
  }, [filters, bookings])

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      disputed: 'bg-orange-100 text-orange-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  // Get status options based on user role
  const getStatusOptions = () => {
    const allStatuses = [
      { value: '', label: 'All Statuses' },
      { value: 'pending', label: 'Pending' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'disputed', label: 'Disputed' }
    ]

    if (user?.role === 'client') {
      return allStatuses
    } else if (user?.role === 'fundi') {
      return allStatuses.filter(status => 
        status.value !== '' && status.value !== 'disputed'
      )
    }
    
    return allStatuses
  }

  // Export bookings
  const handleExport = async (format) => {
    // Implementation for export functionality
    console.log(`Exporting bookings as ${format}`)
    setExportModalOpen(false)
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage message={error} onRetry={loadBookings} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-heading">My Bookings</h1>
            <p className="text-gray-600 mt-2">
              {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            {user?.role === 'client' && (
              <Link
                to="/bookings/new"
                className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>New Booking</span>
              </Link>
            )}
            
            <button
              onClick={() => setExportModalOpen(true)}
              className="bg-white text-gray-700 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by service, ID, or location..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              {getStatusOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Toggle Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
              <div className="max-w-md mx-auto">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
                <p className="text-gray-600 mb-6">
                  {bookings.length === 0 
                    ? "You don't have any bookings yet."
                    : "No bookings match your current filters."
                  }
                </p>
                {user?.role === 'client' && bookings.length === 0 && (
                  <Link
                    to="/bookings/new"
                    className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors inline-flex items-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create Your First Booking</span>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <div key={booking._id} className="bg-white rounded-2xl shadow-soft p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  {/* Booking Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {booking.service?.name}
                        </h3>
                        <p className="text-gray-600 text-sm">Booking ID: {booking._id}</p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(booking.scheduledDate)} at {booking.scheduledTime}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{booking.location.town}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatCurrency(booking.totalAmount)}</span>
                      </div>
                    </div>

                    {/* Participant Info */}
                    <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
                      {user?.role === 'client' && booking.assignedFundi && (
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>
                            Fundi: {booking.assignedFundi.firstName} {booking.assignedFundi.lastName}
                          </span>
                        </div>
                      )}
                      {user?.role === 'fundi' && booking.client && (
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>
                            Client: {booking.client.firstName} {booking.client.lastName}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <span>Created: {formatRelativeTime(booking.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3 mt-4 lg:mt-0 lg:pl-6">
                    <Link
                      to={`/bookings/${booking._id}`}
                      className="bg-teal-500 text-white p-2 rounded-lg hover:bg-teal-600 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </Link>
                    
                    <Link
                      to={`/bookings/${booking._id}?tab=chat`}
                      className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                      title="Open Chat"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </Link>

                    <div className="relative">
                      <button className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination (if needed) */}
        {filteredBookings.length > 0 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button className="px-3 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50">
                Previous
              </button>
              <button className="px-3 py-2 bg-teal-500 text-white rounded">1</button>
              <button className="px-3 py-2 text-gray-500 hover:text-gray-700">2</button>
              <button className="px-3 py-2 text-gray-500 hover:text-gray-700">3</button>
              <button className="px-3 py-2 text-gray-500 hover:text-gray-700">
                Next
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Export Modal */}
      <Modal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Export Bookings"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Choose export format:</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleExport('pdf')}
              className="p-4 border border-gray-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors text-center"
            >
              <div className="font-semibold text-gray-900">PDF</div>
              <div className="text-sm text-gray-600">Document Format</div>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="p-4 border border-gray-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors text-center"
            >
              <div className="font-semibold text-gray-900">CSV</div>
              <div className="text-sm text-gray-600">Spreadsheet Format</div>
            </button>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setExportModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}