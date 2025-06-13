import React from 'react'
import {motion} from 'framer-motion'


const Choose = () => {
  return (
    <div className='w-full flex justify-center items-center'>
      
      <div className='w-5/6 lg:w-1/2 lg:max-w-4xl xl:max-w-7xl lg:w-4xl xl:w-7xl flex justify-center items-center flex flex-col lg:flex-row bg-tranparent pb-12 lg:pt-[150px] gap-16'>
      
      
      
        <div className='flex flex-col items-center lg:items-start justify-center w-full w-1/2 gap-8 bg-none dark:bg-tranparent dark:backdrop-blur-sm py-0 pt-8 lg:py-8 pr-0 lg:pr-8 rounded-3xl'>
          <h1 className='text-2xl lg:text-5xl font-bold gradient-text dark:text-white text-center lg:text-left'>Why Choose <span className='gradient-text dark:text-[#00F5DA]'>Talenta</span></h1>
          <h4 className='text-base lg:text-lg font-medium text-[#2C2F38]/90 dark:text-white text-center lg:text-left'>Access The <span className='gradient-text dark:text-[#00F5DA]'>Fastest</span><br></br>
          <span className='gradient-text dark:text-[#00F5DA]'>Growing, Diverse </span>Telant Pool 
          </h4>
          <p className='text-sm lg:text-base font-light text-[#2C2F38]/90 dark:text-white text-center lg:text-left'>Need to hire fast? Jobright's Talent Match AI delivers 10 highly matched, quality candidates to your roles every week. Access a rapidly expanding, diverse talent pool from new grads to executives across engineering, marketing, and PMs, with experience from startups to Fortune 500 companies. First month free, no credit card needed. Get started for free!</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-[#28196A] dark:bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full font-semibold text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
          >Begin Your Free Trial
          </motion.button>
        </div>

        <div className='w-5/6 lg:w-1/2 flex justify-center flex-wrap gap-3 justify-center lg:justify-end'>
  
          <div className='w-[105px] md:w-1/2 lg:w-2/3 flex flex-col shadow-2xl rounded-xl dark:rounded-lg p-4 bg-white gap-3 cursor-pointer'>
            <div className='flex flex-col lg:flex-row justify-start items-center gap-3'>
              <p className=' bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full p-2 lg:p-3 text-white text-xs lg:text-2xl text-center lg:text-left'>SE</p>
              <div className='flex flex-col justify-center items-start text-black '>
                <h4 className='text-xs lg:text-base font-bold text-[#2C2F38]/90 dark:text-white text-center lg:text-left'>Software Engineer</h4>
                <p className='text-[10px] lg:text-sm text-gray-500 text-center lg:text-left'>Hardcore Tech, Stanford</p>
              </div>
            </div>
            <div className='w-full flex justify-center items-center flex-wrap gap-1 md:gap-2 lg:gap-3 text-xs lg:text-sm'>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>AWS</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>Python</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>React</p>
            
            </div>
          </div>
       
          <div className='w-[105px] md:w-1/2 lg:w-2/3 flex flex-col shadow-2xl rounded-xl dark:rounded-lg p-4 bg-white gap-3 cursor-pointer'>
            <div className='flex flex-col lg:flex-row justify-start items-center gap-3'>
              <p className=' bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full p-2 lg:p-3 text-white text-xs lg:text-2xl text-center lg:text-left'>HB</p>
              <div className='flex flex-col jusitfy-center items-start text-black '>
                <h4 className='text-xs lg:text-base font-bold text-[#2C2F38]/90 dark:text-white text-center lg:text-left'>Software Engineer</h4>
                <p className='text-[10px] lg:text-sm text-gray-500 text-center lg:text-left'>Hardcore Tech, Stanford</p>
              </div>
            </div>
            <div className='w-full flex justify-center items-center flex-wrap gap-1 md:gap-2 lg:gap-3 text-xs lg:text-sm'>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>AWS</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>Python</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>React</p>
            
            </div>
          </div>
       
       
          <div className='w-[105px] md:w-1/2 lg:w-2/3 flex flex-col shadow-2xl rounded-xl dark:rounded-lg p-4 bg-white gap-3 cursor-pointer'>
            <div className='flex flex-col lg:flex-row justify-start items-center gap-3'>
              <p className=' bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full p-2 lg:p-3 text-white text-xs lg:text-2xl text-center lg:text-left'>AB</p>
              <div className='flex flex-col jusitfy-center items-start text-black '>
                <h4 className='text-xs lg:text-base font-bold text-[#2C2F38]/90 dark:text-white text-center lg:text-left'>Software Engineer</h4>
                <p className='text-[10px] lg:text-sm text-gray-500 text-center lg:text-left'>Hardcore Tech, Stanford</p>
              </div>
            </div>
            <div className='w-full flex justify-center items-center flex-wrap gap-1 md:gap-2 lg:gap-3 text-xs lg:text-sm'>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>AWS</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>Python</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>React</p>
            
            </div>
          </div>
       

          <div className='w-[105px] md:w-1/2 lg:w-2/3 flex flex-col shadow-2xl rounded-xl dark:rounded-lg p-4 bg-white gap-3 cursor-pointer'>
            <div className='flex flex-col lg:flex-row justify-start items-center gap-3'>
              <p className=' bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full p-2 lg:p-3 text-white text-xs lg:text-2xl text-center lg:text-left'>AB</p>
              <div className='flex flex-col jusitfy-center items-start text-black '>
                <h4 className='text-xs lg:text-base font-bold text-[#2C2F38]/90 dark:text-white text-center lg:text-left'>Software Engineer</h4>
                <p className='text-[10px] lg:text-sm text-gray-500 text-center lg:text-left'>Hardcore Tech, Stanford</p>
              </div>
            </div>
            <div className='w-full flex justify-center items-center flex-wrap gap-1 md:gap-2 lg:gap-3 text-xs lg:text-sm'>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>AWS</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>Python</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>React</p>
            
            </div>
          </div>

             <div className='w-[105px] md:w-1/2 lg:w-2/3 flex flex-col shadow-2xl rounded-xl dark:rounded-lg p-4 bg-white gap-3 cursor-pointer'>
            <div className='flex flex-col lg:flex-row justify-start items-center gap-3'>
              <p className=' bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full p-2 lg:p-3 text-white text-xs lg:text-2xl text-center lg:text-left'>AB</p>
              <div className='flex flex-col jusitfy-center items-start text-black '>
                <h4 className='text-xs lg:text-base font-bold text-[#2C2F38]/90 dark:text-white text-center lg:text-left'>Software Engineer</h4>
                <p className='text-[10px] lg:text-sm text-gray-500 text-center lg:text-left'>Hardcore Tech, Stanford</p>
              </div>
            </div>
            <div className='w-full flex justify-center items-center flex-wrap gap-1 md:gap-2 lg:gap-3 text-xs lg:text-sm'>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>AWS</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>Python</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>React</p>
            
            </div>
          </div>

          <div className='w-[105px] md:w-1/2 lg:w-2/3 flex flex-col shadow-2xl rounded-xl dark:rounded-lg p-4 bg-white gap-3 cursor-pointer'>
            <div className='flex flex-col lg:flex-row justify-start items-center gap-3'>
              <p className=' bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full p-2 lg:p-3 text-white text-xs lg:text-2xl text-center lg:text-left'>AZ</p>
              <div className='flex flex-col jusitfy-center items-start text-black '>
                <h4 className='text-xs lg:text-base font-bold text-[#2C2F38]/90 dark:text-white text-center lg:text-left'>Software Engineer</h4>
                <p className='text-[10px] lg:text-sm text-gray-500 text-center lg:text-left'>Hardcore Tech, Stanford</p>
              </div>
            </div>
            <div className='w-full flex justify-center items-center flex-wrap gap-1 md:gap-2 lg:gap-3 text-xs lg:text-sm'>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>AWS</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>Python</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-[2px] lg:p-2 text-[6px]'>React</p>
            
            </div>
          </div>

       
        </div>
      
      
      </div>
      
    </div>
  )
}

export default Choose
