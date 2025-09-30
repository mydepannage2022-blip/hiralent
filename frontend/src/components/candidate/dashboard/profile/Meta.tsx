"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Camera, Check, X } from 'lucide-react';
import { HiCheckBadge, HiExclamationTriangle } from 'react-icons/hi2';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from '@/src/context/ProfileContext'; //Added profile context
import { useUploadProfilePicture } from '@/src/lib/profile/profile.queries';
import Button from '@/src/components/layout/Button';

const MetaSection: React.FC = () => {
  const { user } = useAuth(); //Only for user info (name, email verification)
  const { profileData } = useProfile(); //For profile data (picture, headline, resume_application_url)
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { mutate: uploadProfilePicture, isPending } = useUploadProfilePicture();

  // Get profile picture with fallback
  const getProfileImage = () => {
    if (previewUrl) return previewUrl;
    if (profileData?.profile_picture_url) { //From profile context
      return profileData.profile_picture_url;
    }
    return "/images/candidate.jpg";
  };

  // Get user name (from auth context)
  const getUserName = () => {
    return user?.full_name || "Unknown User";
  };

  // Get headline with email fallback
  const getHeadlineOrEmail = () => {
    if (profileData?.headline) { //From profile context
      return profileData.headline;
    }
    if (user?.email) { //Fallback to auth context email
      return user.email;
    }
    return null;
  };

  // Check if user is verified (from auth context)
  const isEmailVerified = () => {
    return user?.is_email_verified || false;
  };

  // Get verification icon
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

  // Handle file selection
  const handleFileSelect = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPG, JPEG, or PNG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleSaveImage = () => {
    if (selectedFile) {
      uploadProfilePicture(selectedFile, {
        onSuccess: () => {
          setIsEditing(false);
          setSelectedFile(null);
          setPreviewUrl(null);
          // Profile data will be updated automatically via context refresh
        }
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  //Updated resume handler - uses profileData.resume_application_url
  const handleViewResume = () => {
    if (profileData?.resume_application_url) {
      window.open(profileData.resume_application_url, '_blank');
    } else {
      console.log('No resume URL found in profile data');
      alert('Resume not available. Please upload your resume first.');
    }
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const headlineOrEmail = getHeadlineOrEmail();
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full flex justify-start items-center gap-4 p-none lg:p-3 ring ring-[#EDEDED] rounded-xl mb-6"
    >
      {/* Profile Picture Section */}
      <div className="relative">
        {!isEditing ? (
          <div className="relative group">
            <img 
              src={getProfileImage()} 
              alt="User Profile" 
              className="w-32 h-32 rounded-xl object-cover hidden lg:block"
            />
            <div 
              onClick={handleStartEdit}
              className="absolute inset-0 bg-black bg-opacity-50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
        ) : (
          <div className="w-32 h-32 relative">
            {/* File Upload Area */}
            <motion.div
              className={`w-full h-full border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-300 ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-500'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleFileInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Upload Photo</p>
                </div>
              )}
            </motion.div>
            
            {/* Edit Controls */}
            <div className="absolute -bottom-2 -right-2 flex gap-1">
              <button
                onClick={handleCancelEdit}
                disabled={isPending}
                className="w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center hover:bg-gray-700 disabled:opacity-50"
              >
                <X className="w-3 h-3" />
              </button>
              {selectedFile && (
                <button
                  onClick={handleSaveImage}
                  disabled={isPending}
                  className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Info Section */}
      <div className="flex flex-col justify-center items-start gap-2">
        <div>
          {/* User Name with Verification Icon */}
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm lg:text-lg text-[#222]">
              {getUserName()}
            </h3>
            {getVerificationIcon()}
          </div>
          
          {/* Headline or Email */}
          {headlineOrEmail && (
            <p className="text-gray-600 text-[10px] lg:text-sm leading-relaxed">
              {headlineOrEmail}
            </p>
          )}
        </div>
      
        {/* Single Resume Button */}
        <div className="flex justify-start mt-2">
          <Button 
            text="View Resume" 
            variant="dark" 
            animation={false}
            onClick={handleViewResume}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default MetaSection;