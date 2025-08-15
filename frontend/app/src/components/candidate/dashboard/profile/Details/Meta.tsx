"use client"
import Button from '@/app/src/components/layout/Button'
import React from 'react'
import { useAuth } from '../../../../../context/AuthContext';

const Meta = () => {
  const { user } = useAuth();

  // Get profile picture - same logic as navbar
  const getProfileImage = () => {
    if (user?.profile?.profile_picture_url) {
      return user.profile.profile_picture_url;
    }
    return "/images/candidate.jpg";
  };

  // Get user name
  const getUserName = () => {
    return user?.full_name || "Unknown User";
  };

  // Get headline directly from user profile
  const getHeadline = () => {
    if (user?.profile?.headline) {
      return user.profile.headline;
    }
    return "Professional seeking new opportunities";
  };

  // Handle resume actions
  const handleViewResume = async () => {
    try {
      // Call API to get resume download URL
      const response = await fetch('/api/candidates/resume/download', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.download_url) {
          window.open(data.data.download_url, '_blank');
        }
      } else {
        console.log('No resume found');
      }
    } catch (error) {
      console.error('Error viewing resume:', error);
    }
  };

  const handleDownloadResume = async () => {
    try {
      // Call API to get resume download URL
      const response = await fetch('/api/candidates/resume/download', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.download_url) {
          // Create temporary link for download
          const link = document.createElement('a');
          link.href = data.data.download_url;
          link.download = data.data.file_name || 'resume.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        console.log('No resume found for download');
      }
    } catch (error) {
      console.error('Error downloading resume:', error);
    }
  };

  return (
    <div className='w-full flex justify-start items-center gap-4 p-3 ring ring-[#EDEDED] rounded-xl'>
      <div>
        <img 
          src={getProfileImage()} 
          alt="User Profile" 
          className='w-32 h-32 rounded-xl object-cover'
        />
      </div>

      <div className='flex flex-col justify-center items-start gap-2'>
        <div className=''>
          <h3 className='font-semibold text-lg text-[#222]'>
            {getUserName()}
          </h3>
          <p className='text-gray-600 text-sm leading-relaxed'>
            {getHeadline()}
          </p>
        </div>
      
        <div className='flex justify-start gap-3 mt-2'>
          <Button 
            text="View Resume" 
            variant="dark" 
            animation={false}
            onClick={handleViewResume}
          />
          <Button 
            text="Download PDF Resume" 
            variant="light" 
            animation={false}
            onClick={handleDownloadResume}
          />
        </div>
      </div>
    </div>
  )
}

export default Meta