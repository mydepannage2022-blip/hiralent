"use client"
import React from 'react'
import { IoSearchOutline } from "react-icons/io5";
import Select from "react-select";
import { locationOptions } from "../../constants/groupedLocationOptions"; // Adjust 
import { IoLocationOutline } from "react-icons/io5";
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const Hero = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Array of hero images that will change
  const heroImages = [
    "/images/expressive-young-girl-posing-2.png",
    "https://ru.readkong.com/static/9f/fe/9ffe688d413d394d3b873a0de26798a7/edinoe-reshenie-po-kartam-i-kasse-s-1-iyulya-2018-1168016-4.jpg", // Add more images as needed
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

  const handleSearch = () => {
    console.log("Searching for:", jobTitle, selectedLocation);
    // You can redirect or filter jobs here
  };

  const customStyles = {
    control: (base: any) => ({
      ...base,
      padding: "4px",
      borderRadius: "8px",
      borderColor: "transparent",
      outline: "none",
      boxShadow: "none",
      border:"none",
      fontSize: "16px",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#EFF5FF" : "#fff",
      color: "#111",
      padding: "10px",
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
    <div className='w-full flex justify-center h-[100vh] xl:h-[75vh] lg:h-[90vh]  items-center bg-[#EFF5FF]'>
      <div className='lg:max-w-5xl xl:max-w-7xl w-9/10 flex flex-col lg:flex-row justify-between items-center'>

        {/* Left Content */}
        <motion.div 
          className='w-full lg:w-1/2 flex flex-col justify-center items-center lg:items-start text-center lg:text-left lg:gap-2 xl:gap-4'
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.h1 
            className=' text-[#222] lg:text-5xl xl:text-7xl font-bold'
            variants={fadeInUp}
          >
            Your Future   Starts with 
            <motion.span 
              className='text-[#005DDC]'
              transition={{ duration: 2, repeat: Infinity }}
            >
              Talenta
            </motion.span>
          </motion.h1>
          
          <motion.p 
            className='text-[#757575] lg:text-sm xl:text-lg w-full lg:w-4/5'
            variants={fadeInUp}
          >
            Discover jobs that match your skills and passion. Type and explore!
          </motion.p>

          <motion.form 
            action="" 
            className='w-full lg:w-4/5 xl:w-full flex flex-col xl:flex-row lg:justify-start xl:justify-between lg:items-start xl:items-center  gap-2  lg:pt-2 xl:py-0'
            variants={fadeInUp}
            // whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className='lg:w-full flex lg:justify-start xl:justify-center items-center wrap bg-white rounded-lg lg:px-2 lg:py-2'>
                <IoSearchOutline className='lg:text-xl xl:text-2xl text-[#CBCBCB]' />

              <input type="text" placeholder='Search for jobs, companies, or keywords' className='w-full outline-none px-2 text-[#A5A5A5] text-base' />
            </div>

            <div className='lg:w-full bg-white flex xl:justify-start items-center rounded-lg lg:px-2'>
              <IoLocationOutline className=' text-[#CBCBCB] lg:text-xl xl:text-2xl' />
              <Select
                options={locationOptions}
                placeholder="location"
                onChange={(option) => setSelectedLocation(option as any)}
                isSearchable={true}
                className="w-full outline-none text-base text-[#A5A5A5]"
                styles={customStyles}
              />
            </div>

            <motion.div 
              className='lg:w-full xl:w-2/5 flex justify-center items-center bg-[#005DDC] p-2 hover:bg-[#0046B3] transition-colors duration-300 rounded-lg text-white cursor-pointer'
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <button type='submit' className=' flex justify-between items-center text-white ' onClick={handleSearch}>
                <IoSearchOutline className='lg:text-xl xl:text-2xl' />
                <p>Search</p>
              </button>
            </motion.div>
          </motion.form>

          <motion.div 
            className='flex justify-start items-center gap-2'
            variants={fadeInUp}
          >
            <div className='flex -space-x-4'>
              <motion.img 
                src="/images/frame-1890165341.png" 
                alt="image" 
                className="w-full max-w-md"
                whileHover={{ scale: 1.1, zIndex: 10 }}
                transition={{ duration: 0.3 }}
              />
              <motion.img 
                src="/images/frame-2147225745.png" 
                alt="image" 
                className="w-full max-w-md"
                whileHover={{ scale: 1.1, zIndex: 10 }}
                transition={{ duration: 0.3 }}
              />
              <motion.img 
                src="/images/frame-2147225746.png" 
                alt="image" 
                className="w-full max-w-md"
                whileHover={{ scale: 1.1, zIndex: 10 }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <motion.span 
              className="ml-4 text-sm text-[#222]"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Over <span className="font-bold text-[#005DDC]">999+</span> jobseekers are successfully hired.
            </motion.span>
          </motion.div>
        </motion.div>

        {/* Right Image Section */}
        <div className='w-full lg:w-1/2 flex flex-col justify-center items-center lg:items-start text-center lg:text-left relative'>
          
          {/* Animated Background Circle */}
          <motion.span 
            className='bg-[#F9F9F9] lg:w-[350px] xl:w-[450px] lg:h-[350px] xl:h-[450px] rounded-full absolute z-0 bottom-0 lg:right-1/8 xl:right-1/6'
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              scale: { duration: 4, repeat: Infinity },
            }}
          ></motion.span>

          {/* Main Hero Image - Light Animation */}
          <div className='w-full z-9999999999 relative'>
            <motion.img 
              src={heroImages[0]} 
              alt="Hero Image" 
              className='w-full z-9999999999 relative'
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

          {/* Floating Icon Animations - Light Animation Only */}
          <motion.img 
            src="/images/component-16.png" 
            alt="icon" 
            className='absolute left-[-10%] top-[35%] z-9999999999999 lg:w-[200px]'
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
            className='absolute right-[-10%] top-[25%] z-9999999999999 lg:w-[200px]'
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
            className='absolute bottom-[-5%] lg:right-[28%] xl:right-[30%] z-9999999999999 lg:w-[200px] xl:w-[250px]'
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
        </div>
      </div>
    </div>
  )
}

export default Hero