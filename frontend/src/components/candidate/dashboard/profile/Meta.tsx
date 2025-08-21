"use client"
import Button from '@/src/components/layout/Button'
import React from 'react'
import { useAuth } from '@/src/context/AuthContext';
import { HiCheckBadge } from 'react-icons/hi2'; // Verified icon
import { HiExclamationTriangle } from 'react-icons/hi2'; // Not verified icon

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

  // Get headline with email fallback
  const getHeadlineOrEmail = () => {
    // First try headline
    if (user?.profile?.headline) {
      return user.profile.headline;
    }
    // Fallback to email
    if (user?.email) {
      return user.email;
    }
    return null;
  };

  // Check if user is verified
  const isEmailVerified = () => {
    return user?.is_email_verified || false;
  };

  // Get verification icon and status
  const getVerificationIcon = () => {
    if (isEmailVerified()) {
      return (
        <HiCheckBadge 
          className="w-4 h-4 text-green-500" 
          title="Email Verified"
        />
      );
    } else {
      return (
        <HiExclamationTriangle 
          className="w-4 h-4 text-orange-500" 
          title="Email Not Verified"
        />
      );
    }
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

  const headlineOrEmail = getHeadlineOrEmail();

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
          {/* User Name with Verification Icon */}
          <div className='flex items-center gap-2'>
            <h3 className='font-semibold text-lg text-[#222]'>
              {getUserName()}
            </h3>
            {/* Verification Icon */}
            {getVerificationIcon()}
          </div>
          
          {/* Headline or Email */}
          {headlineOrEmail && (
            <p className='text-gray-600 text-sm leading-relaxed'>
              {headlineOrEmail}
            </p>
          )}
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