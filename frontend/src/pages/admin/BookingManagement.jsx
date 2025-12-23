// frontend/src/pages/admin/BookingManagement.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Eye, Calendar, MapPin, Clock, DollarSign } from 'lucide-react'
import { Users, CheckCircle, X, AlertCircle } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { bookingAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils'
import { useDebounce } from '../../hooks/useDebounce'

const BookingManagement = () => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showMatchingFundis, setShowMatchingFundis] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [matchingFundis, setMatchingFundis] = useState([])
  const [assigningFundi, setAssigningFundi] = useState(false)
  const [fallbackMessage, setFallbackMessage] = useState('')
  const [showFallbackOptions, setShowFallbackOptions] = useState(false)
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [selectedFundi, setSelectedFundi] = useState(null)
  const [agreedPrice, setAgreedPrice] = useState('')
  const [priceError, setPriceError] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  })
  
  const navigate = useNavigate()
  const debouncedSearch = useDebounce(searchTerm, 300)

  const { execute: fetchBookings } = useApi(bookingAPI.getAll, { showToast: false })
  const { execute: updateBookingStatus } = useApi(bookingAPI.updateStatus, { showToast: true })
  const { execute: getMatchingFundis } = useApi(bookingAPI.getMatchingFundis, { showToast: false })
  const { execute: assignFundi } = useApi(bookingAPI.assignFundi, { showToast: true, successMessage: 'Fundi assigned successfully!' })
  const { execute: pushToFundis } = useApi(bookingAPI.pushToFundis, { showToast: true, successMessage: 'Job pushed to fundis successfully' })

  // Load bookings with pagination and filters
  const loadBookings = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = {
        page,
        limit: pagination.limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: debouncedSearch || undefined
      }

      const bookingsData = await fetchBookings(params)
      if (bookingsData) {
        let payload = []
        let total = 0

        if (bookingsData.data && bookingsData.data.bookings) {
          payload = bookingsData.data.bookings
          total = bookingsData.data.pagination?.total || payload.length
        } else if (bookingsData.data && Array.isArray(bookingsData.data)) {
          payload = bookingsData.data
          total = payload.length
        } else if (Array.isArray(bookingsData)) {
          payload = bookingsData
          total = payload.length
        }

        setBookings(payload)
        setPagination(prev => ({ ...prev, page, total }))
      }
    } catch (error) {
      console.error('Failed to load bookings:', error)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, pagination.limit, fetchBookings])

  useEffect(() => {
    loadBookings(1)
  }, [loadBookings])

  const handleStatusUpdate = async (bookingId, status) => {
    try {
      await updateBookingStatus(bookingId, status)
      loadBookings(pagination.page)
    } catch (error) {
      console.error('Failed to update booking status:', error)
    }
  }

  const handleFindMatchingFundis = async (booking) => {
    try {
      setSelectedBooking(booking);
      setMatchingFundis(null);
      setShowMatchingFundis(true);
      setFallbackMessage('');
      setShowFallbackOptions(false);

      let found = [];
      console.log('DEBUG: Finding matching fundis for booking:', booking);

      // Try primary matching
      try {
        const data = await getMatchingFundis(booking._id, { enableFallback: true });
        console.log('DEBUG: Matching fundis API response:', data);
        
        // Try various response shapes
        if (data?.data?.matchingFundis) {
          found = data.data.matchingFundis;
        } else if (data?.data?.matches) {
          found = data.data.matches;
        } else if (Array.isArray(data?.data)) {
          found = data.data;
        } else if (Array.isArray(data)) {
          found = data;
        }

        console.log('DEBUG: Found initial matches:', found?.length || 0);
        
        if (data?.data?.fallbackInfo) {
          const { strategyUsed, message } = data.data.fallbackInfo;
          setFallbackMessage(message);
          if (strategyUsed === 'same_locality' || strategyUsed === 'emergency_fallback') {
            setShowFallbackOptions(true);
          }
        }
      } catch (err) {
        console.error('Primary matching failed:', err);
      }

      // If no fundis found, try locality fallback
      if (found.length === 0 && booking.location?.county && booking.service) {
        try {
          console.log('DEBUG: Trying locality fallback with:', {
            county: booking.location.county,
            serviceId: booking.service._id || booking.service
          });

          const localityResponse = await bookingAPI.getLocalityFallback({
            serviceCategory: booking.service._id || booking.service,
            county: booking.location.county,
            limit: 10
          });
          
          if (localityResponse.data?.data?.fundis) {
            found = localityResponse.data.data.fundis;
            setFallbackMessage('Found fundis in your locality');
            setShowFallbackOptions(true);
            console.log('DEBUG: Found fundis through locality fallback:', found.length);
          }
        } catch (e) {
          console.error('Locality fallback failed:', e);
        }
      }

      // Final fallback: Try service-based matching
      if (found.length === 0) {
        try {
          const serviceId = booking?.service?._id || booking?.service;
          if (serviceId) {
            console.log('DEBUG: Trying service-based fallback for service:', serviceId);
            
            const { serviceAPI } = await import('../../lib/api');
            const svcResp = await serviceAPI.getFundis(serviceId);
            const svcData = svcResp?.data ?? svcResp;

            let svcFundis = [];
            if (Array.isArray(svcData)) {
              svcFundis = svcData;
            } else if (svcData?.data && Array.isArray(svcData.data)) {
              svcFundis = svcData.data;
            } else if (svcData?.fundis && Array.isArray(svcData.fundis)) {
              svcFundis = svcData.fundis;
            }

            if (svcFundis.length > 0) {
              found = svcFundis.map(fundi => ({
                ...fundi,
                isFallback: true,
                localityMatch: false
              }));
              setFallbackMessage('Found fundis for this service (may be outside your area)');
              setShowFallbackOptions(true);
              console.log('DEBUG: Found fundis through service fallback:', found.length);
            }
          }
        } catch (e) {
          console.error('Service fallback failed:', e);
        }
      }

      console.log('DEBUG: Final matching results:', {
        totalFound: found.length,
        hasFallbackMessage: !!fallbackMessage,
        showFallbackOptions
      });

      setMatchingFundis(found);
    } catch (error) {
      console.error('Error in handleFindMatchingFundis:', error);
      setFallbackMessage('Error finding fundis. Please try again.');
    }
  }

  const handleExpandSearch = async () => {
    if (!selectedBooking) return
    
    try {
      setMatchingFundis(null)
      const expandedResponse = await bookingAPI.getLocalityFallback({
        serviceCategory: selectedBooking.service._id || selectedBooking.service,
        county: selectedBooking.location.county,
        limit: 20
      })
      
      if (expandedResponse.data?.data?.fundis) {
        setMatchingFundis(expandedResponse.data.data.fundis)
        setFallbackMessage('Expanded search to more fundis in your county')
      }
    } catch (error) {
      console.error('Failed to expand search:', error)
    }
  }

  const handleAssignClick = (fundi) => {
    setSelectedFundi(fundi)
    setAgreedPrice('')
    setPriceError('')
    setShowPriceModal(true)
  }

  const validatePrice = (price) => {
    if (!price || isNaN(price) || parseFloat(price) <= 0) {
      return 'Please enter a valid price'
    }
    return ''
  }

  const handleAssignFundi = async () => {
    const error = validatePrice(agreedPrice)
    if (error) {
      setPriceError(error)
      return
    }

    try {
      setAssigningFundi(true)
      await assignFundi(selectedBooking._id, {
        fundiId: selectedFundi.fundi?._id || selectedFundi._id,
        agreedPrice: parseFloat(agreedPrice)
      })

      setShowPriceModal(false)
      setShowMatchingFundis(false)
      loadBookings(pagination.page)
    } catch (error) {
      console.error('Failed to assign fundi:', error)
    } finally {
      setAssigningFundi(false)
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

  const getMatchQualityColor = (quality) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      fair: 'bg-yellow-100 text-yellow-800',
      basic: 'bg-orange-100 text-orange-800',
      locality_fallback: 'bg-purple-100 text-purple-800',
      emergency_fallback: 'bg-red-100 text-red-800',
      poor: 'bg-gray-100 text-gray-800'
    }
    return colors[quality] || 'bg-gray-100 text-gray-800'
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

  if (loading && bookings.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
          <p className="text-gray-600">Manage and monitor all bookings</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Price Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Set Agreed Price</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agreed Price for {selectedFundi?.fundi?.user?.name || `${selectedFundi?.user?.firstName} ${selectedFundi?.user?.lastName}`}
                </label>
                <input
                  type="number"
                  value={agreedPrice}
                  onChange={(e) => {
                    setAgreedPrice(e.target.value)
                    setPriceError('')
                  }}
                  placeholder="Enter amount"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {priceError && (
                  <p className="text-red-500 text-sm mt-1">{priceError}</p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPriceModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignFundi}
                  disabled={assigningFundi}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition-colors flex items-center space-x-2"
                >
                  {assigningFundi ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  <span>Assign Fundi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Matching Fundis Modal */}
      {showMatchingFundis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  Matching Fundis for Booking #{selectedBooking?._id?.slice(-6)?.toUpperCase() || ''}
                </h3>
                {fallbackMessage && (
                  <p className={`text-sm mt-1 flex items-center ${
                    fallbackMessage.includes('Best matches') ? 'text-green-600' : 
                    fallbackMessage.includes('locality') ? 'text-blue-600' : 
                    'text-yellow-600'
                  }`}>
                    <AlertCircle size={16} className="mr-1" />
                    {fallbackMessage}
                  </p>
                )}
              </div>
              <button 
                onClick={() => {
                  setShowMatchingFundis(false)
                  setShowFallbackOptions(false)
                  setFallbackMessage('')
                }} 
                className="text-gray-500 hover:text-gray-700 ml-4"
              >
                <X size={20} />
              </button>
            </div>

            {/* Fallback Options */}
            {showFallbackOptions && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 font-medium">
                      Want to see more options?
                    </p>
                    <p className="text-xs text-blue-600">
                      Expand search to find more fundis in your area
                    </p>
                  </div>
                  <button
                    onClick={handleExpandSearch}
                    className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 whitespace-nowrap"
                  >
                    Expand Search Area
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {matchingFundis === null ? (
                <div className="flex flex-col items-center py-8">
                  <LoadingSpinner size="lg" />
                  <p className="mt-3 text-sm text-gray-600">Searching for fundis in the area...</p>
                </div>
              ) : Array.isArray(matchingFundis) && matchingFundis.length > 0 ? (
                matchingFundis.map((fundi) => (
                  <div key={fundi.fundi?._id || fundi._id} className={`border rounded-lg p-4 ${
                    fundi.isFallback ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start space-x-4 flex-1">
                        <img
                          src={fundi.fundi?.user?.profilePhoto || fundi.user?.profilePhoto || '/default-avatar.png'}
                          alt={fundi.fundi?.user?.name || `${fundi.user?.firstName} ${fundi.user?.lastName}`}
                          className="w-12 h-12 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {fundi.fundi?.user?.name || `${fundi.user?.firstName} ${fundi.user?.lastName}`}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {fundi.matchQuality && (
                              <span className={`inline-block px-2 py-1 rounded text-xs ${getMatchQualityColor(fundi.matchQuality)}`}>
                                {fundi.matchQuality.replace('_', ' ')}
                              </span>
                            )}
                            {fundi.score && (
                              <span className="text-sm text-gray-600">
                                Score: <span className="font-medium">{fundi.score}%</span>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                            <span>⭐ {fundi.fundi?.rating || fundi.rating || 'No ratings'}</span>
                            <span>• {fundi.fundi?.completedJobs || fundi.completedJobs || 0} jobs</span>
                            <span>• {fundi.fundi?.responseTime || fundi.responseTime || 'N/A'} min response</span>
                            {fundi.localityMatch && <span className="text-blue-600">📍 Local</span>}
                          </div>
                          {fundi.isFallback && (
                            <p className="text-xs text-yellow-600 mt-2 flex items-center">
                              <AlertCircle size={12} className="mr-1" />
                              Fallback match - may not meet all criteria
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAssignClick(fundi)}
                        disabled={assigningFundi}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition-colors flex items-center space-x-2 whitespace-nowrap self-start"
                      >
                        <CheckCircle size={16} />
                        <span>Assign</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-900">No fundis found</p>
                  <p className="text-sm text-gray-600 mb-4">Try adjusting the service type or location criteria</p>
                  <button
                    onClick={handleExpandSearch}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Search Entire County
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Booking Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 text-center border">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow-sm p-4 text-center border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-yellow-700">Pending</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow-sm p-4 text-center border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
          <div className="text-sm text-blue-700">Confirmed</div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow-sm p-4 text-center border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{stats.in_progress}</div>
          <div className="text-sm text-purple-700">In Progress</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm p-4 text-center border border-green-200">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-green-700">Completed</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow-sm p-4 text-center border border-red-200">
          <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          <div className="text-sm text-red-700">Cancelled</div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
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
              {bookings.map((booking) => (
                <tr key={booking._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        #{booking._id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {booking.service?.name}
                      </p>
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
                      <span>{booking.location?.town || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(booking.totalAmount)}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={booking.status}
                      onChange={(e) => handleStatusUpdate(booking._id, e.target.value)}
                      className={`text-xs font-medium rounded-full px-3 py-1 border-0 ${getStatusColor(booking.status)} focus:ring-2 focus:ring-blue-500`}
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
                        className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                        title="Find Matching Fundis"
                      >
                        <Users size={16} />
                      </button>
                      <button 
                        onClick={() => navigate(`/bookings/${booking._id}`)} 
                        className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                        title="View booking details"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            await pushToFundis(booking._id)
                          } catch (err) {
                            console.error('Push to fundis failed', err)
                          }
                        }} 
                        className="text-teal-600 hover:text-teal-800 p-1 rounded hover:bg-teal-50"
                        title="Push to Fundis"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {bookings.length === 0 && !loading && (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No bookings found</p>
            <p className="text-gray-400">Adjust your search or filter to see more results</p>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => loadBookings(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadBookings(pagination.page + 1)}
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-center group">
            <DollarSign className="mx-auto mb-2 text-blue-600 group-hover:text-blue-700" size={24} />
            <span className="font-medium text-blue-900 group-hover:text-blue-800">Process Refunds</span>
          </button>
          <button className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-center group">
            <Clock className="mx-auto mb-2 text-green-600 group-hover:text-green-700" size={24} />
            <span className="font-medium text-green-900 group-hover:text-green-800">Schedule Reminders</span>
          </button>
          <button className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-center group">
            <Filter className="mx-auto mb-2 text-purple-600 group-hover:text-purple-700" size={24} />
            <span className="font-medium text-purple-900 group-hover:text-purple-800">Export Bookings</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default BookingManagement