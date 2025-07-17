"use client"
import React from 'react'
import Hero from '../src/components/jobSeekerLandingPage/Hero'
import Navbar from '../src/components/layout/Navbar'
import Category from '../src/components/jobSeekerLandingPage/Category'
import Jobs from '../src/components/jobSeekerLandingPage/Jobs'
import Steps from '../src/components/jobSeekerLandingPage/Steps'

const page = () => {
  return (
    <div className='w-full relative'>
      <Navbar />
      <Hero />
      <Category />
      <Jobs />
      <Steps />
    </div>
  )
}

export default page
