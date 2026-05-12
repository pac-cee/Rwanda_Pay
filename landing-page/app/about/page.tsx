'use client';

import { motion } from 'framer-motion';
import { Target, Eye, Heart, Award } from 'lucide-react';
import AnimatedCard from '@/components/AnimatedCard';
import CursorFollower from '@/components/CursorFollower';

const values = [
  {
    icon: Target,
    title: 'Our Mission',
    description: 'To make financial services accessible to every Rwandan, empowering them to transact, save, and grow their wealth with ease and security.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Eye,
    title: 'Our Vision',
    description: 'To become the leading digital payment platform in Rwanda, driving financial inclusion and economic growth across the nation.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Heart,
    title: 'Our Values',
    description: 'Security, Innovation, Accessibility, Trust, and Customer-First approach guide everything we do at Rwanda Pay.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Award,
    title: 'Our Commitment',
    description: 'We are committed to providing world-class service, maintaining the highest security standards, and continuously innovating for our users.',
    color: 'from-orange-500 to-red-500',
  },
];

const timeline = [
  { year: '2024', title: 'Foundation', description: 'Rwanda Pay was founded with a vision to revolutionize payments in Rwanda.' },
  { year: '2025', title: 'Launch', description: 'Successfully launched our mobile app with 10,000+ early adopters.' },
  { year: '2026', title: 'Growth', description: 'Reached 50,000+ users and partnered with 500+ merchants nationwide.' },
  { year: '2027', title: 'Expansion', description: 'Planning regional expansion and introducing new financial services.' },
];

export default function AboutPage() {
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
                About Us
              </span>
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              About <span className="text-gradient">Rwanda Pay</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're on a mission to transform how Rwandans manage their money and make payments.
            </p>
          </motion.div>

          <motion.div
            className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mb-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <div className="space-y-4 text-gray-600 text-lg leading-relaxed">
              <p>
                Rwanda Pay was born from a simple observation: while Apple Pay and Google Pay revolutionized payments globally, 
                Rwandans were left without access to these convenient solutions. We saw an opportunity to create something better - 
                a payment platform designed specifically for the Rwandan market.
              </p>
              <p>
                Our team of passionate developers, designers, and financial experts came together with a shared vision: 
                to build a digital wallet that combines the best features of international payment platforms with deep 
                understanding of local needs and preferences.
              </p>
              <p>
                Today, Rwanda Pay serves thousands of users across Rwanda, from students splitting lunch bills to 
                businesses managing their daily transactions. We're proud to be contributing to Rwanda's digital transformation 
                and financial inclusion goals.
              </p>
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
            <h2 className="text-4xl font-bold mb-4">What Drives Us</h2>
            <p className="text-xl text-gray-600">Our core values and commitments</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <AnimatedCard key={index} delay={index * 0.1}>
                <div className="p-8">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${value.color} flex items-center justify-center mb-6`}>
                    <value.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{value.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{value.description}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-4">Our Journey</h2>
            <p className="text-xl text-gray-600">Milestones that shaped Rwanda Pay</p>
          </motion.div>

          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-green-200" />
            <div className="space-y-12">
              {timeline.map((item, index) => (
                <motion.div
                  key={index}
                  className={`flex items-center gap-8 ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <div className={`flex-1 ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-shadow">
                      <div className="text-3xl font-bold text-green-600 mb-2">{item.year}</div>
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </div>
                  <div className="w-4 h-4 rounded-full bg-green-600 border-4 border-white shadow-lg z-10" />
                  <div className="flex-1" />
                </motion.div>
              ))}
            </div>
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
              Join Us on This Journey
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Be part of Rwanda's digital payment revolution. Download Rwanda Pay today.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-white text-green-600 rounded-full font-semibold text-lg shadow-lg"
            >
              Get Started
            </motion.button>
          </motion.div>
        </div>
      </section>
    </>
  );
}
