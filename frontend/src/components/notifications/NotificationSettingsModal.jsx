// frontend/src/components/notifications/NotificationSettingsModal.jsx
import { useState } from 'react'
import { Bell, Save } from 'lucide-react'
import Modal from '../common/Modal'
import LoadingSpinner from '../common/LoadingSpinner'

export default function NotificationSettingsModal({ isOpen, onClose, onSave }) {
  const [preferences, setPreferences] = useState({
    email: {
      bookings: true,
      payments: true,
      messages: false,
      promotions: false,
      system: true
    },
    push: {
      bookings: true,
      payments: true,
      messages: true,
      promotions: false,
      system: true
    },
    sms: {
      bookings: false,
      payments: true,
      messages: false,
      promotions: false,
      system: false
    }
  })
  const [saving, setSaving] = useState(false)

  const notificationTypes = [
    {
      key: 'bookings',
      label: 'Bookings',
      description: 'Updates about your bookings and appointments'
    },
    {
      key: 'payments',
      label: 'Payments',
      description: 'Payment confirmations, receipts, and wallet updates'
    },
    {
      key: 'messages',
      label: 'Messages',
      description: 'New messages and chat notifications'
    },
    {
      key: 'promotions',
      label: 'Promotions',
      description: 'Special offers, discounts, and platform updates'
    },
    {
      key: 'system',
      label: 'System',
      description: 'Important platform announcements and security alerts'
    }
  ]

  const handlePreferenceChange = (channel, type, value) => {
    setPreferences(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [type]: value
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(preferences)
      onClose()
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Preferences"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700 text-sm">
            Choose how you want to be notified about different activities on the platform.
            You can customize notifications for each channel.
          </p>
        </div>

        {/* Notification Channels */}
        <div className="space-y-6">
          {/* Email Notifications */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h3>
            <div className="space-y-4">
              {notificationTypes.map((type) => (
                <div key={type.key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{type.label}</p>
                    <p className="text-gray-600 text-sm">{type.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.email[type.key]}
                      onChange={(e) => handlePreferenceChange('email', type.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Push Notifications */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Push Notifications</h3>
            <div className="space-y-4">
              {notificationTypes.map((type) => (
                <div key={type.key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{type.label}</p>
                    <p className="text-gray-600 text-sm">{type.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.push[type.key]}
                      onChange={(e) => handlePreferenceChange('push', type.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* SMS Notifications */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">SMS Notifications</h3>
            <div className="space-y-4">
              {notificationTypes.map((type) => (
                <div key={type.key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{type.label}</p>
                    <p className="text-gray-600 text-sm">{type.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.sms[type.key]}
                      onChange={(e) => handlePreferenceChange('sms', type.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiet Hours</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
          <p className="text-gray-600 text-sm mt-2">
            Notifications will be silenced during these hours (except for urgent system alerts)
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {saving && <LoadingSpinner size="sm" />}
            <Save className="w-5 h-5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}