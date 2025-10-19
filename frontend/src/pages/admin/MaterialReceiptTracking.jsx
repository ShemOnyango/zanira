// frontend/src/pages/admin/MaterialReceiptTracking.jsx
import { useState, useEffect } from 'react'
import { Search, Filter, Package, CheckCircle, XCircle, Eye, Download, DollarSign } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { materialReceiptAPI, shopAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { formatCurrency, formatDate } from '../../lib/utils'

const MaterialReceiptTracking = () => {
  const [receipts, setReceipts] = useState([])
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [filter, setFilter] = useState('all')

  const { execute: fetchReceipts } = useApi(materialReceiptAPI.getReceipts, { showToast: false })
  const { execute: fetchShops } = useApi(shopAPI.getAll, { showToast: false })
  const { execute: verifyReceipt } = useApi(materialReceiptAPI.verifyReceipt, { showToast: true })
  const { execute: rejectReceipt } = useApi(materialReceiptAPI.rejectReceipt, { showToast: true })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [receiptsData, shopsData] = await Promise.all([
        fetchReceipts(),
        fetchShops()
      ])

      if (receiptsData) setReceipts(receiptsData.data || [])
      if (shopsData) setShops(shopsData.data || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (receiptId) => {
    try {
      await verifyReceipt(receiptId)
      loadData()
    } catch (error) {
      console.error('Failed to verify receipt:', error)
    }
  }

  const handleReject = async (receiptId, reason = 'Invalid receipt') => {
    try {
      await rejectReceipt(receiptId, reason)
      loadData()
    } catch (error) {
      console.error('Failed to reject receipt:', error)
    }
  }

  const filteredReceipts = receipts.filter(receipt => 
    filter === 'all' || receipt.status === filter
  )

  const getStatusStats = () => {
    const stats = {
      pending: receipts.filter(r => r.status === 'pending').length,
      verified: receipts.filter(r => r.status === 'verified').length,
      rejected: receipts.filter(r => r.status === 'rejected').length,
      total: receipts.length,
      totalAmount: receipts.reduce((sum, receipt) => sum + (receipt.totalAmount || 0), 0)
    }
    return stats
  }

  const stats = getStatusStats()

  if (loading) {
    return <LoadingSpinner size="xl" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Material Receipt Tracking</h1>
          <p className="text-gray-600">Verify and track material purchase receipts</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search receipts..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Receipts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Package className="text-yellow-600" size={24} />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
            </div>
            <CheckCircle className="text-green-600" size={24} />
          </div>
        </div>
        <div className="bg-red-50 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="text-red-600" size={24} />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalAmount)}</p>
            </div>
            <DollarSign className="text-purple-600" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking & Fundi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shop
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
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
              {filteredReceipts.map((receipt) => (
                <tr key={receipt._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        #{receipt._id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(receipt.createdAt)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Items: {receipt.items?.length || 0}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Booking #{receipt.booking?._id?.slice(-6)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {receipt.booking?.service?.name}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <img
                          src={receipt.fundi?.profilePhoto || '/default-avatar.png'}
                          alt={receipt.fundi?.firstName}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-sm text-gray-600">
                          {receipt.fundi?.firstName} {receipt.fundi?.lastName}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <img
                        src={receipt.shop?.logo || '/default-shop.png'}
                        alt={receipt.shop?.shopName}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {receipt.shop?.shopName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {receipt.shop?.town}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(receipt.totalAmount)}
                    </p>
                    {receipt.commission && (
                      <p className="text-xs text-gray-500">
                        Commission: {formatCurrency(receipt.commission)}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      receipt.status === 'verified' 
                        ? 'bg-green-100 text-green-800'
                        : receipt.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {receipt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedReceipt(receipt)}
                        className="text-blue-500 hover:text-blue-700"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {receipt.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleVerify(receipt._id)}
                            className="text-green-500 hover:text-green-700"
                            title="Verify Receipt"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(receipt._id)}
                            className="text-red-500 hover:text-red-700"
                            title="Reject Receipt"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        title="Download Receipt"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReceipts.length === 0 && (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No receipts found</p>
            <p className="text-gray-400">Adjust your search or filter to see more results</p>
          </div>
        )}
      </div>

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Receipt Details</h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Receipt Information */}
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Receipt Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Receipt ID:</span>
                      <span className="font-medium">#{selectedReceipt._id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>{formatDate(selectedReceipt.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedReceipt.status === 'verified' 
                          ? 'bg-green-100 text-green-800'
                          : selectedReceipt.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedReceipt.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-medium text-lg text-gray-900">
                        {formatCurrency(selectedReceipt.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shop Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Shop Information</h4>
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedReceipt.shop?.logo || '/default-shop.png'}
                      alt={selectedReceipt.shop?.shopName}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedReceipt.shop?.shopName}
                      </p>
                      <p className="text-sm text-gray-600">{selectedReceipt.shop?.shopType}</p>
                      <p className="text-sm text-gray-500">
                        {selectedReceipt.shop?.address}, {selectedReceipt.shop?.town}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items and Actions */}
              <div className="space-y-4">
                {/* Items List */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Purchased Items</h4>
                  <div className="space-y-3">
                    {selectedReceipt.items?.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-white rounded">
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <span className="font-medium text-sm">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                {selectedReceipt.status === 'pending' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-3">Verification Actions</h4>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          handleVerify(selectedReceipt._id)
                          setSelectedReceipt(null)
                        }}
                        className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Verify Receipt
                      </button>
                      <button
                        onClick={() => {
                          handleReject(selectedReceipt._id)
                          setSelectedReceipt(null)
                        }}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Reject Receipt
                      </button>
                    </div>
                  </div>
                )}

                {/* Download Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3">Export Options</h4>
                  <div className="flex space-x-2">
                    <button className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2">
                      <Download size={16} />
                      <span>Download PDF</span>
                    </button>
                    <button className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors">
                      Export to Excel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaterialReceiptTracking