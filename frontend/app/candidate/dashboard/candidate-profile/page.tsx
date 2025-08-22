"use client"
import Meta from '@/src/components/candidate/dashboard/profile/Meta'
import { ResumeLink } from '@/src/components/candidate/dashboard/profile/resume-link/ResumeLink'
import { ResumeQuality } from '@/src/components/candidate/dashboard/profile/resume-quality/ResumeQuality'
import { ResumeUpload } from '@/src/components/candidate/dashboard/profile/resume-upload/ResumeUpload'

// Import our new profile sections
import Personal from '@/src/components/candidate/dashboard/profile/PersonalInfoSection'
import AboutMeSection from '@/src/components/candidate/dashboard/profile/AboutMeSection'
import SkillsSection from '@/src/components/candidate/dashboard/profile/SkillsSection'
import ExperienceSection from '@/src/components/candidate/dashboard/profile/ExperienceSection'
import EducationSection from '@/src/components/candidate/dashboard/profile/EducationSection'
import LinksSection from '@/src/components/candidate/dashboard/profile/LinksSection'
import JobBenefitsSection from '@/src/components/candidate/dashboard/profile/JobBenefitsSection'

import { useAuth } from '@/src/context/AuthContext'
import { useProfileCompleteness } from '@/src/lib/profile.queries'
import React from 'react'

const page = () => {
  const { user } = useAuth();
  const { data: profileData, isLoading, error } = useProfileCompleteness();

  // Transform data for each section
  const aboutMeData = {
    description: user?.profile?.about_me || '',
  };

  const skillsData = profileData?.data?.skills || [];
  const experienceData = profileData?.data?.experience || [];
  const educationData = profileData?.data?.education || [];
  const linksData = profileData?.data?.links || [];
  const jobBenefitsData = profileData?.data?.job_benefits || [];

  if (isLoading) {
    return (
      <div className="w-full flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load profile data</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full flex justify-start items-start gap-3'>
      {/* Left Column - Main Profile Sections */}
      <div className='w-2/3 bg-white rounded-xl flex flex-col justify-start items-center gap-4 p-3'>
        {/* Existing Meta Component */}
        <Meta />
        
        {/* Personal Information Section */}
        <div className="w-full">
          <Personal />
        </div>
        
        {/* Professional Skills Section */}
        <div className="w-full">
          <SkillsSection data={skillsData} />
        </div>
        
        {/* Work Experience Section */}
        <div className="w-full">
          <ExperienceSection data={experienceData} />
        </div>
        
        {/* Education Section */}
        <div className="w-full">
          <EducationSection data={educationData} />
        </div>
        
        {/* Social Links Section */}
        <div className="w-full">
          <LinksSection data={linksData} />
        </div>
        
        {/* Job Benefits Section */}
        <div className="w-full">
          <JobBenefitsSection data={jobBenefitsData} />
        </div>
        
        {/* Profile Completeness Indicator */}
        {profileData?.data?.overall_score !== undefined && (
          <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-900">Profile Completeness</h3>
              <span className="text-2xl font-bold text-blue-600">
                {Math.round(profileData.data.overall_score)}%
              </span>
            </div>
            
            <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${profileData.data.overall_score}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-blue-700">
              Complete your profile to improve your job matching and visibility to employers.
            </p>
          </div>
        )}
      </div>
      
      {/* Right Column - Resume Related Components */}
      <div className='w-1/3 flex flex-col justify-start items-start gap-2'>
        {/* <ResumeQuality /> */}
        <ResumeUpload 
          uploadType="application_specific"
        />
        <ResumeLink />
      </div>
    </div>
  )
}

export default page