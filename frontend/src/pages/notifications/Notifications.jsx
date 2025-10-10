// frontend/src/pages/notifications/Notifications.jsx
import { useState, useEffect } from 'react'
import { 
  Bell, 
  Check, 
  Trash2, 
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
  Star,
  DollarSign,
  Calendar,
  MessageSquare
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { notificationAPI } from '../../lib/api'
import { useSocket } from '../../contexts/SocketContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import Modal from '../../components/common/Modal'
import { formatRelativeTime, truncateText } from '../../lib/utils'


export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [filteredNotifications, setFilteredNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all, unread, read
  const [showSettings, setShowSettings] = useState(false)
  const socket = useSocket()

  // API hooks
  const { execute: fetchNotifications } = useApi(notificationAPI.getAll, { showToast: false })
  const { execute: markAsRead } = useApi(notificationAPI.markAsRead, { showToast: false })
  const { execute: markAllAsRead } = useApi(notificationAPI.markAllAsRead, { successMessage: 'All notifications marked as read' })
  const { execute: deleteNotification } = useApi(notificationAPI.delete, { successMessage: 'Notification deleted' })
  const { execute: updatePreferences } = useApi(notificationAPI.updatePreferences, { successMessage: 'Preferences updated' })

  // Load notifications
  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const resp = await fetchNotifications()

      // Normalize the response so notifications is always an array
      let notificationsArray = []
      if (resp) {
        if (Array.isArray(resp)) {
          notificationsArray = resp
        } else if (resp.data && Array.isArray(resp.data.notifications)) {
          notificationsArray = resp.data.notifications
        } else if (Array.isArray(resp.notifications)) {
          notificationsArray = resp.notifications
        } else if (resp.data && Array.isArray(resp.data)) {
          notificationsArray = resp.data
        } else {
          const maybeArray = Object.values(resp).find(v => Array.isArray(v))
          if (Array.isArray(maybeArray)) notificationsArray = maybeArray
        }
      }

      setNotifications(notificationsArray)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  // Socket.io for real-time notifications
  useEffect(() => {
    if (socket) {
      socket.on('new_notification', (notification) => {
        setNotifications(prev => [notification, ...prev])
      })

      return () => {
        socket.off('new_notification')
      }
    }
  }, [socket])

  // Filter notifications
  useEffect(() => {
    let filtered = notifications

    if (filter === 'unread') {
      filtered = filtered.filter(notification => !notification.read)
    } else if (filter === 'read') {
      filtered = filtered.filter(notification => notification.read)
    }

    setFilteredNotifications(filtered)
  }, [notifications, filter])

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId)
      setNotifications(prev => prev.map(notif => 
        notif._id === notificationId ? { ...notif, read: true } : notif
      ))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  // Delete notification
  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId)
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId))
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  // Clear all notifications
  const handleClearAll = async () => {
    // Implementation for clearing all notifications
    console.log('Clear all notifications')
  }

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    const icons = {
      booking: Calendar,
      payment: DollarSign,
      message: MessageSquare,
      system: Info,
      success: CheckCircle,
      warning: AlertCircle,
      rating: Star
    }
    return icons[type] || Bell
  }

  // Get notification color based on type
  const getNotificationColor = (type) => {
    const colors = {
      booking: 'text-blue-600 bg-blue-100',
      payment: 'text-green-600 bg-green-100',
      message: 'text-purple-600 bg-purple-100',
      system: 'text-gray-600 bg-gray-100',
      success: 'text-green-600 bg-green-100',
      warning: 'text-yellow-600 bg-yellow-100',
      rating: 'text-yellow-600 bg-yellow-100'
    }
    return colors[type] || 'text-gray-600 bg-gray-100'
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage message={error} onRetry={loadNotifications} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-heading">Notifications</h1>
            <p className="text-gray-600 mt-2">
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
              {filter !== 'all' && ` (${filter})`}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleMarkAllAsRead}
              disabled={notifications.filter(n => !n.read).length === 0}
              className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Check className="w-5 h-5" />
              <span>Mark All Read</span>
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
          <div className="flex space-x-4">
            {['all', 'unread', 'read'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  filter === filterType
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterType} ({filterType === 'all' ? notifications.length : 
                              filterType === 'unread' ? notifications.filter(n => !n.read).length :
                              notifications.filter(n => n.read).length})
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-2xl shadow-soft">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? "You're all caught up!" 
                  : `No ${filter} notifications`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type)
                
                return (
                  <div
                    key={notification._id}
                    className={`p-6 transition-colors ${
                      !notification.read ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {notification.title}
                          </h3>
                          <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>

                        <p className="text-gray-700 mb-3">
                          {notification.message}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center space-x-4">
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification._id)}
                              className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center space-x-1"
                            >
                              <Check className="w-4 h-4" />
                              <span>Mark as read</span>
                            </button>
                          )}

                          {notification.actionUrl && (
                            <a
                              href={notification.actionUrl}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              View details
                            </a>
                          )}

                          <button
                            onClick={() => handleDelete(notification._id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center space-x-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Load More */}
        {filteredNotifications.length > 0 && (
          <div className="mt-6 text-center">
            <button className="bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
              Load More Notifications
            </button>
          </div>
        )}
      </div>

      {/* Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={updatePreferences}
      />
    </div>
  )
}

// Add the missing NotificationSettingsModal component
const NotificationSettingsModal = ({ isOpen, onClose, onSave }) => {
  const [preferences, setPreferences] = useState({
    email: true,
    push: true,
    sms: false,
    bookingUpdates: true,
    paymentNotifications: true,
    promotional: false
  })

  const handleSave = async () => {
    try {
      await onSave(preferences)
      onClose()
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }

  const togglePreference = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Settings"
      size="md"
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          Choose how you want to be notified about different activities.
        </div>

        {[
          { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
          { key: 'push', label: 'Push Notifications', description: 'Receive browser push notifications' },
          { key: 'sms', label: 'SMS Notifications', description: 'Receive text message notifications' },
          { key: 'bookingUpdates', label: 'Booking Updates', description: 'Updates about your bookings' },
          { key: 'paymentNotifications', label: 'Payment Notifications', description: 'Payment confirmations and reminders' },
          { key: 'promotional', label: 'Promotional Notifications', description: 'Special offers and updates' }
        ].map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between py-2">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{label}</div>
              <div className="text-sm text-gray-500">{description}</div>
            </div>
            <button
              onClick={() => togglePreference(key)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                preferences[key] ? 'bg-teal-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  preferences[key] ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          Save Preferences
        </button>
      </div>
    </Modal>
  )
}