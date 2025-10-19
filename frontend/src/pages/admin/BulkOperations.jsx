// frontend/src/pages/admin/BulkOperations.jsx
import { useState } from 'react'
import { Zap, Users, Mail, Shield, Download, CheckCircle, AlertCircle } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { bulkAPI } from '../../lib/api'

const BulkOperations = () => {
  const [selectedAction, setSelectedAction] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    recipientType: 'all'
  })
  const [emailData, setEmailData] = useState({
    subject: '',
    htmlContent: '',
    recipientType: 'all'
  })
  const [loading, setLoading] = useState(false)

  const { execute: bulkUsers } = useApi(bulkAPI.users, { showToast: true })
  const { execute: bulkNotifications } = useApi(bulkAPI.notifications, { showToast: true })
  const { execute: bulkEmails } = useApi(bulkAPI.emails, { showToast: true })
  const { execute: bulkVerifyFundis } = useApi(bulkAPI.verifyFundis, { showToast: true })
  const { execute: bulkExport } = useApi(bulkAPI.exportData, { showToast: true })

  const bulkActions = [
    {
      id: 'verify_fundis',
      title: 'Bulk Verify Fundis',
      description: 'Verify multiple fundis at once',
      icon: Shield,
      color: 'green',
      action: () => bulkVerifyFundis({ action: 'verify', userIds: selectedUsers })
    },
    {
      id: 'activate_users',
      title: 'Bulk Activate Users',
      description: 'Activate suspended user accounts',
      icon: Users,
      color: 'blue',
      action: () => bulkUsers({ action: 'activate', userIds: selectedUsers })
    },
    {
      id: 'suspend_users',
      title: 'Bulk Suspend Users',
      description: 'Temporarily suspend user accounts',
      icon: Users,
      color: 'red',
      action: () => bulkUsers({ action: 'suspend', userIds: selectedUsers })
    },
    {
      id: 'send_notification',
      title: 'Bulk Notification',
      description: 'Send notifications to multiple users',
      icon: Mail,
      color: 'purple',
      action: () => bulkNotifications(notificationData)
    },
    {
      id: 'send_email',
      title: 'Bulk Email',
      description: 'Send email campaigns to users',
      icon: Mail,
      color: 'orange',
      action: () => bulkEmails(emailData)
    },
    {
      id: 'export_data',
      title: 'Bulk Export',
      description: 'Export data in various formats',
      icon: Download,
      color: 'gray',
      action: () => bulkExport({ dataType: 'all', format: 'json' })
    }
  ]

  const recipientTypes = [
    { value: 'all', label: 'All Users' },
    { value: 'clients', label: 'Clients Only' },
    { value: 'fundis', label: 'Fundis Only' },
    { value: 'shop_owners', label: 'Shop Owners Only' },
    { value: 'admins', label: 'Admins Only' }
  ]

  const handleBulkAction = async (action) => {
    setLoading(true)
    try {
      await action()
      // Reset form
      setSelectedAction('')
      setSelectedUsers([])
      setNotificationData({ title: '', message: '', recipientType: 'all' })
      setEmailData({ subject: '', htmlContent: '', recipientType: 'all' })
    } catch (error) {
      console.error('Bulk action failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      title: 'Verify All Pending Fundis',
      description: 'Approve all fundis waiting for verification',
      action: () => bulkVerifyFundis({ action: 'verify_all_pending' }),
      icon: Shield,
      color: 'green'
    },
    {
      title: 'Send Welcome Email',
      description: 'Send welcome message to new users',
      action: () => bulkEmails({
        subject: 'Welcome to Zanira BuildLink!',
        htmlContent: '<p>Welcome to our platform...</p>',
        recipientType: 'all'
      }),
      icon: Mail,
      color: 'blue'
    },
    {
      title: 'Export User Data',
      description: 'Download complete user database',
      action: () => bulkExport({ dataType: 'users', format: 'csv' }),
      icon: Download,
      color: 'purple'
    },
    {
      title: 'System Cleanup',
      description: 'Remove inactive users and old data',
      action: () => bulkUsers({ action: 'cleanup' }),
      icon: Zap,
      color: 'orange'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Operations</h1>
          <p className="text-gray-600">Perform mass actions across the platform</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <AlertCircle size={16} />
          <span>Use with caution - these actions affect multiple users</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon
          const colorClasses = {
            green: 'text-green-600 bg-green-50 border-green-200',
            blue: 'text-blue-600 bg-blue-50 border-blue-200',
            purple: 'text-purple-600 bg-purple-50 border-purple-200',
            orange: 'text-orange-600 bg-orange-50 border-orange-200'
          }

          return (
            <button
              key={index}
              onClick={() => handleBulkAction(action.action)}
              disabled={loading}
              className={`p-4 border rounded-lg hover:shadow-md transition-all text-left ${colorClasses[action.color]} hover:scale-105 disabled:opacity-50`}
            >
              <Icon size={24} className="mb-2" />
              <h3 className="font-semibold text-current">{action.title}</h3>
              <p className="text-sm opacity-75 mt-1">{action.description}</p>
            </button>
          )
        })}
      </div>

      {/* Bulk Action Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Management */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Management</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Action
              </label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose an action...</option>
                <option value="activate">Activate Users</option>
                <option value="suspend">Suspend Users</option>
                <option value="verify">Verify Fundis</option>
                <option value="delete">Delete Users</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Users (Optional)
              </label>
              <textarea
                placeholder="Enter user IDs separated by commas, or leave empty for all users"
                value={selectedUsers.join(', ')}
                onChange={(e) => setSelectedUsers(e.target.value.split(',').map(id => id.trim()).filter(Boolean))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={() => {
                const action = bulkActions.find(a => a.id === `${selectedAction}_users`)
                if (action) handleBulkAction(action.action)
              }}
              disabled={!selectedAction || loading}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Execute User Action
            </button>
          </div>
        </div>

        {/* Notification Center */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Notification</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Type
              </label>
              <select
                value={notificationData.recipientType}
                onChange={(e) => setNotificationData({ ...notificationData, recipientType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {recipientTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Title
              </label>
              <input
                type="text"
                value={notificationData.title}
                onChange={(e) => setNotificationData({ ...notificationData, title: e.target.value })}
                placeholder="Enter notification title"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={notificationData.message}
                onChange={(e) => setNotificationData({ ...notificationData, message: e.target.value })}
                placeholder="Enter your notification message"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={() => handleBulkAction(() => bulkNotifications(notificationData))}
              disabled={!notificationData.title || !notificationData.message || loading}
              className="w-full bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Send Bulk Notification
            </button>
          </div>
        </div>
      </div>

      {/* Email Campaign */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Campaign</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Type
              </label>
              <select
                value={emailData.recipientType}
                onChange={(e) => setEmailData({ ...emailData, recipientType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {recipientTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                placeholder="Email subject"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Content (HTML)
            </label>
            <textarea
              value={emailData.htmlContent}
              onChange={(e) => setEmailData({ ...emailData, htmlContent: e.target.value })}
              placeholder="Enter your email content in HTML format"
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => handleBulkAction(() => bulkEmails(emailData))}
              disabled={!emailData.subject || !emailData.htmlContent || loading}
              className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Send Email Campaign
            </button>
            <button className="px-6 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors">
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Data Export */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Export</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => bulkExport({ dataType: 'users', format: 'csv' })}
            disabled={loading}
            className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-center disabled:opacity-50"
          >
            <Users className="mx-auto mb-2 text-blue-600" size={24} />
            <span className="font-medium text-blue-900">Export Users</span>
          </button>
          <button
            onClick={() => bulkExport({ dataType: 'bookings', format: 'csv' })}
            disabled={loading}
            className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-center disabled:opacity-50"
          >
            <CheckCircle className="mx-auto mb-2 text-green-600" size={24} />
            <span className="font-medium text-green-900">Export Bookings</span>
          </button>
          <button
            onClick={() => bulkExport({ dataType: 'payments', format: 'csv' })}
            disabled={loading}
            className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-center disabled:opacity-50"
          >
            <Download className="mx-auto mb-2 text-purple-600" size={24} />
            <span className="font-medium text-purple-900">Export Payments</span>
          </button>
          <button
            onClick={() => bulkExport({ dataType: 'all', format: 'json' })}
            disabled={loading}
            className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-center disabled:opacity-50"
          >
            <Zap className="mx-auto mb-2 text-gray-600" size={24} />
            <span className="font-medium text-gray-900">Export All Data</span>
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      {loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="text-yellow-600" size={20} />
            <div>
              <p className="text-yellow-800 font-medium">Bulk operation in progress</p>
              <p className="text-yellow-700 text-sm">
                Please wait while the system processes your request. This may take a few minutes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BulkOperations