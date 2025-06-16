'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Mail, Phone, MapPin, Send, Clock, Globe } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
    // Reset form
    setFormData({ name: '', email: '', company: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email Us',
      details: 'hello@altermind.studio',
      subtext: 'We typically respond within 24 hours',
    },
    {
      icon: Phone,
      title: 'Call Us',
      details: '+1 (555) 123-4567',
      subtext: 'Mon-Fri, 9AM-6PM PST',
    },
    {
      icon: MapPin,
      title: 'Visit Us',
      details: 'San Francisco, CA',
      subtext: '123 Innovation Street, Suite 200',
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: 'Mon-Fri, 9AM-6PM',
      subtext: 'Weekend support by appointment',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl font-bold mb-8"
          >
            <span className="gradient-text">Get In Touch</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-xl text-gray-300 leading-relaxed"
          >
            Ready to bring your vision to life? We&apos;d love to hear about your 
            project and explore how we can create something extraordinary together.
          </motion.p>
        </div>
      </section>

      {/* Contact Information */}
      <section ref={ref} className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20"
          >
            {contactInfo.map((info, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="text-center p-6 glass-effect rounded-2xl hover:scale-105 transition-transform duration-300"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500">
                  <info.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {info.title}
                </h3>
                <div className="text-blue-400 font-medium mb-2">
                  {info.details}
                </div>
                <p className="text-gray-400 text-sm">
                  {info.subtext}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Contact Form */}
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Form */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
            >
              <motion.div variants={itemVariants} className="glass-effect rounded-2xl p-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-6 text-white">
                  Send us a message
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="John Doe"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Your Company"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                      placeholder="Tell us about your project..."
                    />
                  </div>

                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg font-semibold text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
                  >
                    <Send className="h-5 w-5" />
                    <span>Send Message</span>
                  </motion.button>
                </form>
              </motion.div>
            </motion.div>

            {/* Additional Info */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="space-y-8"
            >
              <motion.div variants={itemVariants} className="glass-effect rounded-2xl p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Globe className="h-6 w-6 text-blue-400" />
                  <h3 className="text-xl font-bold text-white">Global Reach</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  While we&apos;re based in San Francisco, we work with clients worldwide. 
                  Our remote-first approach allows us to collaborate effectively 
                  across time zones and cultures.
                </p>
                <div className="space-y-2 text-sm text-gray-400">
                  <div>🇺🇸 North America: 9AM-6PM PST</div>
                  <div>🇪🇺 Europe: 6PM-3AM CET</div>
                  <div>🇦🇺 Asia-Pacific: By appointment</div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="glass-effect rounded-2xl p-8">
                <h3 className="text-xl font-bold text-white mb-4">
                  What happens next?
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold mt-0.5">
                      1
                    </div>
                    <div>
                      <div className="text-white font-medium">Initial Response</div>
                      <div className="text-gray-400 text-sm">We&apos;ll get back to you within 24 hours</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm font-bold mt-0.5">
                      2
                    </div>
                    <div>
                      <div className="text-white font-medium">Discovery Call</div>
                      <div className="text-gray-400 text-sm">We&apos;ll schedule a call to discuss your project</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold mt-0.5">
                      3
                    </div>
                    <div>
                      <div className="text-white font-medium">Proposal</div>
                      <div className="text-gray-400 text-sm">We&apos;ll create a custom proposal for your needs</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}