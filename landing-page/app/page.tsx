'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Smartphone, Shield, Zap, Users, TrendingUp, Globe } from 'lucide-react';
import Link from 'next/link';
import AnimatedCard from '@/components/AnimatedCard';
import CursorFollower from '@/components/CursorFollower';
import StatsSection from '@/components/StatsSection';

const features = [
  {
    icon: Smartphone,
    title: 'Tap-to-Pay',
    description: 'Pay instantly at any merchant with NFC-enabled payments secured by biometric authentication.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'Your money is protected with end-to-end encryption, JWT authentication, and biometric locks.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Zap,
    title: 'Instant Transfers',
    description: 'Send money to anyone in Rwanda instantly using just their email address.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Users,
    title: 'Split Bills',
    description: 'Easily split expenses with friends and family. No more awkward money conversations.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: TrendingUp,
    title: 'Spending Insights',
    description: 'Track your spending with beautiful charts and analytics. Know where your money goes.',
    color: 'from-indigo-500 to-blue-500',
  },
  {
    icon: Globe,
    title: 'Multi-Currency',
    description: 'Hold and manage multiple currencies in one wallet. Perfect for travelers and businesses.',
    color: 'from-teal-500 to-green-500',
  },
];

const steps = [
  {
    number: '01',
    title: 'Download the App',
    description: 'Get Rwanda Pay from App Store or Google Play in seconds.',
  },
  {
    number: '02',
    title: 'Create Your Account',
    description: 'Sign up with your email and verify your identity securely.',
  },
  {
    number: '03',
    title: 'Add Your Card',
    description: 'Link your bank card or mobile money account to top up.',
  },
  {
    number: '04',
    title: 'Start Paying',
    description: 'Tap to pay at merchants or send money to friends instantly.',
  },
];

export default function Home() {
  return (
    <>
      <CursorFollower />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70"
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute top-40 right-10 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-70"
            animate={{
              x: [0, -100, 0],
              y: [0, 100, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute -bottom-8 left-1/2 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-70"
            animate={{
              x: [0, 50, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
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
                🇷🇼 Made for Rwanda
              </span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              The Future of
              <br />
              <span className="text-gradient">Payments in Rwanda</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Send money, pay merchants, and manage your finances with the most secure and convenient digital wallet in Rwanda.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/download"
                  className="group px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/features"
                  className="px-8 py-4 bg-white text-green-600 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all border-2 border-green-600"
                >
                  Learn More
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* Phone mockup */}
          <motion.div
            className="mt-20"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-3xl blur-3xl opacity-30 animate-pulse" />
              <img
                src="https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=800&fit=crop"
                alt="Rwanda Pay App"
                className="relative z-10 w-full rounded-3xl shadow-2xl"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <StatsSection />

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need in
              <span className="text-gradient"> One App</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Rwanda Pay combines the best features of digital banking, mobile money, and contactless payments.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <AnimatedCard key={index} delay={index * 0.1}>
                <div className="p-8 h-full">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Get Started in <span className="text-gradient">4 Simple Steps</span>
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of Rwandans already using Rwanda Pay
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
              >
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 h-full">
                  <div className="text-6xl font-bold text-green-100 mb-4">{step.number}</div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-green-200" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Payments?
            </h2>
            <p className="text-xl mb-12 opacity-90">
              Join thousands of Rwandans who trust Rwanda Pay for their daily transactions.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/download"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-600 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                Download Now
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
