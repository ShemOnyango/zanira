import { Mail, Phone, MapPin } from 'lucide-react'

export default function Contact() {
  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="bg-gradient-to-br from-primary-900 to-teal-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6 font-heading">Contact Us</h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            We're here to help. Get in touch with us today.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Phone className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Phone</h3>
            <p className="text-gray-600">+254 759 394 399</p>
          </div>

          <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Email</h3>
            <p className="text-gray-600">support@zanirabuildlink.co.ke</p>
          </div>

          <div className="bg-gradient-to-br from-gold-50 to-yellow-50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-8 h-8 text-gold-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Location</h3>
            <p className="text-gray-600">Nairobi, Kenya</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 shadow-soft">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 font-heading">Send us a message</h2>
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input type="text" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input type="text" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea rows="4" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"></textarea>
            </div>
            <button type="submit" className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-primary-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
