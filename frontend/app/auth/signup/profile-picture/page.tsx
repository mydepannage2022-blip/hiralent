"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useUploadProfilePicture } from "../../../src/lib/auth.queries";
import { Upload, User, Check } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Sarah",
    role: "Marketing Manager",
    text: "This platform has completely transformed how we manage our projects. Simple, elegant, and exactly what we needed.",
    image: "https://i1.rgstatic.net/ii/profile.image/277785684791316-1443240676661_Q512/Sara-Johnson-18.jpg",
  },
  {
    id: 2,
    name: "Ahmed Ali",
    role: "Software Developer",
    text: "Clean interface, powerful features. The user experience is outstanding and support team is incredibly responsive.",
    image: "https://img.a.transfermarkt.technology/portrait/big/995642-1712863495.jpg?lm=1",
  },
  {
    id: 3,
    name: "Emma Wilson",
    role: "Business Owner",
    text: "Six months in and still impressed. Great value, reliable service, and intuitive design that just works.",
    image:
      "https://resize-elle.ladmedia.fr/r/400,279,ffffff,forcex,center-middle/img/var/plain_site/storage/images/people/la-vie-des-people/news/emma-watson-son-amusante-reaction-apres-avoir-ete-confondue-avec-emma-roberts-3979994/95896063-1-fre-FR/Emma-Watson-son-amusante-reaction-apres-avoir-ete-confondue-avec-Emma-Roberts.jpg",
  },
];

const TestimonialSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute bottom-6 lg:left-6 lg:right-6 xl:left-24 xl:right-24 bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-white/20">
      <div className="overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="w-full flex-shrink-0"
          >
            <div className="mb-4">
              <p className="text-gray-700 text-sm leading-relaxed font-medium">
                "{testimonials[currentSlide].text}"
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 rounded-full overflow-hidden"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <img
                    src={testimonials[currentSlide].image}
                    alt={testimonials[currentSlide].name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {testimonials[currentSlide].name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {testimonials[currentSlide].role}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {testimonials.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      index === currentSlide ? "bg-[#063B82]" : "bg-gray-300"
                    }`}
                    whileHover={{ scale: 1.3 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const ProfilePicturePage = () => {
  const { mutate, isPending } = useUploadProfilePicture();
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
    <div className="w-full flex justify-center h-screen items-center bg-[#FFFFFF]">
      <div className="w-full flex flex-col lg:flex-row justify-between items-start lg:gap-0 xl:gap-16">
        <motion.div
          className="w-full lg:w-1/2 flex flex-col justify-start items-center lg:items-center lg:gap-5 p-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Progress Steps */}
          <motion.div
            className="flex justify-center items-center gap-3 p-8 lg:p-4 xl:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link
                href="/auth/signup"
                className="py-0 px-6 md:px-10 lg:px-12 bg-[#063B82] rounded-lg"
              ></Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link
                href="/auth/signup/location"
                className="py-0 px-6 md:px-10 lg:px-12 bg-[#063B82] rounded-lg"
              ></Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link
                href="/auth/signup/salary"
                className="py-0 px-6 md:px-10 lg:px-12 bg-[#063B82] rounded-lg"
              ></Link>
            </motion.div>
             <motion.div className="p-none" whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link href="/auth/signup/profile-picture" className="py-[-10px] px-6 md:px-10 lg:px-12 bg-[#063B82] rounded-lg">
                {/* Placeholder */}
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link
                href="/auth/signup/uploadresume"
                className="py-0 px-6 md:px-10 lg:px-12 bg-[#CFE3FF] rounded-lg"
              ></Link>
            </motion.div>
          </motion.div>


          {/* Logo */}
          <motion.div
            className="flex justify-center items-center gap-3 p-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <img src="/images/logo.jpg" alt="logo" className="w-[200px]" />
          </motion.div>

          {/* Header */}
          <motion.div
            className="flex flex-col justify-center items-center gap-3 text-[#222]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <h2 className="text-2xl lg:text-3xl font-bold">Add your profile picture</h2>
            <p className="text-center text-xs lg:text-sm w-full lg:w-2/3">
              Upload a professional photo to make your profile more personalized and trustworthy.
            </p>
          </motion.div>

          {/* Form */}
          <form className="w-full max-w-md space-y-4" onSubmit={handleSubmit}>
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
                  // name="profilePicture"
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
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 text-sm ${
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
            <Link href="/candidate/dashboard">
              <motion.div
                className="text-center text-gray-500 text-sm cursor-pointer hover:text-gray-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                Skip for now
              </motion.div>
            </Link>
          </form>
        </motion.div>

        {/* Right Side - Same Testimonial Slider */}
        <motion.div
          className="hidden lg:block w-full lg:w-1/2 relative h-[95vh] mr-4 rounded-lg overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.img
            src="/images/signup.jpg"
            alt=""
            className="absolute top-0 left-0 w-full h-full object-cover z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />
          <TestimonialSlider />
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePicturePage;