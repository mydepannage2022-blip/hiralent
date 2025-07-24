import React from 'react'
import { motion } from 'framer-motion'
import { Variants } from 'framer-motion';
const Companies = () => {
 
  const companies = [
    {
      id: 1,
      name: "Bergen",
      location: "Bergen",
      logo: "/images/sandro.png",
      type: "Global",
      status: "Hiring",
      description: "Sandro is a French fashion brand known for its chic, contemporary collections, offering men's and women's fashion with modern elegance.",
      jobs: 50,
      reviews: "103.98k",
      salaries: "88.1K"
    },
    {
      id: 2,
      name: "Microsoft",
      location: "New York",
      logo: "/images/mircrosoft.png",
      type: "Remote",
      status: "Hiring",
      description: "TechCorp is a leading technology company specializing in innovative software solutions and digital transformation services.",
      jobs: 125,
      reviews: "89.5k",
      salaries: "142.3K"
    },
    {
      id: 3,
      name: "Sandro",
      location: "California",
      logo: "/images/sandro.png",
      type: "Hybrid",
      status: "Hiring",
      description: "GreenEnergy focuses on sustainable energy solutions and environmental technology to create a cleaner future for all.",
      jobs: 78,
      reviews: "67.2k",
      salaries: "95.7K"
    }
  ];

  // Animation variants
  const containerVariants : Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const headerVariants : Variants= {
    hidden: { opacity: 0, y: -50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
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
  const cardVariants : Variants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    },
    hover: {
      y: -8,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    }
  };

  const badgeVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    hover: {
      scale: 1.1,
      transition: {
        duration: 0.2
      }
    }
  };

  const buttonVariants : Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2
      }
    },
    tap: {
      scale: 0.95
    }
  };

  return (
    <div className='w-full flex justify-center items-center bg-gradient-to-br from-gray-50 to-white py-16 lg:py-24'>
      <motion.div 
        className='lg:max-w-4xl xl:max-w-7xl w-9/10 '
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Header Section */}
        <motion.div 
          className='flex flex-col justify-center items-center lg:gap-2 pb-8 lg:pb-12 relative'
          variants={headingVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
             <motion.div 
            className='hidden lg:block absolute top-0 right-0'
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <motion.a 
              href="#"
              className='text-gray-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1 transition-colors duration-300'
              whileHover={{ x: 5 }}
              transition={{ duration: 0.2 }}
            >
              More 
              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </motion.a>
          </motion.div>


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
            Top Companies Hiring Now
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
        
        {/* Companies Grid */}
        <motion.div 
          className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'
          variants={containerVariants}
        >
          {companies.map((company, index) => (
            <motion.div 
              key={company.id}
              className='group bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 shadow-lg border border-gray-100 cursor-pointer overflow-hidden relative'
              variants={cardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
            >
              {/* Gradient Background on Hover */}
              <motion.div 
                className='absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100'
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              
              {/* Content */}
              <div className='relative z-10'>
                {/* Company Header */}
                <div className='flex items-start gap-4 mb-6'>
                  <motion.div 
                    className='flex-shrink-0'
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className='w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-sm'>
                      <img 
                        src={company.logo} 
                        alt={company.name} 
                        className='rounded-lg object-contain'
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                          if (nextElement) {
                            nextElement.style.display = 'flex';
                          }
                        }}
                      />
                      <div className='hidden w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg items-center justify-center'>
                        <span className='text-white font-bold text-xl'>
                          {company.name.charAt(0)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                  
                  <div className='flex-1'>
                    <motion.h3 
                      className='text-xl font-bold text-gray-900  transition-colors duration-300'
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      {company.name}
                    </motion.h3>
                    <motion.p 
                      className='text-gray-500 text-sm mb-4 flex items-center gap-1'
                      initial={{ opacity: 0.7 }}
                      whileHover={{ opacity: 1 }}
                    >
                      <span className='text-blue-500'>📍</span>
                      {company.location}
                    </motion.p>
                    
                    {/* Status Badges */}
                    <div className='flex gap-2 flex-wrap'>
                      <motion.span 
                        className='bg-white text-blue-700 text-xs font-semibold px-3 py-1 rounded-lg border border-blue-200'
                        variants={badgeVariants}
                        whileHover="hover"
                      >
                        {company.type}
                      </motion.span>
                      <motion.span 
                        className='bg-white text-green-700 text-xs font-semibold px-3 py-1 rounded-lg border border-green-200 flex items-center gap-1'
                        variants={badgeVariants}
                        whileHover="hover"
                      >
                        <motion.span
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className='text-green-500'
                        >
                          ●
                        </motion.span>
                        {company.status}
                      </motion.span>
                    </div>
                  </div>
                </div>

                {/* Company Description */}
                <motion.p 
                  className='text-[#282828] text-sm leading-relaxed mb-6'
                  initial={{ opacity: 0.8 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {company.description}
                </motion.p>

                {/* Company Stats */}
                <div className='pt-4 border-t border-gray-100'>
                  <div className='flex justify-between items-center'>
                    <motion.div 
                      className='flex items-center gap-2 text-sm text-gray-600'
                      whileHover={{ scale: 1.05, color: '#2563eb' }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div 
                        className='w-2 h-2 bg-blue-500 rounded-full'
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                      />
                      <span className='font-medium'>{company.jobs} Jobs</span>
                    </motion.div>
                    
                    <motion.div 
                      className='flex items-center gap-2 text-sm text-gray-600'
                      whileHover={{ scale: 1.05, color: '#ea580c' }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div 
                        className='w-2 h-2 bg-orange-500 rounded-full'
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      />
                      <span>{company.reviews} Reviews</span>
                    </motion.div>
                    
                    <motion.div 
                      className='flex items-center gap-2 text-sm text-gray-600'
                      whileHover={{ scale: 1.05, color: '#16a34a' }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div 
                        className='w-2 h-2 bg-green-500 rounded-full'
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                      />
                      <span>{company.salaries} Salaries</span>
                    </motion.div>
                  </div>
                </div>

                {/* Hover Effect Button */}
                {/* <motion.div
                  className='mt-6 opacity-0 group-hover:opacity-100'
                  initial={{ opacity: 0, y: 20 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.button 
                    className='w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold py-3 px-6 rounded-xl shadow-lg'
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    View Open Positions
                  </motion.button>
                </motion.div> */}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Companies