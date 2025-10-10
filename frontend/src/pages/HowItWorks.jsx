import { ClipboardList, Users, CreditCard, CircleCheck as CheckCircle2 } from 'lucide-react'

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="bg-gradient-to-br from-primary-900 to-teal-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6 font-heading">How It Works</h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            Getting professional help has never been easier
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: ClipboardList,
              title: 'Step 1: Post Your Job',
              description: 'Describe the service you need in detail. Include information about the type of work, location, and any specific requirements.',
              color: 'from-teal-500 to-teal-600',
            },
            {
              icon: Users,
              title: 'Step 2: Get Matched',
              description: 'Our admin team reviews your request and matches you with the best available fundi who has the right skills and availability.',
              color: 'from-primary-500 to-primary-600',
            },
            {
              icon: CreditCard,
              title: 'Step 3: Complete & Pay',
              description: 'Once the work is done to your satisfaction, payment is securely processed through our escrow system.',
              color: 'from-gold-500 to-gold-600',
            },
          ].map((step, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-soft-lg transition-all">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-lg`}>
                <step.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 font-heading">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center font-heading">Why Choose Zanira BuildLink?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              'Verified and certified professionals',
              'Secure escrow payment system',
              'Admin-curated matching process',
              'Transparent pricing',
              'Multi-language support',
              'Quality assurance',
              '24/7 customer support',
              'Coverage across major Kenyan towns',
            ].map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-teal-600 flex-shrink-0" />
                <span className="text-gray-700 font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
