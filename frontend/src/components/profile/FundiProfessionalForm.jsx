// frontend/src/components/profile/FundiProfessionalForm.jsx
import { useState } from 'react'
import { Briefcase, DollarSign, MapPin, Award, Plus, X, Save } from 'lucide-react'
import countiesMapping, { counties } from '../../lib/countiesTowns'
import toast from 'react-hot-toast'
import FormInput from '../forms/FormInput'
import FormSelect from '../forms/FormSelect'
import FormTextarea from '../forms/FormTextarea'
import LoadingSpinner from '../common/LoadingSpinner'

export default function FundiProfessionalForm({ profile, onSave, saving }) {
  const [formData, setFormData] = useState({
    skills: profile.skills || [],
    certifications: profile.certifications || [],
    experience: profile.experience || '',
    hourlyRate: profile.hourlyRate || '',
    serviceAreas: profile.serviceAreas || [],
    languages: profile.languages || ['English'],
    availability: profile.availability || 'flexible',
    tools: profile.tools || []
  })
  // Include operating counties/towns and coordinates
  // merge any existing values that might be at profile.operatingCounties or profile.user.coordinates
  if (!formData.operatingCounties) formData.operatingCounties = profile.operatingCounties || []
  if (!formData.operatingTowns) formData.operatingTowns = profile.operatingTowns || []
  if (!formData.coordinates) formData.coordinates = profile.coordinates || profile.user?.coordinates || {}
  const [newSkill, setNewSkill] = useState('')
  const [newCertification, setNewCertification] = useState({ name: '', issuer: '', year: '' })
  const [newServiceArea, setNewServiceArea] = useState('')
  const [newTool, setNewTool] = useState('')

  const serviceCategories = [
    'Plumbing', 'Electrical', 'Carpentry', 'Masonry', 'Painting',
    'Tiling', 'Roofing', 'Welding', 'AC Repair', 'Generator Repair',
    'Solar Installation', 'Water Heating', 'Drainage', 'Security Systems'
  ]

  const availabilityOptions = [
    { value: 'flexible', label: 'Flexible' },
    { value: 'weekdays', label: 'Weekdays Only' },
    { value: 'weekends', label: 'Weekends Only' },
    { value: 'evenings', label: 'Evenings Only' },
    { value: 'custom', label: 'Custom Schedule' }
  ]

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Skills Management
  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }))
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }))
  }

  // Certifications Management
  const addCertification = () => {
    if (newCertification.name.trim() && newCertification.issuer.trim()) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, { ...newCertification }]
      }))
      setNewCertification({ name: '', issuer: '', year: '' })
    }
  }

  const removeCertification = (index) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }))
  }

  // Service Areas Management
  const addServiceArea = () => {
    if (newServiceArea.trim() && !formData.serviceAreas.includes(newServiceArea.trim())) {
      setFormData(prev => ({
        ...prev,
        serviceAreas: [...prev.serviceAreas, newServiceArea.trim()]
      }))
      setNewServiceArea('')
    }
  }

  const removeServiceArea = (areaToRemove) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter(area => area !== areaToRemove)
    }))
  }

  // Tools Management
  const addTool = () => {
    if (newTool.trim() && !formData.tools.includes(newTool.trim())) {
      setFormData(prev => ({
        ...prev,
        tools: [...prev.tools, newTool.trim()]
      }))
      setNewTool('')
    }
  }

  // Operating Counties / Towns management
  const [newCounty, setNewCounty] = useState('')
  const [newTown, setNewTown] = useState('')
  const [townCounty, setTownCounty] = useState((formData.operatingCounties && formData.operatingCounties[0]) || counties[0] || '')

  const addOperatingCounty = () => {
    if (newCounty && !((formData.operatingCounties || []).includes(newCounty))) {
      setFormData(prev => ({ ...prev, operatingCounties: [...(prev.operatingCounties || []), newCounty] }))
      setNewCounty('')
    }
  }

  const removeOperatingCounty = (c) => {
    setFormData(prev => ({ ...prev, operatingCounties: (prev.operatingCounties || []).filter(x => x !== c) }))
  }

  const addOperatingTown = () => {
    if (newTown && !((formData.operatingTowns || []).includes(newTown))) {
      setFormData(prev => ({ ...prev, operatingTowns: [...(prev.operatingTowns || []), newTown] }))
      setNewTown('')
    }
  }

  const removeOperatingTown = (t) => {
    setFormData(prev => ({ ...prev, operatingTowns: (prev.operatingTowns || []).filter(x => x !== t) }))
  }

  const pinMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords
      setFormData(prev => ({ ...prev, coordinates: { latitude, longitude } }))
      toast.success('Location pinned')
    }, (err) => {
      toast.error('Failed to get location: ' + err.message)
    })
  }

  const removeTool = (toolToRemove) => {
    setFormData(prev => ({
      ...prev,
      tools: prev.tools.filter(tool => tool !== toolToRemove)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 font-heading mb-6">Professional Information</h2>
        
        {/* Skills */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Skills & Specializations
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.skills.map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-teal-100 text-teal-800"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="ml-2 text-teal-600 hover:text-teal-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex space-x-3">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add a skill (e.g., Pipe Installation)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <button
              type="button"
              onClick={addSkill}
              className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Certifications */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Certifications & Licenses
          </label>
          <div className="space-y-3 mb-4">
            {formData.certifications.map((cert, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{cert.name}</p>
                  <p className="text-gray-600 text-sm">
                    {cert.issuer} {cert.year && `• ${cert.year}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeCertification(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              value={newCertification.name}
              onChange={(e) => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Certification name"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <input
              type="text"
              value={newCertification.issuer}
              onChange={(e) => setNewCertification(prev => ({ ...prev, issuer: e.target.value }))}
              placeholder="Issuing organization"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <input
              type="number"
              value={newCertification.year}
              onChange={(e) => setNewCertification(prev => ({ ...prev, year: e.target.value }))}
              placeholder="Year obtained"
              min="1900"
              max={new Date().getFullYear()}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <button
            type="button"
            onClick={addCertification}
            className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center space-x-2"
          >
            <Award className="w-4 h-4" />
            <span>Add Certification</span>
          </button>
        </div>

        {/* Experience & Rates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <FormTextarea
            label="Professional Experience"
            value={formData.experience}
            onChange={(e) => handleInputChange('experience', e.target.value)}
            placeholder="Describe your professional background and experience..."
            rows={4}
            helpText="Share your years of experience and notable projects"
          />

          <div className="space-y-6">
            <FormInput
              label="Hourly Rate (KES)"
              type="number"
              value={formData.hourlyRate}
              onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
              icon={DollarSign}
              placeholder="e.g., 1500"
              min="0"
            />

            <FormSelect
              label="Availability"
              value={formData.availability}
              onChange={(e) => handleInputChange('availability', e.target.value)}
              options={availabilityOptions}
              icon={Briefcase}
            />
          </div>
        </div>

        {/* Operating Counties & Towns */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">Operating Counties</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {(formData.operatingCounties || []).map((c, i) => (
              <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                {c}
                <button type="button" onClick={() => removeOperatingCounty(c)} className="ml-2 text-yellow-600 hover:text-yellow-800"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
            <div className="flex space-x-3 mb-3">
              <select value={newCounty} onChange={(e) => setNewCounty(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Select county</option>
                {counties.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="button" onClick={addOperatingCounty} className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center space-x-2"><Plus className="w-4 h-4" /><span>Add</span></button>
            </div>

          <label className="block text-sm font-medium text-gray-700 mb-3">Operating Towns</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {(formData.operatingTowns || []).map((t, i) => (
              <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                {t}
                <button type="button" onClick={() => removeOperatingTown(t)} className="ml-2 text-yellow-600 hover:text-yellow-800"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
            <div className="flex space-x-3 mb-3">
              <select value={townCounty} onChange={(e) => { setTownCounty(e.target.value); setNewTown('') }} className="px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Select county for town</option>
                {counties.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select value={newTown} onChange={(e) => setNewTown(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Select town</option>
                {(countiesMapping[townCounty] || []).map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <button type="button" onClick={addOperatingTown} className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center space-x-2"><Plus className="w-4 h-4" /><span>Add</span></button>
            </div>

          <label className="block text-sm font-medium text-gray-700 mb-3">Exact Location (coordinates)</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input type="text" value={formData.coordinates?.latitude || ''} onChange={(e) => setFormData(prev => ({ ...prev, coordinates: { ...(prev.coordinates||{}), latitude: e.target.value } }))} placeholder="Latitude" className="px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="text" value={formData.coordinates?.longitude || ''} onChange={(e) => setFormData(prev => ({ ...prev, coordinates: { ...(prev.coordinates||{}), longitude: e.target.value } }))} placeholder="Longitude" className="px-3 py-2 border border-gray-300 rounded-lg" />
            <button type="button" onClick={pinMyLocation} className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors">Pin my location</button>
          </div>
        </div>

        {/* Service Areas */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Service Areas
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.serviceAreas.map((area, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                <MapPin className="w-3 h-3 mr-1" />
                {area}
                <button
                  type="button"
                  onClick={() => removeServiceArea(area)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex space-x-3">
            <input
              type="text"
              value={newServiceArea}
              onChange={(e) => setNewServiceArea(e.target.value)}
              placeholder="Add a service area (e.g., Nairobi West)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <button
              type="button"
              onClick={addServiceArea}
              className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Tools & Equipment */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tools & Equipment
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.tools.map((tool, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
              >
                {tool}
                <button
                  type="button"
                  onClick={() => removeTool(tool)}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex space-x-3">
            <input
              type="text"
              value={newTool}
              onChange={(e) => setNewTool(e.target.value)}
              placeholder="Add a tool or equipment"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <button
              type="button"
              onClick={addTool}
              className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Languages */}
        <div>
          <FormSelect
            label="Languages Spoken"
            value={formData.languages[0]}
            onChange={(e) => handleInputChange('languages', [e.target.value])}
            options={[
              { value: 'English', label: 'English' },
              { value: 'Swahili', label: 'Swahili' },
              { value: 'Both', label: 'English & Swahili' }
            ]}
            helpText="Select the primary language for client communication"
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
          <span>Save Professional Info</span>
        </button>
      </div>
    </form>
  )
}