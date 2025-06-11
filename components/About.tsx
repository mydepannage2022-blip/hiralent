'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef , useState} from 'react';
import { Zap, Target, Users, Award } from 'lucide-react';
import AboutScene3D from './AboutScene3D'; 
const About = () => {

  
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const stats = [
    { icon: Zap, label: 'Projects Completed', value: '150+' },
    { icon: Users, label: 'Happy Clients', value: '50+' },
    { icon: Target, label: 'Success Rate', value: '98%' },
    { icon: Award, label: 'Awards Won', value: '12' },
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
    <section ref={ref} className="relative py-20 px-4 z-9999999999999999999">


      <div className="max-w-7xl mx-auto">
        <motion.div
                initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
         variants={containerVariants}
          className="text-center mb-16"
        >
             
          <motion.h2
            variants={itemVariants}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            <span className="gradient-text">About Our Studio</span>
          </motion.h2>
          
          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed"
          >
            We are a team of creative technologists, designers, and storytellers 
            who believe in the power of immersive experiences. Our mission is to 
            push the boundaries of what&apos;s possible in digital art and interactive media.
          </motion.p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="text-center p-6 bg-slate-800/50 rounded-2xl hover:scale-105 transition-transform duration-300"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500">
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-white font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Story Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-2 gap-12 items-center"
        >
          <motion.div variants={itemVariants}>
            <h3 className="text-2xl md:text-3xl font-bold mb-6 text-white">
              Our Story
            </h3>
            <div className="space-y-4 text-gray-300">
              <p>
                Founded in 2020, AlterMind Studio emerged from a shared vision 
                to revolutionize how people interact with digital content. We 
                started as a small team of passionate creators and have grown 
                into a full-service creative studio.
              </p>
              <p>
                Our expertise spans 3D visualization, interactive experiences, 
                AR/VR development, and cutting-edge web technologies. We&apos;ve 
                worked with startups, Fortune 500 companies, and everything in between.
              </p>
              <p>
                What sets us apart is our commitment to storytelling through 
                technology. Every project is an opportunity to create something 
                that not only looks beautiful but also creates meaningful connections.
              </p>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="relative"
          >
            <div className="rounded-2xl p-8 bg-slate-800/50 ">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Zap className="h-10 w-10 text-white" />
                </div>
                <h4 className="text-xl font-bold text-white">Our Mission</h4>
                <p className="text-white">
                  To create digital experiences that inspire, engage, and 
                  transform how people perceive and interact with technology.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default About;