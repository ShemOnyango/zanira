import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { SocketProvider } from './contexts/SocketContext'

import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Services from './pages/Services'
import HowItWorks from './pages/HowItWorks'
import About from './pages/About'
import Contact from './pages/Contact'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import AdminLogin from './pages/auth/AdminLogin'
import AdminRegister from './pages/auth/AdminRegister'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import VerifyEmail from './pages/auth/VerifyEmail'

import ClientDashboard from './pages/dashboard/ClientDashboard'
import FundiDashboard from './pages/dashboard/FundiDashboard'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import AdminLayout from './pages/admin/AdminLayout'
//import AdminDashboardAdmin from './pages/admin/AdminDashboard'
import ChatManagement from './pages/admin/ChatManagement'
import PriceNegotiation from './pages/admin/PriceNegotiation'
import ShopVerification from './pages/admin/ShopVerification'
import BookingManagementAdmin from './pages/admin/BookingManagement'
import TestimonialModeration from './pages/admin/TestimonialModeration'
import FundiAllocation from './pages/admin/FundiAllocation'
import MaterialReceiptTracking from './pages/admin/MaterialReceiptTracking'
import EnhancedAnalytics from './pages/admin/EnhancedAnalytics'
import RoleManagement from './pages/admin/RoleManagement'
import ProductManagement from './pages/admin/ProductManagement'
import BulkOperations from './pages/admin/BulkOperations'
import AdvancedReporting from './pages/admin/AdvancedReporting'
import AdminServices from './pages/admin/AdminServices'
import SystemConfiguration from './pages/admin/SystemConfiguration'

import BookingCreate from './pages/bookings/BookingCreate'
import BookingDetails from './pages/bookings/BookingDetails'
import Bookings from './pages/bookings/Bookings'

import Profile from './pages/profile/Profile'
import Wallet from './pages/wallet/Wallet'
import Messages from './pages/messages/Messages'
import Notifications from './pages/notifications/Notifications'

import Shops from './pages/shops/Shops'
import ShopDetail from './pages/shops/ShopDetail'
import ShopDashboard from './pages/shops/ShopDashboard'
import CreateShop from './pages/shops/CreateShop'

import NotFound from './pages/NotFound'
import Unauthorized from './pages/Unauthorized'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If allowedRoles is provided but the authenticated user hasn't loaded
  // their full profile (role may be undefined while the client fetches /auth/me),
  // allow rendering the children so downstream components can complete the
  // profile load. This prevents accidental redirects to a non-existent
  // /unauthorized route during initial hydration.
  if (allowedRoles) {
    // If user role not yet available but user is authenticated, allow through
    if (!user?.role) {
      return children
    }

    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return children
}

const DashboardRouter = () => {
  const { user, token, setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchProfile = async () => {
      if (user?.role || !token) {
        return
      }

      setLoading(true)
      try {
        const { authAPI } = await import('./lib/api')
        const { data } = await authAPI.getMe()
        if (!mounted) return
        if (data.user) {
          setAuth(data.user, data.token || token, data.refreshToken || null)
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchProfile()

    return () => {
      mounted = false
    }
  }, [user, token, setAuth])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  switch (user?.role) {
    case 'client':
      return <ClientDashboard />
    case 'fundi':
      return <FundiDashboard />
    case 'shop_owner':
      return <Navigate to="/shop-dashboard" replace />
    case 'admin':
    case 'super_admin':
      return <AdminDashboard />
    default:
      return <Navigate to="/profile" replace />
  }
}


function App() {
  return (
    <SocketProvider>
      <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="services" element={<Services />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />

        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="admin-access-2024" element={<AdminLogin />} />
        <Route path="admin-setup-initial" element={<AdminRegister />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password/:token" element={<ResetPassword />} />
  <Route path="verify-email" element={<VerifyEmail />} />

        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />

        <Route
          path="bookings"
          element={
            <ProtectedRoute>
              <Bookings />
            </ProtectedRoute>
          }
        />

        <Route
          path="bookings/new"
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <BookingCreate />
            </ProtectedRoute>
          }
        />

        <Route
          path="bookings/:id"
          element={
            <ProtectedRoute>
              <BookingDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="wallet"
          element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          }
        />

        <Route
          path="messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />

        <Route
          path="notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />

        {/* Shop routes */}
        <Route path="shops" element={<Shops />} />
        <Route path="shops/:id" element={<ShopDetail />} />

        <Route
          path="shop-dashboard"
          element={
            <ProtectedRoute allowedRoles={['shop_owner', 'admin', 'super_admin']}>
              <ShopDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="shops/create"
          element={
            <ProtectedRoute allowedRoles={['shop_owner', 'admin', 'super_admin']}>
              <CreateShop />
            </ProtectedRoute>
          }
        />

        {/* Admin area */}
        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="analytics" element={<EnhancedAnalytics />} />
          <Route path="chat" element={<ChatManagement />} />
          <Route path="price-negotiation" element={<PriceNegotiation />} />
          <Route path="shop-verification" element={<ShopVerification />} />
          <Route path="bookings" element={<BookingManagementAdmin />} />
          <Route path="testimonials" element={<TestimonialModeration />} />
          <Route path="fundi-allocation" element={<FundiAllocation />} />
          <Route path="material-receipts" element={<MaterialReceiptTracking />} />
          <Route path="roles" element={<RoleManagement />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="bulk-operations" element={<BulkOperations />} />
          <Route path="reports" element={<AdvancedReporting />} />
          <Route path= 'services' element= {<AdminServices />} />
          <Route path="system" element={<SystemConfiguration />} />
        </Route>

  <Route path="unauthorized" element={<Unauthorized />} />
  <Route path="*" element={<NotFound />} />
      </Route>
      </Routes>
    </SocketProvider>
  )
}

export default App
