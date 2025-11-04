"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUploadResume } from '../../../../src/lib/auth/auth.queries';
import { useRouter } from 'next/navigation';
import { getAuthPageConfig } from "../../../../config/authPagesConfig";
import AuthLayout from "@/src/components/layout/AuthLayout";
import SmartLink from "@/src/components/layout/SmartLink";

const UploadResumePage = () => {
  const { mutate: uploadResumeMutation, isPending } = useUploadResume();
  const pageConfig = getAuthPageConfig('uploadresume');
  const [resume, setResume] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [forceProcessing, setForceProcessing] = useState(false);
  const router = useRouter();

useEffect(() => {
  if (forceProcessing) {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadStatus('completed');
          // Auto redirect after 1 minute + 2 seconds delay
          setTimeout(() => {
            router.push('/auth/logout');
          }, 2000);
          return 100;
        }
        return prev + 1.67; // 60 seconds = 60 * 1.67 = ~100%
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }
}, [forceProcessing, router]);

  const handleFileChange = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension)) {
      setResume(file);
    } else {
      alert("Please upload a valid CV (PDF or Word format)");
      setResume(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (resume) {
    setUploadStatus('uploading');
    
    uploadResumeMutation(resume, {
      onSuccess: () => {
        console.log('✅ Upload successful - but continuing timer');
      },
      onError: () => {
        console.log('❌ Upload failed - but continuing timer');
      }
    });
    
    setTimeout(() => {
      setUploadStatus('processing');
      setProgress(0);
      setForceProcessing(true); 
    }, 2000); 
    
  } else {
    alert("Please select a valid resume");
  }
};

  return (
    <>
      <AnimatePresence>
        {uploadStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div 
              className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center">
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[#063B82] border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                
                <h3 className="text-xl font-bold text-[#222] mb-2">
                  {uploadStatus === 'uploading' && "Uploading your resume..."}
                  {uploadStatus === 'processing' && "Processing your resume..."}
                  {uploadStatus === 'completed' && "Resume processed successfully!"}
                </h3>
                
                <p className="text-gray-600 text-sm mb-6">
                  {uploadStatus === 'uploading' && "Please wait while we upload your file"}
                  {uploadStatus === 'processing' && "AI is extracting your skills and experience"}
                  {uploadStatus === 'completed' && "Redirecting you to complete setup..."}
                </p>

                {uploadStatus === 'processing' && (
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                    <motion.div 
                      className="bg-[#063B82] h-3 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  {uploadStatus === 'uploading' && "Uploading..."}
                  {uploadStatus === 'processing' && `${Math.round(progress)}% completed`}
                  {uploadStatus === 'completed' && "✅ All done!"}
                </div>

                {uploadStatus === 'completed' && (
                  <motion.button
                    onClick={() => router.push('/auth/logout')}
                    className="mt-4 px-6 py-2 bg-[#063B82] text-white rounded-lg text-sm hover:bg-[#052f6b] transition-colors"
                    whileHover={{ scale: 1.05 }}
                  >
                    Continue →
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthLayout
        backgroundImage={pageConfig.backgroundImage}
        testimonials={pageConfig.testimonials}
        title={pageConfig.title}
        subtitle={pageConfig.subtitle}
        currentStep={5}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <label className="block text-[#222] font-medium text-xs lg:text-sm mb-2">
              CV/Resume<span className="text-red-500">*</span>
            </label>
            <motion.input
              type="file"
              name="resume"
              id="resume"
              accept=".pdf,.doc,.docx"
              className="w-full outline-none px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#063B82] focus:border-transparent text-sm text-[#757575]"
              required
              onChange={handleFileChange}
              disabled={isPending}
              whileFocus={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>

          <motion.button
            type="submit"
            disabled={isPending || !resume}
            className="w-full bg-[#1B73E8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1557B0] transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            whileHover={{ scale: isPending ? 1 : 1.05 }}
            whileTap={{ scale: isPending ? 1 : 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {isPending ? "Uploading..." : "Finish Up"}
          </motion.button>

          {/* Only show skip if not loading */}
          {!isPending && (
            <SmartLink href={"/auth/logout"}>
              <motion.div
                className="text-center text-gray-500 text-sm cursor-pointer hover:text-gray-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                Skip
              </motion.div>
            </SmartLink>
          )}
        </form>
      </AuthLayout>
    </>
  );
};

export default UploadResumePage;