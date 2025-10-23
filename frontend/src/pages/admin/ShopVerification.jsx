// frontend/src/pages/admin/ShopVerification.jsx
import { useState, useEffect } from 'react'
import { Search, Filter, CheckCircle, XCircle, Eye, MapPin, Clock, ShoppingCart } from 'lucide-react'
import Modal from '../../components/common/Modal'
import { useApi } from '../../hooks/useApi'
import { shopAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const ShopVerification = () => {
  const [shops, setShops] = useState([])
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedShop, setSelectedShop] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  const { execute: fetchShops } = useApi(shopAPI.getPendingShops, { showToast: false })
  const { execute: verifyShop } = useApi((id, data) => shopAPI.verify(id, data), { showToast: true })
  const { execute: updateShop } = useApi(shopAPI.update, { showToast: true })

  useEffect(() => {
    loadShops()
  }, [])

  const loadShops = async () => {
    try {
      setLoading(true)
      const shopsData = await fetchShops()
      if (shopsData) {
        // support multiple response shapes: { data: { shops } } | { shops } | [shop,...]
        const shopsList = shopsData?.data?.shops || shopsData?.shops || (Array.isArray(shopsData?.data) ? shopsData.data : null) || (Array.isArray(shopsData) ? shopsData : null) || []
        setShops(Array.isArray(shopsList) ? shopsList : [])
      }
    } catch (error) {
      console.error('Failed to load shops:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (shopId, commissionRate) => {
    try {
      // call verify endpoint with status 'verified'
      await verifyShop(shopId, { status: 'verified' })
      if (commissionRate !== undefined && commissionRate !== null) {
        await updateShop(shopId, { commissionRate })
      }
      loadShops() // Refresh the list
    } catch (error) {
      console.error('Failed to verify shop:', error)
    }
  }

  const handleReject = async (shopId) => {
    try {
      // prefer using verify endpoint to set status to rejected
      await verifyShop(shopId, { status: 'rejected' })
      loadShops()
    } catch (error) {
      console.error('Failed to reject shop:', error)
    }
  }

  const filteredShops = shops.filter(shop => {
    const ownerName = `${shop.user?.firstName || ''} ${shop.user?.lastName || ''}`.toLowerCase()
    const matchesSearch = shop.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) || ownerName.includes(searchTerm.toLowerCase())
    const status = shop.verification?.overallStatus || 'pending'
    const matchesFilter = filter === 'all' || status === filter
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return <LoadingSpinner size="xl" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shop Verification</h1>
          <p className="text-gray-600">Verify shops and set commission rates</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search shops..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Shops</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shop Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission
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
              {filteredShops.map((shop) => (
                <tr key={shop._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <img
                            src={shop.logo || '/default-shop.png'}
                            alt={shop.shopName}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{shop.shopName}</p>
                        <p className="text-sm text-gray-500">{shop.shopType}</p>
                            <p className="text-sm text-gray-500">
                              {shop.user?.firstName} {shop.user?.lastName}
                            </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-900">
                      <MapPin size={16} />
                          <span>{shop.location?.town || '-'}, {shop.location?.county || '-'}</span>
                    </div>
                        <p className="text-sm text-gray-500 mt-1">{shop.location?.address || ''}</p>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      step="0.5"
                      defaultValue={shop.commissionRate || 10}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onChange={(e) => {
                        // Update commission rate in state
                        const newShops = shops.map(s => 
                          s._id === shop._id 
                            ? { ...s, commissionRate: parseFloat(e.target.value) }
                            : s
                        )
                        setShops(newShops)
                      }}
                    />
                    <span className="text-sm text-gray-500 ml-1">%</span>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const status = shop.verification?.overallStatus || 'pending'
                      const isVerified = status === 'verified'
                      return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isVerified
                            ? 'bg-green-100 text-green-800'
                            : status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {isVerified ? 'Verified' : status === 'rejected' ? 'Rejected' : 'Pending'}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {!(shop.verification?.overallStatus === 'verified') && shop.verification?.overallStatus !== 'rejected' && (
                        <>
                          <button
                            onClick={() => handleVerify(shop._id, shop.commissionRate)}
                            className="bg-green-500 text-white p-2 rounded hover:bg-green-600 transition-colors"
                            title="Verify Shop"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(shop._id)}
                            className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors"
                            title="Reject Shop"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      <button
                        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
                        title="View Details"
                        onClick={() => {
                          setSelectedShop(shop)
                          setShowDetails(true)
                        }}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Details Modal (uses shared Modal component) */}
        <Modal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title={selectedShop ? selectedShop.shopName : 'Shop Details'}
          size="lg"
        >
          {selectedShop ? (
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{selectedShop.shopType}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <img
                    src={selectedShop.logo || '/default-shop.png'}
                    alt={selectedShop.shopName}
                    className="w-full h-48 object-cover rounded"
                  />
                  <div>
                    <p className="text-sm text-gray-600">Owner</p>
                    <p className="text-gray-900">{selectedShop.user?.firstName} {selectedShop.user?.lastName}</p>
                    {selectedShop.user?.email && <p className="text-sm text-gray-500">{selectedShop.user.email}</p>}
                    {selectedShop.user?.phone && <p className="text-sm text-gray-500">{selectedShop.user.phone}</p>}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Commission Rate</p>
                    <p className="text-gray-900">{selectedShop.commissionRate ?? 10}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Verification Status</p>
                    <p className="text-gray-900">{selectedShop.verification?.overallStatus || 'pending'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="text-gray-900">{selectedShop.location?.town || '-'}, {selectedShop.location?.county || '-'}</p>
                    <p className="text-sm text-gray-500">{selectedShop.location?.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="text-gray-900">{selectedShop.description || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Documents</p>
                    {Array.isArray(selectedShop.documents) && selectedShop.documents.length > 0 ? (
                      <ul className="list-disc list-inside text-sm text-gray-700">
                        {selectedShop.documents.map((d, i) => (
                          <li key={i} className="flex items-center justify-between">
                            <span className="mr-2">{d.name || `Document ${i+1}`}</span>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setPreviewFile(d.url || d)
                                  setShowPreview(true)
                                }}
                                className="text-blue-600 underline text-sm"
                                type="button"
                              >
                                View
                              </button>
                              <a href={d.url || d} target="_blank" rel="noreferrer" className="text-gray-600 text-sm">Open</a>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No documents available</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button onClick={() => setShowDetails(false)} className="px-4 py-2 bg-gray-100 rounded">Close</button>
              </div>
            </div>
          ) : null}
        </Modal>

        {/* File Preview Modal (re-uses same modal component) */}
        <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Document Preview" size="xl">
          <div className="flex justify-center p-4">
            {previewFile?.endsWith('.mp4') || previewFile?.includes('video') ? (
              <video controls className="w-full h-96 rounded-lg">
                <source src={previewFile} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : previewFile?.endsWith('.pdf') ? (
              <iframe src={previewFile} className="w-full h-96 rounded-lg" title="PDF Preview" />
            ) : (
              <img src={previewFile} alt="Preview" className="w-full h-96 object-contain rounded-lg" />
            )}
          </div>
          <div className="flex justify-end p-4">
            <button onClick={() => setShowPreview(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">Close</button>
          </div>
        </Modal>

        {filteredShops.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No shops found</p>
            <p className="text-gray-400">Adjust your search or filter to see more results</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Shops</p>
              <p className="text-2xl font-bold text-gray-900">{shops.length}</p>
            </div>
            <ShoppingCart className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {shops.filter(s => !s.verified && s.status !== 'rejected').length}
              </p>
            </div>
            <Clock className="text-yellow-600" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-green-600">
                {shops.filter(s => s.verified).length}
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
                {shops.filter(s => s.status === 'rejected').length}
              </p>
            </div>
            <XCircle className="text-red-600" size={24} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShopVerification