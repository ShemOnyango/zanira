// src/components/common/SuccessMessage.jsx
import { useState, useEffect } from 'react'
import { CheckCircle, X, Info, AlertCircle } from 'lucide-react'

const SuccessMessage = ({ 
  message, 
  onClose, 
  duration = 5000,
  className = '',
  type = 'success',
  title,
  showIcon = true,
  autoClose = true
}) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoClose && duration) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => {
          onClose?.()
        }, 300)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, onClose, autoClose])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose?.()
    }, 300)
  }

  if (!isVisible) {
    return null
  }

  // Configuration based on message type
  const config = {
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-400',
      icon: CheckCircle,
      defaultTitle: 'Success'
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-400',
      icon: Info,
      defaultTitle: 'Information'
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-400',
      icon: AlertCircle,
      defaultTitle: 'Warning'
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-400',
      icon: AlertCircle,
      defaultTitle: 'Error'
    }
  }

  const { 
    bgColor, 
    borderColor, 
    textColor, 
    iconColor, 
    icon: IconComponent,
    defaultTitle 
  } = config[type] || config.success

  const displayTitle = title || defaultTitle

  return (
    <div className={`animate-in slide-in-from-top duration-300 ${className}`}>
      <div className={`rounded-md p-4 border shadow-sm ${bgColor} ${borderColor}`}>
        <div className="flex">
          {showIcon && (
            <div className="flex-shrink-0">
              <IconComponent className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
            </div>
          )}
          <div className={showIcon ? "ml-3 flex-1" : "flex-1"}>
            {title && (
              <h3 className={`text-sm font-semibold ${textColor}`}>
                {displayTitle}
              </h3>
            )}
            <p className={`text-sm ${textColor} ${title ? 'mt-1' : ''}`}>
              {message}
            </p>
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={handleClose}
                className={`inline-flex rounded-md p-1.5 hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-2 ${bgColor}`}
              >
                <span className="sr-only">Dismiss</span>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export both the main component and a simpler success-only version
export const SimpleSuccessMessage = ({ message, onClose, duration = 5000 }) => (
  <SuccessMessage 
    message={message} 
    onClose={onClose} 
    duration={duration}
    type="success"
  />
)

export default SuccessMessage