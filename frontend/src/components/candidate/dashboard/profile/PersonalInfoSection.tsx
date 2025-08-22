"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, User, X, Check, Plus } from 'lucide-react';
import { useUpdateBasicInfo } from '@/src/lib/profile.queries';
import { useAuth } from '@/src/context/AuthContext';

const Personal = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  // Extract data from user context
  const firstName = user?.full_name?.split(' ')[0] || '';
  const lastName = user?.full_name?.split(' ').slice(1).join(' ') || '';
  const email = user?.email || '';
  const phone = user?.phone_number || '';
  const location = user?.profile?.location || '';
  const aboutMe = user?.profile?.about_me || '';

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    phone_number: phone,
    location: location,
    about_me: aboutMe,
  });

  const { mutate: updateBasicInfo, isPending } = useUpdateBasicInfo();

  const handleEdit = () => {
    setIsEditing(true);
    setFormData({
      full_name: user?.full_name || '',
      phone_number: phone,
      location: location,
      about_me: aboutMe,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    updateBasicInfo(formData, {
      onSuccess: () => {
        setIsEditing(false);
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const hasAboutContent = aboutMe && aboutMe.trim().length > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
        </div>
        
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {!isEditing ? (
        <div className="space-y-6">
          {/* Personal Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <p className="text-gray-900">{firstName || 'Add'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
              <p className="text-gray-900">{lastName || 'Add'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <p className="text-gray-900">{phone || 'Add'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <p className="text-gray-900">{location || 'Add'}</p>
            </div>
          </div>

          {/* About Me Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">About me</h4>
            </div>
            
            {hasAboutContent ? (
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {aboutMe}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">Add something about yourself</p>
                <button
                  onClick={handleEdit}
                  className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700"
                >
                  About me
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Personal Info Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="Enter your mobile number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="Enter your location"
              />
            </div>
          </div>

          {/* About Me Field */}
          <div className="border-t border-gray-200 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              About me
            </label>
            <textarea
              name="about_me"
              value={formData.about_me}
              onChange={handleInputChange}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
              placeholder="Tell us about yourself, your experience, and what makes you unique..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.about_me.length}/500 characters
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Personal;