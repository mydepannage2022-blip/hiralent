'use client';

import { Suspense } from 'react';
import Hero from '@/components/Hero';
import About from '@/components/About';
import SecondSectionBoxes from '@/components/SecondSectionBoxes';
import Choose from '@/components/Choose';
import AiMatching from '@/components/AiMatching';
import Steps from '@/components/Steps';

// Loading component for the hero section
const HeroLoading = () => (
  <div className="h-screen bg-white flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-400 mx-auto mb-4"></div>
      <p className="text-white text-lg">Loading Experience...</p>
    </div>
  </div>
);

export default function Home() {
  return (
    <>
      {/* Hero Section with 3D Scene */}
      <Suspense fallback={<HeroLoading />}>
        <Hero />
      </Suspense>

      <SecondSectionBoxes />
      <Choose />
      <AiMatching />
      <Steps />
      {/* About Section */}
      <About />

      {/* Additional Content Section */}
      <section className="mb-20 ">
        <div className="max-w-7xl mx-auto text-center bg-gradient-to-br from-slate-900/0 to-slate-600/50 py-20 px-4 rounded-3xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            <span className="gradient-text">Ready to Create?</span>
          </h2>
          <p className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto">
            Let&apos;s bring your vision to life with cutting-edge technology and creative excellence.
          </p>
          <button className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full font-semibold text-white shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300">
            Start Your Project
          </button>
        </div>
      </section>
    </>
  );
}