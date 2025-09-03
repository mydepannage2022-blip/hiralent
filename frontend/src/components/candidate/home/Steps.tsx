import React from 'react'
import { motion } from 'framer-motion'
import { Variants } from 'framer-motion';
const Steps = () => {
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

  const stepsData = [
    {
      number: 1,
      title: "Create Account",
      description: "Start your journey today. Nulla facilisi. Aenean et tortor at elit luctus."
    },
    {
      number: 2,
      title: "Build Profile",
      description: "Complete your professional profile with skills and experience details."
    },
    {
      number: 3,
      title: "Apply Jobs",
      description: "Browse and apply to thousands of job opportunities in your field."
    },
    {
      number: 4,
      title: "Get Hired",
      description: "Connect with employers and land your dream job successfully."
    }
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
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
            Steps to Your Dream Job
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

        {/* Steps Section */}
        <motion.div 
          className='w-full flex flex-wrap justify-start items-center gap-4 lg:gap-4'
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {stepsData.map((step, index) => (
            <motion.div 
              key={step.number}
              className='flex-1 min-w-[250px]'
              variants={itemVariants}
            >
              <div className='box'>
                <p className='text-[#005DDC] text-center text-4xl p-4 rounded-xl bg-[#EFF5FF] w-1/5 ml-6 relative z-10'>
                  {step.number}
                </p>
                <motion.div 
                  className='flex flex-col justify-center items-start gap-2 ring ring-[#005DDC] rounded-lg shadow-md p-5 hover:shadow-lg transition-all duration-300 hover:ring-[#005DDC] hover:ring-2 cursor-pointer pt-16 mt-[-24px] relative z-0'
                  whileHover={{ 
                    scale: 1.01
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <h4 className='text-[#222] text-lg font-semibold'>{step.title}</h4>
                  <p className='text-[#757575] text-sm'>{step.description}</p>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* View All Button */}
        <motion.div 
                  className='text-center mt-16'
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                >
                  <motion.button 
                    className='bg-[#005DDC] text-white font-semibold py-4 px-8 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300 cursor-pointer'
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.span
                      className='bg-white bg-clip-text text-transparent'
                      whileHover={{ 
                        backgroundPosition: ["0% 50%", "100% 50%"] 
                      }}
                      transition={{ duration: 0.5 }}
                    >
                      Get Started  →
                    </motion.span>
                  </motion.button>
                </motion.div> 
        

      </div>
    </div>
  )
}

export default Steps