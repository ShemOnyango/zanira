import { Link } from 'react-router-dom'
import { Hop as Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-4xl font-bold text-gray-900 mb-4 font-heading">Page Not Found</h2>
        <p className="text-xl text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-primary-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          <Home className="w-5 h-5" />
          <span>Go Home</span>
        </Link>
      </div>
    </div>
  )
}
