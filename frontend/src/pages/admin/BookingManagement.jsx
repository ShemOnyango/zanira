// frontend/src/pages/admin/BookingManagement.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Eye, Calendar, MapPin, Clock, DollarSign } from 'lucide-react'
import { Users, CheckCircle, X } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { bookingAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils'

const BookingManagement = () => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [showMatchingFundis, setShowMatchingFundis] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [matchingFundis, setMatchingFundis] = useState([])
  const [assigningFundi, setAssigningFundi] = useState(false)
  const navigate = useNavigate()

  const { execute: fetchBookings } = useApi(bookingAPI.getAll, { showToast: false })
  const { execute: updateBookingStatus } = useApi(bookingAPI.updateStatus, { showToast: true })
  const { execute: getMatchingFundis } = useApi(bookingAPI.getMatchingFundis, { showToast: false })
  const { execute: assignFundi } = useApi(bookingAPI.assignFundi, { showToast: true, successMessage: 'Fundi assigned successfully!' })
  const { execute: pushToFundis } = useApi(bookingAPI.pushToFundis, { showToast: true, successMessage: 'Job pushed to fundis successfully' })

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const bookingsData = await fetchBookings()
      if (bookingsData) {
        // API may return either an array (legacy) or an object { data: { bookings, pagination } }
        // Normalize to an array of booking objects for the table.
        let payload = []
        // Case A: axios wrapper returned { data: { bookings, pagination } }
        if (bookingsData.data && bookingsData.data.bookings) {
          payload = bookingsData.data.bookings
        } else if (bookingsData.data && Array.isArray(bookingsData.data)) {
          // Case B: axios wrapper returned { data: [ ... ] }
          payload = bookingsData.data
        } else if (Array.isArray(bookingsData)) {
          // Case C: direct array
          payload = bookingsData
        }

        setBookings(payload)
      }
    } catch (error) {
      console.error('Failed to load bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (bookingId, status) => {
    try {
      await updateBookingStatus(bookingId, status)
      loadBookings()
    } catch (error) {
      console.error('Failed to update booking status:', error)
    }
  }

  const handleFindMatchingFundis = async (booking) => {
    try {
      setSelectedBooking(booking)
      setMatchingFundis([])
      setShowMatchingFundis(true)
      // show a loading indicator by setting matchingFundis to null
      setMatchingFundis(null)

      let data = null
      try {
        data = await getMatchingFundis(booking._id)
      } catch (err) {
        console.error('matching-fundis API failed, will try service fundis fallback', err)
      }

      let found = []
      if (data && data.data && Array.isArray(data.data.matchingFundis)) {
        found = data.data.matchingFundis
      }

      // Fallback: fetch fundis for the service via service API if none found
      if (found.length === 0) {
        try {
          // dynamic import to avoid circular deps
          const { serviceAPI } = await import('../../lib/api')
          // serviceAPI.getFundis expects a serviceId (string). booking.service may be
          // an object (populated) or an id. Normalize to id to avoid calling /services/[object Object]/fundis
          const serviceId = booking?.service?._id || booking?.service
          if (!serviceId) {
            console.warn('No service id available for fallback getFundis', { bookingId: booking?._id, booking })
          } else {
            const svcResp = await serviceAPI.getFundis(serviceId)
            if (svcResp && svcResp.data) found = svcResp.data
          }
        } catch (e) {
          console.error('Service fundis fallback failed', e)
        }
      }

      setMatchingFundis(found)
    } catch (error) {
      console.error('Failed to find matching fundis:', error)
    }
  }

  const handleAssignFundi = async (fundi) => {
    try {
      setAssigningFundi(true)
      const agreedPrice = prompt(`Enter agreed price for ${fundi.user.firstName}:`)
      if (!agreedPrice || isNaN(agreedPrice)) {
        alert('Please enter a valid price')
        return
      }

      await assignFundi(selectedBooking._id, {
        fundiId: fundi._id,
        agreedPrice: parseFloat(agreedPrice)
      })

      setShowMatchingFundis(false)
      loadBookings()
    } catch (error) {
      console.error('Failed to assign fundi:', error)
    } finally {
      setAssigningFundi(false)
    }
  }

  const filteredBookings = bookings.filter(booking => 
    (statusFilter === 'all' || booking.status === statusFilter) &&
    (dateFilter === 'all' || isInDateRange(booking.createdAt, dateFilter))
  )

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const dateOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ]

  const isInDateRange = (date, range) => {
    const now = new Date()
    const targetDate = new Date(date)
    
    switch (range) {
      case 'today':
        return targetDate.toDateString() === now.toDateString()
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7))
        return targetDate >= weekAgo
      case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1))
        return targetDate >= monthAgo
      default:
        return true
    }
  }

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

  const getStatusStats = () => {
    const stats = {
      pending: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      total: bookings.length
    }
    
    bookings.forEach(booking => {
      if (stats.hasOwnProperty(booking.status)) {
        stats[booking.status]++
      }
    })
    
    return stats
  }

  const stats = getStatusStats()

  if (loading) {
    return <LoadingSpinner size="xl" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
          <p className="text-gray-600">Manage and monitor all bookings</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search bookings..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {dateOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Matching Fundis Modal */}
      {showMatchingFundis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Matching Fundis for Booking #{(selectedBooking && selectedBooking._id) ? selectedBooking._id.slice(-6).toUpperCase() : ''}</h3>
              <button onClick={() => setShowMatchingFundis(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              {matchingFundis === null ? (
                <div className="flex flex-col items-center py-8">
                  <LoadingSpinner size="lg" />
                  <p className="mt-3 text-sm text-gray-600">Searching for fundis in the area...</p>
                </div>
              ) : Array.isArray(matchingFundis) && matchingFundis.length > 0 ? (
                matchingFundis.map((fundi) => (
                  <div key={fundi._id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <img
                          src={fundi.user.profilePhoto || '/default-avatar.png'}
                          alt={fundi.user.firstName}
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <h4 className="font-semibold">
                            {fundi.user.firstName} {fundi.user.lastName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Match Score: <span className="font-medium">{fundi.matchScore}%</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Rating: ⭐ {fundi.rating || 'No ratings'} • {fundi.stats?.completedJobs || 0} jobs
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAssignFundi(fundi)}
                        disabled={assigningFundi}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition-colors flex items-center space-x-2"
                      >
                        {assigningFundi ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        <span>Assign</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No matching fundis found for this booking.</p>
                  <p className="text-sm">Try adjusting the service type or location criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Booking Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-yellow-700">Pending</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
          <div className="text-sm text-blue-700">Confirmed</div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.in_progress}</div>
          <div className="text-sm text-purple-700">In Progress</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-green-700">Completed</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          <div className="text-sm text-red-700">Cancelled</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fundi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr key={booking._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        #{booking._id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-500">{booking.service?.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatRelativeTime(booking.createdAt)}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <img
                        src={booking.client?.profilePhoto || '/default-avatar.png'}
                        alt={booking.client?.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="text-sm text-gray-900">
                        {booking.client?.firstName} {booking.client?.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {booking.fundi ? (
                      <div className="flex items-center space-x-2">
                        <img
                          src={booking.fundi.profilePhoto || '/default-avatar.png'}
                          alt={booking.fundi.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="text-sm text-gray-900">
                          {booking.fundi.firstName} {booking.fundi.lastName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1 text-sm text-gray-900">
                      <Calendar size={14} />
                      <span>{formatDate(booking.scheduledDate)}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <MapPin size={14} />
                      <span>{booking.location?.town}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(booking.totalAmount)}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={booking.status}
                      onChange={(e) => handleStatusUpdate(booking._id, e.target.value)}
                      className={`text-xs font-medium rounded-full px-2 py-1 border-0 ${getStatusColor(booking.status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleFindMatchingFundis(booking)}
                        className="text-blue-500 hover:text-blue-700"
                        title="Find Matching Fundis"
                      >
                        <Users size={16} />
                      </button>
                      <button className="text-blue-500 hover:text-blue-700" onClick={() => navigate(`/bookings/${booking._id}`)} title="View booking details">
                        <Eye size={16} />
                      </button>
                      <button className="text-teal-600 hover:text-teal-800 ml-2" onClick={async () => {
                        try {
                          await pushToFundis(booking._id)
                        } catch (err) {
                          console.error('Push to fundis failed', err)
                        }
                      }} title="Push to Fundis">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No bookings found</p>
            <p className="text-gray-400">Adjust your search or filter to see more results</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-center">
            <DollarSign className="mx-auto mb-2 text-blue-600" size={24} />
            <span className="font-medium text-blue-900">Process Refunds</span>
          </button>
          <button className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-center">
            <Clock className="mx-auto mb-2 text-green-600" size={24} />
            <span className="font-medium text-green-900">Schedule Reminders</span>
          </button>
          <button className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-center">
            <Filter className="mx-auto mb-2 text-purple-600" size={24} />
            <span className="font-medium text-purple-900">Export Bookings</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default BookingManagement