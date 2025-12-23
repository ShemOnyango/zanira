// frontend/src/pages/profile/Profile.jsx
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { 
  User, 
  Shield, 
  Bell, 
  Briefcase, 
  Star, 
  Camera,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Edit3,
  Save,
  X,
  Upload,
  Award,
  Clock,
  DollarSign
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import countiesMapping, { counties } from '../../lib/countiesTowns'
import { useApi } from '../../hooks/useApi'
import { userAPI, matchingAPI } from '../../lib/api' // Remove analyticsAPI import
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import Modal from '../../components/common/Modal'
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils'
import FundiProfessionalForm from '../../components/profile/FundiProfessionalForm'
import SecuritySettings from '../../components/profile/SecuritySettings'
import PhotoUploadModal from '../../components/profile/PhotoUploadModal'
import Notifications from '../notifications/Notifications'
import PortfolioVerification from '../verification/PortfolioVerification'

export default function Profile() {
  const { user, updateUser } = useAuthStore()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('personal')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({})

  // API hooks - remove analytics call
  const { execute: fetchProfile } = useApi(userAPI.getProfile, { showToast: false })
  const { execute: updateProfile } = useApi(userAPI.updateProfile, { successMessage: 'Profile updated successfully!' })
  const { execute: updateFundiPreferences } = useApi(matchingAPI.updatePreferences, { successMessage: 'Profile updated successfully!' })
  const { execute: uploadPhoto } = useApi(userAPI.uploadPhoto, { successMessage: 'Profile photo updated!' })

  // Load profile data
  useEffect(() => {
    loadProfileData()
    // set initial tab from query param if provided
    try {
      const params = new URLSearchParams(location.search)
      const tab = params.get('tab')
      if (tab) setActiveTab(tab)
    } catch (e) {
      // ignore during SSR or other contexts
    }
  }, [])

  const loadProfileData = async () => {
    try {
      setLoading(true)
      
      // Only fetch profile data, remove analytics call
      const profileData = await fetchProfile()

      // Normalize response data
      const normalizedProfile = profileData?.data ?? profileData

      if (normalizedProfile) {
        setProfile(normalizedProfile)
        setFormData(normalizedProfile)
        updateUser(normalizedProfile)
      } else {
        setError('No profile data received')
      }

    } catch (err) {
      console.error('Profile load error:', err)
      setError(err.response?.data?.error || 'Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    // Support simple latitude/longitude inputs as named fields
    if (name === 'latitude' || name === 'longitude') {
      setFormData(prev => ({
        ...prev,
        coordinates: { ...(prev.coordinates || {}), latitude: name === 'latitude' ? value : (prev.coordinates?.latitude || prev.user?.coordinates?.latitude), longitude: name === 'longitude' ? value : (prev.coordinates?.longitude || prev.user?.coordinates?.longitude) },
        user: { ...(prev.user || {}), coordinates: { ...(prev.user?.coordinates || {}), latitude: name === 'latitude' ? value : (prev.user?.coordinates?.latitude), longitude: name === 'longitude' ? value : (prev.user?.coordinates?.longitude) } }
      }))
      return
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle profile update — supports being called as a form submit handler (event)
  // or directly with a values object (from child components)
  const handleProfileUpdate = async (eOrValues) => {
    let values
    // Called as event
    if (eOrValues && typeof eOrValues.preventDefault === 'function') {
      eOrValues.preventDefault()
      values = formData
    } else {
      // Called with values object
      values = eOrValues || formData
    }

    setSaving(true)
    try {
      // Decide which endpoint to call. Fundi-specific updates should go to updateFundiProfile
      let updatedProfile
      const isFundi = user?.role === 'fundi'
      const hasFundiFields = values && (values.operatingCounties !== undefined || values.operatingTowns !== undefined || values.workingHours !== undefined || values.workingDays !== undefined || values.tools !== undefined || values.serviceAreas !== undefined || values.languages !== undefined || values.hourlyRate !== undefined || values.experience !== undefined)

      if (isFundi && hasFundiFields) {
        // send fundi-specific preferences (operating areas etc) to matching preferences endpoint
        updatedProfile = await updateFundiPreferences(values)
      } else {
        updatedProfile = await updateProfile(values)
      }

      if (updatedProfile) {
        const normalizedProfile = updatedProfile?.data ?? updatedProfile
        setProfile(normalizedProfile)
        updateUser(normalizedProfile)
        setEditMode(false)
      }
      return updatedProfile
    } catch (error) {
      console.error('Profile update failed:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const pinLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords
      setFormData(prev => ({
        ...prev,
        coordinates: { latitude, longitude },
        user: { ...(prev.user || {}), coordinates: { latitude, longitude } }
      }))
      toast.success('Location pinned')
    }, (err) => {
      toast.error('Failed to get location: ' + err.message)
    })
  }

  // Handle photo upload
  const handlePhotoUpload = async (file) => {
    try {
      const formData = new FormData()
      // backend expects field name 'profilePhoto'
      formData.append('profilePhoto', file)
      
      const updatedProfile = await uploadPhoto(formData)
      if (updatedProfile) {
        const normalizedProfile = updatedProfile?.data ?? updatedProfile
        setProfile(normalizedProfile)
        updateUser(normalizedProfile)
        setShowPhotoModal(false)
      }
    } catch (error) {
      console.error('Photo upload failed:', error)
    }
  }

  // Profile tabs based on user role
  const getProfileTabs = () => {
    const baseTabs = [
      { id: 'personal', label: 'Personal Info', icon: User },
      { id: 'security', label: 'Security', icon: Shield },
      { id: 'notifications', label: 'Notifications', icon: Bell }
    ]

    if (user?.role === 'fundi') {
      baseTabs.splice(1, 0, 
        { id: 'professional', label: 'Professional', icon: Briefcase },
        { id: 'portfolio', label: 'Portfolio', icon: Award }
        , { id: 'availability', label: 'Availability', icon: Calendar }
      )
    } else if (user?.role === 'client') {
      baseTabs.splice(1, 0, 
        { id: 'preferences', label: 'Preferences', icon: Star }
      )
    }

    return baseTabs
  }

  // Availability form for Fundis
  const AvailabilityForm = () => {
    const [local, setLocal] = useState({
      availability: profile.availability || 'available',
      workingHours: profile.workingHours || { start: '08:00', end: '17:00' },
      workingDays: profile.workingDays || ['mon','tue','wed','thu','fri']
    })
    const [savingAvail, setSavingAvail] = useState(false)

    const toggleDay = (day) => {
      setLocal(prev => {
        const days = new Set(prev.workingDays)
        if (days.has(day)) days.delete(day)
        else days.add(day)
        return { ...prev, workingDays: Array.from(days) }
      })
    }

    const handleSave = async () => {
      setSavingAvail(true)
      try {
        const payload = {
          availability: local.availability,
          workingHours: local.workingHours,
          workingDays: local.workingDays
        }
        const res = await updateProfile(payload)
        const normalized = res?.data ?? res
        setProfile(normalized)
        updateUser(normalized)
        toast.success('Availability updated')
      } catch (err) {
        console.error('Failed to update availability', err)
        toast.error('Failed to update availability')
      } finally {
        setSavingAvail(false)
      }
    }

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Availability</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={local.availability}
              onChange={(e) => setLocal(prev => ({ ...prev, availability: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="unavailable">Unavailable</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Working Hours</label>
            <div className="flex space-x-2">
              <input type="time" value={local.workingHours.start} onChange={(e) => setLocal(prev => ({ ...prev, workingHours: { ...prev.workingHours, start: e.target.value } }))} className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg" />
              <input type="time" value={local.workingHours.end} onChange={(e) => setLocal(prev => ({ ...prev, workingHours: { ...prev.workingHours, end: e.target.value } }))} className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
          <div className="flex flex-wrap gap-2">
            {['mon','tue','wed','thu','fri','sat','sun'].map(d => (
              <button key={d} type="button" onClick={() => toggleDay(d)} className={`px-3 py-1 rounded-lg border ${local.workingDays.includes(d) ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {d.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex space-x-4 pt-4">
          <button onClick={handleSave} disabled={savingAvail} className="bg-teal-500 text-white px-6 py-2 rounded-lg">{savingAvail ? 'Saving...' : 'Save Availability'}</button>
        </div>
      </div>
    )
  }

  // Simple Personal Info Form Component
  const PersonalInfoForm = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
        <button
          type="button"
          onClick={() => setEditMode(!editMode)}
          className="flex items-center space-x-2 bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          <span>{editMode ? 'Cancel' : 'Edit'}</span>
        </button>
      </div>

      <form onSubmit={handleProfileUpdate} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName || ''}
              onChange={handleInputChange}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName || ''}
              onChange={handleInputChange}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleInputChange}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone || ''}
              onChange={handleInputChange}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">County</label>
            <select name="county" value={formData.county || ''} onChange={(e) => {
              const val = e.target.value
              // set county and reset town to first town in that county (if any)
              const towns = countiesMapping[val] || []
              setFormData(prev => ({ ...prev, county: val, town: towns[0] || '' }))
            }} disabled={!editMode} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100">
              <option value="">Select county</option>
              {counties.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Town</label>
            <select name="town" value={formData.town || ''} onChange={handleInputChange} disabled={!editMode} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100">
              <option value="">Select town</option>
              {(countiesMapping[formData.county] || []).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
              <input type="text" name="latitude" value={formData.coordinates?.latitude || ''} onChange={handleInputChange} disabled={!editMode} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
              <input type="text" name="longitude" value={formData.coordinates?.longitude || ''} onChange={handleInputChange} disabled={!editMode} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>

            <div className="flex items-end">
              <button type="button" onClick={pinLocation} disabled={!editMode} className="w-full bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600">Pin my location</button>
            </div>
          </div>
        </div>

        {editMode && (
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditMode(false)
                setFormData(profile)
              }}
              className="flex items-center space-x-2 bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </form>
    </div>
  )

  // Simple placeholder components for other tabs
  // using imported `FundiProfessionalForm` component (see imports)

  const FundiPortfolioForm = () => (
    <div className="text-center py-8">
      <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Portfolio</h3>
      <p className="text-gray-600">Portfolio management will be available soon.</p>
    </div>
  )

  const ClientPreferencesForm = () => (
    <div className="text-center py-8">
      <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Preferences</h3>
      <p className="text-gray-600">Client preferences will be available soon.</p>
    </div>
  )

  // using imported `SecuritySettings` component (see imports)

  const NotificationSettings = () => (
    <div className="text-center py-8">
      <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Notification Settings</h3>
      <p className="text-gray-600">Notification settings will be available soon.</p>
    </div>
  )

  // Simple Photo Upload Modal
  const PhotoUploadModal = ({ isOpen, onClose, onUpload, currentPhoto }) => {
    const [selectedFile, setSelectedFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(currentPhoto)

    const handleFileSelect = (e) => {
      const file = e.target.files[0]
      if (file) {
        setSelectedFile(file)
        setPreviewUrl(URL.createObjectURL(file))
      }
    }

    const handleUpload = () => {
      if (selectedFile) {
        onUpload(selectedFile)
      }
    }

    if (!isOpen) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Update Profile Photo</h3>
          
          <div className="flex flex-col items-center space-y-4 mb-6">
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-gray-400" />
              )}
            </div>
            
            <label className="flex items-center space-x-2 bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Choose Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleUpload}
              disabled={!selectedFile}
              className="flex-1 bg-teal-500 text-white py-2 rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
            >
              Upload Photo
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20 flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage message={error} onRetry={loadProfileData} />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage message="Profile not found" />
        </div>
      </div>
    )
  }

  const tabs = getProfileTabs()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8 mb-8">
          {/* Profile Photo & Basic Info */}
          <div className="bg-white rounded-2xl shadow-soft p-8 lg:w-80 flex-shrink-0 mb-8 lg:mb-0">
            <div className="text-center">
              {/* Profile Photo */}
              <div className="relative inline-block mb-4">
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {profile.profilePhoto ? (
                    <img
                      src={profile.profilePhoto}
                      alt={profile.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <button
                  onClick={() => setShowPhotoModal(true)}
                  className="absolute bottom-2 right-2 w-10 h-10 bg-teal-500 text-white rounded-full flex items-center justify-center hover:bg-teal-600 transition-colors shadow-lg"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              {/* Basic Info */}
              <h1 className="text-2xl font-bold text-gray-900 font-heading">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-gray-600 mb-2">{profile.email}</p>
              <span className="inline-block px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium capitalize">
                {profile.role?.replace('_', ' ')}
              </span>

              {/* Verification Status */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Verification Status</span>
                  <span className={`font-medium ${
                    profile.isVerified ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {profile.isVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
                {!profile.isVerified && (
                  <p className="text-xs text-gray-500 mt-1">
                    Complete your profile to get verified
                  </p>
                )}
              </div>
            </div>

            {/* Removed Quick Stats section since we don't have the data */}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-soft">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6 overflow-x-auto">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'border-teal-500 text-teal-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-8">
                {/* Personal Info Tab */}
                {activeTab === 'personal' && <PersonalInfoForm />}

                {/* Professional Tab (Fundi) */}
                {activeTab === 'professional' && user?.role === 'fundi' && (
                  <FundiProfessionalForm
                    profile={profile}
                    onSave={handleProfileUpdate}
                    saving={saving}
                  />
                )}

                {/* Portfolio Tab (Fundi) */}
                {activeTab === 'portfolio' && user?.role === 'fundi' && (
                  <PortfolioVerification profile={profile} onSave={handleProfileUpdate} saving={saving} />
                )}

                {/* Availability Tab (Fundi) */}
                {activeTab === 'availability' && user?.role === 'fundi' && <AvailabilityForm />}

                {/* Preferences Tab (Client) */}
                {activeTab === 'preferences' && user?.role === 'client' && <ClientPreferencesForm />}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <SecuritySettings
                    profile={profile}
                    onSave={handleProfileUpdate}
                    saving={saving}
                  />
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && <Notifications />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onUpload={handlePhotoUpload}
        currentPhoto={profile.profilePhoto}
      />
    </div>
  )
}