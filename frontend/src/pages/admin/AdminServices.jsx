// src/pages/admin/AdminServices.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Save,
  X,
  Package,
  DollarSign,
  Clock,
  Shield,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { serviceAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import SuccessMessage from '../../components/common/SuccessMessage'

export default function AdminServices() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editingService, setEditingService] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [formErrors, setFormErrors] = useState({})

  const { execute: fetchServices } = useApi(serviceAPI.getCategories, { showToast: false })
  const { execute: createService } = useApi(serviceAPI.createCategory, { showToast: false })
  const { execute: updateService } = useApi(serviceAPI.updateCategory, { showToast: false })
  const { execute: deleteService } = useApi(serviceAPI.deleteCategory, { showToast: false })

  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    try {
      setLoading(true)
      const response = await fetchServices()
      if (response?.data?.services) {
        setServices(response.data.services)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingService(null)
    setFormData(initialFormData)
    setFormErrors({})
    setShowForm(true)
  }

  const handleEdit = (service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description,
      category: service.category,
      icon: service.icon || '',
      image: service.image || '',
      basePrice: service.basePrice,
      priceRange: {
        min: service.priceRange.min,
        max: service.priceRange.max
      },
      pricingType: service.pricingType,
      currency: service.currency,
      duration: {
        estimated: service.duration?.estimated || 0,
        min: service.duration?.min || 0,
        max: service.duration?.max || 0
      },
      complexity: service.complexity,
      toolsRequired: service.toolsRequired || [],
      materialsRequired: service.materialsRequired || [],
      safetyRequirements: service.safetyRequirements || [],
      qualifications: service.qualifications || [],
      certifications: service.certifications || [],
      experienceLevel: service.experienceLevel,
      isActive: service.isActive,
      isPopular: service.isPopular,
      isEmergency: service.isEmergency,
      tags: service.tags || [],
      searchKeywords: service.searchKeywords || [],
      displayOrder: service.displayOrder
    })
    setFormErrors({})
    setShowForm(true)
  }

  const handleDelete = async (service) => {
    if (!window.confirm(`Are you sure you want to delete "${service.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteService(service._id)
      setSuccess('Service deleted successfully')
      loadServices()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete service')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Basic validation
    const errors = validateForm(formData)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      if (editingService) {
        await updateService(editingService._id, formData)
        setSuccess('Service updated successfully')
      } else {
        await createService(formData)
        setSuccess('Service created successfully')
      }
      
      setShowForm(false)
      setFormErrors({})
      loadServices()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${editingService ? 'update' : 'create'} service`)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleNestedInputChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }))
  }

  const handleArrayInput = (field, value) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item)
    setFormData(prev => ({
      ...prev,
      [field]: items
    }))
  }

  // Filter services based on search and filters
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || service.category === categoryFilter
    const matchesStatus = !statusFilter || 
                         (statusFilter === 'active' && service.isActive) ||
                         (statusFilter === 'inactive' && !service.isActive)
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Service Management</h1>
              <p className="text-gray-600 mt-2">Manage service categories and pricing</p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              <span>Add Service</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onClose={() => setError(null)} />
          </div>
        )}
        {success && (
          <div className="mb-6">
            <SuccessMessage message={success} onClose={() => setSuccess(null)} />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="both">Both</option>
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <button
              onClick={() => {
                setSearchTerm('')
                setCategoryFilter('')
                setStatusFilter('')
              }}
              className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter size={18} />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map(service => (
            <ServiceCard
              key={service._id}
              service={service}
              onEdit={() => handleEdit(service)}
              onDelete={() => handleDelete(service)}
            />
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-500 mb-4">
              {services.length === 0 ? 'No services have been created yet.' : 'Try adjusting your search or filters.'}
            </p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              <span>Add First Service</span>
            </button>
          </div>
        )}

        {/* Service Form Modal */}
        {showForm && (
          <ServiceForm
            formData={formData}
            formErrors={formErrors}
            isEditing={!!editingService}
            onClose={() => setShowForm(false)}
            onSubmit={handleSubmit}
            onInputChange={handleInputChange}
            onNestedInputChange={handleNestedInputChange}
            onArrayInput={handleArrayInput}
          />
        )}
      </div>
    </div>
  )
}

