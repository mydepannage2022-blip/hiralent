'use client'

import { BadgeCheck, Bookmark, CalendarClock, Clock, MapPin, CircleDollarSign } from "lucide-react";

interface CompanyDetailsCardProps {
  name: string;
  logo: string;
  role: string;
  shortDescription: string;
  employmentType: string;
  experienceLevel: string;
  location: string;
  salary: string;
  profileImage: string;
  resumeProgress: string;
  resumeMessage: string;
}

const CompanyDetailsCard = ({
  name,
  logo,
  role,
  shortDescription,
  employmentType,
  experienceLevel,
  location,
  salary,
  profileImage,
  resumeProgress,
  resumeMessage,
}: CompanyDetailsCardProps) => {
  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between">
        {/* Left Container */}
        <div className="flex w-full md:w-3/4 gap-4">
          {/* Left Sub-Container (Logo) */}
          <div className="border border-gray rounded-md p-6">
            <img src={logo} alt={`${name} logo`} className="h-full w-full" />
          </div>
          {/* Right Sub-Container (Company Name + Role + Short Description) */}
          <div className="flex-1 max-w-[600px]">
            <h2 className="text-sm text-[#515151] flex items-center gap-1 font-semibold">{name}<BadgeCheck className="h-4 w-4 text-[#005DDC]" /></h2>
            <p className="text-2xl font-semibold text-black flex items-center gap-3">{role}<Bookmark className="text-[#005DDC]" /></p>
            <p className="text-[#757575] my-6">{shortDescription}</p>
            <div className="flex gap-3">
              <button className="bg-[#005DDC] text-white w-full max-w-[140px] py-2 rounded-md text-sm font-medium cursor-pointer hover:bg-[#004EB7]">Apply Now</button>
              <button className="border border-[#005DDC] text-[#005DDC] w-full max-w-[140px] py-2 rounded-md text-sm font-medium cursor-pointer hover:bg-[#005DDC] hover:text-white">Message</button>
            </div>
          </div>
        </div>
        {/* Right Container (Buttons + Resume Progress) */}
        <div className="w-full md:w-1/4 mt-4 md:mt-0 flex flex-col items-end">
          <div className="bg-[#F9F9F9] border border-[#EDEDED] rounded-lg flex flex-col items-center justify-center text-center p-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="w-15 h-15 rounded-full bg-gray-200 overflow-hidden">
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <svg className="absolute w-16 h-16" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="#CBCBCB"
                  strokeWidth="4"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="#005DDC"
                  strokeWidth="4"
                  strokeDasharray="288.88"
                  strokeDashoffset="274.44" // 5% of 288.88 (circumference)
                  transform="rotate(-90 50 50)"
                />
              </svg>
            </div>
            <div className="text-[#005DDC] font-semibold mb-1">{resumeProgress} <span className="text-black">of Your Resume is Complete</span></div>
            <div className="text-[#757575] text-xs mb-1 max-w-[175px]">{resumeMessage}</div>
            <button className="text-[#003E93] font-medium">
              Complete your resume
            </button>
          </div>
        </div>
      </div>
      {/* Bottom Container */}
      <div className="w-full flex justify-center items-center md:space-x-12 lg:space-x-22 xl:space-x-29 p-4 mt-8 border-t pt-16 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <Clock size={36} color="black" />
          <div>
            <h1 className="text-black font-medium">{employmentType}</h1>
            <p className="text-[#757575] text-sm">Employement Type</p>
          </div>
        </div>
        <div className="h-10 w-px bg-[#A5A5A5]"></div>
        <div className="flex items-center space-x-2">
          <CalendarClock size={36} color="black" />
          <div>
            <h1 className="text-black font-medium">{experienceLevel}</h1>
            <p className="text-[#757575] text-sm">Experience Level</p>
          </div>
        </div>
        <div className="h-10 w-px bg-[#A5A5A5]"></div>
        <div className="flex items-center space-x-2">
          <MapPin size={36} color="black" />
          <div>
            <h1 className="text-black font-medium">{location}</h1>
            <p className="text-[#757575] text-sm">Location</p>
          </div>
        </div>
        <div className="h-10 w-px bg-[#A5A5A5]"></div>
        <div className="flex items-center space-x-2">
          <CircleDollarSign size={36} color="black" />
          <div>
            <h1 className="text-black font-medium">{salary}</h1>
            <p className="text-[#757575] text-sm">$500</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanyDetailsCard;