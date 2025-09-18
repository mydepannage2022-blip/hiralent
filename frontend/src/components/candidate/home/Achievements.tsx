import React from 'react'
import { motion } from 'framer-motion';
import { Variants } from 'framer-motion';

const Achievements = () => {

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

  const boxVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
      <div className='w-full flex justify-center items-center bg-[#FFFFFF]'>
      <div className='lg:max-w-5xl xl:max-w-7xl w-9/10 flex flex-col lg:flex-row justify-between items-center py-12 lg:py-16 gap-16'>

        {/* Header Section */}
        <motion.div 
          className='w-full lg:w-1/3 flex flex-col justify-center items-center lg:items-start lg:gap-5 pb-8 lg:pb-12'
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
            Our Achievements in Hiring
          </motion.h2>
          <motion.p 
            className='text-[#757575] text-sm lg:text-base text-center lg:text-left'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Whether you're an employer looking for top talent or a job seeker searching for the perfect role, our platform has helped hundreds of professionals find success. Be the next one to achieve your career goals!
          </motion.p>
        </motion.div>

        {/* Achievement Boxes */}
        <div className='w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6'>
          
          {/* Box 1 - Profile Based */}
          <motion.div 
            className='box flex justify-start items-center gap-4 w-full p-5 ring ring-[#E0E0E0] rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:ring-[#005DDC] hover:ring-1 cursor-pointer'
            variants={boxVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <motion.img 
              src="/images/user-achivments.png" 
              alt="User Achievement" 
              className='p-4 bg-[#EFF5FF] rounded-lg'
              animate={{ 
                rotate: [0, 5, -5, 0],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <div className='flex flex-col justify-center items-start gap-1'>
              <motion.h3 
                className='text-[#222] text-sm lg:text-base font-semibold'
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                300+
              </motion.h3>
              <p className='text-[#757575] text-xs lg:text-sm'>Profile Based</p>
            </div>
          </motion.div>

          {/* Box 2 - Successful Placements */}
          <motion.div 
            className='box flex justify-start items-center gap-4 w-full p-5 ring ring-[#E0E0E0] rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:ring-[#005DDC] hover:ring-1 cursor-pointer'
            variants={boxVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
          >
            <motion.div 
              className='p-4 bg-[#E8F5E8] rounded-lg'
              animate={{ 
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
            <div className='flex flex-col justify-center items-start gap-1'>
              <motion.h3 
                className='text-[#222] text-sm lg:text-base font-semibold'
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                150+
              </motion.h3>
              <p className='text-[#757575] text-xs lg:text-sm'>Successful Placements</p>
            </div>
          </motion.div>

          {/* Box 3 - Active Companies */}
          <motion.div 
            className='box flex justify-start items-center gap-4 w-full p-5 ring ring-[#E0E0E0] rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:ring-[#005DDC] hover:ring-1 cursor-pointer'
            variants={boxVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            <motion.div 
              className='p-4 bg-[#FFF7ED] rounded-lg'
              animate={{ 
                y: [0, -5, 0],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 7H5C3.89543 7 3 7.89543 3 9V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V9C21 7.89543 20.1046 7 19 7Z" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 7V5C8 4.46957 8.21071 3.96086 8.58579 3.58579C8.96086 3.21071 9.46957 3 10 3H14C14.5304 3 15.0391 3.21071 15.4142 3.58579C15.7893 3.96086 16 4.46957 16 5V7" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
            <div className='flex flex-col justify-center items-start gap-1'>
              <motion.h3 
                className='text-[#222] text-sm lg:text-base font-semibold'
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                50+
              </motion.h3>
              <p className='text-[#757575] text-xs lg:text-sm'>Active Companies</p>
            </div>
          </motion.div>

          {/* Box 4 - Job Categories */}
          <motion.div 
            className='box flex justify-start items-center gap-4 w-full p-5 ring ring-[#E0E0E0] rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:ring-[#005DDC] hover:ring-1 cursor-pointer'
            variants={boxVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
          >
            <motion.div 
              className='p-4 bg-[#F3E8FF] rounded-lg'
              animate={{ 
                rotate: [0, 10, -10, 0],
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M4 12H20M4 18H20" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
            <div className='flex flex-col justify-center items-start gap-1'>
              <motion.h3 
                className='text-[#222] text-sm lg:text-base font-semibold'
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                25+
              </motion.h3>
              <p className='text-[#757575] text-xs lg:text-sm'>Job Categories</p>
            </div>
          </motion.div>

        </div>
      </div>
      </div>
  )
}

export default Achievements