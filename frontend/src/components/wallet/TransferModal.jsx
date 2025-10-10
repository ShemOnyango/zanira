// frontend/src/components/wallet/TransferModal.jsx
import { useState } from 'react'
import { DollarSign, User, Search, AlertCircle } from 'lucide-react'
import Modal from '../common/Modal'
import FormInput from '../forms/FormInput'
import LoadingSpinner from '../common/LoadingSpinner'

export default function TransferModal({ isOpen, onClose, onTransfer, wallet }) {
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)

  const handleSearch = async (query) => {
    if (query.length < 3) {
      setSearchResults([])
      return
    }

    // Mock search - replace with actual API call
    const mockResults = [
      { _id: '1', name: 'John Doe', email: 'john@example.com', phone: '+254712345678' },
      { _id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '+254723456789' },
    ].filter(user => 
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase()) ||
      user.phone.includes(query)
    )

    setSearchResults(mockResults)
  }

  const handleSelectUser = (user) => {
    setSelectedUser(user)
    setRecipient(user._id)
    setSearchResults([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || !recipient) return

    setLoading(true)
    try {
      await onTransfer({
        recipientId: recipient,
        amount: parseInt(amount),
        description: description || 'Fund transfer'
      })
      onClose()
    } catch (error) {
      console.error('Transfer failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setAmount('')
    setRecipient('')
    setDescription('')
    setSelectedUser(null)
    setSearchResults([])
    setLoading(false)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Transfer to User"
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

        {/* Recipient Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient
          </label>
          
          {selectedUser ? (
            <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedUser.name}</p>
                  <p className="text-teal-700 text-sm">{selectedUser.phone} • {selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null)
                  setRecipient('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-gray-600 text-sm">{user.phone} • {user.email}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Amount */}
        <FormInput
          label="Amount (KES)"
          type="number"
          placeholder="Enter amount to transfer"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="10"
          max={wallet?.available || 10}
          required
          icon={DollarSign}
        />

        {/* Description */}
        <FormInput
          label="Description (Optional)"
          type="text"
          placeholder="e.g., Payment for services"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Transfer Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Transfer Information:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Minimum transfer: KES 10</li>
                <li>Maximum daily transfer: KES 50,000</li>
                <li>Transfers are instant and free</li>
                <li>Double-check recipient details before sending</li>
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
            disabled={!amount || !recipient || loading || parseInt(amount) < 10 || parseInt(amount) > (wallet?.available || 0)}
            className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading && <LoadingSpinner size="sm" />}
            <span>Send Transfer</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}