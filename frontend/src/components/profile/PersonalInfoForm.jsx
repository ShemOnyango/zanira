// frontend/src/components/profile/PersonalInfoForm.jsx
import { useState } from 'react'
import { Mail, Phone, MapPin, Calendar, Save } from 'lucide-react'
import FormInput from '../forms/FormInput'
import FormSelect from '../forms/FormSelect'
import FormTextarea from '../forms/FormTextarea'
import LoadingSpinner from '../common/LoadingSpinner'
import { KENYAN_COUNTIES, KENYAN_TOWNS } from '../../lib/constants'

export default function PersonalInfoForm({ profile, onSave, saving }) {
  const [formData, setFormData] = useState({
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    email: profile.email || '',
    phone: profile.phone || '',
    county: profile.county || '',
    town: profile.town || '',
    address: profile.address || '',
    dateOfBirth: profile.dateOfBirth || '',
    gender: profile.gender || '',
    bio: profile.bio || ''
  })
  const [errors, setErrors] = useState({})

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^\+254[17]\d{8}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid Kenyan phone number (e.g., +254712345678)'
    }

    if (!formData.county) {
      newErrors.county = 'County is required'
    }

    if (!formData.town) {
      newErrors.town = 'Town is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    await onSave(formData)
  }

  const getTownsForCounty = () => {
    if (!formData.county) return []
    return KENYAN_TOWNS[formData.county] || []
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 font-heading mb-6">Personal Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <FormInput
            label="First Name"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            error={errors.firstName}
            required
            placeholder="Enter your first name"
          />

          {/* Last Name */}
          <FormInput
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            error={errors.lastName}
            required
            placeholder="Enter your last name"
          />

          {/* Email */}
          <FormInput
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            error={errors.email}
            required
            icon={Mail}
            placeholder="your@email.com"
          />

          {/* Phone */}
          <FormInput
            label="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            error={errors.phone}
            required
            icon={Phone}
            placeholder="+254712345678"
            pattern="^\+254[17]\d{8}$"
          />

          {/* County */}
          <FormSelect
            label="County"
            value={formData.county}
            onChange={(e) => {
              handleInputChange('county', e.target.value)
              handleInputChange('town', '') // Reset town when county changes
            }}
            options={KENYAN_COUNTIES.map(county => ({ value: county, label: county }))}
            error={errors.county}
            required
            placeholder="Select your county"
          />

          {/* Town */}
          <FormSelect
            label="Town"
            value={formData.town}
            onChange={(e) => handleInputChange('town', e.target.value)}
            options={getTownsForCounty().map(town => ({ value: town, label: town }))}
            error={errors.town}
            required
            disabled={!formData.county}
            placeholder={formData.county ? "Select your town" : "Select county first"}
          />

          {/* Date of Birth */}
          <FormInput
            label="Date of Birth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            icon={Calendar}
            max={new Date().toISOString().split('T')[0]}
          />

          {/* Gender */}
          <FormSelect
            label="Gender"
            value={formData.gender}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            options={[
              { value: '', label: 'Prefer not to say' },
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' }
            ]}
            placeholder="Select gender"
          />
        </div>

        {/* Address */}
        <div className="mt-6">
          <FormTextarea
            label="Full Address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Enter your full address including street and building"
            rows={3}
            icon={MapPin}
          />
        </div>

        {/* Bio */}
        <div className="mt-6">
          <FormTextarea
            label="Bio"
            value={formData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            placeholder="Tell us a bit about yourself..."
            rows={4}
            helpText="This will be visible on your public profile"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving}
          className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          {saving && <LoadingSpinner size="sm" />}
          <Save className="w-5 h-5" />
          <span>Save Changes</span>
        </button>
      </div>
    </form>
  )
}