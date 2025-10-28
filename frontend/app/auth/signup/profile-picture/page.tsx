// pages/auth/signup/profile-picture.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUploadProfilePicture } from "../../../../src/lib/auth/auth.queries";
import { Upload } from "lucide-react";
import { getAuthPageConfig } from "../../../../config/authPagesConfig";
import AuthLayout from "@/src/components/layout/AuthLayout";
import SmartLink from "@/src/components/layout/SmartLink";

const ProfilePicturePage = () => {
  const { mutate, isPending } = useUploadProfilePicture();
  const pageConfig = getAuthPageConfig('profilePicture');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPG, JPEG, or PNG)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert("Please select a profile picture.");
      return;
    }
    
    console.log("📤 Uploading Profile Picture:", selectedFile.name);
    mutate(selectedFile);
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <AuthLayout
      backgroundImage={pageConfig.backgroundImage}
      testimonials={pageConfig.testimonials}
      title={pageConfig.title}
      subtitle={pageConfig.subtitle}
      currentStep={4}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <label className="block text-[#222] font-medium text-xs lg:text-sm mb-2">
            Profile Picture<span className="text-red-500">*</span>
          </label>
          
          {/* File Upload Area */}
          <motion.div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-300 ${
              isDragOver 
                ? 'border-[#063B82] bg-[#EFF5FF]' 
                : 'border-gray-300 hover:border-[#063B82]'
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
              required
            />
            
            {previewUrl ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#063B82]">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#063B82]">
                    {selectedFile?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Click or drag to change
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-12 h-12 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    JPG, JPEG or PNG (max 5MB)
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isPending || !selectedFile}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 mt-4 text-sm ${
            isPending || !selectedFile
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-[#1B73E8] hover:bg-[#1557B0] text-white'
          }`}
          whileHover={!isPending && selectedFile ? { scale: 1.05 } : {}}
          whileTap={!isPending && selectedFile ? { scale: 0.95 } : {}}
          transition={{ duration: 0.3 }}
        >
          {isPending ? 'Uploading...' : 'Upload Profile Picture'}
        </motion.button>

        {/* Skip Option */}
        <SmartLink href="/auth/signup/uploadresume">
          <motion.div
            className="text-center text-gray-500 text-sm cursor-pointer hover:text-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            Skip for now
          </motion.div>
        </SmartLink>
      </form>
    </AuthLayout>
  );
};

export default ProfilePicturePage;