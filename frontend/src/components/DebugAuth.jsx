import { useAuthStore } from '../store/authStore'

export default function DebugAuth() {
  const { user, token, isAuthenticated } = useAuthStore()
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      fontSize: '12px',
      zIndex: 9999 
    }}>
      <div>Auth Debug:</div>
      <div>Authenticated: {isAuthenticated ? 'YES' : 'NO'}</div>
      <div>User: {user ? JSON.stringify(user) : 'null'}</div>
      <div>Token: {token ? 'YES' : 'NO'}</div>
    </div>
  )
}