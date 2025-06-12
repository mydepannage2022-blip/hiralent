'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef , useState} from 'react';

const Steps = () => {

  
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const stats = [
    { step: 1, value: 'Identify Needs', label: 'Understand your hiring requirements and goals.' },
    { step: 2, value: 'Source Talent', label: 'Leverage our AI to find the best candidates.' },
    { step: 3, value: 'Review Profiles', label: 'Get detailed profiles of top of the world candidates.' },
    { step: 4, value: 'Schedule Interviews', label: 'Connect with candidates through our platform.' },
    { step: 5, value: 'Make Offers', label: 'Hire the best talent quickly and efficiently.' },
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
          className="text-center  w-full bg-transparent backdrop-blur-sm p-8 rounded-xl
          shadow-lg pb-12 mb-[150px]"
        >
             
          <motion.h2
            variants={itemVariants}
            className="text-4xl md:text-5xl font-bold mb-6 text-center lg:text-left"
          >
            <span className="text-[#00F5DA]">Find Candidate<span className='text-white'> In 5 Easy Steps</span> </span>
          </motion.h2>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex justify-start items-center gap-8 flex-wrap "
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="text-center p-6  ring-1 ring-white/50 rounded-2xl hover:scale-105 transition-transform duration-300 w-1/4"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-gradient-to-r from-[#00F5DA] to-[#28196A] text-white text-2xl font-bold">
                {stat.step}
              </div>
              <div className="text-base md:text-base font-bold text-white mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-white font-light">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
        </motion.div>

        {/* <motion.div
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
        </motion.div> */}
      
      
      
      </div>
    </section>
  );
};

export default Steps;