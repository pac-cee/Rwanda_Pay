'use client';

import { motion } from 'framer-motion';
import { Shield, Zap, Smartphone, CreditCard, BarChart3, Users, Lock, Globe, Wallet, TrendingUp, Bell, HeadphonesIcon } from 'lucide-react';
import AnimatedCard from '@/components/AnimatedCard';
import CursorFollower from '@/components/CursorFollower';

const features = [
  {
    icon: Smartphone,
    title: 'NFC Tap-to-Pay',
    description: 'Pay at any merchant with a simple tap of your phone. No need to carry cash or cards.',
    benefits: ['Contactless payments', 'Biometric security', 'Instant confirmation', 'Works offline'],
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Zap,
    title: 'Instant Transfers',
    description: 'Send money to anyone in Rwanda instantly using just their email or phone number.',
    benefits: ['Real-time transfers', 'No transaction fees', 'Send to any bank', '24/7 availability'],
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'Your money and data are protected with military-grade encryption and biometric authentication.',
    benefits: ['End-to-end encryption', 'Face ID / Fingerprint', 'Fraud detection', 'Secure cloud backup'],
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: CreditCard,
    title: 'Multi-Card Support',
    description: 'Link multiple cards and accounts. Switch between them seamlessly for different purchases.',
    benefits: ['Visa & Mastercard', 'Mobile Money', 'Bank accounts', 'Virtual cards'],
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: BarChart3,
    title: 'Spending Analytics',
    description: 'Track your spending with beautiful charts and insights. Know exactly where your money goes.',
    benefits: ['Category breakdown', 'Monthly reports', 'Budget tracking', 'Export statements'],
    color: 'from-indigo-500 to-blue-500',
  },
  {
    icon: Users,
    title: 'Split Bills',
    description: 'Easily split expenses with friends and family. No more awkward money conversations.',
    benefits: ['Group payments', 'Equal or custom splits', 'Payment reminders', 'Expense history'],
    color: 'from-teal-500 to-green-500',
  },
  {
    icon: Wallet,
    title: 'Digital Wallet',
    description: 'Store money securely in your Rwanda Pay wallet. Top up from any source.',
    benefits: ['Instant top-ups', 'Multiple currencies', 'Cashback rewards', 'Interest earnings'],
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: Globe,
    title: 'Multi-Currency',
    description: 'Hold and manage multiple currencies. Perfect for travelers and international businesses.',
    benefits: ['RWF, USD, EUR', 'Real-time rates', 'Low conversion fees', 'Auto-conversion'],
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: TrendingUp,
    title: 'Investment Options',
    description: 'Grow your money with safe investment options directly from your wallet.',
    benefits: ['Savings accounts', 'Fixed deposits', 'Mutual funds', 'Crypto trading'],
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Stay informed with real-time notifications for all your transactions and activities.',
    benefits: ['Transaction alerts', 'Bill reminders', 'Spending limits', 'Custom alerts'],
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: Lock,
    title: 'Privacy Controls',
    description: 'You control your data. Choose what to share and with whom.',
    benefits: ['Data encryption', 'Anonymous mode', 'Transaction privacy', 'GDPR compliant'],
    color: 'from-red-500 to-pink-500',
  },
  {
    icon: HeadphonesIcon,
    title: '24/7 Support',
    description: 'Our support team is always here to help you with any questions or issues.',
    benefits: ['Live chat', 'Phone support', 'Email support', 'Help center'],
    color: 'from-emerald-500 to-teal-500',
  },
];

export default function FeaturesPage() {
  return (
    <>
      <CursorFollower />
      
      <section className="pt-32 pb-20 bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
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
                All Features
              </span>
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Powerful Features for
              <br />
              <span className="text-gradient">Modern Payments</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage your money, make payments, and grow your wealth - all in one beautiful app.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <AnimatedCard key={index} delay={index * 0.05}>
                <div className="p-8">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-600 mb-6">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Experience the Future of Payments
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Download Rwanda Pay today and join thousands of satisfied users.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-white text-green-600 rounded-full font-semibold text-lg shadow-lg"
            >
              Get Started Now
            </motion.button>
          </motion.div>
        </div>
      </section>
    </>
  );
}
