'use client';

import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, Sparkles } from 'lucide-react';
import Scene3D from './Scene3D'; 
import JoniurScene3D from './JoniurScene3D';
const Hero = () => {
  const [mounted, setMounted] = useState(false);
  const { scrollY } = useScroll();

  // Transform values for scroll-based animations
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.8]);
  const y = useTransform(scrollY, [0, 300], [0, -100]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative h-screen w-screen overflow-hidden flex flex-col justify-center items-center py-0">
    
      {/* Gradient Overlay */}
      <div className="absolute pointer-events-none" />

      <Scene3D/>

      {/* Hero Content */}
      <motion.div
        style={{ opacity, scale, y }}
        className="flex flex-col lg:flex-row items-center justify-start text-center lg:max-w-4xl xl:max-w-7xl w-full lg:w-4xl xl:w-7xl mx-auto pt-16 rounded-[100px]"
      >



<div className='flex flex-col items-center lg:items-start justify-start w-full lg:w-2/4 bg-none dark:bg-transparent dark:backdrop-blur-sm p-8 rounded-[70px] gap-8 dark:shadow-lg'>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          
        > 
          <div className='flex items-center justify-start w-full gap-12'>
            <div className='flex flex-col items-center justify-center ring-1 ring-white/70 backdrop-blur-xs rounded-xl dark:rounded-xl p-3 gap-2 bg-gradient-to-b from-[#00F5DA] to-[#28196A] dark:bg-none shadow-xl'>
              <img src="/images/confetti-1.png" alt="image" className='bg-white backdrop-blur-sm p-2  rounded-[5px] dark:rounded-md w-[30px] md:w-[50px]'/>
              <h4 className='text-center text-[10px] lg:text-sm font-medium text-white/90 dark:text-white'>Product of the Month <br></br>
              <span className='font-light sm:text-[10px] md:text-[12px] lg:text-sm'>PRODUCT HUNT</span>

              </h4>
              <h1 className='text-sm  md:text-base lg:text-xl font-medium text-white text-white/90 dark:text-white'>
                1st
              </h1>
            </div>
             <div className='flex flex-col items-center justify-center ring-1 ring-white/70 backdrop-blur-xs rounded-xl dark:rounded-xl p-3 gap-2 bg-gradient-to-b from-[#00F5DA] to-[#28196A] dark:bg-none shadow-xl'>
              <img src="/images/frame.png" alt="image" className='bg-white backdrop-blur-sm p-2  rounded-[5px] dark:rounded-md w-[30px] md:w-[50px]'/>
              <h4 className='text-center text-[10px] lg:text-sm font-medium text-white/90 dark:text-white'>Product of the Month <br></br>
              <span className='font-light sm:text-[10px] md:text-[12px] lg:text-sm'>PRODUCT HUNT</span>

              </h4>
              <h1 className='text-sm  md:text-base lg:text-xl font-medium text-white text-white/90 dark:text-white'>
                TOP PICK  
              </h1>
            </div>
          </div>
</motion.div>


        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="text-2xl md:text-4xl lg:text-6xl font-bold leading-tight text-center lg:text-left"
        >
          <span className="text-center lg:text-left font-light">Find The 
          <span className='text-[#2C2F38] dark:text-[#00F5D4] font-bold'><br></br>Perfect Candidate </span>
          <span className='text-[#2C2F38] dark:text-[#00F5D4]'><br></br> In 30 days</span>
          </span>
        </motion.h1>
        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="text-sm md:text-lg text-white-700 max-w-2xl leading-relaxed text-center lg:text-left text-[#2C2F38]/90 dark:text-white"
        >
Need to hire fast? Our Talent Match AI delivers 10 highly matched, quality candidates to your roles every week, helping you find the perfect fit in just 30 days.        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 mb-16"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 rounded-full font-semibold text-white transition-all duration-300 bg-[#28196A] dark:bg-gradient-to-r from-[#28196A] to-[#00F5DA] hover:shadow-blue-500/25 shadow-2xl text-sm md:text-base"
          >
            Begin Your Free Trial
          </motion.button>
     
        </motion.div>

</div>

<div className='flex flex-col items-center justify-center w-full lg:w-2/5'>
</div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex flex-col items-center space-y-2 text-gray-400"
          >
            <span className="text-sm font-medium">Scroll to explore</span>
            <ArrowDown className="h-5 w-5" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;