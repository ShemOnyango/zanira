import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, token, refreshToken = null) => {
        console.log('setAuth called with:', { user, token: !!token, refreshToken: !!refreshToken })
        
        if (!user || !token) {
          console.error('setAuth called with missing user or token')
          return
        }

        // Update Zustand state
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
        })

        // Also update localStorage directly for legacy compatibility
        try {
          localStorage.setItem('accessToken', token)
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken)
          }
          localStorage.setItem('user', JSON.stringify(user))
          console.log('Legacy localStorage updated successfully')
        } catch (e) {
          console.warn('Failed to update legacy localStorage:', e)
        }
      },

      updateUser: (userData) => {
        console.log('updateUser called with:', userData)
        const currentUser = get().user
        const updatedUser = { ...currentUser, ...userData }
        
        set({ user: updatedUser })
        
        try {
          localStorage.setItem('user', JSON.stringify(updatedUser))
        } catch (e) {
          console.warn('Failed to update user in localStorage:', e)
        }
      },

      logout: () => {
        console.log('logout called')
        // Clear everything
        try {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('user')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('zanira-auth-storage')
        } catch (e) {
          // ignore
        }
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      // Simple sync function that just reads from localStorage
      syncWithLocalStorage: () => {
        try {
          const token = localStorage.getItem('accessToken')
          const userStr = localStorage.getItem('user')
          
          console.log('syncWithLocalStorage found:', { 
            token: !!token, 
            userStr: !!userStr 
          })

          if (token && userStr) {
            try {
              const user = JSON.parse(userStr)
              console.log('Syncing from localStorage:', { user, token: !!token })
              
              set({
                user,
                token,
                isAuthenticated: true,
              })
              return true
            } catch (parseError) {
              console.error('Error parsing user from localStorage:', parseError)
              // Clean up invalid data
              localStorage.removeItem('user')
              localStorage.removeItem('accessToken')
            }
          }
          return false
        } catch (error) {
          console.error('Error in syncWithLocalStorage:', error)
          return false
        }
      },
    }),
    {
      name: 'zanira-auth-storage',
      version: 1,
    }
  )
)