'use client';

import { Suspense } from 'react';
import Hero from '@/components/Hero';
import SecondSectionBoxes from '@/components/SecondSectionBoxes';
import Choose from '@/components/Choose';
import AiMatching from '@/components/AiMatching';
import Steps from '@/components/Steps';
import Testimonials from '@/components/Testimonials';
import { motion } from 'framer-motion';


export default function Home() {
  return (
    <>
        <Hero />

      <SecondSectionBoxes />
      <Choose />
      <AiMatching />
      <Steps />
      <Testimonials />
      {/* Additional Content Section */}
      <section className="mb-20 ">
        <div className="max-w-7xl mx-auto text-center bg-transparent backdrop-blur-sm py-20 px-4 rounded-3xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            <span className="text-[#00F5DA]">Ready to Create?</span>
          </h2>
          <p className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto">
            Let&apos;s bring your vision to life with cutting-edge technology and creative excellence.
          </p>
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full font-semibold text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300 "
          >
            Begin Your Free Trial
          </motion.button>
        </div>
      </section>
    </>
  );
}