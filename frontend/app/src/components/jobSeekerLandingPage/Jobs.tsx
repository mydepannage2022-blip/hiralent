import React from 'react'
import { motion } from 'framer-motion'
import { IoLocationOutline } from "react-icons/io5";
import { Variants } from 'framer-motion';

const Jobs = () => {

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

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const jobCardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const jobs = [
    {
      id: 1,
      company: "MIM",
      logo: "/images/MIM.png",
      title: "President of Sales",
      type: "Full Time",
      mode: "Remote",
      location: "New York, USA",
      salary: "2500$ / Month",
      time: "1 hour ago"
    },
    {
      id: 2,
      company: "McDonald's",
      logo: "/images/zb-bjdz-google-icon-12-x.png",
      title: "Web Designer",
      type: "Full Time",
      mode: "Hybrid",
      location: "San Francisco, USA",
      salary: "8500$ / Month",
      time: "2 hours ago"
    },
    {
      id: 3,
      company: "Love Clip",
      logo: "/images/loveclip.png",
      title: "Product Manager",
      type: "Full Time",
      mode: "On-site",
      location: "Seattle, USA",
      salary: "7200$ / Month",
      time: "3 hours ago"
    },
    {
      id: 4,
      company: "TYME",
      logo: "/images/zb-bjdz-google-icon-1.png",
      title: "UX Designer",
      type: "Part Time",
      mode: "Remote",
      location: "Cupertino, USA",
      salary: "4800$ / Month",
      time: "5 hours ago"
    },
    {
      id: 5,
      company: "OB",
      logo: "/images/OB.png",
      title: "Dog Trainer",
      type: "Full Time",
      mode: "Hybrid",
      location: "Austin, USA",
      salary: "6800$ / Month",
      time: "6 hours ago"
    },
    {
      id: 6,
      company: "Meta",
      logo: "/images/zb-bjdz-google-icon-1.png",
      title: "DevOps Engineer",
      type: "Contract",
      mode: "Remote",
      location: "Menlo Park, USA",
      salary: "5500$ / Month",
      time: "8 hours ago"
    }
  ];

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
            Newest Jobs For You
          </motion.h2>
          <motion.p 
            className='text-[#757575] text-sm lg:text-base text-center'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Get the fastest application so that your name is above other
          </motion.p>
        </motion.div>
       
       <motion.div 
         className='w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
         variants={containerVariants}
         initial="hidden"
         whileInView="visible"
         viewport={{ once: true, amount: 0.2 }}
       >
         {jobs.map((job) => (
           <motion.div 
             key={job.id}
             className='box flex justify-center items-start gap-2 ring ring-[#E0E0E0] rounded-lg shadow-md p-5 hover:shadow-lg transition-all duration-300 hover:ring-[#005DDC] hover:ring-2 cursor-pointer'
             variants={jobCardVariants}
             whileHover={{ 
               y: -5,
               transition: { duration: 0.2 }
             }}
           >
             <div className='flex-shrink-0'>
               <img src={job.logo} alt={job.company} className='w-12 h-12 lg:w-14 lg:h-14 object-contain' />
             </div>

             <div className='flex flex-col justify-center items-start gap-1 flex-1'>
               <p className='text-[#A5A5A5] text-xs'>{job.company}</p>
               <h3 className='text-sm lg:text-base text-[#222] font-medium'>{job.title}</h3>
               <div className='flex gap-2 items-center'>
                 <span className='bg-[#EFF5FF] text-xs font-light text-[#005DDC] px-2 py-1 rounded'>{job.type}</span>
                 <span className='bg-[#EFF5FF] text-xs font-light text-[#005DDC] px-2 py-1 rounded'>{job.mode}</span>
               </div>

               <div className='flex items-center gap-1 text-xs text-[#353535] mt-1'>
                 <IoLocationOutline className='flex-shrink-0' />
                 <span>{job.location}</span>
               </div>
               
               <div className='flex justify-between items-center w-full gap-4 mt-2'>
                 <span className='text-[#005DDC] text-xs font-medium'>{job.salary}</span>
                 <span className='text-[10px] text-[#757575] font-light'>{job.time}</span>
               </div>
             </div>
           </motion.div>
         ))}
       </motion.div>
      </div>
      </div>
  )
}

export default Jobs