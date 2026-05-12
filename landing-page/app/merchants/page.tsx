'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Store, TrendingUp, Users, Shield, Zap, BarChart3, Mail, Send } from 'lucide-react';
import AnimatedCard from '@/components/AnimatedCard';
import CursorFollower from '@/components/CursorFollower';

const benefits = [
  {
    icon: TrendingUp,
    title: 'Increase Sales',
    description: 'Accept payments from 50,000+ Rwanda Pay users and grow your customer base.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Zap,
    title: 'Instant Settlements',
    description: 'Get your money instantly. No waiting days for payment processing.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Shield,
    title: 'Secure Transactions',
    description: 'Bank-level security protects every transaction. Zero fraud risk.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Users,
    title: 'Customer Insights',
    description: 'Understand your customers better with detailed analytics and reports.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: BarChart3,
    title: 'Business Dashboard',
    description: 'Track sales, manage inventory, and monitor performance in real-time.',
    color: 'from-indigo-500 to-blue-500',
  },
  {
    icon: Store,
    title: 'Easy Integration',
    description: 'Simple setup with QR codes or NFC. Start accepting payments in minutes.',
    color: 'from-teal-500 to-green-500',
  },
];

export default function MerchantsPage() {
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    category: '',
    location: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setStatus('success');
    setFormData({
      businessName: '',
      ownerName: '',
      email: '',
      phone: '',
      category: '',
      location: '',
      message: '',
    });
    
    setTimeout(() => setStatus('idle'), 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <>
      <CursorFollower />
      
      <section className="pt-32 pb-20 bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="inline-block mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                For Businesses
              </span>
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Grow Your Business with
              <br />
              <span className="text-gradient">Simple Payments</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join 500+ merchants across Rwanda accepting payments with Rwanda Pay. 
              Make your business glow with seamless, secure, and instant payments.
            </p>
          </motion.div>

          <motion.div
            className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mb-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">Why Choose Rwanda Pay?</h2>
                <p className="text-gray-600 text-lg mb-6">
                  Rwanda Pay is the fastest-growing digital payment platform in Rwanda. 
                  We help businesses of all sizes accept payments easily and grow their revenue.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-green-600" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Zero Setup Fees</div>
                      <div className="text-gray-600">Get started for free. No hidden charges.</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-green-600" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Low Transaction Fees</div>
                      <div className="text-gray-600">Competitive rates that help you save money.</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-green-600" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">24/7 Support</div>
                      <div className="text-gray-600">Our team is always here to help your business succeed.</div>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-3xl blur-3xl opacity-20" />
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop"
                  alt="Merchant Dashboard"
                  className="relative z-10 w-full rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-4">Benefits for Your Business</h2>
            <p className="text-xl text-gray-600">Everything you need to succeed</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <AnimatedCard key={index} delay={index * 0.1}>
                <div className="p-8">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-6`}>
                    <benefit.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-4">Become a Rwanda Pay Merchant</h2>
            <p className="text-xl text-gray-600">
              Fill out the form below and our team will contact you within 24 hours to get you started.
            </p>
          </motion.div>

          <motion.div
            className="bg-white rounded-3xl shadow-2xl p-8 md:p-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                    placeholder="Your Business Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                    placeholder="business@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                    placeholder="+250 788 000 000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                  >
                    <option value="">Select a category</option>
                    <option value="restaurant">Restaurant / Cafe</option>
                    <option value="retail">Retail Store</option>
                    <option value="supermarket">Supermarket</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="hotel">Hotel / Accommodation</option>
                    <option value="transport">Transportation</option>
                    <option value="services">Services</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                    placeholder="Kigali, Rwanda"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Information
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors resize-none"
                  placeholder="Tell us more about your business and why you want to partner with Rwanda Pay..."
                />
              </div>

              <motion.button
                type="submit"
                disabled={status === 'sending'}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {status === 'sending' ? (
                  'Submitting...'
                ) : status === 'success' ? (
                  '✓ Application Submitted!'
                ) : (
                  <>
                    Submit Application
                    <Send className="w-5 h-5" />
                  </>
                )}
              </motion.button>

              {status === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-green-600 font-medium"
                >
                  Thank you! Our team will contact you within 24 hours.
                </motion.div>
              )}
            </form>
          </motion.div>

          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Mail className="w-5 h-5" />
              <span>Or email us directly at</span>
              <a href="mailto:merchants@rwandapay.com" className="text-green-600 font-semibold hover:underline">
                merchants@rwandapay.com
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
