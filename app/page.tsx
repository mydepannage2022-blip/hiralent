'use client';

import { Suspense } from 'react';
import Hero from '@/components/Hero';
import SecondSectionBoxes from '@/components/SecondSectionBoxes';
import Choose from '@/components/Choose';
import AiMatching from '@/components/AiMatching';
import Steps from '@/components/Steps';
import Testimonials from '@/components/Testimonials';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      {/* <Navbar /> */}
        <Hero />

      <SecondSectionBoxes />
      <Choose />
      <AiMatching />
      <Steps />
      <Testimonials />
      {/* Additional Content Section */}
      <section className="mb-20 ">
        <div className="lg:max-w-4xl xl:max-w-7xl mx-auto text-center bg-white/70 dark:bg-transparent backdrop-blur-sm py-20 px-4 rounded-3xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            <span className="gradient-text dark:text-[#00F5DA]">Ready to Create?</span>
          </h2>
          <p className="text-lg text-[#2C2F38] mb-12 max-w-2xl mx-auto">
            Let&apos;s bring your vision to life with cutting-edge technology and creative excellence.
          </p>
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-[#28196A] dark:bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full font-semibold text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300 "
          >
            Begin Your Free Trial
          </motion.button>
        </div>
      </section>
      {/* <Footer /> */}
    </>
  );
}