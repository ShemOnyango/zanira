// frontend/src/components/profile/PhotoUploadModal.jsx
import { useState, useRef } from 'react'
import { Upload, X, User, Camera } from 'lucide-react'
import Modal from '../common/Modal'
import LoadingSpinner from '../common/LoadingSpinner'

export default function PhotoUploadModal({ isOpen, onClose, onUpload, currentPhoto }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc.)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    setSelectedFile(file)
    setError('')

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setLoading(true)
    try {
      await onUpload(selectedFile)
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload photo')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setError('')
    setLoading(false)
    onClose()
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Update Profile Photo"
      size="md"
    >
      <div className="space-y-6">
        {/* Current Photo */}
        <div className="text-center">
          <label className="block text-sm font-medium text-gray-700 mb-3">Current Photo</label>
          <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mx-auto">
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt="Current profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-16 h-16 text-gray-400" />
            )}
          </div>
        </div>

        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">New Photo</label>
          
          {previewUrl ? (
            <div className="text-center">
              <div className="w-48 h-48 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mx-auto mb-4 relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={triggerFileInput}
                className="text-teal-600 hover:text-teal-700 font-medium text-sm"
              >
                Choose Different Photo
              </button>
            </div>
          ) : (
            <div
              onClick={triggerFileInput}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-teal-400 transition-colors"
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Click to upload a photo</p>
              <p className="text-gray-500 text-sm">JPEG, PNG up to 5MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Upload Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Photo Tips:</h4>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Use a clear, recent photo of yourself</li>
            <li>• Face the camera directly with good lighting</li>
            <li>• Avoid filters and group photos</li>
            <li>• Square photos work best</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || loading}
            className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading && <LoadingSpinner size="sm" />}
            <Camera className="w-5 h-5" />
            <span>Update Photo</span>
          </button>
        </div>
      </div>
    </Modal>
  )
}