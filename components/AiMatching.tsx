import React from "react";
import { motion } from "framer-motion";
import { ImCheckboxChecked } from "react-icons/im";
import { SlEnergy } from "react-icons/sl";
import { MdOutlineStar } from "react-icons/md";
import { TiInputChecked } from "react-icons/ti";
const AiMatching = () => {
  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full lg:max-w-4xl xl:max-w-7xl lg:w-4xl xl:w-7xl flex justify-center items-center flex flex-col lg:flex-row bg-tranparent pb-12 lg:py-[150px] gap-24">
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-start gap-12">
          <div className="flex flex-col gap-3 w-full lg:w-4/5 rounded-xl p-4 ring-1  ring-white/10 ">
            <div className="flex items-center justify-start gap-3">
              <TiInputChecked className="text-[#00F5DA] text-4xl" />
              <div className="flex flex-col justify-start items-start">
                <h3 className="text-sm lg:text-base font-bold traking-">
                  Key Requirments Match
                </h3>
                <p className="text-xs lg:text-sm">
                  Experience with C++ product building
                </p>
              </div>
            </div>

            <p className="text-xs lg:text-sm font-light">
              This candidate has demonstrated a strong track record in C++
              product development, having worked on large-scale backend systems
              and framework development, which directly aligns with the
              requirements outlined in the job posting.
            </p>
          </div>




           <div className="flex flex-col gap-3 w-full lg:w-4/5 rounded-xl p-4 ring-1  ring-white/10 ">
            <div className="flex items-center justify-start gap-3">
              <MdOutlineStar className="text-[#00F5DA] text-4xl" />
              <div className="flex flex-col justify-start items-start">
                <h3 className="text-sm lg:text-base font-bold traking-">
                  Fair Match
                </h3>
                {/* <p className="text-xs lg:text-sm">
                  Experience with C++ product building
                </p> */}
              </div>
            </div>

            <p className="text-xs lg:text-sm font-light">
       Additional relevant skills and experience that complement the core requirements.
            </p>
          </div>





           <div className="flex flex-col gap-3 w-full lg:w-4/5 rounded-xl p-4 ring-1  ring-white/10 ">
            <div className="flex items-center justify-start gap-3">
              <SlEnergy className="text-[#00F5DA] text-4xl" />
              <div className="flex flex-col justify-start items-start">
                <h3 className="text-sm lg:text-base font-bold traking-">
                  Strong Stakeholder Communication and Collaboration
                </h3>
                {/* <p className="text-xs lg:text-sm">
                  Experience with C++ product building
                </p> */}
              </div>
            </div>

            <p className="text-xs lg:text-sm font-light">
              Proven ability to work effectively with cross-functional teams and communicate complex technical concepts to non-technical stakeholders.
            </p>
          </div>






        </div>

        <div className="flex flex-col justify-center items-end gap-8 w-1/2 bg-transparent backdrop-blur-sm p-8 rounded-3xl">
          <h1 className="text-2xl lg:text-5xl text-white font-bold text-right">
            <span className="text-[#00F5DA]">AI-Powered With </span>Talent
            Matching Precision
          </h1>
          <p className="text-sm lg:text-base font-light text-right">
            Unlike keyword search, our AI match engine infers key hiring needs
            from your company background and JDs, delivering maximum-level
            precision and refining with recruiter feedback.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-gradie  bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full font-semibold text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300 "
          >
            Get Started
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default AiMatching;
