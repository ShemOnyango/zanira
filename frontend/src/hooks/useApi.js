// frontend/src/hooks/useApi.js
import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'

export function useApi(apiFunction, options = {}) {
  const { showToast = true, successMessage = null } = options
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiFunction(...args)
      setData(response.data)
      
      if (showToast && successMessage) {
        toast.success(successMessage)
      }
      
      return response.data
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'An error occurred'
      setError(errorMessage)
      
      if (showToast) {
        toast.error(errorMessage)
      }
      
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiFunction, showToast, successMessage])

  return { data, loading, error, execute }
}