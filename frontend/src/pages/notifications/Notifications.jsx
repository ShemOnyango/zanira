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
import { bulkAPI, chatAPI } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
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
  const [activeTab, setActiveTab] = useState('inbox') // inbox or sent
  const [sentItems, setSentItems] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const socket = useSocket()
  const { user } = useAuthStore()

  // API hooks
  const { execute: fetchNotifications } = useApi(notificationAPI.getAll, { showToast: false })
  const { execute: markAsRead } = useApi(notificationAPI.markAsRead, { showToast: false })
  const { execute: markAllAsRead } = useApi(notificationAPI.markAllAsRead, { successMessage: 'All notifications marked as read' })
  const { execute: deleteNotification } = useApi(notificationAPI.delete, { successMessage: 'Notification deleted' })
  const { execute: updatePreferences } = useApi(notificationAPI.updatePreferences, { successMessage: 'Preferences updated' })
  const { execute: sendBulkNotifications } = useApi(bulkAPI.notifications, { showToast: true })
  const { execute: sendBulkEmails } = useApi(bulkAPI.emails, { showToast: true })
  const { execute: createChat } = useApi(chatAPI.createChat, { showToast: true })

  // Modal for sending targeted notifications (admin only)
  const SendNotificationModal = ({ isOpen, onClose, onSend }) => {
    const [recipientType, setRecipientType] = useState('all')
    const [recipientIds, setRecipientIds] = useState('')
    const [title, setTitle] = useState('')
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)

    const handleSend = async () => {
      try {
        setSending(true)
        if (!title || title.trim().length === 0) {
          alert('Title is required');
          setSending(false);
          return;
        }

        const payload = {
          title,
          message,
          recipientType: recipientType === 'specific' ? undefined : recipientType,
          recipientIds: recipientType === 'specific' ? (recipientIds ? recipientIds.split(',').map(s => s.trim()) : []) : undefined,
          // normalize to server-side enum-friendly values
          notificationType: 'system_alert',
          action: 'dismiss'
        }
        await onSend(payload)
        onClose()
      } catch (err) {
        console.error('Failed to send notifications', err)
      } finally {
        setSending(false)
      }
    }

    if (!isOpen) return null

    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Send Notification" size="md">
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Target</label>
            <select value={recipientType} onChange={(e) => setRecipientType(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300">
              <option value="all">All Users</option>
              <option value="fundi">Fundis</option>
              <option value="client">Clients</option>
              <option value="shop_owner">Shop Owners</option>
              <option value="system">System Users</option>
              <option value="specific">Specific User IDs (comma separated)</option>
            </select>
          </div>

          {recipientType === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Recipient IDs</label>
              <input value={recipientIds} onChange={(e) => setRecipientIds(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300" placeholder="id1,id2,..." />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="mt-1 block w-full rounded-md border-gray-300" />
          </div>

          <div className="flex justify-end space-x-3">
            <button onClick={onClose} className="px-4 py-2 bg-white border rounded">Cancel</button>
            <button onClick={handleSend} disabled={sending} className="px-4 py-2 bg-blue-600 text-white rounded">{sending ? 'Sending...' : 'Send'}</button>
          </div>
        </div>
      </Modal>
    )
  }

  // Modal for creating a new chat or sending bulk email
  const NewMessageModal = ({ isOpen, onClose, onCreateChat, onSendEmail }) => {
    const [mode, setMode] = useState('chat') // chat or email
    const [chatType, setChatType] = useState('group')
    const [participants, setParticipants] = useState('')
    const [initialMessage, setInitialMessage] = useState('')
    const [subject, setSubject] = useState('')
    const [htmlContent, setHtmlContent] = useState('')
    const [sending, setSending] = useState(false)

    const handleCreate = async () => {
      try {
        setSending(true)
        if (mode === 'chat') {
          const payload = {
            chatType,
            participants: participants ? participants.split(',').map(s => s.trim()) : undefined,
            initialMessage
          }
          await onCreateChat(payload)
        } else {
          const payload = {
            subject,
            htmlContent,
            recipientType: 'all' // allow choosing later; keep simple for now
          }
          await onSendEmail(payload)
        }
        onClose()
      } catch (err) {
        console.error('Failed to create chat/send email', err)
      } finally {
        setSending(false)
      }
    }

    if (!isOpen) return null

    return (
      <Modal isOpen={isOpen} onClose={onClose} title="New Message / Email" size="md">
        <div className="space-y-4 p-4">
          <div className="flex items-center space-x-3">
            <button onClick={() => setMode('chat')} className={`px-3 py-2 rounded ${mode === 'chat' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Chat</button>
            <button onClick={() => setMode('email')} className={`px-3 py-2 rounded ${mode === 'email' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Email</button>
          </div>

          {mode === 'chat' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Chat Type</label>
                <select value={chatType} onChange={(e) => setChatType(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300">
                  <option value="group">Group</option>
                  <option value="direct">Direct</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Participants (user ids comma separated)</label>
                <input value={participants} onChange={(e) => setParticipants(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300" placeholder="userId1,userId2" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Initial Message</label>
                <textarea value={initialMessage} onChange={(e) => setInitialMessage(e.target.value)} rows={4} className="mt-1 block w-full rounded-md border-gray-300" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">HTML Content</label>
                <textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} rows={6} className="mt-1 block w-full rounded-md border-gray-300" />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3">
            <button onClick={onClose} className="px-4 py-2 bg-white border rounded">Cancel</button>
            <button onClick={handleCreate} disabled={sending} className="px-4 py-2 bg-indigo-600 text-white rounded">{sending ? 'Sending...' : mode === 'chat' ? 'Create Chat' : 'Send Email'}</button>
          </div>
        </div>
      </Modal>
    )
  }

  // Hook up modals to API calls via existing useApi execute functions
  // We'll render them below (inside the Notifications component render)

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
      socket.on('notification:new', (notification) => {
        setNotifications(prev => [notification, ...prev])
      })

      // Admin summary for bulk sends
      socket.on('bulk:notification:sent', (summary) => {
        setSentItems(prev => [summary, ...prev])
      })

      return () => {
        socket.off('new_notification')
        socket.off('bulk:notification:sent')
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
            {user && (user.role === 'admin' || user.role === 'super_admin') && (
              <>
                <button
                  onClick={() => setShowSendModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Bell className="w-5 h-5" />
                  <span>New Notification</span>
                </button>

                <button
                  onClick={() => setShowMessageModal(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>New Message/Email</span>
                </button>
              </>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'inbox' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              Inbox
            </button>
            {user && (user.role === 'admin' || user.role === 'super_admin') && (
              <button
                onClick={() => setActiveTab('sent')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'sent' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                Sent ({sentItems.length})
              </button>
            )}
          </div>
        </div>

        {/* Filters (only when showing inbox) */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
          {activeTab === 'inbox' && (
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
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-2xl shadow-soft">
          {activeTab === 'inbox' ? (
            filteredNotifications.length === 0 ? (
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
            )
          ) : (
            // Sent tab
            <div className="p-6">
              {sentItems.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No sent notifications yet</h3>
                  <p className="text-gray-600">Send a bulk notification to see it listed here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sentItems.map((s, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm text-gray-500">Sent at: {new Date().toLocaleString()}</div>
                          <div className="font-semibold text-gray-900">Total: {s.total} — Successful: {s.successful} — Failed: {s.failed}</div>
                        </div>
                        <div className="text-sm text-gray-600">Results: {s.results?.length || 0}</div>
                      </div>
                      {s.results && (
                        <details className="mt-3">
                          <summary className="text-sm text-indigo-600 cursor-pointer">View results</summary>
                          <pre className="text-xs mt-2 overflow-auto max-h-40 bg-gray-50 p-2 rounded">{JSON.stringify(s.results, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
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

      {/* Send Notification Modal (admin) */}
      <SendNotificationModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSend={async (payload) => {
          // payload should include title, message, recipientType or recipientIds
          await sendBulkNotifications(payload)
        }}
      />

      {/* New Message / Email Modal (admin) */}
      <NewMessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        onCreateChat={async (payload) => {
          // payload: { chatType, participants, initialMessage }
          await createChat(payload)
        }}
        onSendEmail={async (payload) => {
          // payload: { subject, htmlContent, recipientType }
          await sendBulkEmails(payload)
        }}
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