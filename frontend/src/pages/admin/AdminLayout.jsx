// frontend/src/pages/admin/AdminLayout.jsx
import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import {
  MessageSquare,
  DollarSign,
  ShoppingCart,
  Calendar,
  Star,
  Users,
  Package,
  BarChart3,
  Settings,
  Zap,
  FileText,
  Shield,
  Menu,
  X,
  Home
} from 'lucide-react'

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'Chat Management', href: '/admin/chat', icon: MessageSquare },
    { name: 'Price Negotiation', href: '/admin/price-negotiation', icon: DollarSign },
    { name: 'Shop Verification', href: '/admin/shop-verification', icon: ShoppingCart },
    { name: 'Booking Management', href: '/admin/bookings', icon: Calendar },
    { name: 'Testimonial Moderation', href: '/admin/testimonials', icon: Star },
    { name: 'Fundi Allocation', href: '/admin/fundi-allocation', icon: Users },
    { name: 'Material Receipts', href: '/admin/material-receipts', icon: Package },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Role Management', href: '/admin/roles', icon: Shield },
    { name: 'Bulk Operations', href: '/admin/bulk-operations', icon: Zap },
    { name: 'Reporting', href: '/admin/reports', icon: FileText },
    { name: 'System Config', href: '/admin/system', icon: Settings },
  ]

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0 transition duration-200 ease-in-out`}>
        <div className="flex items-center justify-between h-16 px-4 bg-gray-800">
          <span className="text-white font-bold text-xl">Admin Panel</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="mt-8 px-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={18} className="mr-3" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu size={20} />
            </button>
            <div className="flex-1 flex justify-between items-center">
              <h1 className="text-2xl font-semibold text-gray-900">
                {navigation.find(item => isActive(item.href))?.name || 'Admin'}
              </h1>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome, Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default AdminLayout