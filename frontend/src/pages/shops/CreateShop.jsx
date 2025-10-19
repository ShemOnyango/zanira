import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, MapPin, Phone, Mail, Clock, DollarSign, ArrowLeft, Check } from 'lucide-react'
import { shopAPI } from '../../lib/api'
import { useApi } from '../../hooks/useApi'
import FormInput from '../../components/forms/FormInput'
import FormSelect from '../../components/forms/FormSelect'
import FormTextarea from '../../components/forms/FormTextarea'
import ErrorMessage from '../../components/common/ErrorMessage'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const CreateShop = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    shopName: '',
    shopType: '',
    description: '',
    location: {
      county: '',
      town: '',
      address: '',
      building: '',
      floor: '',
      landmark: ''
    },
    contactPhone: '',
    contactEmail: '',
    website: '',
    socialMedia: {
      facebook: '',
      twitter: '',
      instagram: ''
    },
    businessRegistrationNumber: '',
    taxPin: '',
    yearsInOperation: '',
    operatingHours: {
      monday: { open: '08:00', close: '18:00', closed: false },
      tuesday: { open: '08:00', close: '18:00', closed: false },
      wednesday: { open: '08:00', close: '18:00', closed: false },
      thursday: { open: '08:00', close: '18:00', closed: false },
      friday: { open: '08:00', close: '18:00', closed: false },
      saturday: { open: '08:00', close: '18:00', closed: false },
      sunday: { open: '', close: '', closed: true }
    },
    pricingTier: 'standard',
    paymentMethods: ['mpesa', 'cash'],
    mpesaPaybill: '',
    bankAccount: {
      bankName: '',
      accountNumber: '',
      accountName: ''
    }
  })

  const { execute: createShop, loading, error } = useApi(shopAPI.create)

  const steps = [
    { number: 1, title: 'Basic Info', icon: Store },
    { number: 2, title: 'Location', icon: MapPin },
    { number: 3, title: 'Contact', icon: Phone },
    { number: 4, title: 'Operating Hours', icon: Clock },
    { number: 5, title: 'Payment', icon: DollarSign }
  ]

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleOperatingHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value
        }
      }
    }))
  }

  const handlePaymentMethodToggle = (method) => {
    setFormData(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.includes(method)
        ? prev.paymentMethods.filter(m => m !== method)
        : [...prev.paymentMethods, method]
    }))
  }

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.shopName && formData.shopType && formData.description
      case 2:
        return formData.location.county && formData.location.town && formData.location.address
      case 3:
        return formData.contactPhone && formData.contactEmail
      case 4:
        return true
      case 5:
        return formData.paymentMethods.length > 0
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(5, prev + 1))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(1, prev - 1))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep(5)) return

    try {
      const response = await createShop(formData)
      if (response?.data?.shop) {
        navigate('/shop-dashboard')
      }
    } catch (err) {
      console.error('Failed to create shop:', err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 text-gray-600 hover:text-gray-900 font-medium flex items-center"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back
      </button>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Progress Steps */}
        <div className="px-8 py-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isCompleted = currentStep > step.number
              const isCurrent = currentStep === step.number

              return (
                <div key={step.number} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? 'bg-green-500 border-green-500'
                          : isCurrent
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="text-white" size={24} />
                      ) : (
                        <Icon
                          className={isCurrent ? 'text-white' : 'text-gray-400'}
                          size={24}
                        />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isCurrent ? 'text-blue-600' : 'text-gray-600'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 h-1 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8">
          {error && <ErrorMessage message={error} className="mb-6" />}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Basic Information</h2>

              <FormInput
                label="Shop Name"
                required
                value={formData.shopName}
                onChange={(e) => handleChange('shopName', e.target.value)}
                placeholder="Enter your shop name"
              />

              <FormSelect
                label="Shop Type"
                required
                value={formData.shopType}
                onChange={(e) => handleChange('shopType', e.target.value)}
                options={[
                  { value: '', label: 'Select shop type' },
                  { value: 'plumbing_supplies', label: 'Plumbing Supplies' },
                  { value: 'electrical_supplies', label: 'Electrical Supplies' },
                  { value: 'hardware', label: 'Hardware Store' },
                  { value: 'general', label: 'General Store' }
                ]}
              />

              <FormTextarea
                label="Description"
                required
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe your shop and what you offer"
                rows={4}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Business Registration Number"
                  value={formData.businessRegistrationNumber}
                  onChange={(e) => handleChange('businessRegistrationNumber', e.target.value)}
                  placeholder="Optional"
                />

                <FormInput
                  label="Tax PIN"
                  value={formData.taxPin}
                  onChange={(e) => handleChange('taxPin', e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <FormInput
                label="Years in Operation"
                type="number"
                value={formData.yearsInOperation}
                onChange={(e) => handleChange('yearsInOperation', e.target.value)}
                placeholder="How long have you been in business?"
              />

              <FormSelect
                label="Pricing Tier"
                value={formData.pricingTier}
                onChange={(e) => handleChange('pricingTier', e.target.value)}
                options={[
                  { value: 'budget', label: 'Budget - Affordable prices' },
                  { value: 'standard', label: 'Standard - Moderate prices' },
                  { value: 'premium', label: 'Premium - High-end products' }
                ]}
              />
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Location Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="County"
                  required
                  value={formData.location.county}
                  onChange={(e) => handleChange('location.county', e.target.value)}
                  placeholder="e.g., Nairobi"
                />

                <FormInput
                  label="Town"
                  required
                  value={formData.location.town}
                  onChange={(e) => handleChange('location.town', e.target.value)}
                  placeholder="e.g., Westlands"
                />
              </div>

              <FormInput
                label="Street Address"
                required
                value={formData.location.address}
                onChange={(e) => handleChange('location.address', e.target.value)}
                placeholder="Enter street address"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Building Name"
                  value={formData.location.building}
                  onChange={(e) => handleChange('location.building', e.target.value)}
                  placeholder="Optional"
                />

                <FormInput
                  label="Floor"
                  value={formData.location.floor}
                  onChange={(e) => handleChange('location.floor', e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <FormInput
                label="Landmark"
                value={formData.location.landmark}
                onChange={(e) => handleChange('location.landmark', e.target.value)}
                placeholder="Nearby landmark to help customers find you"
              />
            </div>
          )}

          {/* Step 3: Contact */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Phone Number"
                  type="tel"
                  required
                  value={formData.contactPhone}
                  onChange={(e) => handleChange('contactPhone', e.target.value)}
                  placeholder="07XX XXX XXX"
                />

                <FormInput
                  label="Email Address"
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  placeholder="shop@example.com"
                />
              </div>

              <FormInput
                label="Website (Optional)"
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://yourwebsite.com"
              />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Social Media (Optional)</h3>

                <FormInput
                  label="Facebook"
                  value={formData.socialMedia.facebook}
                  onChange={(e) => handleChange('socialMedia.facebook', e.target.value)}
                  placeholder="https://facebook.com/yourshop"
                />

                <FormInput
                  label="Twitter"
                  value={formData.socialMedia.twitter}
                  onChange={(e) => handleChange('socialMedia.twitter', e.target.value)}
                  placeholder="https://twitter.com/yourshop"
                />

                <FormInput
                  label="Instagram"
                  value={formData.socialMedia.instagram}
                  onChange={(e) => handleChange('socialMedia.instagram', e.target.value)}
                  placeholder="https://instagram.com/yourshop"
                />
              </div>
            </div>
          )}

          {/* Step 4: Operating Hours */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Operating Hours</h2>

              <div className="space-y-4">
                {Object.keys(formData.operatingHours).map((day) => (
                  <div key={day} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="w-32">
                      <span className="font-medium text-gray-900 capitalize">{day}</span>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.operatingHours[day].closed}
                        onChange={(e) => handleOperatingHoursChange(day, 'closed', e.target.checked)}
                        className="mr-2 rounded"
                      />
                      <span className="text-sm text-gray-600">Closed</span>
                    </label>
                    {!formData.operatingHours[day].closed && (
                      <>
                        <input
                          type="time"
                          value={formData.operatingHours[day].open}
                          onChange={(e) => handleOperatingHoursChange(day, 'open', e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-2"
                        />
                        <span className="text-gray-600">to</span>
                        <input
                          type="time"
                          value={formData.operatingHours[day].close}
                          onChange={(e) => handleOperatingHoursChange(day, 'close', e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Payment */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Methods (Select all that apply)
                </label>
                <div className="space-y-2">
                  {['mpesa', 'bank', 'cash'].map((method) => (
                    <label key={method} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.paymentMethods.includes(method)}
                        onChange={() => handlePaymentMethodToggle(method)}
                        className="mr-3 rounded"
                      />
                      <span className="font-medium text-gray-900 capitalize">{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formData.paymentMethods.includes('mpesa') && (
                <FormInput
                  label="M-Pesa Paybill Number"
                  value={formData.mpesaPaybill}
                  onChange={(e) => handleChange('mpesaPaybill', e.target.value)}
                  placeholder="Enter paybill number"
                />
              )}

              {formData.paymentMethods.includes('bank') && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Bank Account Details</h3>
                  <FormInput
                    label="Bank Name"
                    value={formData.bankAccount.bankName}
                    onChange={(e) => handleChange('bankAccount.bankName', e.target.value)}
                    placeholder="e.g., Equity Bank"
                  />
                  <FormInput
                    label="Account Number"
                    value={formData.bankAccount.accountNumber}
                    onChange={(e) => handleChange('bankAccount.accountNumber', e.target.value)}
                    placeholder="Enter account number"
                  />
                  <FormInput
                    label="Account Name"
                    value={formData.bankAccount.accountName}
                    onChange={(e) => handleChange('bankAccount.accountName', e.target.value)}
                    placeholder="Enter account name"
                  />
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!validateStep(currentStep)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !validateStep(5)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Creating Shop...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Create Shop
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateShop
