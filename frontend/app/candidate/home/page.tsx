"use client"
import React from 'react'
import Hero from '../../src/components/candidate/home/Hero'
import Navbar from '../../src/components/layout/Navbar'
import Category from '../../src/components/candidate/home/Category'
import Jobs from '../../src/components/candidate/home/Jobs'
import Steps from '../../src/components/candidate/home/Steps'
import Companies from '../../src/components/candidate/home/Companies'
import Achievements from '../../src/components/candidate/home/Achievements'
import BlogSection from '../../src/components/candidate/home/Blog'
import Employer from '../../src/components/candidate/home/Employer'
import Footer from '../../src/components/layout/Footer'

const page = () => {
  return (
    <div className='w-full relative'>
      <Navbar />
      <Hero />
      <Category />
      <Jobs />
      <Steps />
      <Companies />
      <Achievements />
      <BlogSection />
      <Employer />
      <Footer />
    </div>
  )
}

export default page
