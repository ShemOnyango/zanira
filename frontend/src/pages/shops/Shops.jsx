import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Filter, MapPin, Clock, Star, Store,
  ChevronRight, Package, Phone, Mail, ExternalLink
} from 'lucide-react'
import { shopAPI } from '../../lib/api'
import { useApi } from '../../hooks/useApi'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'

const Shops = () => {
  const navigate = useNavigate()
  const [shops, setShops] = useState([])
  const [filteredShops, setFilteredShops] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    shopType: '',
    county: '',
    pricingTier: '',
    verificationStatus: 'verified'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const { execute: fetchShops, loading, error } = useApi(shopAPI.getAll, { showToast: false })

  useEffect(() => {
    loadShops()
  }, [currentPage, filters])

  useEffect(() => {
    handleSearch()
  }, [searchTerm, shops])

  const loadShops = async () => {
    try {
      const params = {
        page: currentPage,
        limit: 12,
        ...filters
      }

      const response = await fetchShops(params)
      if (response?.data) {
        setShops(response.data.shops || [])
        setTotalPages(response.data.pagination?.pages || 1)
      }
    } catch (err) {
      console.error('Failed to load shops:', err)
    }
  }

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredShops(shops)
      return
    }

    const filtered = shops.filter(shop =>
      shop.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.location?.town?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.location?.county?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredShops(filtered)
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      shopType: '',
      county: '',
      pricingTier: '',
      verificationStatus: 'verified'
    })
    setSearchTerm('')
    setCurrentPage(1)
  }

  const getShopTypeLabel = (type) => {
    const types = {
      plumbing_supplies: 'Plumbing Supplies',
      electrical_supplies: 'Electrical Supplies',
      hardware: 'Hardware Store',
      general: 'General Store'
    }
    return types[type] || type
  }

  const getPricingTierBadge = (tier) => {
    const badges = {
      budget: { color: 'bg-green-100 text-green-800', label: 'Budget' },
      standard: { color: 'bg-blue-100 text-blue-800', label: 'Standard' },
      premium: { color: 'bg-purple-100 text-purple-800', label: 'Premium' }
    }
    return badges[tier] || badges.standard
  }

  const displayShops = searchTerm ? filteredShops : shops

  if (loading && shops.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Material Shops</h1>
        <p className="text-gray-600">Find verified suppliers for your construction needs</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search shops by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={filters.shopType}
            onChange={(e) => handleFilterChange('shopType', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Shop Types</option>
            <option value="plumbing_supplies">Plumbing Supplies</option>
            <option value="electrical_supplies">Electrical Supplies</option>
            <option value="hardware">Hardware Store</option>
            <option value="general">General Store</option>
          </select>

          <select
            value={filters.pricingTier}
            onChange={(e) => handleFilterChange('pricingTier', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Price Ranges</option>
            <option value="budget">Budget</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>

          <button
            onClick={clearFilters}
            className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} className="mb-6" />}

      {/* Shop Grid */}
      {displayShops.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Store size={64} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No shops found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
          <button
            onClick={clearFilters}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {displayShops.map((shop) => (
              <div
                key={shop._id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group"
                onClick={() => navigate(`/shops/${shop._id}`)}
              >
                <div className="relative h-48 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  {shop.catalog && shop.catalog[0] ? (
                    <img
                      src={shop.catalog[0]}
                      alt={shop.shopName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Store size={64} className="text-white opacity-50" />
                  )}
                  {shop.verification?.overallStatus === 'verified' && (
                    <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <Star size={12} fill="currentColor" />
                      Verified
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                        {shop.shopName}
                      </h3>
                      <p className="text-sm text-gray-600">{getShopTypeLabel(shop.shopType)}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPricingTierBadge(shop.pricingTier).color}`}>
                      {getPricingTierBadge(shop.pricingTier).label}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin size={16} className="mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {shop.location?.town}, {shop.location?.county}
                      </span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Phone size={16} className="mr-2 flex-shrink-0" />
                      <span>{shop.contactPhone}</span>
                    </div>

                    {shop.stats?.rating > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Star size={16} className="mr-2 flex-shrink-0 text-yellow-400" fill="currentColor" />
                        <span className="font-medium">{shop.stats.rating.toFixed(1)}</span>
                        <span className="ml-1">({shop.stats.totalTransactions || 0} orders)</span>
                      </div>
                    )}
                  </div>

                  {shop.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {shop.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center text-sm">
                      <Package size={16} className="mr-1 text-gray-400" />
                      <span className="text-gray-600">{shop.inventory?.length || 0} items</span>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center group">
                      View Shop
                      <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg font-medium ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Shops
