// frontend/src/pages/bookings/BookingDetails.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  User, 
  MessageSquare,
  Star,
  Camera,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Phone,
  Mail,
  MoreVertical
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { bookingAPI, chatAPI, walletAPI } from '../../lib/api'
import { useSocket } from '../../contexts/SocketContext'
import { useAuthStore } from '../../store/authStore'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import Modal from '../../components/common/Modal'
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils'

export default function BookingDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const socket = useSocket()
  const { user } = useAuthStore()
  const [booking, setBooking] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [activeTab, setActiveTab] = useState('details')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')

  // API hooks
  const { execute: fetchBooking, loading: bookingLoading, error: bookingError } = useApi(bookingAPI.getById, { showToast: false })
  const { execute: fetchMessages, loading: messagesLoading } = useApi(chatAPI.getMessages, { showToast: false })
  const { execute: sendMessageApi, loading: sendingMessage } = useApi(chatAPI.sendMessage)
  const { execute: updateStatus } = useApi(bookingAPI.updateStatus)
  const { execute: confirmCompletion } = useApi(bookingAPI.confirmCompletion)
  const { execute: cancelBooking } = useApi(bookingAPI.cancel)
  const { execute: rateBooking } = useApi(bookingAPI.rate)
  const { execute: initiatePayment } = useApi(bookingAPI.initiatePayment)

  // Load booking data
  useEffect(() => {
    const loadBooking = async () => {
      try {
        const response = await fetchBooking(id)
        let bookingData = response

        // Handle nested data structure (response.data or response.data.booking)
        if (response && response.data) {
          // If API returned { data: { booking: {...} } }
          if (response.data.booking) bookingData = response.data.booking
          else bookingData = response.data
        }

        if (bookingData) {
          // Normalize chat id: some responses provide `chatId`, others embed `chatThread` object
          const normalizedChatId = bookingData.chatId || bookingData.chatThread?._id || bookingData.chatThread || null

          // Normalize participant shapes: some endpoints return { client: { user: {...} } } or { fundi: { user: {...} } }
          const normalizeParticipant = (obj) => {
            if (!obj) return null
            // if object has a nested 'user' field, return that user object for UI convenience
            if (obj.user) return obj.user
            return obj
          }

          const normalizedBooking = {
            ...bookingData,
            chatId: normalizedChatId,
            client: normalizeParticipant(bookingData.client),
            fundi: normalizeParticipant(bookingData.fundi),
            assignedFundi: normalizeParticipant(bookingData.assignedFundi),
          }

          setBooking(normalizedBooking)
          if (normalizedChatId) {
            loadMessages(normalizedChatId)
          }
        }
      } catch (error) {
        console.error('Failed to load booking:', error)
      }
    }

    loadBooking()
  }, [id])

  // Load messages
  // Load messages
  const loadMessages = async (chatId) => {
    if (!chatId) return
    try {
      const response = await fetchMessages(chatId)
      let messagesData = []

      if (response) {
        if (Array.isArray(response)) {
          messagesData = response
        } else if (response.data && Array.isArray(response.data)) {
          messagesData = response.data
        } else if (response.data && Array.isArray(response.data.messages)) {
          messagesData = response.data.messages
        } else {
          const maybeArray = Object.values(response).find(v => Array.isArray(v))
          if (Array.isArray(maybeArray)) messagesData = maybeArray
        }
      }

      setMessages(messagesData)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  // Socket.io for real-time messages
  useEffect(() => {
    if (socket && booking?.chatId) {
      socket.emit('join_booking_chat', booking.chatId)
      
      socket.on('new_message', (message) => {
        if (message.chatId === booking.chatId) {
          setMessages(prev => [...prev, message])
        }
      })

      socket.on('booking_updated', (updatedBooking) => {
        if (updatedBooking._id === booking._id) {
          setBooking(updatedBooking)
        }
      })

      return () => {
        socket.off('new_message')
        socket.off('booking_updated')
      }
    }
  }, [socket, booking])

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !booking?.chatId) return

    try {
      const resp = await sendMessageApi(booking.chatId, { 
        message: newMessage,
        type: 'text'
      })

      // Clear input
      setNewMessage('')

      // Refresh messages list to include the new message
      await loadMessages(booking.chatId)

      // Emit socket event for real-time update (if socket connected)
      if (socket && resp && resp.data && resp.data.message) {
        socket.emit('new_message', resp.data.message)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  // Update booking status
  const handleStatusUpdate = async (newStatus) => {
    try {
      const data = await updateStatus(id, newStatus)
      if (data) setBooking(data)
    } catch (error) {
      console.error('Status update failed:', error)
    }
  }

  // Confirm completion (client)
  const handleConfirmCompletion = async () => {
    try {
      const data = await confirmCompletion(id)
      if (data) setBooking(data)
    } catch (error) {
      console.error('Completion confirmation failed:', error)
    }
  }

  // Cancel booking
  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) return

    try {
      const data = await cancelBooking(id, cancelReason)
      if (data) {
        setBooking(data)
        setShowCancelModal(false)
        setCancelReason('')
      }
    } catch (error) {
      console.error('Cancellation failed:', error)
    }
  }

  // Submit rating
  const handleSubmitRating = async () => {
    try {
      const data = await rateBooking(id, { rating, review })
      if (data) {
        setBooking(data)
        setShowRatingModal(false)
        setRating(5)
        setReview('')
      }
    } catch (error) {
      console.error('Rating submission failed:', error)
    }
  }

  // Initiate payment
  const handleInitiatePayment = async () => {
    try {
      const data = await initiatePayment(id, {
        amount: booking.totalAmount,
        method: 'wallet' // or 'mpesa'
      })
      if (data) setBooking(data)
    } catch (error) {
      console.error('Payment initiation failed:', error)
    }
  }

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

  // Get status icon
  const getStatusIcon = (status) => {
    const icons = {
      pending: AlertCircle,
      confirmed: CheckCircle,
      in_progress: Clock,
      completed: CheckCircle,
      cancelled: XCircle,
      disputed: AlertCircle
    }
    return icons[status] || AlertCircle
  }

  // Check if user can perform actions
  const canUpdateStatus = user?.role === 'fundi' && ['pending', 'confirmed', 'in_progress'].includes(booking?.status)
  const canConfirmCompletion = user?.role === 'client' && booking?.status === 'in_progress'
  const canCancel = (user?.role === 'client' || user?.role === 'fundi') && 
                   ['pending', 'confirmed'].includes(booking?.status)
  const canRate = user?.role === 'client' && booking?.status === 'completed' && !booking.rating
  const canPay = user?.role === 'client' && booking?.status === 'completed' && !booking.paymentStatus

  if (bookingLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20 flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  if (bookingError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage 
            message={bookingError} 
            onRetry={() => fetchBooking(id)}
          />
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage message="Booking not found" />
        </div>
      </div>
    )
  }

  const StatusIcon = getStatusIcon(booking.status)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/bookings')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Bookings</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 font-heading">Booking Details</h1>
            <p className="text-gray-600 mt-2">Booking ID: {booking._id}</p>
          </div>

          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
              <StatusIcon className="w-4 h-4 mr-1" />
              {booking.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-soft">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {['details', 'chat', 'documents'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                        activeTab === tab
                          ? 'border-teal-500 text-teal-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab === 'chat' ? `Chat (${messages.length})` : tab}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Details Tab */}
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    {/* Service Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">Service</p>
                            <p className="font-medium">{booking.service?.name}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <DollarSign className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">Total Amount</p>
                            <p className="font-medium">{formatCurrency(booking.totalAmount)}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">Scheduled Date</p>
                            <p className="font-medium">{formatDate(booking.scheduledDate)}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">Scheduled Time</p>
                            <p className="font-medium">{booking.scheduledTime}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">{booking.location.address}</p>
                          <p className="text-gray-600">
                            {booking.location.town}, {booking.location.county}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Special Requirements */}
                    {booking.specialRequirements && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Requirements</h3>
                        <p className="text-gray-700">{booking.specialRequirements}</p>
                      </div>
                    )}

                    {/* Materials */}
                    {booking.materials && booking.materials.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Materials Needed</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {booking.materials.map((material, index) => (
                            <li key={index} className="text-gray-700">{material}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Images */}
                    {booking.images && booking.images.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Photos</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {booking.images.map((image, index) => (
                            <img
                              key={index}
                              src={image}
                              alt={`Job photo ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Chat Tab */}
                {activeTab === 'chat' && (
                  <div className="h-96 flex flex-col">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                      {messagesLoading ? (
                        <div className="flex justify-center py-8">
                          <LoadingSpinner size="md" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No messages yet</p>
                          <p className="text-sm">Start a conversation about this booking</p>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message._id}
                            className={`flex ${message.senderId === user._id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.senderId === user._id
                                  ? 'bg-teal-500 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                message.senderId === user._id ? 'text-teal-100' : 'text-gray-500'
                              }`}>
                                {formatRelativeTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Message Input */}
                    <form onSubmit={handleSendMessage} className="flex space-x-4">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        disabled={sendingMessage}
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || sendingMessage}
                        className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                      >
                        {sendingMessage ? <LoadingSpinner size="sm" /> : <MessageSquare className="w-4 h-4" />}
                        <span>Send</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents & Receipts</h3>
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No documents uploaded yet</p>
                      <p className="text-sm">Receipts and documents will appear here after job completion</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                {canUpdateStatus && (
                  <>
                    {booking.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate('confirmed')}
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Accept Booking
                      </button>
                    )}
                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusUpdate('in_progress')}
                        className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors"
                      >
                        Start Job
                      </button>
                    )}
                    {booking.status === 'in_progress' && (
                      <button
                        onClick={() => handleStatusUpdate('completed')}
                        className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Mark as Completed
                      </button>
                    )}
                  </>
                )}

                {canConfirmCompletion && (
                  <button
                    onClick={handleConfirmCompletion}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Confirm Completion
                  </button>
                )}

                {canCancel && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Cancel Booking
                  </button>
                )}

                {canRate && (
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="w-full bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    Rate & Review
                  </button>
                )}

                {canPay && (
                  <button
                    onClick={handleInitiatePayment}
                    className="w-full bg-teal-500 text-white py-2 px-4 rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    Make Payment
                  </button>
                )}

                {(user?.role === 'admin' || user?.role === 'super_admin') && (
                  <button className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
                    Admin Actions
                  </button>
                )}
              </div>
            </div>

            {/* Participant Info */}
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {user?.role === 'client' ? 'Assigned Fundi' : 'Client'}
              </h3>
              
              <div className="flex items-center space-x-3">
                <img
                  src={user?.role === 'client' ? booking.assignedFundi?.profilePhoto : booking.client?.profilePhoto}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {user?.role === 'client' 
                      ? `${booking.assignedFundi?.firstName} ${booking.assignedFundi?.lastName}`
                      : `${booking.client?.firstName} ${booking.client?.lastName}`
                    }
                  </p>
                  <p className="text-gray-600 text-sm">
                    {user?.role === 'client' ? booking.assignedFundi?.skills?.[0] : 'Client'}
                  </p>
                  <div className="flex items-center space-x-4 mt-1">
                    <button className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1">
                      <Phone className="w-3 h-3" />
                      <span>Call</span>
                    </button>
                    <button className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1">
                      <Mail className="w-3 h-3" />
                      <span>Email</span>
                    </button>
                  </div>
                </div>
              </div>

              {user?.role === 'client' && booking.assignedFundi?.rating && (
                <div className="mt-4 flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= booking.assignedFundi.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {booking.assignedFundi.rating} ({booking.assignedFundi.completedJobs} jobs)
                  </span>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-4">
                {booking.timeline?.map((event, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-teal-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{event.status}</p>
                      <p className="text-gray-600 text-sm">{formatRelativeTime(event.timestamp)}</p>
                      {event.note && <p className="text-gray-500 text-sm mt-1">{event.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Booking Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Booking"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Please provide a reason for cancellation:</p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Enter cancellation reason..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowCancelModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCancelBooking}
              disabled={!cancelReason.trim()}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Confirm Cancellation
            </button>
          </div>
        </div>
      </Modal>

      {/* Rating Modal */}
      <Modal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        title="Rate & Review"
      >
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-600 mb-4">How would you rate this service?</p>
            <div className="flex justify-center space-x-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="text-2xl focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review (Optional)
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowRatingModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitRating}
              className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors"
            >
              Submit Review
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}