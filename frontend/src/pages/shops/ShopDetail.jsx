import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Phone, Mail, Globe, Star, Clock,
  Package, CheckCircle, Facebook, Twitter, Instagram,
  Calendar, TrendingUp, Users, ShoppingBag
} from 'lucide-react'
import { shopAPI } from '../../lib/api'
import { useApi } from '../../hooks/useApi'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'

const ShopDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [shop, setShop] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const { execute: fetchShop, loading, error } = useApi(shopAPI.getById, { showToast: false })

  useEffect(() => {
    loadShop()
  }, [id])

  const loadShop = async () => {
    try {
      const response = await fetchShop(id)
      if (response?.data?.shop) {
        setShop(response.data.shop)
      }
    } catch (err) {
      console.error('Failed to load shop:', err)
    }
  }

  const getDaySchedule = (day) => {
    const schedule = shop?.operatingHours?.[day.toLowerCase()]
    if (!schedule) return 'N/A'
    if (schedule.closed) return 'Closed'
    return `${schedule.open} - ${schedule.close}`
  }

  const isOpenNow = () => {
    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const currentTime = now.toTimeString().slice(0, 5)

    const schedule = shop?.operatingHours?.[currentDay]
    if (!schedule || schedule.closed) return false

    return currentTime >= schedule.open && currentTime <= schedule.close
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  if (error || !shop) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorMessage message={error || 'Shop not found'} />
        <button
          onClick={() => navigate('/shops')}
          className="mt-4 text-blue-600 hover:text-blue-700 font-medium flex items-center"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Shops
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/shops')}
        className="mb-6 text-gray-600 hover:text-gray-900 font-medium flex items-center"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Shops
      </button>

      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="h-64 bg-gradient-to-br from-blue-500 to-blue-600 relative">
          {shop.catalog && shop.catalog[0] && (
            <img
              src={shop.catalog[0]}
              alt={shop.shopName}
              className="w-full h-full object-cover"
            />
          )}
          {shop.verification?.overallStatus === 'verified' && (
            <div className="absolute top-6 right-6 bg-green-500 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2">
              <CheckCircle size={20} />
              Verified Shop
            </div>
          )}
          {isOpenNow() && (
            <div className="absolute bottom-6 right-6 bg-green-500 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 animate-pulse">
              <Clock size={16} />
              Open Now
            </div>
          )}
        </div>

        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{shop.shopName}</h1>
              <p className="text-gray-600 mb-4">{shop.description}</p>

              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center text-gray-700">
                  <MapPin size={20} className="mr-2 text-blue-600" />
                  <span>{shop.location?.address}, {shop.location?.town}, {shop.location?.county}</span>
                </div>
                {shop.stats?.rating > 0 && (
                  <div className="flex items-center text-gray-700">
                    <Star size={20} className="mr-2 text-yellow-400" fill="currentColor" />
                    <span className="font-semibold">{shop.stats.rating.toFixed(1)}</span>
                    <span className="ml-1 text-gray-500">({shop.stats.totalTransactions} reviews)</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {shop.shopType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  {shop.pricingTier?.charAt(0).toUpperCase() + shop.pricingTier?.slice(1)} Pricing
                </span>
                {shop.yearsInOperation && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                    {shop.yearsInOperation}+ Years
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <a href={`tel:${shop.contactPhone}`} className="flex items-center text-gray-700 hover:text-blue-600">
              <Phone size={18} className="mr-2" />
              <span>{shop.contactPhone}</span>
            </a>
            {shop.contactEmail && (
              <a href={`mailto:${shop.contactEmail}`} className="flex items-center text-gray-700 hover:text-blue-600">
                <Mail size={18} className="mr-2" />
                <span>{shop.contactEmail}</span>
              </a>
            )}
            {shop.website && (
              <a href={shop.website} target="_blank" rel="noopener noreferrer" className="flex items-center text-gray-700 hover:text-blue-600">
                <Globe size={18} className="mr-2" />
                <span>Visit Website</span>
              </a>
            )}
            <div className="flex items-center gap-3">
              {shop.socialMedia?.facebook && (
                <a href={shop.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600">
                  <Facebook size={20} />
                </a>
              )}
              {shop.socialMedia?.twitter && (
                <a href={shop.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600">
                  <Twitter size={20} />
                </a>
              )}
              {shop.socialMedia?.instagram && (
                <a href={shop.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600">
                  <Instagram size={20} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <ShoppingBag className="text-blue-600" size={24} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{shop.stats?.totalTransactions || 0}</p>
          <p className="text-sm text-gray-600">Total Orders</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="text-green-600" size={24} />
          </div>
          <p className="text-2xl font-bold text-gray-900">KES {(shop.stats?.totalRevenue || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-600">Total Revenue</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="text-purple-600" size={24} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{(shop.stats?.fundiCustomers || 0) + (shop.stats?.clientCustomers || 0)}</p>
          <p className="text-sm text-gray-600">Total Customers</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <Package className="text-orange-600" size={24} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{shop.inventory?.length || 0}</p>
          <p className="text-sm text-gray-600">Products Available</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['overview', 'inventory', 'hours'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">About This Shop</h3>
                <p className="text-gray-700">{shop.description || 'No description available.'}</p>
              </div>

              {shop.location && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Location</h3>
                  <div className="space-y-2">
                    <p className="text-gray-700">{shop.location.address}</p>
                    {shop.location.building && <p className="text-gray-600">Building: {shop.location.building}</p>}
                    {shop.location.floor && <p className="text-gray-600">Floor: {shop.location.floor}</p>}
                    {shop.location.landmark && <p className="text-gray-600">Landmark: {shop.location.landmark}</p>}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Methods</h3>
                <div className="flex flex-wrap gap-2">
                  {shop.paymentMethods?.map((method) => (
                    <span key={method} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {method.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Products</h3>
              {shop.inventory && shop.inventory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shop.inventory.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.product?.name || 'Product'}</h4>
                          {item.sku && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
                        </div>
                        <Package size={20} className="text-gray-400" />
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-lg font-bold text-gray-900">KES {item.price?.toLocaleString()}</span>
                        <span className={`text-sm ${item.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.quantity > 0 ? `${item.quantity} in stock` : 'Out of stock'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-12">No inventory information available</p>
              )}
            </div>
          )}

          {activeTab === 'hours' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Operating Hours</h3>
              <div className="space-y-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <div key={day} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="font-medium text-gray-900">{day}</span>
                    <span className="text-gray-600">{getDaySchedule(day)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShopDetail
