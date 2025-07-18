"use client"
import React from 'react'
import Hero from '../src/components/jobSeekerLandingPage/Hero'
import Navbar from '../src/components/layout/Navbar'
import Category from '../src/components/jobSeekerLandingPage/Category'
import Jobs from '../src/components/jobSeekerLandingPage/Jobs'
import Steps from '../src/components/jobSeekerLandingPage/Steps'
import Companies from '../src/components/jobSeekerLandingPage/Companies'
import Achievements from '../src/components/jobSeekerLandingPage/Achievements'
import BlogSection from '../src/components/jobSeekerLandingPage/Blog'
import Employer from '../src/components/jobSeekerLandingPage/Employer'
import Footer from '../src/components/layout/Footer'

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
