import { Link } from 'react-router-dom'
import { Building2, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="space-y-6">
            <Link to="/" className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-teal-500 to-primary-600 p-2 rounded-xl shadow-lg">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold font-heading text-white">
                  ZANIRA
                </span>
                <div className="text-xs font-semibold text-gold-400 tracking-wider">
                  BUILDLINK
                </div>
              </div>
            </Link>
            <p className="text-sm leading-relaxed">
              Your one-stop marketplace for reliable, verified plumbers and electricians in Kenya. Get your job done right, the first time.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-teal-600 transition-colors duration-200"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-teal-600 transition-colors duration-200"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-teal-600 transition-colors duration-200"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-teal-600 transition-colors duration-200"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold text-lg mb-6 font-heading">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/services" className="hover:text-teal-400 transition-colors duration-200 text-sm">
                  Our Services
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-teal-400 transition-colors duration-200 text-sm">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-teal-400 transition-colors duration-200 text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-teal-400 transition-colors duration-200 text-sm">
                  Become a Fundi
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-teal-400 transition-colors duration-200 text-sm">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-lg mb-6 font-heading">Services</h3>
            <ul className="space-y-3">
              <li className="text-sm">Plumbing Services</li>
              <li className="text-sm">Electrical Services</li>
              <li className="text-sm">Emergency Repairs</li>
              <li className="text-sm">Installations</li>
              <li className="text-sm">Maintenance</li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-lg mb-6 font-heading">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm">
                  Nairobi, Mombasa, Kisumu, Eldoret & Major Towns Across Kenya
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-teal-400 flex-shrink-0" />
                <span className="text-sm">+254 759 394 399</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-teal-400 flex-shrink-0" />
                <span className="text-sm">support@zanirabuildlink.co.ke</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-400">
              © {currentYear} Zanira BuildLink. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm">
              <Link to="/privacy" className="hover:text-teal-400 transition-colors duration-200">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-teal-400 transition-colors duration-200">
                Terms of Service
              </Link>
              <Link to="/cookies" className="hover:text-teal-400 transition-colors duration-200">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
