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

  // if (!mounted) {
  //   return (
  //     <div className="h-screen bg-slate-800 flex items-center justify-center">
  //       <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-400"></div>
  //     </div>
  //   );
  // }

  return (
    <section className="relative h-screen w-screen overflow-hidden flex flex-col justify-center items-center py-0">
    
      {/* Gradient Overlay */}
      <div className="absolute pointer-events-none" />
      
      <Scene3D/>
      
      {/* Hero Content */}
      <motion.div
        style={{ opacity, scale, y }}
        className="flex flex-col lg:flex-row items-center justify-center text-center lg:max-w-4xl xl:max-w-7xl w-full lg:w-4xl xl:w-7xl mx-auto pt-16 rounded-[100px] shadow-lg"
      >



<div className='flex flex-col items-start justify-start w-full lg:w-3/5 bg-tranparent backdrop-blur-sm p-8 rounded-[70px] gap-8 shadow-lg'>
        {/* Animated Badge */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mb-8"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full glass-effect glow-effect">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">
              Welcome to the Future
            </span>
          </div>
        </motion.div> */}


          <div className='flex items-center justify-start w-full gap-12'>
            <div className='flex flex-col items-center justify-center ring-1 ring-white/70 backdrop-blur-xs rounded-xl p-3 gap-2 shadow-md'>
              <img src="/images/confetti-1.png" alt="image" className='bg-white backdrop-blur-sm p-2 rounded-md w-[50px]'/>
              <h4 className='text-center text-xs lg:text-sm font-medium'>Product of the Month <br></br>
              <span className='font-light'>PRODUCT HUNT</span>

              </h4>
              <h1 className='text-base lg:text-xl font-medium text-white'>
                1st
              </h1>
            </div>
             <div className='flex flex-col items-center justify-center ring-1 ring-white/70 backdrop-blur-xs rounded-xl p-3 gap-2 shadow-md'>
              <img src="/images/frame.png" alt="image" className='bg-white backdrop-blur-sm p-2 rounded-md w-[50px]'/>
              <h4 className='text-center text-xs lg:text-sm font-medium'>Product of the Month <br></br>
              <span className='font-light'>PRODUCT HUNT</span>

              </h4>
              <h1 className='text-base lg:text-xl font-medium text-white'>
                TOP PICK
              </h1>
            </div>
          </div>
        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="text-4xl md:text-4xl lg:text-6xl font-bold leading-tight text-center lg:text-left"
        >
          <span className="gradient-text text-[#00F5D4] text-center lg:text-left">
          Find The <span className="text-white">Perfect <span className='text-[#00F5D4]'>Candidate </span></span>
          </span>
          <span className="text-white">
            In 30 days
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="text-base md:text-lg text-white-700 max-w-2xl leading-relaxed text-center lg:text-left"
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
            className="px-8 py-4 bg-gradie  bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full font-semibold text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300 "
          >
            Explore Our Work
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 rounded-full font-semibold text-white transition-all duration-300  bg-gradient-to-r from-[#28196A] to-[#00F5DA] hover:shadow-blue-500/25"
          >
            Get Started
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