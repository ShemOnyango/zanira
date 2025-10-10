import { Wrench, Zap } from 'lucide-react'

export default function Services() {
  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="bg-gradient-to-br from-primary-900 to-teal-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6 font-heading">Our Services</h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            Professional plumbing and electrical services across Kenya
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-8 shadow-soft">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mb-6">
              <Wrench className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-heading">Plumbing Services</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              From simple repairs to complex installations, our certified plumbers deliver quality workmanship.
            </p>
            <ul className="space-y-3 text-gray-700">
              <li>• Leak detection and repair</li>
              <li>• Pipe installation and replacement</li>
              <li>• Drain cleaning and unclogging</li>
              <li>• Water heater installation</li>
              <li>• Bathroom and kitchen plumbing</li>
              <li>• Emergency plumbing services</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-gold-50 to-yellow-50 rounded-2xl p-8 shadow-soft">
            <div className="w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-700 rounded-2xl flex items-center justify-center mb-6">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-heading">Electrical Services</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Safe and reliable electrical work by NCA-certified electricians.
            </p>
            <ul className="space-y-3 text-gray-700">
              <li>• Wiring and rewiring</li>
              <li>• Light fixture installation</li>
              <li>• Circuit breaker repair</li>
              <li>• Electrical panel upgrades</li>
              <li>• Socket and switch installation</li>
              <li>• Emergency electrical repairs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
