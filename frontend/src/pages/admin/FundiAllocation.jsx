// frontend/src/pages/admin/FundiAllocation.jsx
import { useState, useEffect } from 'react'
import { Search, Filter, Users, MapPin, Star, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { bookingAPI, userAPI, matchingAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { formatCurrency, formatDate } from '../../lib/utils'

const FundiAllocation = () => {
  const [bookings, setBookings] = useState([])
  const [fundis, setFundis] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [recommendedFundis, setRecommendedFundis] = useState([])

  const { execute: fetchBookings } = useApi(bookingAPI.getAll, { showToast: false })
  const { execute: fetchFundis } = useApi(() => userAPI.getAllUsers({ role: 'fundi', verified: true }), { showToast: false })
  const { execute: findFundis } = useApi(matchingAPI.findFundis, { showToast: false })
  const { execute: assignFundi } = useApi(bookingAPI.assignFundi, { showToast: true })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [bookingsData, fundisData] = await Promise.all([
        fetchBookings({ status: 'pending', limit: 50 }),
        fetchFundis()
      ])

      if (bookingsData) {
        const payload = bookingsData.data ?? bookingsData ?? []
        setBookings(Array.isArray(payload) ? payload : [])
      }
      if (fundisData) {
        const payload = fundisData.data ?? fundisData ?? []
        setFundis(Array.isArray(payload) ? payload : [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFindFundis = async (booking) => {
    try {
      setSelectedBooking(booking)
      const fundisData = await findFundis({
        serviceId: booking.service?._id,
        location: booking.location,
        budget: booking.totalAmount
      })
      if (fundisData) setRecommendedFundis(fundisData.data || [])
    } catch (error) {
      console.error('Failed to find fundis:', error)
    }
  }

  const handleAssignFundi = async (bookingId, fundiId) => {
    try {
      await assignFundi(bookingId, fundiId)
      setSelectedBooking(null)
      setRecommendedFundis([])
      loadData() // Refresh the list
    } catch (error) {
      console.error('Failed to assign fundi:', error)
    }
  }

  const getMatchingScore = (fundi, booking) => {
    let score = 0
    
    // Service match
    if (fundi.services?.some(service => service._id === booking.service?._id)) {
      score += 40
    }
    
    // Location match
    if (fundi.operatingAreas?.includes(booking.location?.county)) {
      score += 30
    }
    
    // Rating bonus
    score += (fundi.rating || 0) * 6
    
    // Availability bonus
    if (fundi.availability === 'available') {
      score += 10
    }
    
    return Math.min(score, 100)
  }

  const pendingBookings = bookings.filter(booking => !booking.fundi && booking.status === 'pending')

  if (loading) {
    return <LoadingSpinner size="xl" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fundi Allocation</h1>
          <p className="text-gray-600">Assign the best fundis to pending bookings</p>
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
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Allocation</p>
              <p className="text-2xl font-bold text-gray-900">{pendingBookings.length}</p>
            </div>
            <Clock className="text-yellow-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Fundis</p>
              <p className="text-2xl font-bold text-blue-600">
                {fundis.filter(f => f.availability === 'available').length}
              </p>
            </div>
            <Users className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Top Rated</p>
              <p className="text-2xl font-bold text-green-600">
                {fundis.filter(f => f.rating >= 4.5).length}
              </p>
            </div>
            <Star className="text-green-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Auto-Match Ready</p>
              <p className="text-2xl font-bold text-purple-600">
                {pendingBookings.filter(b => b.service && b.location).length}
              </p>
            </div>
            <CheckCircle className="text-purple-600" size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Bookings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bookings Needing Fundis</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {pendingBookings.map((booking) => (
              <div key={booking._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      #{booking._id.slice(-6).toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-500">{booking.service?.name}</p>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                    Pending
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Users size={14} />
                    <span>
                      {booking.client?.firstName} {booking.client?.lastName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin size={14} />
                    <span>{booking.location?.town}, {booking.location?.county}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock size={14} />
                    <span>{formatDate(booking.scheduledDate)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {formatCurrency(booking.totalAmount)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleFindFundis(booking)}
                  className="w-full mt-3 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Find Matching Fundis
                </button>
              </div>
            ))}

            {pendingBookings.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
                <p className="text-gray-500">All bookings have been assigned!</p>
                <p className="text-gray-400 text-sm">No pending allocations</p>
              </div>
            )}
          </div>
        </div>

        {/* Recommended Fundis */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedBooking ? 'Recommended Fundis' : 'Select a Booking'}
          </h2>

          {selectedBooking ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="font-medium text-blue-900">Selected Booking</p>
                <p className="text-sm text-blue-700">
                  {selectedBooking.service?.name} in {selectedBooking.location?.town}
                </p>
                <p className="text-sm text-blue-600">
                  Budget: {formatCurrency(selectedBooking.totalAmount)}
                </p>
              </div>

              {recommendedFundis.map((fundi) => (
                <div key={fundi._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <img
                      src={fundi.profilePhoto || '/default-avatar.png'}
                      alt={fundi.firstName}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">
                          {fundi.firstName} {fundi.lastName}
                        </p>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          {getMatchingScore(fundi, selectedBooking)}% Match
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Star size={14} className="text-yellow-400 fill-current" />
                        <span>{fundi.rating?.toFixed(1)}</span>
                        <span>•</span>
                        <span>{fundi.completedJobs || 0} jobs</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-2">
                      <MapPin size={14} />
                      <span>{fundi.operatingAreas?.join(', ') || 'Nairobi'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock size={14} />
                      <span className="capitalize">{fundi.availability || 'available'}</span>
                    </div>
                    {fundi.skills && (
                      <div className="flex flex-wrap gap-1">
                        {fundi.skills.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAssignFundi(selectedBooking._id, fundi._id)}
                      className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Assign Fundi
                    </button>
                    <button className="px-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {recommendedFundis.length === 0 && (
                <div className="text-center py-8">
                  <Users size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No matching fundis found</p>
                  <p className="text-gray-400 text-sm">Try adjusting search criteria</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Select a booking to view matching fundis</p>
              <p className="text-gray-400 text-sm">
                Click "Find Matching Fundis" on a booking to get recommendations
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Available Fundis List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Available Fundis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fundis
            .filter(fundi => fundi.availability === 'available')
            .slice(0, 6)
            .map((fundi) => (
              <div key={fundi._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <img
                    src={fundi.profilePhoto || '/default-avatar.png'}
                    alt={fundi.firstName}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      {fundi.firstName} {fundi.lastName}
                    </p>
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Star size={14} className="text-yellow-400 fill-current" />
                      <span>{fundi.rating?.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Jobs: {fundi.completedJobs || 0}</p>
                  <p>Location: {fundi.town}, {fundi.county}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {fundi.skills?.slice(0, 2).map((skill, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

export default FundiAllocation