"use client"
import dynamic from 'next/dynamic';
import { useProfileCompleteness } from '@/src/lib/profile/profile.queries'
import { useProfile } from "@/src/context/ProfileContext";
import React from 'react'
import { useQueryClient } from '@tanstack/react-query'; 
import toast from 'react-hot-toast';

// Lazy load all components
const Meta = dynamic(() => import('@/src/components/candidate/dashboard/profile/Meta'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-xl mb-4"></div>
});

const ResumeLink = dynamic(() => 
  import('@/src/components/candidate/dashboard/profile/resume-link/ResumeLink').then(mod => ({ default: mod.ResumeLink })), {
  loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-xl"></div>
});

const ResumeUpload = dynamic(() => 
  import('@/src/components/candidate/dashboard/profile/resume-upload/ResumeUpload').then(mod => ({ default: mod.ResumeUpload })), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-xl"></div>
});

const Personal = dynamic(() => import('@/src/components/candidate/dashboard/profile/PersonalInfoSection'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-40 rounded-xl mb-4"></div>
});

const SkillsSection = dynamic(() => import('@/src/components/candidate/dashboard/profile/SkillsSection'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-56 rounded-xl mb-4"></div>
});

const ExperienceSection = dynamic(() => import('@/src/components/candidate/dashboard/profile/ExperienceSection'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-xl"></div>
});

const EducationSection = dynamic(() => import('@/src/components/candidate/dashboard/profile/EducationSection'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-xl"></div>
});

const LinksSection = dynamic(() => import('@/src/components/candidate/dashboard/profile/LinksSection'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-xl mb-4"></div>
});

const JobBenefitsSection = dynamic(() => import('@/src/components/candidate/dashboard/profile/JobBenefitsSection'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-xl mb-4"></div>
});

const ProjectsSection = dynamic(() => import('@/src/components/candidate/dashboard/profile/ProjectsSection'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-xl mb-4"></div>
});

const CertificationsSection = dynamic(() => import('@/src/components/candidate/dashboard/profile/CertificationsSection'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-xl mb-4"></div>
});

const LanguagesSection = dynamic(() => import('@/src/components/candidate/dashboard/profile/LanguagesSection'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-xl mb-4"></div>
});

const CandidateProfilePage = () => {
  const queryClient = useQueryClient();
  const { refetch: refetchProfile, loading: profileLoading, forceRefresh, dataVersion } = useProfile();
  const { refetch: refetchCompleteness, isLoading, error } = useProfileCompleteness();

  const handleAutofillApplied = async () => {
    console.log('🔄 handleAutofillApplied: Starting refresh...');
    
    try {
      // ✅ Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('profileData');
        localStorage.removeItem('profileCompleteness');
      }
      
      // ✅ Invalidate ALL profile-related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['profileCompleteness'] }),
        queryClient.invalidateQueries({ queryKey: ['profileData'] })
      ]);
      
      // ✅ Wait for backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // ✅ Force ProfileContext refresh
      await forceRefresh();
      
      // ✅ Refetch completeness
      await refetchCompleteness();
      
      toast.success('Profile updated successfully!');
      console.log('✅ handleAutofillApplied: Refresh complete');
      
    } catch (error) {
      console.error('❌ handleAutofillApplied error:', error);
      toast.error('Failed to refresh profile');
    }
  };

  if (isLoading || profileLoading) {
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
    <div key={`profile-page-${dataVersion}`} className='w-full flex flex-col lg:flex-row justify-start items-start gap-3'>
      {/* Left Column - Main Profile Sections */}
      <div className='w-full lg:w-2/3 bg-white rounded-xl flex flex-col justify-start items-center gap-2 lg:gap-4 p-1 lg:p-3'>
        <Meta />
        
        <div className="w-full">
          <Personal />
        </div>
        
        <div className="w-full">
          <SkillsSection/>
        </div>
        
        <div className="w-full flex flex-col lg:flex-row gap-4">
          <div className='w-full lg:w-1/2'>
            <ExperienceSection/>
          </div>
          <div className='w-full lg:w-1/2'>
            <EducationSection/>
          </div>
        </div>

        <div className="w-full">
          <ProjectsSection />
        </div>

        <div className="w-full">
          <CertificationsSection />
        </div>

        <div className="w-full">
          <LanguagesSection />
        </div>
        
        <div className="w-full">
          <LinksSection/>
        </div>
        
        <div className="w-full">
          <JobBenefitsSection />
        </div>
      </div>
      
      {/* Right Column - Resume Related Components */}
      <div className='w-full lg:w-1/3 flex flex-col justify-start items-start gap-2'>
        <ResumeUpload onAutofillApplied={handleAutofillApplied} />
        <ResumeLink />
      </div>
    </div>
  )
}

export default CandidateProfilePage;