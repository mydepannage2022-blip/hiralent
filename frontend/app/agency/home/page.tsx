"use client"
import React from 'react'
import Hero from '../../../src/components/agency/home/Hero'
import Benefits from '../../../src/components/agency/home/Benefits'
import HowItWorks from '../../../src/components/agency/home/HowItWorks'
import Services from '../../../src/components/agency/home/Services'
import FinalCTA from '../../../src/components/agency/home/FinalCTA'

const page = () => {
  return (
    <div className='w-full relative'>
      <Hero />
      <Benefits />
      <HowItWorks />
      <Services />
      <FinalCTA />
    </div>
  )
}

export default page