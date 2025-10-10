// frontend/src/contexts/SocketContext.jsx (Fixed)
import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const SocketContext = createContext()

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState([])
  const { isAuthenticated, token, user } = useAuthStore()
  const socketRef = useRef(null)

  useEffect(() => {
    if (isAuthenticated && user?._id) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
      const currentToken = useAuthStore.getState().token

      console.log('🔌 Initializing socket connection...', {
        socketUrl,
        hasToken: !!currentToken,
        userId: user._id
      })

      // Clean up any existing socket first
      if (socketRef.current) {
        console.log('♻️ Cleaning up previous socket connection')
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current = null
      }

      const newSocket = io(socketUrl, {
        auth: {
          token: currentToken
        },
        transports: ['websocket', 'polling'], // Explicitly specify transports
        upgrade: true,
        forceNew: true, // Force new connection
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        withCredentials: true
      })

      socketRef.current = newSocket

      newSocket.on('connect', () => {
        console.log('✅ Socket connected successfully:', {
          socketId: newSocket.id,
          connected: newSocket.connected,
          transport: newSocket.io.engine.transport.name
        })
        
        // Join user to their personal room
        if (user?._id) {
          newSocket.emit('join_user', user._id)
        }
      })

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', {
          message: error.message,
          description: error.description,
          context: error.context
        })
        
        // More specific error handling
        if (error.message.includes('401') || error.message.includes('auth')) {
          toast.error('Authentication failed. Please log in again.')
          useAuthStore.getState().logout()
        } else if (error.message.includes('404')) {
          console.warn('Socket endpoint not found, retrying...')
        } else {
          toast.error(`Connection error: ${error.message}`)
        }
      })

      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason)
        if (reason === 'io server disconnect') {
          // Server deliberately disconnected, may need to reconnect manually
          newSocket.connect()
        }
      })

      newSocket.on('reconnect_attempt', (attempt) => {
        console.log(`🔄 Socket reconnect attempt ${attempt}`)
      })

      newSocket.on('reconnect_error', (error) => {
        console.error('🔄 Socket reconnect error:', error)
      })

      newSocket.on('reconnect_failed', () => {
        console.error('❌ Socket reconnect failed')
        toast.error('Unable to establish real-time connection')
      })

      // Handle real-time events
      newSocket.on('connected', (data) => {
        console.log('🎉 Server acknowledged connection:', data)
      })

      newSocket.on('notification', (notification) => {
        toast(notification.message, {
          icon: '🔔',
          duration: 5000
        })
        const event = new CustomEvent('new_notification', { detail: notification })
        window.dispatchEvent(event)
      })

      newSocket.on('new_message', (messageData) => {
        const event = new CustomEvent('new_message', { detail: messageData })
        window.dispatchEvent(event)
      })

      newSocket.on('user_typing', (data) => {
        const event = new CustomEvent('user_typing', { detail: data })
        window.dispatchEvent(event)
      })

      newSocket.on('user_online', (data) => {
        setOnlineUsers(prev => {
          const exists = prev.find(u => u.userId === data.userId)
          return exists ? prev : [...prev, data]
        })
      })

      newSocket.on('user_offline', (data) => {
        setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId))
      })

      newSocket.on('online_users', (users) => {
        setOnlineUsers(users)
      })

      setSocket(newSocket)

      return () => {
        console.log('🧹 Cleaning up socket connection on unmount')
        if (socketRef.current) {
          socketRef.current.removeAllListeners()
          socketRef.current.disconnect()
          socketRef.current = null
        }
        setSocket(null)
      }
    } else {
      // Cleanup when not authenticated
      if (socketRef.current) {
        console.log('🚪 Cleaning up socket - user not authenticated')
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
      }
      setOnlineUsers([])
    }
  }, [isAuthenticated, user?._id]) // Only depend on auth state and user ID

  // Handle token updates without recreating socket
  useEffect(() => {
    if (socket && token) {
      console.log('🔄 Updating socket auth token')
      socket.auth = { token }
      // Don't force reconnect on token update unless disconnected
      if (!socket.connected) {
        socket.connect()
      }
    }
  }, [token, socket])

  return (
    <SocketContext.Provider value={{ 
      socket, 
      onlineUsers,
      isConnected: socket?.connected || false 
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context.socket
}

export function useOnlineUsers() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useOnlineUsers must be used within a SocketProvider')
  }
  return context.onlineUsers
}

export function useSocketConnection() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocketConnection must be used within a SocketProvider')
  }
  return {
    socket: context.socket,
    onlineUsers: context.onlineUsers,
    isConnected: context.isConnected
  }
}