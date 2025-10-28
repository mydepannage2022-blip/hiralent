import Link from 'next/dist/client/link'
import React from 'react'
import { motion } from 'framer-motion';
import { IoLocationOutline } from "react-icons/io5";
import { Variants } from 'framer-motion';
import { IoCallOutline } from "react-icons/io5";


const Footer = () => {
  return (
  <div className='w-full flex justify-center items-center bg-[#FFFFFF]'>
      <div className='lg:max-w-5xl xl:max-w-7xl w-9/10 flex flex-col justify-between items-center py-12 lg:py-16'>
             
      <div className='w-full flex flex-col lg:flex-row justify-between items-start gap-8'>
        <div className='w-full lg:w-1/4 flex flex-col justify-center items-center lg:items-start gap-4 text-[#353535]'>
          <img src="/images/logo.png" alt="Logo" className='w-32 h-auto' />
          <p className='text-xs lg:text-sm text-center lg:text-left'>Joblin is a smart job search and recruitment platform that connects job seekers with employers. With fast search, professional resume building, and intelligent matching, Jablin makes hiring and job hunting easy and efficient.</p>
        </div>
        <div className='w-full lg:w-1/4 flex flex-col justify-center items-center lg:items-start gap-4 text-[#353535]'>
          <h3 className='font-bold text-base'>Our Services</h3>
          <p className='text-xs lg:text-sm cursor-pointer'> <Link href={"/job/jobsearch"}>Find job</Link></p>
          {/* <p className='text-xs lg:text-sm cursor-pointer'> <Link href={"/"}>Create resume</Link></p> */}
          <p className='text-xs lg:text-sm cursor-pointer'> <Link href={"/company/discover"}>Search company</Link></p>
          <p className='text-xs lg:text-sm cursor-pointer'> <Link href={"/company/pricing"}>Pricing Plan</Link></p>
          <p className='text-xs lg:text-sm cursor-pointer'> <Link href={"/footer/about"}>About us</Link></p>
        </div>
        <div className='w-full lg:w-1/4 flex flex-col justify-center items-center lg:items-start gap-4 text-[#353535]'>
          <h3 className='font-bold text-base'>Links</h3>
          <p className='text-xs lg:text-sm cursor-pointer'> <Link href={"/footer/blog"}>Blog</Link></p>
          <p className='text-xs lg:text-sm cursor-pointer'> <Link href={"/footer/helpcenter"}>Help Center</Link></p>
          <p className='text-xs lg:text-sm cursor-pointer'> <Link href={"/footer/contact"}>Contact us</Link></p>
          <p className='text-xs lg:text-sm cursor-pointer'> <Link href={"/footer/privacypolicy"}>Privacy Policy</Link></p>
        </div>

        <div className='w-full lg:w-1/4 flex flex-col justify-center items-center lg:items-start gap-4 text-[#353535]'>
          <h3 className='font-bold text-base'>Contact Us</h3>
          <div className='flex justify-center gap-3 lg:gap-4'>

          <img className='p-3 bg-[#F4F4F4] rounded-lg' src="/images/instgram.png" alt="Instagram" />
          <img className='p-3 bg-[#F4F4F4] rounded-lg' src="/images/facebook.png" alt="Facebook" />
          <img className='p-3 bg-[#F4F4F4] rounded-lg' src="/images/x.png" alt="Twitter" />
          <img className='w-12 p-3 bg-[#F4F4F4] rounded-lg' src="/images/linkedin.ico" alt="LinkedIn" />
          </div>
          <div className='flex items-center gap-2 text-xs lg:text-sm'>
            <IoLocationOutline className='text-[#353535] text-xl' />
            <p>1234 Street, City, Country</p>
          </div>
          <div className='flex items-center gap-2 text-xs lg:text-sm'>
            <IoCallOutline className='text-[#353535] text-xl' />
            <p>+1 234 567 890</p>
          </div>
        </div>
       
      </div>
       <div className='w-full flex justify-center items-center lg:items-start pt-16  text-center'>
          <p className='text-xs lg:text-sm text-[#353535] text-center'>© 2025 hiralent. All rights reserved.</p>
        </div>
    </div>
    </div>

  )
}

export default Footer
