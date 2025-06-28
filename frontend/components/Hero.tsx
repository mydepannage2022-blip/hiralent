"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";

const Hero = () => {
  const [mounted, setMounted] = useState(false);
  const { scrollY } = useScroll();
  const phrases = ["With AI", "Without Stress", "In One Click"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.8]);
  const y = useTransform(scrollY, [0, 300], [0, -100]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative h-screen w-screen overflow-hidden flex flex-col justify-center items-center py-0 bg-[#ddd6ff] dark:bg-transparent">
      {/* Bottom SVG Design */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] block dark:hidden">
        <svg
          className="relative block w-[100vw] h-[80px]"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 1440 320"
        >
          <path
            fill="#FFFBF4"
            d="M0,224L60,213.3C120,203,240,181,360,154.7C480,128,600,96,720,112C840,128,960,192,1080,197.3C1200,203,1320,149,1380,122.7L1440,96V320H1380C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320H0Z"
          />
        </svg>
      </div>

      {/* Main Content Container */}
      <motion.div
        className="flex flex-col lg:flex-row items-center justify-between text-center lg:max-w-6xl xl:max-w-7xl w-full mx-auto pt-16 rounded-[100px] transition-all gap-12 px-6"
      >
        {/* Left Side Text */}
        <div className="flex flex-col items-center lg:items-start justify-start w-full lg:w-2/4 p-8 rounded-[70px] gap-8 dark:shadow-lg">
 {/* <div className="flex items-center justify-start w-full gap-12">
              <div className="flex flex-col items-center justify-center  dark:ring-1 ring-[#28196A] dark:ring-white/70 backdrop-blur-xs rounded-xl dark:rounded-xl p-3 gap-2 dark:bg-none  shadow-[0_1px_5px_#28196A] dark:shadow-xl">
                <img
                  src="/images/confetti-1.png"
                  alt="image"
                  className="bg-white backdrop-blur-sm p-2  rounded-xl dark:rounded-xl w-[30px] md:w-[50px]"
                />
                <h4 className="text-center text-[10px] lg:text-sm font-medium text-[#2C2F38] dark:text-white">
                  Product of the Month <br></br>
                  <span className="font-light sm:text-[10px] md:text-[12px] lg:text-sm">
                    PRODUCT HUNT
                  </span>
                </h4>
                <h1 className="text-sm lg:text-base xl:text-xl font-medium text-[#2C2F38] dark:text-white">
                  1st
                </h1>
              </div>
              <div className="flex flex-col items-center justify-center  dark:ring-1 ring-[#28196A] dark:ring-white/70 backdrop-blur-xs rounded-xl dark:rounded-xl p-3 gap-2 dark:bg-none  shadow-[0_1px_5px_#28196A] dark:shadow-xl">
                <img
                  src="/images/frame.png"
                  alt="image"
                  className="bg-white backdrop-blur-sm p-2  rounded-xl dark:rounded-xl w-[30px] md:w-[50px]"
                />
                <h4 className="text-center text-[10px] lg:text-sm font-medium text-[#2C2F38] dark:text-white">
                  Product of the Month <br></br>
                  <span className="font-light sm:text-[10px] md:text-[12px] lg:text-sm">
                    PRODUCT HUNT
                  </span>
                </h4>
                <h1 className="text-sm lg:text-base xl:text-xl font-medium text-[#2C2F38] dark:text-white">
                  TOP PICK
                </h1>
              </div>
            </div> */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="text-2xl md:text-4xl xl:text-6xl font-bold leading-tight text-center lg:text-left font-josefin"
          >
            <span className="text-center lg:text-left font-light">
              Find The{" "}
              <span className="text-[#2C2F38] dark:text-[#00F5D4] font-bold">
                <br />
                Perfect Candidate
              </span>
              <br />
              <AnimatePresence mode="wait">
                <motion.span
                  key={phrases[index]}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    duration: 1,
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                  className="inline-block rounded-md text-[#2C2F38] font-lighter"
                >
                  {phrases[index]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="text-sm md:text-lg text-[#2C2F38]/90 dark:text-white max-w-2xl leading-relaxed text-center lg:text-left"
          >
            Need to hire fast? Our Talent Match AI delivers 10 highly matched,
            quality candidates to your roles every week, helping you find the
            perfect fit in just 30 days.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 mb-8"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 rounded-full font-semibold text-white transition-all duration-300 bg-[#1B1B1B] dark:bg-gradient-to-r from-[#28196A] to-[#00F5DA] hover:shadow-blue-500/25 shadow-2xl text-sm md:text-base"
            >
              Begin Your Free Trial
            </motion.button>
          </motion.div>
        </div>

        {/* Right Side YouTube Video */}
        <div className="hidden lg:block lg:w-2/4 rounded-3xl overflow-hidden shadow-xl border-[10px]">
          <iframe
            width="100%"
            height="315"
            src="https://www.youtube.com/embed/7IFJb-uLEaI?si=w_Q4cSXX2VJZaJtV" // replace with your video link
            title="Talenta Overview"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="rounded-2xl w-full h-[300px] xl:h-[450px]"
          ></iframe>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
