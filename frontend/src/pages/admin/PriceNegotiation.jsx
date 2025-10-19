// frontend/src/pages/admin/PriceNegotiation.jsx
import { useState, useEffect } from 'react'
import { Search, Filter, DollarSign, CheckCircle, XCircle, MessageSquare, Clock } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { adminAPI, bookingAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { formatCurrency, formatDate } from '../../lib/utils'

const PriceNegotiation = () => {
  const [negotiations, setNegotiations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNegotiation, setSelectedNegotiation] = useState(null)
  const [counterOffer, setCounterOffer] = useState('')

  const { execute: fetchNegotiations } = useApi(adminAPI.getPriceNegotiations, { showToast: false })
  const { execute: updateNegotiation } = useApi(adminAPI.updatePriceNegotiation, { showToast: true })

  useEffect(() => {
    loadNegotiations()
  }, [])

  const loadNegotiations = async () => {
    try {
      setLoading(true)
      const negotiationsData = await fetchNegotiations()
      if (negotiationsData) setNegotiations(negotiationsData.data || [])
    } catch (error) {
      console.error('Failed to load negotiations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (negotiationId, approvedPrice) => {
    try {
      await updateNegotiation(negotiationId, { 
        status: 'approved', 
        approvedPrice: approvedPrice || negotiations.find(n => n._id === negotiationId)?.proposedPrice 
      })
      loadNegotiations()
    } catch (error) {
      console.error('Failed to approve negotiation:', error)
    }
  }

  const handleReject = async (negotiationId) => {
    try {
      await updateNegotiation(negotiationId, { status: 'rejected' })
      loadNegotiations()
    } catch (error) {
      console.error('Failed to reject negotiation:', error)
    }
  }

  const handleCounterOffer = async (negotiationId) => {
    if (!counterOffer) return
    
    try {
      await updateNegotiation(negotiationId, { 
        status: 'counter_offered', 
        counterOffer: parseFloat(counterOffer) 
      })
      setCounterOffer('')
      setSelectedNegotiation(null)
      loadNegotiations()
    } catch (error) {
      console.error('Failed to submit counter offer:', error)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      counter_offered: 'bg-blue-100 text-blue-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return <LoadingSpinner size="xl" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Negotiation</h1>
          <p className="text-gray-600">Manage price negotiation requests from clients</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search negotiations..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>All Status</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Negotiations</p>
              <p className="text-2xl font-bold text-gray-900">{negotiations.length}</p>
            </div>
            <DollarSign className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {negotiations.filter(n => n.status === 'pending').length}
              </p>
            </div>
            <Clock className="text-yellow-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {negotiations.filter(n => n.status === 'approved').length}
              </p>
            </div>
            <CheckCircle className="text-green-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">
                {negotiations.filter(n => n.status === 'rejected').length}
              </p>
            </div>
            <XCircle className="text-red-600" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client & Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proposed Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Difference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {negotiations.map((negotiation) => (
                <tr key={negotiation._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={negotiation.client?.profilePhoto || '/default-avatar.png'}
                        alt={negotiation.client?.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {negotiation.client?.firstName} {negotiation.client?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{negotiation.service?.name}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(negotiation.createdAt)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(negotiation.originalPrice)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(negotiation.proposedPrice)}
                      </span>
                      {negotiation.counterOffer && (
                        <span className="text-xs text-blue-600">
                          Counter: {formatCurrency(negotiation.counterOffer)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${
                      negotiation.proposedPrice < negotiation.originalPrice 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {((negotiation.proposedPrice - negotiation.originalPrice) / negotiation.originalPrice * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(negotiation.status)}`}>
                      {negotiation.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {negotiation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(negotiation._id)}
                            className="bg-green-500 text-white p-2 rounded hover:bg-green-600 transition-colors"
                            title="Approve Price"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => setSelectedNegotiation(negotiation)}
                            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
                            title="Counter Offer"
                          >
                            <MessageSquare size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(negotiation._id)}
                            className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors"
                            title="Reject Negotiation"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {negotiations.length === 0 && (
          <div className="text-center py-12">
            <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No price negotiations</p>
            <p className="text-gray-400">All price negotiations have been processed</p>
          </div>
        )}
      </div>

      {/* Counter Offer Modal */}
      {selectedNegotiation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Make Counter Offer</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Client: {selectedNegotiation.client?.firstName} {selectedNegotiation.client?.lastName}</p>
                <p className="text-sm text-gray-600">Service: {selectedNegotiation.service?.name}</p>
                <p className="text-sm text-gray-600">Original: {formatCurrency(selectedNegotiation.originalPrice)}</p>
                <p className="text-sm text-gray-600">Proposed: {formatCurrency(selectedNegotiation.proposedPrice)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Counter Offer Amount
                </label>
                <input
                  type="number"
                  value={counterOffer}
                  onChange={(e) => setCounterOffer(e.target.value)}
                  placeholder="Enter counter offer amount"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleCounterOffer(selectedNegotiation._id)}
                  className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Submit Counter Offer
                </button>
                <button
                  onClick={() => {
                    setSelectedNegotiation(null)
                    setCounterOffer('')
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PriceNegotiation