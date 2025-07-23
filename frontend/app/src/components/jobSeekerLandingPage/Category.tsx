import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Variants } from 'framer-motion';
const Category = () => {
  const categories = [
    {
      id: 1,
      icon: "/images/wordpress.png",
      title: "Wordpress Developer",
      jobs: "72+ Job Available",
      bgColor: "bg-gradient-to-br from-[#F4F4F4] to-[#E8E8E8]",
      hoverBg: "bg-gradient-to-br from-blue-50 to-blue-100",
      accentColor: "#3B82F6"
    },
    {
      id: 2,
      icon: "/images/laptop-code.png",
      title: "Software Developer",
      jobs: "45+ Job Available",
      bgColor: "bg-gradient-to-br from-[#FFF5F5] to-[#FEE2E2]",
      hoverBg: "bg-gradient-to-br from-red-50 to-red-100",
      accentColor: "#EF4444"
    },
    {
      id: 3,
      icon: "/images/user-code.png",
      title: "Software Tester",
      jobs: "68+ Job Available",
      bgColor: "bg-gradient-to-br from-[#F0FFF4] to-[#DCFCE7]",
      hoverBg: "bg-gradient-to-br from-green-50 to-green-100",
      accentColor: "#22C55E"
    },
    {
      id: 4,
      icon: "/images/pen-tool.png",
      title: "Graphic Designer",
      jobs: "54+ Job Available",
      bgColor: "bg-gradient-to-br from-[#F5F5FF] to-[#E0E7FF]",
      hoverBg: "bg-gradient-to-br from-purple-50 to-purple-100",
      accentColor: "#8B5CF6"
    },
    {
      id: 5,
      icon: "/images/users-group-alt.png",
      title: "Team Leader",
      jobs: "38+ Job Available",
      bgColor: "bg-gradient-to-br from-[#FFF9F0] to-[#FED7AA]",
      hoverBg: "bg-gradient-to-br from-orange-50 to-orange-100",
      accentColor: "#F97316"
    },
    {
      id: 6,
      icon: "/images/search-text.png",
      title: "UX Designer",
      jobs: "29+ Job Available",
      bgColor: "bg-gradient-to-br from-[#F0F8FF] to-[#CFFAFE]",
      hoverBg: "bg-gradient-to-br from-cyan-50 to-cyan-100",
      accentColor: "#06B6D4"
    },
    {
      id: 7,
      icon: "/images/brush-alt.png",
      title: "Project Manager",
      jobs: "41+ Job Available",
      bgColor: "bg-gradient-to-br from-[#FFF0F5] to-[#FCE7F3]",
      hoverBg: "bg-gradient-to-br from-pink-50 to-pink-100",
      accentColor: "#EC4899"
    },
    {
      id: 8,
      icon: "/images/edit.png",
      title: "UI Designer",
      jobs: "33+ Job Available",
      bgColor: "bg-gradient-to-br from-[#F8F8FF] to-[#E0E7FF]",
      hoverBg: "bg-gradient-to-br from-indigo-50 to-indigo-100",
      accentColor: "#6366F1"
    }
  ];

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9,
      rotateX: -15
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
        type: "spring",
        stiffness: 100
      }
    }
  };

  const headingVariants: Variants = {
    hidden: { opacity: 0, y: -30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const sparkleVariants: Variants = {
    initial: { scale: 0, rotate: 0 },
    animate: {
      scale: [0, 1, 0],
      rotate: [0, 180, 360],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <>
 

      <div className='w-full flex justify-center items-center bg-[#FFFFFF]'>
      <div className='lg:max-w-5xl xl:max-w-7xl w-9/10 flex flex-col justify-between items-center py-12 lg:py-16'>

        {/* Header Section */}
        <motion.div 
          className='flex flex-col justify-center items-center lg:gap-2 pb-8 lg:pb-12'
          variants={headingVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.h2 
            className='text-[#222] text-2xl lg:text-3xl xl:text-4xl font-semibold text-center'
            animate={{ 
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            Popular Categories
          </motion.h2>
          <motion.p 
            className='text-[#757575] text-sm lg:text-base text-center'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            The last job offers Upload
          </motion.p>
        </motion.div>

        {/* Categories Grid */}
        <motion.div 
          className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 lg:gap-6 w-full'
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {categories.map((category) => (
            <motion.div
              key={category.id}
              className='category-box flex flex-col sm:flex-row lg:flex-row xl:flex-row justify-start items-center lg:gap-1 xl:gap-3 ring-1 ring-[#CBCBCB] rounded-xl pr-0 sm:pl-3 md:pl-3 lg:pl-2 xl:pl-3 py-2 cursor-pointer group'
              variants={itemVariants}
              whileHover={{ 
                scale: 1.03,
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 10px -2px rgba(0, 0, 0, 0.05)",
                borderColor: "#005DDC"
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ 
                duration: 0.3,
                ease: "easeOut"
              }}
            >
              <motion.div
                className={`${category.bgColor} group-hover:${category.hoverBg} p-3 lg:p-3 rounded-xl transition-all duration-300`}
                whileHover={{ 
                  rotate: [0, -5, 5, 0],
                  scale: 1.1
                }}
                transition={{ 
                  duration: 0.5,
                  ease: "easeInOut"
                }}
              >
                <img 
                  src={category.icon} 
                  alt={`${category.title} icon`} 
                  className=' object-contain'
                />
              </motion.div>
              
              <div className='flex-1 text-center sm:text-left lg:text-left xl:text-left'>
                <motion.h3 
                  className='text-[#222] text-sm lg:text-sm font-medium group-hover:text-[#005DDC] transition-colors duration-300'
                  whileHover={{ 
                    x: 2
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {category.title}
                </motion.h3>
                <motion.p 
                  className='text-[#757575] text-xs lg:text-sm mt-1 group-hover:text-[#666] transition-colors duration-300'
                  initial={{ opacity: 0.7 }}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {category.jobs}
                </motion.p>
              </div>

              {/* Hover Arrow Animation */}
              <motion.div
                className='opacity-0 group-hover:opacity-100 transition-opacity duration-300'
                initial={{ x: -10 }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <svg 
                  className='w-4 h-4 text-[#005DDC]' 
                  fill='none' 
                  stroke='currentColor' 
                  viewBox='0 0 24 24'
                >
                  <path 
                    strokeLinecap='round' 
                    strokeLinejoin='round' 
                    strokeWidth='2' 
                    d='M9 5l7 7-7 7'
                  />
                </svg>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

      
      </div>
    </div>


    </>
  )
}

export default Category