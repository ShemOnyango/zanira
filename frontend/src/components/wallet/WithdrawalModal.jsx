// frontend/src/components/wallet/WithdrawalModal.jsx
import { useState } from 'react'
import { DollarSign, Phone, Bank, AlertCircle } from 'lucide-react'
import Modal from '../common/Modal'
import FormInput from '../forms/FormInput'
import FormSelect from '../forms/FormSelect'
import LoadingSpinner from '../common/LoadingSpinner'

export default function WithdrawalModal({ isOpen, onClose, onWithdraw, wallet }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('mpesa')
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(false)

  const withdrawalMethods = [
    { value: 'mpesa', label: 'M-Pesa', icon: Phone },
    { value: 'bank', label: 'Bank Transfer', icon: Bank }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || !destination) return

    setLoading(true)
    try {
      await onWithdraw({
        amount: parseInt(amount),
        method,
        destination: method === 'mpesa' ? { mpesaNumber: destination } : { bankAccount: destination }
      })
      onClose()
    } catch (error) {
      console.error('Withdrawal failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setAmount('')
    setMethod('mpesa')
    setDestination('')
    setLoading(false)
    onClose()
  }

  const getDestinationPlaceholder = () => {
    return method === 'mpesa' ? '+254712345678' : 'Bank Account Number'
  }

  const getDestinationLabel = () => {
    return method === 'mpesa' ? 'M-Pesa Phone Number' : 'Bank Account Number'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Withdraw Funds"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Available Balance */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Available Balance:</span>
            <span className="text-lg font-semibold text-gray-900">
              {wallet ? `KES ${wallet.available?.toLocaleString()}` : 'KES 0'}
            </span>
          </div>
        </div>

        {/* Withdrawal Method */}
        <FormSelect
          label="Withdrawal Method"
          value={method}
          onChange={(e) => {
            setMethod(e.target.value)
            setDestination('')
          }}
          options={withdrawalMethods.map(method => ({
            value: method.value,
            label: method.label
          }))}
          required
        />

        {/* Amount */}
        <FormInput
          label="Amount (KES)"
          type="number"
          placeholder="Enter amount to withdraw"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="100"
          max={wallet?.available || 100}
          required
          icon={DollarSign}
        />

        {/* Destination */}
        <FormInput
          label={getDestinationLabel()}
          type={method === 'mpesa' ? 'tel' : 'text'}
          placeholder={getDestinationPlaceholder()}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
          icon={method === 'mpesa' ? Phone : Bank}
          pattern={method === 'mpesa' ? '^\\+254[17]\\d{8}$' : undefined}
        />

        {/* Withdrawal Limits */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Withdrawal Information:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Minimum withdrawal: KES 100</li>
                <li>Maximum daily withdrawal: KES 100,000</li>
                <li>Processing time: 2-24 hours</li>
                <li>Withdrawal fee: KES 27 (for M-Pesa)</li>
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
            disabled={!amount || !destination || loading || parseInt(amount) < 100 || parseInt(amount) > (wallet?.available || 0)}
            className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading && <LoadingSpinner size="sm" />}
            <span>Request Withdrawal</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}