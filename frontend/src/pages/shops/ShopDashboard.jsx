import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Store, TrendingUp, Package, Users, Plus, Edit2, Settings,
  Clock, MapPin, Phone, Mail, Star, ShoppingBag, Activity,
  Calendar, BarChart3, ChevronRight
} from 'lucide-react'
import { shopAPI } from '../../lib/api'
import { useApi } from '../../hooks/useApi'
import { useAuthStore } from '../../store/authStore'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'

const ShopDashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [shop, setShop] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const { execute: fetchShops, loading: loadingShops } = useApi(shopAPI.getAll, { showToast: false })
  const { execute: fetchAnalytics, loading: loadingAnalytics } = useApi(shopAPI.getAnalytics, { showToast: false })

  useEffect(() => {
    loadShopData()
  }, [])

  const loadShopData = async () => {
    try {
      const response = await fetchShops({ user: user._id })
      if (response?.data?.shops && response.data.shops.length > 0) {
        const myShop = response.data.shops[0]
        setShop(myShop)
        loadAnalytics(myShop._id)
      }
    } catch (err) {
      console.error('Failed to load shop:', err)
    }
  }

  const loadAnalytics = async (shopId) => {
    try {
      const response = await fetchAnalytics(shopId)
      if (response?.data?.analytics) {
        setAnalytics(response.data.analytics)
      }
    } catch (err) {
      console.error('Failed to load analytics:', err)
    }
  }

  const isOpenNow = () => {
    if (!shop?.operatingHours) return false
    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const currentTime = now.toTimeString().slice(0, 5)

    const schedule = shop.operatingHours[currentDay]
    if (!schedule || schedule.closed) return false

    return currentTime >= schedule.open && currentTime <= schedule.close
  }

  if (loadingShops) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Store size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Shop Found</h2>
          <p className="text-gray-600 mb-6">You haven't created a shop yet. Create one to start selling.</p>
          <button
            onClick={() => navigate('/shops/create')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Create Your Shop
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Store size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{shop.shopName}</h1>
              <p className="text-gray-600">{shop.shopType?.replace(/_/g, ' ')}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  shop.verification?.overallStatus === 'verified'
                    ? 'bg-green-100 text-green-800'
                    : shop.verification?.overallStatus === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {shop.verification?.overallStatus || 'Pending'}
                </span>
                {isOpenNow() ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Open Now
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                    Closed
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/shops/${shop._id}/edit`)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Edit2 size={18} />
              Edit Shop
            </button>
            <button
              onClick={() => navigate(`/shops/${shop._id}`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Activity size={18} />
              View Public Page
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center text-gray-600">
            <MapPin size={18} className="mr-2" />
            <span className="text-sm">{shop.location?.town}, {shop.location?.county}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Phone size={18} className="mr-2" />
            <span className="text-sm">{shop.contactPhone}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Mail size={18} className="mr-2" />
            <span className="text-sm">{shop.contactEmail}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingBag className="text-blue-600" size={24} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{shop.stats?.totalTransactions || 0}</p>
          <p className="text-sm text-gray-600">Total Orders</p>
          <div className="mt-2 flex items-center text-sm text-green-600">
            <TrendingUp size={16} className="mr-1" />
            <span>+12% this month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">KES {(shop.stats?.totalRevenue || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-600">Total Revenue</p>
          <div className="mt-2 flex items-center text-sm text-green-600">
            <TrendingUp size={16} className="mr-1" />
            <span>+8% this month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="text-purple-600" size={24} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {(shop.stats?.fundiCustomers || 0) + (shop.stats?.clientCustomers || 0)}
          </p>
          <p className="text-sm text-gray-600">Total Customers</p>
          <div className="mt-2 text-sm text-gray-500">
            <span>{shop.stats?.fundiCustomers || 0} Fundis, {shop.stats?.clientCustomers || 0} Clients</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="text-orange-600" size={24} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{shop.inventory?.length || 0}</p>
          <p className="text-sm text-gray-600">Products</p>
          <button
            onClick={() => setActiveTab('inventory')}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage Inventory →
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'inventory', label: 'Inventory', icon: Package },
              { key: 'orders', label: 'Orders', icon: ShoppingBag },
              { key: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <ShoppingBag size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">New Order #ORD-00{i}</p>
                          <p className="text-sm text-gray-600">2 hours ago</p>
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center">
                        View
                        <ChevronRight size={16} className="ml-1" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {analytics && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Average Transaction</p>
                      <p className="text-2xl font-bold text-gray-900">
                        KES {(analytics.averageTransaction || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Commission Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{shop.commissionRate}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Manage Inventory</h3>
                <button
                  onClick={() => navigate(`/shops/${shop._id}/inventory/add`)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Product
                </button>
              </div>

              {shop.inventory && shop.inventory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shop.inventory.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{item.product?.name || 'Product'}</h4>
                          {item.sku && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                          <Edit2 size={16} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Price</span>
                          <span className="font-semibold text-gray-900">KES {item.price?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Stock</span>
                          <span className={`font-semibold ${item.quantity > 10 ? 'text-green-600' : item.quantity > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {item.quantity} units
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Package size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-4">No products in inventory yet</p>
                  <button
                    onClick={() => navigate(`/shops/${shop._id}/inventory/add`)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Your First Product
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="text-center py-12">
              <ShoppingBag size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">Order management coming soon</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Shop Settings</h3>
                <button
                  onClick={() => navigate(`/shops/${shop._id}/edit`)}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Settings size={20} className="text-gray-600" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Edit Shop Details</p>
                      <p className="text-sm text-gray-600">Update shop information, location, and contact details</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShopDashboard
