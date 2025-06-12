import React from 'react'
import {motion} from 'framer-motion'


const Choose = () => {
  return (
    <div className='w-full flex justify-center items-center '>
      <div className='w-full lg:max-w-4xl xl:max-w-7xl lg:w-4xl xl:w-7xl flex justify-center items-center flex flex-col lg:flex-row bg-tranparent pb-12 lg:pt-[150px] gap-16'>
        <div className='flex flex-col items-center lg:items-start justify-center w-full w-1/2 gap-8 bg-tranparent backdrop-blur-sm py-8 pr-8 rounded-3xl'>
          <h1 className='text-2xl lg:text-5xl text-white font-bold'>Why Choose <span className='text-[#00F5DA]'>Talenta</span></h1>
          <h4 className='text-base lg:text-lg font-medium'>Access The <span className='text-[#00F5DA]'>Fastest</span><br></br>
          <span className='text-[#00F5DA]'>Growing, Diverse </span>Telant Pool 
          </h4>
          <p className='text-sm lg:text-base font-light '>Need to hire fast? Jobright's Talent Match AI delivers 10 highly matched, quality candidates to your roles every week. Access a rapidly expanding, diverse talent pool from new grads to executives across engineering, marketing, and PMs, with experience from startups to Fortune 500 companies. First month free, no credit card needed. Get started for free!</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-gradie  bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full font-semibold text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300 "
          >
            Begin Your Free Trial
          </motion.button>
        </div>



        <div className='w-full w-1/2 flex flex-co lg:flex-row flex-wrap gap-5 justify-end'>
  
  
          <div className='flex flex-col border-t-2  border-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-lg p-4 bg-white gap-3 cursor-pointer'>
            <div className='flex justify-start items-center gap-3'>
              <p className=' bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full p-2 lg:p-3'>SE</p>
              <div className='flex flex-col jusitfy-center items-start text-black '>
                <h4 className='text-sm lg:text-base font-bold'>Software Engineer</h4>
                <p className='text-xs lg:text-sm text-gray-500 '>Hardcore Tech, Stanford</p>
              </div>
            </div>
            <div className='flex justify-center items-center gap-3'>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>AWS</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>Python</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>React</p>
            
            </div>
          </div>
       
          <div className='flex flex-col border-t-2  border-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-lg p-4 bg-white gap-3 cursor-pointer'>
            <div className='flex justify-start items-center gap-3'>
              <p className=' bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full p-2 lg:p-3'>HI</p>
              <div className='flex flex-col jusitfy-center items-start text-black '>
                <h4 className='text-sm lg:text-base font-bold'>Software Engineer</h4>
                <p className='text-xs lg:text-sm text-gray-500 '>Hardcore Tech, Stanford</p>
              </div>
            </div>
            <div className='flex justify-center items-center gap-3'>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>AWS</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>Python</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>React</p>
            
            </div>
          </div>
       
       
          <div className='flex flex-col border-t-2  border-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-lg p-4 bg-white gap-3 cursor-pointer'>
            <div className='flex justify-start items-center gap-3'>
              <p className=' bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full p-2 lg:p-3'>AB</p>
              <div className='flex flex-col jusitfy-center items-start text-black '>
                <h4 className='text-sm lg:text-base font-bold'>Software Engineer</h4>
                <p className='text-xs lg:text-sm text-gray-500 '>Hardcore Tech, Stanford</p>
              </div>
            </div>
            <div className='flex justify-center items-center gap-3'>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>AWS</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>Python</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>React</p>
            
            </div>
          </div>
       

          <div className='flex flex-col border-t-2  border-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-lg p-4 bg-white gap-3 cursor-pointer'>
            <div className='flex justify-start items-center gap-3'>
              <p className=' bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full p-2 lg:p-3'>AB</p>
              <div className='flex flex-col jusitfy-center items-start text-black '>
                <h4 className='text-sm lg:text-base font-bold'>Software Engineer</h4>
                <p className='text-xs lg:text-sm text-gray-500 '>Hardcore Tech, Stanford</p>
              </div>
            </div>
            <div className='flex justify-center items-center gap-3'>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>AWS</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>Python</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>React</p>
            
            </div>
          </div>

             <div className='flex flex-col border-t-2  border-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-lg p-4 bg-white gap-3 cursor-pointer'>
            <div className='flex justify-start items-center gap-3'>
              <p className=' bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full p-2 lg:p-3'>AB</p>
              <div className='flex flex-col jusitfy-center items-start text-black '>
                <h4 className='text-sm lg:text-base font-bold'>Software Engineer</h4>
                <p className='text-xs lg:text-sm text-gray-500 '>Hardcore Tech, Stanford</p>
              </div>
            </div>
            <div className='flex justify-center items-center gap-3'>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>AWS</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>Python</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>React</p>
            
            </div>
          </div>

          <div className='flex flex-col border-t-2  border-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-lg p-4 bg-white gap-3 cursor-pointer'>
            <div className='flex justify-start items-center gap-3'>
              <p className=' bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full p-2 lg:p-3'>AZ</p>
              <div className='flex flex-col jusitfy-center items-start text-black '>
                <h4 className='text-sm lg:text-base font-bold'>Software Engineer</h4>
                <p className='text-xs lg:text-sm text-gray-500 '>Hardcore Tech, Stanford</p>
              </div>
            </div>
            <div className='flex justify-center items-center gap-3'>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>AWS</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>Python</p>
              <p className='bg-[#00F5DA] rounded-full text-gray-600 p-2 text-[8px]'>React</p>
            
            </div>
          </div>

       
        </div>
      
      
      </div>
      
    </div>
  )
}

export default Choose
