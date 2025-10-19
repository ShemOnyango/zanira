// frontend/src/pages/admin/TestimonialModeration.jsx
import { useState, useEffect } from 'react'
import { Search, Filter, Star, CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { testimonialAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { formatDate } from '../../lib/utils'

const TestimonialModeration = () => {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selectedTestimonial, setSelectedTestimonial] = useState(null)

  const { execute: fetchTestimonials } = useApi(testimonialAPI.getPending, { showToast: false })
  const { execute: approveTestimonial } = useApi(testimonialAPI.approve, { showToast: true })
  const { execute: rejectTestimonial } = useApi(testimonialAPI.reject, { showToast: true })

  useEffect(() => {
    loadTestimonials()
  }, [filter])

  const loadTestimonials = async () => {
    try {
      setLoading(true)
      const testimonialsData = await fetchTestimonials()
      if (testimonialsData) setTestimonials(testimonialsData.data || [])
    } catch (error) {
      console.error('Failed to load testimonials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (testimonialId) => {
    try {
      await approveTestimonial(testimonialId)
      loadTestimonials()
    } catch (error) {
      console.error('Failed to approve testimonial:', error)
    }
  }

  const handleReject = async (testimonialId, reason = 'Does not meet community guidelines') => {
    try {
      await rejectTestimonial(testimonialId, reason)
      loadTestimonials()
    } catch (error) {
      console.error('Failed to reject testimonial:', error)
    }
  }

  const getStatusStats = () => {
    const stats = {
      pending: testimonials.filter(t => t.status === 'pending').length,
      approved: testimonials.filter(t => t.status === 'approved').length,
      rejected: testimonials.filter(t => t.status === 'rejected').length,
      total: testimonials.length
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Testimonial Moderation</h1>
          <p className="text-gray-600">Approve or reject user testimonials</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search testimonials..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <MessageSquare className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Star className="text-yellow-600" size={24} />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <CheckCircle className="text-green-600" size={24} />
          </div>
        </div>
        <div className="bg-red-50 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="text-red-600" size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials
          .filter(testimonial => filter === 'all' || testimonial.status === filter)
          .map((testimonial) => (
          <div key={testimonial._id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-4">
              <img
                src={testimonial.author?.profilePhoto || '/default-avatar.png'}
                alt={testimonial.author?.firstName}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <p className="font-medium text-gray-900">
                  {testimonial.author?.firstName} {testimonial.author?.lastName}
                </p>
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < testimonial.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                    />
                  ))}
                  <span className="text-sm text-gray-500 ml-2">({testimonial.rating}.0)</span>
                </div>
              </div>
            </div>
            
            <p className="text-gray-700 mb-4 line-clamp-3">{testimonial.content}</p>
            
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>{formatDate(testimonial.createdAt)}</span>
              <span className="capitalize">{testimonial.author?.role}</span>
            </div>

            {testimonial.booking && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-gray-900">
                  Service: {testimonial.booking.service?.name}
                </p>
                <p className="text-xs text-gray-500">
                  Booking #{testimonial.booking._id?.slice(-6)}
                </p>
              </div>
            )}

            {testimonial.status === 'pending' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleApprove(testimonial._id)}
                  className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <CheckCircle size={16} />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => handleReject(testimonial._id)}
                  className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <XCircle size={16} />
                  <span>Reject</span>
                </button>
              </div>
            )}

            {testimonial.status !== 'pending' && (
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  testimonial.status === 'approved' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {testimonial.status}
                </span>
                <button
                  onClick={() => setSelectedTestimonial(testimonial)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Eye size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {testimonials.filter(t => filter === 'all' || t.status === filter).length === 0 && (
        <div className="text-center py-12">
          <Star size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">No testimonials found</p>
          <p className="text-gray-400">Adjust your search or filter to see more results</p>
        </div>
      )}

      {/* Testimonial Detail Modal */}
      {selectedTestimonial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Testimonial Details</h3>
              <button
                onClick={() => setSelectedTestimonial(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <img
                  src={selectedTestimonial.author?.profilePhoto || '/default-avatar.png'}
                  alt={selectedTestimonial.author?.firstName}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedTestimonial.author?.firstName} {selectedTestimonial.author?.lastName}
                  </p>
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={i < selectedTestimonial.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 capitalize">{selectedTestimonial.author?.role}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Testimonial</h4>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {selectedTestimonial.content}
                </p>
              </div>

              {selectedTestimonial.booking && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Related Booking</h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-900">
                      <strong>Service:</strong> {selectedTestimonial.booking.service?.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Booking ID:</strong> #{selectedTestimonial.booking._id?.slice(-6)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Date:</strong> {formatDate(selectedTestimonial.booking.scheduledDate)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Submitted: {formatDate(selectedTestimonial.createdAt)}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedTestimonial.status === 'approved' 
                    ? 'bg-green-100 text-green-800'
                    : selectedTestimonial.status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedTestimonial.status}
                </span>
              </div>

              {selectedTestimonial.status === 'pending' && (
                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      handleApprove(selectedTestimonial._id)
                      setSelectedTestimonial(null)
                    }}
                    className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Approve Testimonial
                  </button>
                  <button
                    onClick={() => {
                      handleReject(selectedTestimonial._id)
                      setSelectedTestimonial(null)
                    }}
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Reject Testimonial
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestimonialModeration