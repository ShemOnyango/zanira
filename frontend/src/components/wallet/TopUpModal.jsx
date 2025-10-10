// frontend/src/components/wallet/TopUpModal.jsx
import { useState } from 'react'
import { DollarSign, Phone, CreditCard, AlertCircle } from 'lucide-react'
import Modal from '../common/Modal'
import FormInput from '../forms/FormInput'
import LoadingSpinner from '../common/LoadingSpinner'

export default function TopUpModal({ isOpen, onClose, onTopUp, wallet }) {
  const [amount, setAmount] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const predefinedAmounts = [100, 500, 1000, 2000, 5000, 10000]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || !phoneNumber) return

    setLoading(true)
    try {
      await onTopUp({
        amount: parseInt(amount),
        phoneNumber,
        method: 'mpesa'
      })
      setStep(2)
    } catch (error) {
      console.error('Top-up failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setAmount('')
    setPhoneNumber('')
    setStep(1)
    setLoading(false)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Funds to Wallet"
      size="md"
    >
      {step === 1 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Amount (KES)
            </label>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {predefinedAmounts.map((predefinedAmount) => (
                <button
                  key={predefinedAmount}
                  type="button"
                  onClick={() => setAmount(predefinedAmount.toString())}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    amount === predefinedAmount.toString()
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-300 hover:border-teal-300'
                  }`}
                >
                  {predefinedAmount.toLocaleString()}
                </button>
              ))}
            </div>
            
            <FormInput
              type="number"
              placeholder="Or enter custom amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="10"
              max="70000"
              icon={DollarSign}
            />
          </div>

          {/* Phone Number */}
          <FormInput
            label="M-Pesa Phone Number"
            type="tel"
            placeholder="+254712345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
            icon={Phone}
            pattern="^\+254[17]\d{8}$"
          />

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Method
            </label>
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">M-Pesa STK Push</p>
                  <p className="text-gray-600 text-sm">You will receive a payment prompt on your phone</p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Important:</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Ensure your phone is nearby and has signal</li>
                  <li>You will receive an M-Pesa prompt to enter your PIN</li>
                  <li>Funds will be available immediately after confirmation</li>
                  <li>Transaction fee of KES 33 applies for amounts above KES 100</li>
                </ul>
              </div>
            </div>
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
              disabled={!amount || !phoneNumber || loading || parseInt(amount) < 10}
              className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {loading && <LoadingSpinner size="sm" />}
              <span>Continue to Payment</span>
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Phone className="w-8 h-8 text-green-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Check Your Phone
            </h3>
            <p className="text-gray-600">
              We've sent an M-Pesa payment request to <strong>{phoneNumber}</strong>
            </p>
            <p className="text-gray-600 mt-2">
              Amount: <strong>KES {parseInt(amount).toLocaleString()}</strong>
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-700">
                <p>Please check your phone and enter your M-Pesa PIN to complete the payment.</p>
                <p className="mt-1">This window will close automatically when payment is confirmed.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-3 pt-4">
            <button
              onClick={handleClose}
              className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}