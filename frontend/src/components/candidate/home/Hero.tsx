"use client"
import React from 'react'
import { locationOptions } from "../../../constants/groupedLocationOptions";

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import JobSearch from '../../job/JobSearch';

const Hero = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Array of hero images that will change
  const heroImages = [
    "/images/expressive-young-girl-posing-2.png",
    "https://ru.readkong.com/static/9f/fe/9ffe688d413d394d3b873a0de26798a7/edinoe-reshenie-po-kartam-i-kasse-s-1-iyulya-2018-1168016-4.jpg",
    "/images/679922-middle.png",
    "/images/Marina.png"
  ];

  // Change image every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);


  const handleSearch = (title: string, location: any) => {
    console.log("Searching for:", title, location?.value);
    // Implement actual search logic or route navigation here
  };

  const customStyles = {
    control: (base: any) => ({
      ...base,
      padding: "0px 8px", // Adjusted to py-2 equivalent (8px vertical), px-2 (8px horizontal)
      borderRadius: "8px",
      borderColor: "transparent",
      outline: "none",
      boxShadow: "none",
      border: "none",
      fontSize: "14px", // Slightly smaller font for slim look
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#EFF5FF" : "#fff",
      color: "#111",
      padding: "8px", // Slimmer options
      fontWeight: state.isSelected ? "bold" : "normal",
    }),
  };

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  const staggerContainer = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  // Light floating animation for icons (no rotation)
  const lightFloatingAnimation = {
    y: [-5, 5, -5],
  };

  return (
    <div className='w-full flex justify-center pt-30 pb-8 md:pt-32 md:pb-18 lg:pt-26 lg:pb-20 items-center bg-[#EFF5FF]'>
      <div className='lg:max-w-5xl xl:max-w-7xl w-9/10 flex flex-col lg:flex-row justify-between items-center gap-8 lg:gap-0'>
        {/* Left Content */}
        <motion.div
          className='w-full lg:w-1/2 flex flex-col justify-center items-center lg:items-start text-center lg:text-left gap-4 md:gap-6 lg:gap-2 xl:gap-4'
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.h1
            className='text-4xl md:text-4xl text-[#222] lg:text-5xl xl:text-7xl font-bold'
            variants={fadeInUp}
          >
            Your Future Starts with
            <motion.span
              className='text-[#005DDC]'
              transition={{ duration: 2, repeat: Infinity }}
            >
              {" "}Hiralent
            </motion.span>
          </motion.h1>

          <motion.p
            className='text-[#757575] text-sm md:text-base lg:text-sm xl:text-lg w-full lg:w-4/5'
            variants={fadeInUp}
          >
            Discover jobs that match your skills and passion. Type and explore!
          </motion.p>

          <JobSearch
            locationOptions={locationOptions}
            onSearch={handleSearch}
            customStyles={customStyles}
          />

          <motion.div
            className='flex justify-center lg:justify-start items-center gap-2 mt-2'
            variants={fadeInUp}
          >
            <div className='flex -space-x-2 md:-space-x-3 lg:-space-x-4'>
              <motion.img
                src="/images/frame-1890165341.png"
                alt="image"
                className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full"
                whileHover={{ scale: 1.1, zIndex: 10 }}
                transition={{ duration: 0.3 }}
              />
              <motion.img
                src="/images/frame-2147225745.png"
                alt="image"
                className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full"
                whileHover={{ scale: 1.1, zIndex: 10 }}
                transition={{ duration: 0.3 }}
              />
              <motion.img
                src="/images/frame-2147225746.png"
                alt="image"
                className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full"
                whileHover={{ scale: 1.1, zIndex: 10 }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <motion.span
              className="ml-2 md:ml-4 text-xs md:text-sm text-[#222]"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Over <span className="font-bold text-[#005DDC]">999+</span> jobseekers are successfully hired.
            </motion.span>
          </motion.div>
        </motion.div>

        {/* Right Image Section */}
        <div className='w-full lg:w-1/2 flex flex-col justify-center items-center lg:items-start text-center lg:text-left relative mt-6 lg:mt-0'>

          {/* Animated Background Circle */}
          <motion.span
            className='bg-[#F9F9F9] w-[220px] h-[220px] md:w-[350px] md:h-[350px] lg:w-[350px] xl:w-[450px] lg:h-[350px] xl:h-[450px] rounded-full absolute z-0 bottom-0 lg:right-1/8 xl:right-1/6'
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              scale: { duration: 4, repeat: Infinity },
            }}
          ></motion.span>

          {/* Main Hero Image - Light Animation */}
          <div className='w-full z-10 relative'>
            <motion.img
              src={heroImages[0]}
              alt="Hero Image"
              className='w-full max-w-[300px] md:max-w-[400px] lg:max-w-none mx-auto z-10 relative'
              animate={{
                y: [-8, 8, -8],
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>

          {/* Floating Icon Animations - Hidden on small screens, visible on lg+ */}
          <motion.img
            src="/images/component-16.png"
            alt="icon"
            className='absolute left-[-10%] top-[35%] z-20 w-[120px] md:w-[150px] lg:w-[200px] hidden lg:block'
            animate={lightFloatingAnimation}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            whileHover={{
              scale: 1.1,
            }}
            style={{
              transition: "transform 0.3s ease-out"
            }}
          />

          <motion.img
            src="/images/component-19.png"
            alt="icon"
            className='absolute right-[-10%] top-[25%] z-20 w-[120px] md:w-[150px] lg:w-[200px] hidden lg:block'
            animate={lightFloatingAnimation}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            whileHover={{
              scale: 1.1,
            }}
            style={{
              transition: "transform 0.3s ease-out"
            }}
          />

          <motion.img
            src="/images/component-41.png"
            alt="icon"
            className='absolute bottom-[-5%] lg:right-[28%] xl:right-[30%] z-20 w-[120px] md:w-[150px] lg:w-[200px] xl:w-[250px] hidden lg:block'
            animate={{
              y: [-3, 3, -3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            whileHover={{
              scale: 1.1,
            }}
            style={{
              transition: "transform 0.3s ease-out"
            }}
          />

          {/* Small screen decorative elements */}
          <motion.div
            className='absolute top-4 right-4 w-12 h-12 md:w-16 md:h-16 bg-[#005DDC] rounded-full opacity-20 lg:hidden'
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          <motion.div
            className='absolute bottom-8 left-4 w-8 h-8 md:w-12 md:h-12 bg-[#00C851] rounded-full opacity-30 lg:hidden'
            animate={{
              y: [-5, 5, -5],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          <motion.div
            className='absolute top-1/2 left-2 w-6 h-6 md:w-8 md:h-8 bg-[#FF6B35] rounded-full opacity-25 lg:hidden'
            animate={{
              x: [-3, 3, -3],
              opacity: [0.25, 0.5, 0.25]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default Hero