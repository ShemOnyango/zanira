// frontend/src/components/profile/SecuritySettings.jsx
import { useState } from 'react'
import { Shield, Eye, EyeOff, Key, Smartphone, Save } from 'lucide-react'
import FormInput from '../forms/FormInput'
import LoadingSpinner from '../common/LoadingSpinner'

export default function SecuritySettings({ profile, onSave, saving }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: profile.twoFactorEnabled || false
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (formData.newPassword) {
      if (formData.newPassword.length < 8) {
        newErrors.newPassword = 'Password must be at least 8 characters long'
      }

      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required to change password'
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    // Only send password fields if they're being changed
    const dataToSave = {
      twoFactorEnabled: formData.twoFactorEnabled
    }

    if (formData.newPassword) {
      dataToSave.currentPassword = formData.currentPassword
      dataToSave.newPassword = formData.newPassword
    }

    await onSave(dataToSave)

    // Clear password fields after successful save
    setFormData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 font-heading mb-6">Security Settings</h2>

        {/* Change Password */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Key className="w-5 h-5 text-gray-600" />
            <span>Change Password</span>
          </h3>

          <div className="space-y-4">
            <FormInput
              label="Current Password"
              type={showCurrentPassword ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              error={errors.currentPassword}
              icon={Shield}
              placeholder="Enter your current password"
              rightIcon={showCurrentPassword ? EyeOff : Eye}
              onRightIconClick={() => setShowCurrentPassword(!showCurrentPassword)}
            />

            <FormInput
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              error={errors.newPassword}
              icon={Key}
              placeholder="Enter new password"
              rightIcon={showNewPassword ? EyeOff : Eye}
              onRightIconClick={() => setShowNewPassword(!showNewPassword)}
              helpText="Password must be at least 8 characters long"
            />

            <FormInput
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              icon={Key}
              placeholder="Confirm your new password"
              rightIcon={showConfirmPassword ? EyeOff : Eye}
              onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-gray-600" />
            <span>Two-Factor Authentication</span>
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">SMS Authentication</p>
              <p className="text-gray-600 text-sm mt-1">
                Receive a verification code via SMS when logging in
              </p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.twoFactorEnabled}
                onChange={(e) => handleInputChange('twoFactorEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-700 text-sm">
              <strong>Note:</strong> Two-factor authentication adds an extra layer of security to your account. 
              When enabled, you'll need to enter a verification code sent to your phone in addition to your password when logging in.
            </p>
          </div>
        </div>

        {/* Security Tips */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">Security Tips</h3>
          <ul className="text-yellow-700 text-sm space-y-2">
            <li>• Use a strong, unique password that you don't use elsewhere</li>
            <li>• Enable two-factor authentication for added security</li>
            <li>• Never share your password or verification codes with anyone</li>
            <li>• Log out from shared devices after use</li>
            <li>• Update your password regularly</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving}
          className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          {saving && <LoadingSpinner size="sm" />}
          <Save className="w-5 h-5" />
          <span>Save Security Settings</span>
        </button>
      </div>
    </form>
  )
}