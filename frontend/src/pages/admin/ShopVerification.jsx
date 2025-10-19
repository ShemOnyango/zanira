// frontend/src/pages/admin/ShopVerification.jsx
import { useState, useEffect } from 'react'
import { Search, Filter, CheckCircle, XCircle, Eye, MapPin, Clock, ShoppingCart } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { shopAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const ShopVerification = () => {
  const [shops, setShops] = useState([])
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const { execute: fetchShops } = useApi(shopAPI.getPendingShops, { showToast: false })
  const { execute: verifyShop } = useApi(shopAPI.verify, { showToast: true })
  const { execute: updateShop } = useApi(shopAPI.update, { showToast: true })

  useEffect(() => {
    loadShops()
  }, [])

  const loadShops = async () => {
    try {
      setLoading(true)
      const shopsData = await fetchShops()
      if (shopsData) {
        const payload = shopsData.data ?? shopsData ?? []
        setShops(Array.isArray(payload) ? payload : [])
      }
    } catch (error) {
      console.error('Failed to load shops:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (shopId, commissionRate) => {
    try {
      await verifyShop(shopId)
      if (commissionRate) {
        await updateShop(shopId, { commissionRate })
      }
      loadShops() // Refresh the list
    } catch (error) {
      console.error('Failed to verify shop:', error)
    }
  }

  const handleReject = async (shopId) => {
    try {
      await updateShop(shopId, { status: 'rejected' })
      loadShops()
    } catch (error) {
      console.error('Failed to reject shop:', error)
    }
  }

  const filteredShops = shops.filter(shop => {
    const matchesSearch = shop.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shop.owner?.firstName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || shop.status === filter
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
                          {shop.owner?.firstName} {shop.owner?.lastName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-900">
                      <MapPin size={16} />
                      <span>{shop.town}, {shop.county}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{shop.address}</p>
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      shop.verified 
                        ? 'bg-green-100 text-green-800'
                        : shop.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {shop.verified ? 'Verified' : shop.status === 'rejected' ? 'Rejected' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {!shop.verified && shop.status !== 'rejected' && (
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