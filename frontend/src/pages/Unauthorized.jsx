import React from 'react'
import { Link } from 'react-router-dom'

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow p-10 text-center">
        <h1 className="text-6xl font-bold text-gray-200">403</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mt-4">Access Denied</h2>
        <p className="text-gray-600 mt-2">You don't have permission to view this page.</p>
        <div className="mt-6">
          <Link to="/" className="inline-block bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700">Go Home</Link>
        </div>
      </div>
    </div>
  )
}
