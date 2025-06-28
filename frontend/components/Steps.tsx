'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef , useState} from 'react';

const Steps = () => {

  
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const stats = [
{ step: 1, value: 'Identify Needs', label: 'Define your hiring goals and job requirements clearly.' },
  { step: 2, value: 'Source Talent', label: 'Use our AI-driven platform to discover top talent fast.' },
  { step: 3, value: 'Review Profiles', label: 'Explore verified profiles tailored to your job needs.' },
  { step: 4, value: 'Plan Interviews', label: 'Easily connect and interact through our system.' },
  { step: 5, value: 'Make Offers', label: 'Send job offers and onboard the best candidates quickly.' }

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
    <section ref={ref} className="relative py-10 lg:py-20 px-4 z-9999999999999999999">


      <div className="lg:max-w-4xl xl:max-w-7xl mx-auto">
  

        <motion.div
                initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
         variants={containerVariants}
          className="text-center w-full bg-none dark:bg-transparent dark:backdrop-blur-sm rounded-xl
          dark:shadow-lg pb-12 flex flex-col lg:flex-row py-8 gap-6 lg:gap-8"
        >

       <div className='w-full lg:w-1/2 flex flex-col gap-2 justify-center items-center lg:items-start'>      
          <motion.h2
            variants={itemVariants}
            className="text-2xl md:text-5xl font-bold text-center lg:text-left"
          >
            <span className="text-[#1B1B1B] dark:text-[#00F5DA]">Find Candidate<span className='text-[#1B1B1B] dark:text-[#00F5DA]'> In 5 <br></br>Easy Steps</span> </span>
          </motion.h2>
         
          <motion.h3
            variants={itemVariants}
            className="text-base md:text-lg font-medium text-[#2C2F38]/90 dark:text-white text-center lg:text-left"
          >Smart, Fast, and Hassle-Free Hiring – Just Follow the Steps.
          </motion.h3>


          <motion.p
            variants={itemVariants}
            className="text-sm md:text-lg font-light text-[#2C2F38]/90 dark:text-white mb-6 text-center lg:text-left"
          >
            Our streamlined process ensures you find the perfect candidate quickly and efficiently. Follow these five simple steps to hire top talent with ease.
          </motion.p>

            <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 rounded-full font-semibold text-white transition-all duration-300 bg-[#1B1B1B] dark:bg-gradient-to-r from-[#28196A] to-[#00F5DA] hover:shadow-blue-500/25 shadow-2xl w-2/3 xl:w-2/5 text-xs lg:text-base"
          >
            Begin Your Free Trial
          </motion.button>
     
       
       </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex justify-center items-center lg:gap-4 xl:gap-8 flex-wrap w-full lg:w-1/2"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="text-center p-6 ring-1 ring-[#2C2F38]/0 dark:ring-white/50 rounded-2xl hover:scale-105 transition-transform duration-300 w-full lg:w-1/3 xl:w-1/4 shadow-lg bg-white/70 dark:bg-transparent backdrop-blur-sm shadow-2xl"
            >
              <div className="inline-flex items-center justify-center w-8 h-8 xl:w-12 xl:h-12 mb-4 rounded-full bg-gradient-to-r from-[#00F5DA] to-[#28196A] text-white text-base xl:text-2xl font-bold">
                {stat.step}
              </div>
              <div className="text-xs xl:text-sm font-bold text-[#2C2F38]/90 dark:text-white mb-2">
                {stat.value}
              </div>
              <div className="text-xs xl:sm text-[#2C2F38]/70 dark:text-white/90 font-light">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
        </motion.div>
      
      </div>
    </section>
  );
};

export default Steps;