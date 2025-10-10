// frontend/src/components/wallet/PinSetupModal.jsx
import { useState } from 'react'
import { Shield, Eye, EyeOff } from 'lucide-react'
import Modal from '../common/Modal'
import LoadingSpinner from '../common/LoadingSpinner'

export default function PinSetupModal({ isOpen, onClose, onSetPin, hasPin }) {
  const [pin, setPin] = useState(['', '', '', ''])
  const [confirmPin, setConfirmPin] = useState(['', '', '', ''])
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePinChange = (value, index, isConfirm = false) => {
    if (!/^\d?$/.test(value)) return

    const targetPin = isConfirm ? [...confirmPin] : [...pin]
    targetPin[index] = value

    if (isConfirm) {
      setConfirmPin(targetPin)
    } else {
      setPin(targetPin)
    }

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`${isConfirm ? 'confirm-' : ''}pin-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleKeyDown = (e, index, isConfirm = false) => {
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      const prevInput = document.getElementById(`${isConfirm ? 'confirm-' : ''}pin-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const pinString = pin.join('')
    const confirmPinString = confirmPin.join('')

    if (pinString.length !== 4) {
      setError('Please enter a 4-digit PIN')
      return
    }

    if (pinString !== confirmPinString) {
      setError('PINs do not match')
      return
    }

    if (!/^\d{4}$/.test(pinString)) {
      setError('PIN must contain only numbers')
      return
    }

    setLoading(true)
    setError('')

    try {
      await onSetPin(pinString)
      handleClose()
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to set PIN')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPin(['', '', '', ''])
    setConfirmPin(['', '', '', ''])
    setShowPin(false)
    setError('')
    setLoading(false)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={hasPin ? 'Change Wallet PIN' : 'Set Up Wallet PIN'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-teal-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {hasPin ? 'Change Your PIN' : 'Create a Secure PIN'}
          </h3>
          <p className="text-gray-600 text-sm">
            {hasPin 
              ? 'Enter your new 4-digit PIN to secure your wallet'
              : 'Set up a 4-digit PIN to secure your wallet transactions'
            }
          </p>
        </div>

        {/* PIN Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Enter {hasPin ? 'New' : ''} PIN
            </label>
            <div className="flex space-x-3 justify-center">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  id={`pin-${index}`}
                  type={showPin ? 'text' : 'password'}
                  value={digit}
                  onChange={(e) => handlePinChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  maxLength={1}
                  className="w-14 h-14 text-center text-2xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  pattern="\d"
                  inputMode="numeric"
                />
              ))}
            </div>
          </div>

          {/* Confirm PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Confirm PIN
            </label>
            <div className="flex space-x-3 justify-center">
              {confirmPin.map((digit, index) => (
                <input
                  key={index}
                  id={`confirm-pin-${index}`}
                  type={showPin ? 'text' : 'password'}
                  value={digit}
                  onChange={(e) => handlePinChange(e.target.value, index, true)}
                  onKeyDown={(e) => handleKeyDown(e, index, true)}
                  maxLength={1}
                  className="w-14 h-14 text-center text-2xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  pattern="\d"
                  inputMode="numeric"
                />
              ))}
            </div>
          </div>

          {/* Show/Hide PIN */}
          <div className="flex items-center justify-center space-x-2">
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showPin ? 'Hide PIN' : 'Show PIN'}</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Security Tips */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">Security Tips:</h4>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• Don't use obvious numbers like 1234 or your birth year</li>
            <li>• Never share your PIN with anyone</li>
            <li>• The platform will never ask for your PIN</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || pin.join('').length !== 4 || confirmPin.join('').length !== 4}
            className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading && <LoadingSpinner size="sm" />}
            <span>{hasPin ? 'Change PIN' : 'Set PIN'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}