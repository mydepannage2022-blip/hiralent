'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Brain, Code, Palette, Zap, Users, Target, Award, Heart } from 'lucide-react';

export default function AboutPage() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const team = [
    {
      name: 'Alex Chen',
      role: 'Creative Director',
      bio: 'Visionary leader with 10+ years in digital art and interactive media.',
      icon: Palette,
    },
    {
      name: 'Sarah Johnson',
      role: 'Lead Developer',
      bio: 'Full-stack developer specializing in 3D web technologies and AR/VR.',
      icon: Code,
    },
    {
      name: 'Michael Rodriguez',
      role: 'UX Designer',
      bio: 'User experience expert focused on creating intuitive digital interactions.',
      icon: Brain,
    },
    {
      name: 'Emily Davis',
      role: 'Project Manager',
      bio: 'Strategic coordinator ensuring seamless project delivery and client satisfaction.',
      icon: Target,
    },
  ];

  const values = [
    {
      icon: Zap,
      title: 'Innovation',
      description: 'We push boundaries and explore new possibilities in digital creation.',
    },
    {
      icon: Users,
      title: 'Collaboration',
      description: 'We believe the best results come from working closely with our clients.',
    },
    {
      icon: Award,
      title: 'Excellence',
      description: 'We maintain the highest standards in everything we create.',
    },
    {
      icon: Heart,
      title: 'Passion',
      description: 'We love what we do, and it shows in every project we deliver.',
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
            <span className="gradient-text">About Our Studio</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-xl text-gray-300 leading-relaxed"
          >
            We are pioneers in the realm of digital creativity, transforming ideas 
            into immersive experiences that captivate and inspire. Our journey began 
            with a simple belief: technology should enhance human connection, not replace it.
          </motion.p>
        </div>
      </section>

      {/* Our Story */}
      <section ref={ref} className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid md:grid-cols-2 gap-16 items-center mb-20"
          >
            <motion.div variants={itemVariants}>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                Our Journey
              </h2>
              <div className="space-y-6 text-gray-300 text-lg leading-relaxed">
                <p>
                  AlterMind Studio was born from the convergence of art, technology, 
                  and storytelling. Founded in 2020 by a team of passionate creators, 
                  we started with a mission to redefine digital experiences.
                </p>
                <p>
                  From our humble beginnings in a shared workspace to becoming a 
                  recognized creative studio, we&apos;ve maintained our core philosophy: 
                  every project is an opportunity to create something extraordinary.
                </p>
                <p>
                  Today, we work with forward-thinking brands and organizations 
                  worldwide, creating experiences that not only look beautiful but 
                  also drive meaningful engagement and results.
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="relative"
            >
              <div className="glass-effect rounded-2xl p-8 glow-effect">
                <div className="text-center space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-3xl font-bold text-blue-400 mb-2">150+</div>
                      <div className="text-sm text-gray-400">Projects Delivered</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-cyan-400 mb-2">50+</div>
                      <div className="text-sm text-gray-400">Happy Clients</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-purple-400 mb-2">12</div>
                      <div className="text-sm text-gray-400">Awards Won</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-orange-400 mb-2">4</div>
                      <div className="text-sm text-gray-400">Years Experience</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Our Values */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="mb-20"
          >
            <motion.h2
              variants={itemVariants}
              className="text-3xl md:text-4xl font-bold text-center mb-12"
            >
              <span className="gradient-text">Our Values</span>
            </motion.h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="text-center p-6 glass-effect rounded-2xl hover:scale-105 transition-transform duration-300"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500">
                    <value.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {value.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Our Team */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <motion.h2
              variants={itemVariants}
              className="text-3xl md:text-4xl font-bold text-center mb-12"
            >
              <span className="gradient-text">Meet Our Team</span>
            </motion.h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {team.map((member, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="text-center p-6 glass-effect rounded-2xl hover:scale-105 transition-all duration-300 group"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 group-hover:from-cyan-500 group-hover:to-purple-500 transition-all duration-300">
                    <member.icon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {member.name}
                  </h3>
                  <div className="text-blue-400 font-medium mb-3">
                    {member.role}
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {member.bio}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold mb-8"
          >
            <span className="gradient-text">Ready to Work Together?</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            viewport={{ once: true }}
            className="text-lg text-gray-300 mb-12 leading-relaxed"
          >
            We&apos;re always excited to take on new challenges and create 
            something amazing together. Let&apos;s discuss your next project.
          </motion.p>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            viewport={{ once: true }}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full font-semibold text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
          >
            Get In Touch
          </motion.button>
        </div>
      </section>
    </div>
  );
}