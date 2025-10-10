// frontend/src/lib/utils.js
import { format, formatDistanceToNow, parseISO } from 'date-fns'

// Format currency (Kenyan Shillings)
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format date
export const formatDate = (date, formatStr = 'PPP') => {
  if (!date) return ''
  return format(new Date(date), formatStr)
}

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date) => {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

// Validate email
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

// Validate phone number (Kenyan format)
export const validatePhone = (phone) => {
  const re = /^\+254[17]\d{8}$/
  return re.test(phone)
}

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Generate random ID
export const generateId = (length = 8) => {
  return Math.random().toString(36).substring(2, 2 + length)
}

// Debounce function
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Format booking status for display
export const formatBookingStatus = (status) => {
  const statusMap = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    disputed: 'Disputed'
  }
  return statusMap[status] || status
}

// Get initials from name
export const getInitials = (firstName, lastName) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}

// Truncate text
export const truncateText = (text, length = 50) => {
  if (!text) return ''
  return text.length > length ? `${text.substring(0, length)}...` : text
}