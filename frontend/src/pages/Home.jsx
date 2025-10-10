import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ClipboardList, Users, CreditCard, Wrench, Zap, Shield, CircleCheck as CheckCircle2, CreditCard as CardIcon, Languages, Star, ArrowRight, Sparkles, BadgeCheck, Award } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Home() {
  const { isAuthenticated, user } = useAuthStore()

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  }

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  return (
    <div className="min-h-screen">
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-teal-900">
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/8092/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1920')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/90 via-primary-800/90 to-teal-900/90"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
          <motion.div {...fadeIn}>
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-gold-400" />
              <span className="text-sm font-medium text-white">
                NCA-Certified Professionals
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 font-heading leading-tight">
              Connect with Trusted
              <br />
              <span className="bg-gradient-to-r from-teal-400 to-gold-400 bg-clip-text text-transparent">
                Fundis, Instantly
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed">
              Your one-stop marketplace for reliable, verified plumbers and electricians in Kenya. Get your job done right, the first time.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  {user?.role === 'client' && (
                    <Link
                      to="/bookings/new"
                      className="px-8 py-4 bg-gradient-to-r from-teal-500 to-primary-600 text-white rounded-xl font-semibold text-lg shadow-2xl hover:shadow-teal-500/50 hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      <span>Hire a Fundi</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  )}
                  <Link
                    to="/dashboard"
                    className="px-8 py-4 bg-white text-primary-700 rounded-xl font-semibold text-lg shadow-2xl hover:shadow-white/30 hover:scale-105 transition-all duration-300"
                  >
                    Go to Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/register?role=client"
                    className="px-8 py-4 bg-gradient-to-r from-teal-500 to-primary-600 text-white rounded-xl font-semibold text-lg shadow-2xl hover:shadow-teal-500/50 hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <span>Hire a Fundi</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    to="/register?role=fundi"
                    className="px-8 py-4 bg-white text-primary-700 rounded-xl font-semibold text-lg shadow-2xl hover:shadow-white/30 hover:scale-105 transition-all duration-300"
                  >
                    Become a Fundi
                  </Link>
                </>
              )}
            </div>

            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {[
                { label: '500+', subtitle: 'Verified Fundis' },
                { label: '5,000+', subtitle: 'Jobs Completed' },
                { label: '4.8/5', subtitle: 'Average Rating' },
                { label: '24/7', subtitle: 'Support' },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 * index, duration: 0.6 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {stat.label}
                  </div>
                  <div className="text-sm text-gray-300">{stat.subtitle}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeIn}
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-heading"
            >
              Get Your Job Done in 3 Easy Steps
            </motion.h2>
            <motion.p variants={fadeIn} className="text-xl text-gray-600 max-w-2xl mx-auto">
              We've simplified the process of finding and hiring skilled professionals.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: ClipboardList,
                title: 'Post a Job',
                description:
                  'Tell us what you need. Provide details about the service you require, whether it\'s plumbing or electrical work.',
                color: 'from-teal-500 to-teal-600',
              },
              {
                icon: Users,
                title: 'Get Matched',
                description:
                  'Our admin team reviews your request and matches you with a verified, skilled fundi perfect for your job.',
                color: 'from-primary-500 to-primary-600',
              },
              {
                icon: CreditCard,
                title: 'Pay Securely',
                description:
                  'Once the job is done to your satisfaction, pay securely through our escrow system. Your fundi gets paid, and everyone is happy.',
                color: 'from-gold-500 to-gold-600',
              },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 * index }}
                className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-soft-lg transition-all duration-300 group"
              >
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                >
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 font-heading">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeIn}
              className="text-4xl md:text-5xl font-bold mb-6 font-heading"
            >
              <span className="bg-gradient-to-r from-primary-700 to-teal-700 bg-clip-text text-transparent">
                Our Core Services
              </span>
            </motion.h2>
            <motion.p variants={fadeIn} className="text-xl text-gray-600 max-w-2xl mx-auto">
              Whether it's an emergency or a planned project, we have the right fundi for you.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[
              {
                icon: Wrench,
                title: 'Plumbing Services',
                description:
                  'From leaky faucets to full pipe installations, our certified plumbers are ready to help.',
                services: [
                  'Leak Repairs',
                  'Pipe Installation',
                  'Drain Cleaning',
                  'Water Heater Services',
                ],
                gradient: 'from-primary-500 to-primary-700',
              },
              {
                icon: Zap,
                title: 'Electrical Services',
                description:
                  'Safe and reliable electrical work, including wiring, fixture installation, and emergency repairs.',
                services: [
                  'Wiring & Rewiring',
                  'Fixture Installation',
                  'Circuit Repairs',
                  'Emergency Electrical',
                ],
                gradient: 'from-gold-500 to-gold-700',
              },
            ].map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-white rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 overflow-hidden group"
              >
                <div className={`h-2 bg-gradient-to-r ${service.gradient}`}></div>
                <div className="p-8">
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                  >
                    <service.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 font-heading">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>
                  <ul className="space-y-3">
                    {service.services.map((item, idx) => (
                      <li key={idx} className="flex items-center space-x-3">
                        <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/services"
                    className={`inline-flex items-center space-x-2 mt-6 text-primary-600 font-semibold hover:text-primary-700 transition-colors`}
                  >
                    <span>Learn More</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeIn}
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-heading"
            >
              Your Safety and Satisfaction is Our Priority
            </motion.h2>
            <motion.p variants={fadeIn} className="text-xl text-gray-600 max-w-3xl mx-auto">
              We've built a platform centered on trust, quality, and convenience. Here's what makes Zanira BuildLink different.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: BadgeCheck,
                title: 'Verified Professionals',
                description:
                  'Every fundi on our platform undergoes a rigorous verification process to ensure quality and safety.',
              },
              {
                icon: Shield,
                title: 'Escrow Payment',
                description:
                  'Your payment is held securely in escrow and only released to the fundi once you approve the completed job.',
              },
              {
                icon: CardIcon,
                title: 'Transparent Pricing',
                description:
                  'Negotiate and agree on prices with our admin team before any work begins. No hidden fees.',
              },
              {
                icon: Languages,
                title: 'Multi-language Support',
                description:
                  'Our platform is available in both English and Kiswahili for your convenience.',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index }}
                className="text-center group"
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal-100 to-primary-100 flex items-center justify-center group-hover:from-teal-500 group-hover:to-primary-600 transition-all duration-300 shadow-lg group-hover:shadow-xl group-hover:scale-110">
                  <feature.icon className="w-8 h-8 text-teal-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 font-heading">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeIn}
              className="text-4xl md:text-5xl font-bold mb-6 font-heading"
            >
              <span className="bg-gradient-to-r from-primary-700 to-teal-700 bg-clip-text text-transparent">
                Trusted by Kenyans Across the Country
              </span>
            </motion.h2>
            <motion.p variants={fadeIn} className="text-xl text-gray-600">
              Here's what our clients and fundis have to say about their experience.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Jane Doe',
                location: 'Nairobi',
                rating: 5,
                review:
                  'Zanira BuildLink made it so easy to find a reliable electrician. The process was smooth, and the fundi did a fantastic job. Highly recommended!',
                avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
              },
              {
                name: 'John Smith',
                location: 'Mombasa',
                rating: 5,
                review:
                  'I needed a plumber urgently, and Zanira BuildLink came through. The admin was very helpful, and the fundi they sent was professional and efficient.',
                avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
              },
              {
                name: 'Maryanne Odhiambo',
                location: 'Kisumu',
                rating: 5,
                review:
                  'The escrow payment system gave me peace of mind. I knew my money was safe until the work was completed to my satisfaction. Great service!',
                avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 * index }}
                className="bg-white rounded-2xl p-8 shadow-soft hover:shadow-soft-lg transition-all duration-300"
              >
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-gold-400 text-gold-400" />
                  ))}
                </div>
                <p className="text-gray-700 italic mb-6 leading-relaxed">
                  "{testimonial.review}"
                </p>
                <div className="flex items-center space-x-4">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.location}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-primary-900 via-primary-800 to-teal-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/8092/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1920')] bg-cover bg-center opacity-5"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Award className="w-16 h-16 mx-auto mb-6 text-gold-400" />
            <h2 className="text-4xl md:text-5xl font-bold mb-6 font-heading">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-200 mb-10 leading-relaxed">
              Join thousands of satisfied clients and skilled fundis on Kenya's most trusted construction services platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/register?role=client"
                    className="px-8 py-4 bg-white text-primary-700 rounded-xl font-semibold text-lg shadow-2xl hover:shadow-white/30 hover:scale-105 transition-all duration-300"
                  >
                    Hire a Professional
                  </Link>
                  <Link
                    to="/register?role=fundi"
                    className="px-8 py-4 bg-gradient-to-r from-teal-500 to-primary-600 text-white rounded-xl font-semibold text-lg shadow-2xl hover:shadow-teal-500/50 hover:scale-105 transition-all duration-300 border-2 border-white/20"
                  >
                    Join as a Fundi
                  </Link>
                </>
              ) : (
                <Link
                  to="/dashboard"
                  className="px-8 py-4 bg-white text-primary-700 rounded-xl font-semibold text-lg shadow-2xl hover:shadow-white/30 hover:scale-105 transition-all duration-300"
                >
                  Go to Dashboard
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
