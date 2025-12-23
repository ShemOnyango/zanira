// frontend/src/pages/verification/PortfolioVerification.jsx
import { useState, useRef } from 'react'
import { 
  Upload, 
  Camera, 
  FileText, 
  UserCheck, 
  Building, 
  MapPin,
  Calendar,
  Save,
  X,
  Eye,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useApi } from '../../hooks/useApi'
import { userAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Modal from '../../components/common/Modal'
import toast from 'react-hot-toast'

export default function PortfolioVerification({ profile, onSave, saving }) {
  const { user } = useAuthStore()
  const [formData, setFormData] = useState({
    // Common fields
    nationalId: profile.nationalId || '',
    nationalIdScan: profile.nationalIdScan || '',
    phoneVerified: profile.phoneVerified || false,
    
    // Fundi specific
    verificationVideo: profile.verificationVideo || '',
    toolsPhoto: profile.toolsPhoto || '',
    nationalIdPhoto: profile.nationalIdPhoto || '',
    licenseDocument: profile.licenseDocument || '',
    ncaCertificate: profile.ncaCertificate || '',
    skills: profile.skills || [],
    certifications: profile.certifications || [],
    
    // Shop owner specific
    businessPermit: profile.businessPermit || '',
    businessRegistration: profile.businessRegistration || '',
    shopLocation: profile.shopLocation || {
      county: '',
      town: '',
      address: '',
      coordinates: { lat: 0, lng: 0 }
    },
    workingHours: profile.workingHours || {
      days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      start: '08:00',
      end: '17:00'
    },
    
    // Client specific (minimal)
    idVerificationDocument: profile.idVerificationDocument || ''
  })
  
  const [uploading, setUploading] = useState('')
  const [previewFile, setPreviewFile] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef(null)

  const { execute: uploadFile } = useApi(userAPI.uploadDocument, { 
    showToast: false 
  })

  // Handle file upload
  const handleFileUpload = async (file, fieldName) => {
    setUploading(fieldName)
    try {
      // Map our local UI field names to the server's expected multipart field names
      const mapToServerField = (local) => {
        const map = {
          verificationVideo: 'video',
          toolsPhoto: 'photoWithTools',
          nationalIdPhoto: 'nationalIdFront',
          nationalIdScan: 'nationalIdBack',
          licenseDocument: 'otherCertificates',
          ncaCertificate: 'ncaCertificate',
          idVerificationDocument: 'clientIdDocument',
          businessPermit: 'businessPermit',
          businessRegistration: 'businessRegistration'
        }
        return map[local] || local
      }

      const serverField = mapToServerField(fieldName)

      const formDataToSend = new FormData()
      // Append the file under the server-expected field name
      // For array fields like otherCertificates, multer will accept multiple files under the same field name
      formDataToSend.append(serverField, file)

      // Optionally include a documentType for server-side labeling
      formDataToSend.append('documentType', fieldName)

      const response = await uploadFile(formDataToSend)

      // Backend returns uploadedFiles in response.data.data.uploadedFiles
      const uploadedFiles = response?.data?.data?.uploadedFiles || response?.data?.uploadedFiles || response?.uploadedFiles || {}

      // uploadedFiles keys are the multipart field names (serverField)
      // If server returned a single string url (legacy), try to use that too
      const fileUrl = uploadedFiles[serverField] || response?.data?.data?.url || response?.data?.url || response?.url

      if (fileUrl) {
        setFormData(prev => ({
          ...prev,
          [fieldName]: fileUrl
        }))
        toast.success(`${fieldName.replace(/([A-Z])/g, ' $1')} uploaded successfully`)
      } else {
        // If uploadedFiles contains the url under a different key (like nationalIdFront when we mapped nationalIdScan), try to find any url
        const anyUrl = Object.values(uploadedFiles).find(v => typeof v === 'string' && v.startsWith('http'))
        if (anyUrl) {
          setFormData(prev => ({ ...prev, [fieldName]: anyUrl }))
          toast.success(`${fieldName.replace(/([A-Z])/g, ' $1')} uploaded successfully`)
        }
      }
    } catch (error) {
      console.error(`Upload failed for ${fieldName}:`, error)
      toast.error(`Failed to upload ${fieldName.replace(/([A-Z])/g, ' $1')}`)
    } finally {
      setUploading('')
    }
  }

  // Handle file selection
  const handleFileSelect = (e, fieldName) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'video/mp4', 'application/pdf']
      const maxSize = fieldName.includes('Video') ? 50 * 1024 * 1024 : 5 * 1024 * 1024 // 50MB for video, 5MB for others

      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid file type (JPEG, PNG, PDF, or MP4)')
        return
      }

      if (file.size > maxSize) {
        toast.error(`File size must be less than ${maxSize / (1024 * 1024)}MB`)
        return
      }

      handleFileUpload(file, fieldName)
    }
  }

  // Trigger file input
  const triggerFileInput = (fieldName) => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-field', fieldName)
      fileInputRef.current.click()
    }
  }

  // Preview file
  const handlePreview = (fileUrl) => {
    setPreviewFile(fileUrl)
    setShowPreview(true)
  }

  // File upload card component
  const FileUploadCard = ({ 
    title, 
    description, 
    fieldName, 
    currentFile, 
    required = false,
    accept = "image/*,video/*,application/pdf",
    isVideo = false
  }) => (
    <div className="border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
            {title}
            {required && <span className="text-red-500">*</span>}
            {currentFile && <CheckCircle className="w-5 h-5 text-green-500" />}
          </h3>
          <p className="text-gray-600 text-sm mt-1">{description}</p>
        </div>
        
        {currentFile && (
          <button
            type="button"
            onClick={() => handlePreview(currentFile)}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
          >
            <Eye className="w-4 h-4" />
            <span>View</span>
          </button>
        )}
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={() => triggerFileInput(fieldName)}
          disabled={uploading === fieldName}
          className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 transition-colors flex items-center space-x-2"
        >
          {uploading === fieldName ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>
            {currentFile ? 'Replace File' : 'Upload File'}
            {uploading === fieldName && '...'}
          </span>
        </button>

        {currentFile && (
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, [fieldName]: '' }))}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Remove</span>
          </button>
        )}
      </div>

      {isVideo && currentFile && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <p className="text-blue-700 text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>Video must show you working (max 30 seconds)</span>
          </p>
        </div>
      )}
    </div>
  )

  // Fundi Verification Section
  const FundiVerification = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center space-x-2">
          <UserCheck className="w-5 h-5" />
          <span>Fundi Verification Requirements</span>
        </h3>
        <p className="text-blue-700 text-sm">
          Complete all required verifications to get verified and start receiving jobs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Video */}
        <FileUploadCard
          title="Working Video"
          description="30-second video showing you working on a real task"
          fieldName="verificationVideo"
          currentFile={formData.verificationVideo}
          required={true}
          accept="video/mp4,video/quicktime"
          isVideo={true}
        />

        {/* Tools Photo */}
        <FileUploadCard
          title="Tools Photo"
          description="Clear photo showing your working tools"
          fieldName="toolsPhoto"
          currentFile={formData.toolsPhoto}
          required={true}
        />

        {/* National ID Photo */}
        <FileUploadCard
          title="National ID Photo"
          description="Photo of you holding your original National ID"
          fieldName="nationalIdPhoto"
          currentFile={formData.nationalIdPhoto}
          required={true}
        />

        {/* National ID Scan */}
        <FileUploadCard
          title="National ID Scan"
          description="Scanned copy of your National ID (front and back)"
          fieldName="nationalIdScan"
          currentFile={formData.nationalIdScan}
          required={true}
          accept="image/*,application/pdf"
        />

        {/* License Document (Optional) */}
        <FileUploadCard
          title="Engineering License"
          description="Board of Engineers certification (optional)"
          fieldName="licenseDocument"
          currentFile={formData.licenseDocument}
          required={false}
          accept="image/*,application/pdf"
        />

        {/* NCA Certificate */}
        <FileUploadCard
          title="NCA Certificate"
          description="National Construction Authority certificate"
          fieldName="ncaCertificate"
          currentFile={formData.ncaCertificate}
          required={false}
          accept="image/*,application/pdf"
        />
      </div>

      {/* Skills and Certifications */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Skills & Certifications</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Skills
            </label>
            <textarea
              value={formData.skills.join(', ')}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                skills: e.target.value.split(',').map(skill => skill.trim()).filter(Boolean)
              }))}
              placeholder="e.g., Plumbing, Electrical Wiring, Pipe Installation"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <p className="text-gray-500 text-sm mt-1">Separate skills with commas</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certifications
            </label>
            <textarea
              value={formData.certifications.join(', ')}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                certifications: e.target.value.split(',').map(cert => cert.trim()).filter(Boolean)
              }))}
              placeholder="e.g., NCA Level 4, Electrical Engineering Certificate"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <p className="text-gray-500 text-sm mt-1">Separate certifications with commas</p>
          </div>
        </div>
      </div>
    </div>
  )

  // Shop Owner Verification Section
  const ShopOwnerVerification = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center space-x-2">
          <Building className="w-5 h-5" />
          <span>Shop Owner Verification Requirements</span>
        </h3>
        <p className="text-blue-700 text-sm">
          Complete business verification to start operating on the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Permit */}
        <FileUploadCard
          title="Business Operation Permit"
          description="Valid business operation permit from county government"
          fieldName="businessPermit"
          currentFile={formData.businessPermit}
          required={true}
          accept="image/*,application/pdf"
        />

        {/* Business Registration */}
        <FileUploadCard
          title="Business Registration"
          description="Certificate of business registration"
          fieldName="businessRegistration"
          currentFile={formData.businessRegistration}
          required={true}
          accept="image/*,application/pdf"
        />

        {/* National ID Scan */}
        <FileUploadCard
          title="National ID Scan"
          description="Scanned copy of owner's National ID"
          fieldName="nationalIdScan"
          currentFile={formData.nationalIdScan}
          required={true}
          accept="image/*,application/pdf"
        />
      </div>

      {/* Shop Location */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <MapPin className="w-5 h-5" />
          <span>Shop Location Details</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              County
            </label>
            <input
              type="text"
              value={formData.shopLocation.county}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                shopLocation: { ...prev.shopLocation, county: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Enter county"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Town
            </label>
            <input
              type="text"
              value={formData.shopLocation.town}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                shopLocation: { ...prev.shopLocation, town: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Enter town"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Address
            </label>
            <textarea
              value={formData.shopLocation.address}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                shopLocation: { ...prev.shopLocation, address: e.target.value }
              }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Enter full shop address including street and building"
            />
          </div>
        </div>
      </div>

      {/* Working Hours */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Working Hours</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opening Time
            </label>
            <input
              type="time"
              value={formData.workingHours.start}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                workingHours: { ...prev.workingHours, start: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Closing Time
            </label>
            <input
              type="time"
              value={formData.workingHours.end}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                workingHours: { ...prev.workingHours, end: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Working Days
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'mon', label: 'Monday' },
              { value: 'tue', label: 'Tuesday' },
              { value: 'wed', label: 'Wednesday' },
              { value: 'thu', label: 'Thursday' },
              { value: 'fri', label: 'Friday' },
              { value: 'sat', label: 'Saturday' },
              { value: 'sun', label: 'Sunday' }
            ].map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => {
                  const days = new Set(formData.workingHours.days)
                  if (days.has(day.value)) {
                    days.delete(day.value)
                  } else {
                    days.add(day.value)
                  }
                  setFormData(prev => ({
                    ...prev,
                    workingHours: { ...prev.workingHours, days: Array.from(days) }
                  }))
                }}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  formData.workingHours.days.includes(day.value)
                    ? 'bg-teal-500 text-white border-teal-500'
                    : 'bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // Client Verification Section
  const ClientVerification = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center space-x-2">
          <UserCheck className="w-5 h-5" />
          <span>Client Verification</span>
        </h3>
        <p className="text-blue-700 text-sm">
          Basic verification required to book services on the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-2xl">
        {/* National ID Scan */}
        <FileUploadCard
          title="National ID Scan"
          description="Scanned copy of your National ID for verification"
          fieldName="nationalIdScan"
          currentFile={formData.nationalIdScan}
          required={true}
          accept="image/*,application/pdf"
        />

        {/* ID Verification Document */}
        <FileUploadCard
          title="Additional ID Document"
          description="Any additional ID document (Passport, Driver's License)"
          fieldName="idVerificationDocument"
          currentFile={formData.idVerificationDocument}
          required={false}
          accept="image/*,application/pdf"
        />
      </div>

      {/* Phone Verification Status */}
      <div className="border border-gray-200 rounded-lg p-6 max-w-2xl">
        <h3 className="font-semibold text-gray-900 mb-4">Phone Verification</h3>
        
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Phone Number Verified</p>
            <p className="text-gray-600 text-sm">
              {formData.phoneVerified 
                ? 'Your phone number has been verified' 
                : 'Please verify your phone number to continue'
              }
            </p>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            formData.phoneVerified 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {formData.phoneVerified ? 'Verified' : 'Pending'}
          </div>
        </div>

        {!formData.phoneVerified && (
          <button
            type="button"
            className="mt-4 bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors"
          >
            Verify Phone Number
          </button>
        )}
      </div>
    </div>
  )

  // File Preview Modal
  const FilePreviewModal = () => (
    <Modal
      isOpen={showPreview}
      onClose={() => setShowPreview(false)}
      title="Document Preview"
      size="lg"
    >
      <div className="flex justify-center">
        {previewFile?.endsWith('.mp4') || previewFile?.includes('video') ? (
          <video controls className="w-full h-96 rounded-lg">
            <source src={previewFile} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : previewFile?.endsWith('.pdf') ? (
          <iframe 
            src={previewFile} 
            className="w-full h-96 rounded-lg"
            title="PDF Preview"
          />
        ) : (
          <img 
            src={previewFile} 
            alt="Preview" 
            className="w-full h-96 object-contain rounded-lg"
          />
        )}
      </div>
      
      <div className="flex justify-end mt-4">
        <button
          onClick={() => setShowPreview(false)}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  )

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave(formData)
  }

  // Render based on user role
  const renderVerificationForm = () => {
    switch (user?.role) {
      case 'fundi':
        return <FundiVerification />
      case 'shop_owner':
        return <ShopOwnerVerification />
      case 'client':
        return <ClientVerification />
      default:
        return (
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Verification Not Required</h3>
            <p className="text-gray-600">Your user role does not require additional verification.</p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 font-heading mb-2">
          Portfolio & Verification
        </h2>
        <p className="text-gray-600">
          Complete your verification to access all platform features
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {renderVerificationForm()}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,application/pdf"
          onChange={(e) => {
            const fieldName = e.target.getAttribute('data-field')
            if (fieldName) {
              handleFileSelect(e, fieldName)
            }
          }}
        />

        {/* Submit button */}
        {user?.role && ['fundi', 'shop_owner', 'client'].includes(user.role) && (
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-8">
            <button
              type="submit"
              disabled={saving}
              className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {saving && <LoadingSpinner size="sm" />}
              <Save className="w-5 h-5" />
              <span>Save Verification Details</span>
            </button>
          </div>
        )}
      </form>

      {/* File Preview Modal */}
      <FilePreviewModal />
    </div>
  )
}