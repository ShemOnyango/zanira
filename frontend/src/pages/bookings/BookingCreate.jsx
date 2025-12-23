// frontend/src/pages/bookings/BookingCreate.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  MapPin, 
  Navigation,
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  CheckCircle,
  Upload,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import MapSelectorModal from '../../components/common/MapSelectorModal'
import { useApi } from '../../hooks/useApi'
import { serviceAPI, bookingAPI } from '../../lib/api'
import FormInput from '../../components/forms/FormInput'
import FormSelect from '../../components/forms/FormSelect'
import FormTextarea from '../../components/forms/FormTextarea'
// Modal not used here; MapSelectorModal provides the map modal
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import mapping, { counties as kenyaCounties } from '../../lib/countiesTowns'

export default function BookingCreate() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [services, setServices] = useState([])
  const [uploadedImages, setUploadedImages] = useState([])

  const [formData, setFormData] = useState({
    serviceId: '',
    location: {
      address: '',
      county: '',
      town: '',
      coordinates: { latitude: 0, longitude: 0 }
    },
    scheduledDate: '',
    scheduledTime: '',
    budget: '',
    specialRequirements: '',
    materials: [''],
    urgency: 'normal',
    // fundiId removed: bookings are posted without client-side fundi selection
  })

  // Location helpers
  const [locationLoading, setLocationLoading] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapCoordinates, setMapCoordinates] = useState({ latitude: 0, longitude: 0 })

  // API hooks
  const { execute: fetchServices, loading: servicesLoading } = useApi(serviceAPI.getAll, { showToast: false })
  const { execute: createBooking, loading: bookingLoading } = useApi(bookingAPI.create, { 
    successMessage: 'Booking created successfully!' 
  })
  // matching API removed from client side; fundi assignment happens via admin

  // Load services on mount
  useEffect(() => {
    const loadServices = async () => {
      try {
        const data = await fetchServices()
        if (data) {
          // Handle the response structure from /services or /services/categories
          let servicesArray = data
          if (data.data && Array.isArray(data.data)) {
            servicesArray = data.data
          } else if (Array.isArray(data)) {
            servicesArray = data
          } else if (data.data && Array.isArray(data.data.services)) {
            servicesArray = data.data.services
          } else if (Array.isArray(data.services)) {
            servicesArray = data.services
          } else {
            const maybeArray = Object.values(data).find(v => Array.isArray(v))
            if (Array.isArray(maybeArray)) servicesArray = maybeArray
          }

          setServices(servicesArray)
        }
      } catch (err) {
        console.error('Failed to load services:', err)
        setServicesError('Failed to load services. Please try again later.')
        // Provide fallback demo services
        setServices([
          { _id: '1', name: 'Plumbing', description: 'Fix leaks, installations, and repairs' },
          { _id: '2', name: 'Electrical', description: 'Wiring, installations, and electrical repairs' },
          { _id: '3', name: 'Carpentry', description: 'Furniture, doors, and woodwork' },
          { _id: '4', name: 'Painting', description: 'Interior and exterior painting services' },
          { _id: '5', name: 'Cleaning', description: 'Home and office cleaning services' }
        ])
        // lazy-import toast to avoid adding at top if not used elsewhere
        const { default: toast } = await import('react-hot-toast')
        toast.error('Using demo services. Backend services endpoint not available.')
      }
    }

    loadServices()
  }, [])

  // Handle form data updates
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLocationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }))
  }

  // Pin current location using Geolocation API
  const pinLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setFormData(prev => ({
          ...prev,
          location: {
            ...prev.location,
            coordinates: { latitude, longitude }
          }
        }))
        setLocationLoading(false)
        toast.success('Location pinned successfully!')
      },
      (error) => {
        setLocationLoading(false)
        let errorMessage = 'Failed to get location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.'
            break
        }
        toast.error(errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    )
  }

  // Handler when a location is selected from the map modal
  const handleMapSelect = (lat, lng) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        coordinates: { latitude: lat, longitude: lng }
      }
    }))
    setShowMapModal(false)
    toast.success('Location selected from map!')
  }

  // Manual coordinate inputs
  const handleCoordinateChange = (field, value) => {
    const numValue = parseFloat(value) || 0
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        coordinates: {
          ...prev.location.coordinates,
          [field]: numValue
        }
      }
    }))
  }

  const handleMaterialChange = (index, value) => {
    const newMaterials = [...formData.materials]
    newMaterials[index] = value
    setFormData(prev => ({
      ...prev,
      materials: newMaterials
    }))
  }

  const addMaterialField = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, '']
    }))
  }

  const removeMaterialField = (index) => {
    if (formData.materials.length > 1) {
      const newMaterials = formData.materials.filter((_, i) => i !== index)
      setFormData(prev => ({
        ...prev,
        materials: newMaterials
      }))
    }
  }

  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }))
    setUploadedImages(prev => [...prev, ...newImages])
  }

  const removeImage = (index) => {
    const newImages = uploadedImages.filter((_, i) => i !== index)
    setUploadedImages(newImages)
  }

  // Client no longer selects fundis; admin assigns fundis later

  // Submit booking
  const handleSubmit = async () => {
    try {
      // Prepare form data with images
      const bookingData = new FormData()
      
      // Append basic fields (skip empty strings)
      Object.keys(formData).forEach(key => {
        if (key === 'location') {
          bookingData.append(key, JSON.stringify(formData[key]))
        } else if (key === 'materials') {
          formData.materials.forEach((material, index) => {
            if (material && material.trim()) {
              bookingData.append(`materials[${index}]`, material)
            }
          })
        } else if (formData[key] !== undefined && formData[key] !== '' && formData[key] !== null) {
          bookingData.append(key, formData[key])
        }
      })

      // Append images
      uploadedImages.forEach((image, index) => {
        bookingData.append('images', image.file)
      })

      const data = await createBooking(bookingData)
      if (data) {
        // Normalize the response to find the created booking id
        const bookingObj = data?.data?.booking || data?.booking || data
        const bookingId = bookingObj?._id || bookingObj?.id || bookingObj
        if (bookingId) navigate(`/bookings/${bookingId}`)
      }
    } catch (error) {
      console.error('Booking creation error:', error)
    }
  }

  // Get towns for selected county
  const getTownsForCounty = () => {
    if (!formData.location.county) return []
    return mapping[formData.location.county] || []
  }

  // Calculate progress percentage
  const progress = (step / 4) * 100

  if (servicesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20 flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 font-heading">Create New Booking</h1>
            <p className="text-gray-600 mt-2">Book a service with verified fundis</p>
          </div>
          <div className="w-20"></div> {/* Spacer for alignment */}
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
          <div className="flex justify-between mb-4">
            {['Service', 'Location', 'Details', 'Review'].map((label, index) => (
              <div key={label} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step > index + 1 ? 'bg-teal-500 border-teal-500 text-white' :
                  step === index + 1 ? 'border-teal-500 text-teal-500' :
                  'border-gray-300 text-gray-400'
                }`}>
                  {step > index + 1 ? <CheckCircle className="w-5 h-5" /> : index + 1}
                </div>
                <span className={`text-sm mt-2 ${
                  step >= index + 1 ? 'text-teal-600 font-medium' : 'text-gray-500'
                }`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-teal-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Form Steps */}
        <div className="bg-white rounded-2xl shadow-soft p-8">
          {/* Step 1: Service Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 font-heading">Select Service</h2>
              
              <FormSelect
                label="Service Category"
                value={formData.serviceId}
                onChange={(e) => handleInputChange('serviceId', e.target.value)}
                options={services.map(service => ({
                  value: service._id,
                  label: service.name,
                  description: service.description
                }))}
                required
                placeholder="Choose a service type"
              />

              {formData.serviceId && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <h3 className="font-semibold text-teal-900 mb-2">Service Details</h3>
                  <p className="text-teal-800 text-sm">
                    {services.find(s => s._id === formData.serviceId)?.description}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-6">
                <button
                  onClick={() => setStep(2)}
                  disabled={!formData.serviceId}
                  className="bg-teal-500 text-white px-8 py-3 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Continue to Location
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Location & Scheduling */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 font-heading">Location & Scheduling</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormSelect
                  label="County"
                  value={formData.location.county}
                  onChange={(e) => handleLocationChange('county', e.target.value)}
                  options={kenyaCounties.map(county => ({ value: county, label: county }))}
                  required
                />
                
                <FormSelect
                  label="Town"
                  value={formData.location.town}
                  onChange={(e) => handleLocationChange('town', e.target.value)}
                  options={getTownsForCounty().map(town => ({ value: town, label: town }))}
                  required
                  placeholder="Select a town"
                  disabled={!formData.location.county}
                />
              </div>

              <FormInput
                label="Full Address"
                value={formData.location.address}
                onChange={(e) => handleLocationChange('address', e.target.value)}
                placeholder="Enter your full address including street and building"
                required
                icon={MapPin}
              />

              {/* Pin Location Section */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pin Exact Location</h3>
                <p className="text-gray-600 mb-4">
                  Pin your exact location for better fundi matching and accurate service delivery.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.location.coordinates.latitude}
                      onChange={(e) => handleCoordinateChange('latitude', e.target.value)}
                      placeholder="e.g., -1.2921"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.location.coordinates.longitude}
                      onChange={(e) => handleCoordinateChange('longitude', e.target.value)}
                      placeholder="e.g., 36.8219"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={pinLocation}
                    disabled={locationLoading}
                    className="flex items-center justify-center space-x-2 bg-teal-500 text-white px-4 py-3 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {locationLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Navigation className="w-5 h-5" />
                    )}
                    <span>
                      {locationLoading ? 'Getting Location...' : 'Pin My Current Location'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMapCoordinates(formData.location.coordinates)
                      setShowMapModal(true)
                    }}
                    className="flex items-center justify-center space-x-2 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <MapPin className="w-5 h-5" />
                    <span>Select from Map</span>
                  </button>
                </div>

                {/* Display current coordinates */}
                {(formData.location.coordinates.latitude !== 0 || formData.location.coordinates.longitude !== 0) && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-sm">
                      <strong>Location Pinned:</strong> {formData.location.coordinates.latitude.toFixed(6)}, {formData.location.coordinates.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  type="date"
                  label="Preferred Date"
                  value={formData.scheduledDate}
                  onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                  required
                  icon={Calendar}
                  min={new Date().toISOString().split('T')[0]}
                />
                
                <FormInput
                  type="time"
                  label="Preferred Time"
                  value={formData.scheduledTime}
                  onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                  required
                  icon={Clock}
                />
              </div>

              <FormSelect
                label="Urgency Level"
                value={formData.urgency}
                onChange={(e) => handleInputChange('urgency', e.target.value)}
                options={[
                  { value: 'low', label: 'Low - Within the next week' },
                  { value: 'normal', label: 'Normal - Within 2-3 days' },
                  { value: 'high', label: 'High - Within 24 hours' },
                  { value: 'emergency', label: 'Emergency - Immediately' }
                ]}
              />

              <div className="flex justify-between pt-6">
                <button
                  onClick={() => setStep(1)}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!formData.location.address || !formData.scheduledDate || !formData.scheduledTime}
                  className="bg-teal-500 text-white px-8 py-3 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Continue to Details
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Job Details */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 font-heading">Job Details</h2>
              
              <FormInput
                type="number"
                label="Estimated Budget (KES)"
                value={formData.budget}
                onChange={(e) => handleInputChange('budget', e.target.value)}
                placeholder="Enter your budget estimate"
                icon={DollarSign}
                min="0"
              />

              <FormTextarea
                label="Special Requirements & Job Description"
                value={formData.specialRequirements}
                onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                placeholder="Describe the job in detail, any specific requirements, or issues you're facing..."
                rows={4}
                icon={FileText}
              />

              {/* Materials Checklist */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Materials Needed
                </label>
                <div className="space-y-3">
                  {formData.materials.map((material, index) => (
                    <div key={index} className="flex space-x-3">
                      <FormInput
                        value={material}
                        onChange={(e) => handleMaterialChange(index, e.target.value)}
                        placeholder={`Material ${index + 1}`}
                        className="flex-1"
                      />
                      {formData.materials.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMaterialField(index)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMaterialField}
                    className="text-teal-600 hover:text-teal-700 font-medium flex items-center space-x-2"
                  >
                    <span>+ Add Another Material</span>
                  </button>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Upload Photos (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Drag and drop images here, or click to browse</p>
                  <p className="text-gray-500 text-sm mb-4">Supports JPG, PNG up to 5MB each</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="inline-block bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 cursor-pointer transition-colors"
                  >
                    Select Images
                  </label>
                </div>

                {/* Image Previews */}
                {uploadedImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {uploadedImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.preview}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-6">
                <button
                  onClick={() => setStep(2)}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <div className="space-x-4">
                  <button
                    onClick={() => setStep(4)}
                    className="bg-teal-500 text-white px-8 py-3 rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    Continue to Review
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 font-heading">Review & Submit</h2>
              
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Service Details</h3>
                    <p className="text-gray-600">
                      {services.find(s => s._id === formData.serviceId)?.name}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                    <p className="text-gray-600">{formData.location.address}</p>
                    <p className="text-gray-500 text-sm">
                      {formData.location.town}, {formData.location.county}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Schedule</h3>
                    <p className="text-gray-600">
                      {new Date(formData.scheduledDate).toLocaleDateString()} at {formData.scheduledTime}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Budget</h3>
                    <p className="text-gray-600">
                      {formData.budget ? `KES ${parseInt(formData.budget).toLocaleString()}` : 'Not specified'}
                    </p>
                  </div>
                </div>

                {/* Client-side fundi review removed; admin assigns fundi later */}

                {formData.specialRequirements && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Special Requirements</h3>
                    <p className="text-gray-600">{formData.specialRequirements}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-6">
                <button
                  onClick={() => setStep(3)}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={bookingLoading}
                  className="bg-teal-500 text-white px-8 py-3 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {bookingLoading && <LoadingSpinner size="sm" />}
                  <span>Create Booking</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fundi Matching Modal removed from client side */}
      <MapSelectorModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        onLocationSelect={handleMapSelect}
        initialCoordinates={mapCoordinates}
      />
    </div>
  )
}