// Service Card Component
function ServiceCard({ service, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              service.category === 'plumbing' ? 'bg-blue-100 text-blue-800' :
              service.category === 'electrical' ? 'bg-yellow-100 text-yellow-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {service.category}
            </span>
            {service.isActive ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle size={12} className="mr-1" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <AlertCircle size={12} className="mr-1" />
                Inactive
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{service.description}</p>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Base Price</span>
          <span className="font-semibold text-gray-900">
            {service.currency} {service.basePrice.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Price Range</span>
          <span className="text-sm text-gray-600">
            {service.currency} {service.priceRange.min.toLocaleString()} - {service.priceRange.max.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Pricing Type</span>
          <span className="text-sm font-medium text-gray-700 capitalize">{service.pricingType}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Complexity</span>
          <span className="text-sm font-medium text-gray-700 capitalize">{service.complexity}</span>
        </div>

        {service.stats && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Bookings: {service.stats.totalBookings || 0}</span>
              <span>Rating: {service.stats.averageRating || 0}/5</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Service Form Component
function ServiceForm({ 
  formData, 
  formErrors, 
  isEditing, 
  onClose, 
  onSubmit, 
  onInputChange, 
  onNestedInputChange, 
  onArrayInput 
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] w-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Service' : 'Create New Service'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Pipe Installation"
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => onInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => onInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe the service in detail..."
            />
            {formErrors.description && (
              <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
            )}
          </div>

          {/* Pricing Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign size={20} className="mr-2" />
              Pricing Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price (KES) *
                </label>
                <input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => onInputChange('basePrice', parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.basePrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.basePrice && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.basePrice}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Price (KES) *
                </label>
                <input
                  type="number"
                  value={formData.priceRange.min}
                  onChange={(e) => onNestedInputChange('priceRange', 'min', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Price (KES) *
                </label>
                <input
                  type="number"
                  value={formData.priceRange.max}
                  onChange={(e) => onNestedInputChange('priceRange', 'max', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pricing Type
                </label>
                <select
                  value={formData.pricingType}
                  onChange={(e) => onInputChange('pricingType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="fixed">Fixed</option>
                  <option value="hourly">Hourly</option>
                  <option value="per_item">Per Item</option>
                  <option value="negotiable">Negotiable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => onInputChange('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Clock size={20} className="mr-2" />
              Service Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Duration (mins)
                </label>
                <input
                  type="number"
                  value={formData.duration.estimated}
                  onChange={(e) => onNestedInputChange('duration', 'estimated', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Duration (mins)
                </label>
                <input
                  type="number"
                  value={formData.duration.min}
                  onChange={(e) => onNestedInputChange('duration', 'min', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Duration (mins)
                </label>
                <input
                  type="number"
                  value={formData.duration.max}
                  onChange={(e) => onNestedInputChange('duration', 'max', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complexity Level
                </label>
                <select
                  value={formData.complexity}
                  onChange={(e) => onInputChange('complexity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="simple">Simple</option>
                  <option value="moderate">Moderate</option>
                  <option value="complex">Complex</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experience Level Required
                </label>
                <select
                  value={formData.experienceLevel}
                  onChange={(e) => onInputChange('experienceLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>
          </div>

          {/* Arrays Inputs */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Shield size={20} className="mr-2" />
              Requirements & Tags
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tools Required (comma separated)
                </label>
                <input
                  type="text"
                  defaultValue={formData.toolsRequired.join(', ')}
                  onBlur={(e) => onArrayInput('toolsRequired', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Wrench, Pliers, Screwdriver"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Materials Required (comma separated)
                </label>
                <input
                  type="text"
                  defaultValue={formData.materialsRequired.join(', ')}
                  onBlur={(e) => onArrayInput('materialsRequired', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Pipes, Connectors, Tape"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Safety Requirements (comma separated)
                </label>
                <input
                  type="text"
                  defaultValue={formData.safetyRequirements.join(', ')}
                  onBlur={(e) => onArrayInput('safetyRequirements', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Gloves, Goggles, Boots"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  defaultValue={formData.tags.join(', ')}
                  onBlur={(e) => onArrayInput('tags', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., emergency, popular, basic"
                />
              </div>
            </div>
          </div>

          {/* Status & Display */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <TrendingUp size={20} className="mr-2" />
              Status & Display
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => onInputChange('isActive', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Active Service</label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPopular}
                  onChange={(e) => onInputChange('isPopular', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Popular</label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isEmergency}
                  onChange={(e) => onInputChange('isEmergency', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Emergency</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => onInputChange('displayOrder', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="border-t pt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Save size={18} />
              <span>{isEditing ? 'Update Service' : 'Create Service'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Initial form data
const initialFormData = {
  name: '',
  description: '',
  category: 'plumbing',
  icon: '',
  image: '',
  basePrice: 0,
  priceRange: {
    min: 0,
    max: 0
  },
  pricingType: 'fixed',
  currency: 'KES',
  duration: {
    estimated: 0,
    min: 0,
    max: 0
  },
  complexity: 'moderate',
  toolsRequired: [],
  materialsRequired: [],
  safetyRequirements: [],
  qualifications: [],
  certifications: [],
  experienceLevel: 'intermediate',
  isActive: true,
  isPopular: false,
  isEmergency: false,
  tags: [],
  searchKeywords: [],
  displayOrder: 0
}

// Validation function
function validateForm(formData) {
  const errors = {}

  if (!formData.name.trim()) {
    errors.name = 'Service name is required'
  }

  if (!formData.description.trim()) {
    errors.description = 'Service description is required'
  }

  if (formData.basePrice <= 0) {
    errors.basePrice = 'Base price must be greater than 0'
  }

  if (formData.priceRange.min > formData.priceRange.max) {
    errors.priceRange = 'Minimum price cannot be greater than maximum price'
  }

  return errors
}