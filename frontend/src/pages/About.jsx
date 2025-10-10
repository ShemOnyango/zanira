export default function About() {
  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="bg-gradient-to-br from-primary-900 to-teal-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6 font-heading">About Zanira BuildLink</h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            Connecting Kenyans with trusted construction professionals
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 font-heading">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed mb-8">
            Zanira BuildLink was founded with a simple mission: to streamline the construction industry and ensure convenient and reliable access to certified plumbers and electricians nationwide. We believe that everyone deserves access to quality construction services, delivered by professionals they can trust.
          </p>

          <h2 className="text-3xl font-bold text-gray-900 mb-6 font-heading">Our Vision</h2>
          <p className="text-gray-700 leading-relaxed mb-8">
            To become Kenya's leading platform for construction services, setting the standard for quality, reliability, and customer satisfaction in the industry.
          </p>

          <h2 className="text-3xl font-bold text-gray-900 mb-6 font-heading">Our Values</h2>
          <ul className="space-y-4 text-gray-700">
            <li><strong>Trust:</strong> Every professional on our platform is verified and certified</li>
            <li><strong>Quality:</strong> We maintain high standards for all services delivered</li>
            <li><strong>Safety:</strong> Your payment and satisfaction are protected through our escrow system</li>
            <li><strong>Convenience:</strong> Easy-to-use platform accessible in English and Kiswahili</li>
            <li><strong>Growth:</strong> We support professional development of fundis across Kenya</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
