// frontend/src/components/common/MapSelectorModal.jsx
import { useState, useEffect } from 'react'
import { X, MapPin } from 'lucide-react'
import Modal from './Modal'
import LoadingSpinner from './LoadingSpinner'

export default function MapSelectorModal({ 
  isOpen, 
  onClose, 
  onLocationSelect, 
  initialCoordinates 
}) {
  const [selectedLocation, setSelectedLocation] = useState(initialCoordinates)
  const [mapLoading, setMapLoading] = useState(true)

  useEffect(() => {
    setSelectedLocation(initialCoordinates)
  }, [initialCoordinates, isOpen])

  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Simple simulation - in real app, you'd use actual map coordinates
    // For demo, we'll use relative positioning
    const lat = initialCoordinates.latitude + (y - rect.height / 2) / 10000
    const lng = initialCoordinates.longitude + (x - rect.width / 2) / 10000
    
    setSelectedLocation({ latitude: lat, longitude: lng })
  }

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation.latitude, selectedLocation.longitude)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Location on Map"
      size="lg"
    >
      <div className="space-y-4">
        <div className="bg-gray-100 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">
            Click on the map to select your exact location
          </p>
          
          {/* Map Container - In a real app, integrate with Google Maps or similar */}
          <div 
            className="w-full h-64 bg-blue-50 border-2 border-blue-200 rounded-lg relative cursor-pointer overflow-hidden"
            onClick={handleMapClick}
          >
            {mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner size="md" />
              </div>
            )}
            
            {/* Simple grid for demo - replace with actual map in production */}
            <div className="w-full h-full bg-gradient-to-br from-green-100 to-blue-100 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 opacity-20">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="absolute w-full h-px bg-gray-400 top-1/4"></div>
                ))}
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="absolute h-full w-px bg-gray-400 left-1/4"></div>
                ))}
              </div>
              
              {/* Selected location marker */}
              {selectedLocation && (
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: '50%',
                    top: '50%'
                  }}
                >
                  <div className="relative">
                    <MapPin className="w-8 h-8 text-red-500 fill-current" />
                    <div className="absolute inset-0 animate-ping">
                      <MapPin className="w-8 h-8 text-red-300" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Coordinates display */}
          {selectedLocation && (
            <div className="mt-3 p-2 bg-white rounded border">
              <p className="text-sm text-gray-600">
                Selected Coordinates:
              </p>
              <p className="text-sm font-mono">
                {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedLocation}
            className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </Modal>
  )
}