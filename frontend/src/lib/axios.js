import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

axiosInstance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

axiosInstance.interceptors.response.use(
  (response) => {
    // Success responses go here - just return them unchanged
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Only handle actual errors (status codes 4xx, 5xx)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Prefer auth store value but fall back to legacy localStorage value
        let refreshToken = useAuthStore.getState().refreshToken
        if (!refreshToken) {
          try {
            refreshToken = localStorage.getItem('refreshToken')
          } catch (e) {
            refreshToken = null
          }
        }

        const refreshResp = await axios.post('/api/v1/auth/refresh-token', {
          refreshToken,
        })

        const refreshData = refreshResp?.data?.data || refreshResp?.data || {}
        const newToken = refreshData.token || refreshData.accessToken || null
        const newRefresh = refreshData.refreshToken || refreshData.refresh || null
        const currentUser = useAuthStore.getState().user || null

        useAuthStore.getState().setAuth(currentUser, newToken, newRefresh)
        
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }

        return axiosInstance(originalRequest)
      } catch (refreshError) {
        const authState = useAuthStore.getState()
        const role = authState.user?.role
        authState.logout()
        // If the user was an admin, redirect to home page; otherwise to login
        if (role === 'admin' || role === 'super_admin') {
          window.location.href = '/'
        } else {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      }
    }

    // Only show toast for actual errors, not successful responses
    if (error.response?.status >= 400) {
      const details = error.response?.data?.details
      const message = error.response?.data?.message || 
                     error.response?.data?.error || 
                     'An error occurred'

      // Show toast only for non-login routes to avoid interfering with login
      if (!originalRequest.url.includes('/auth/login')) {
        toast.error(Array.isArray(details) ? details[0].message : message)
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance