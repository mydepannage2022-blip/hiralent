"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Briefcase, X, Check, Plus, Trash2, Calendar } from 'lucide-react';
import { useUpdateExperience, useAddExperience } from '@/src/lib/profile/profile.queries';
import { ExperienceData } from '@/src/lib/profile/profile.api';
import { useProfile } from '@/src/context/ProfileContext';

const ExperienceSection: React.FC = () => {
  const { profileData, setProfileData } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [experiences, setExperiences] = useState<ExperienceData[]>([]);
  const [newExperience, setNewExperience] = useState<ExperienceData>({
    job_title: '',
    company: '',
    duration: '',
    years: 1,
    description: '',
    currently_working: false,
    start_date: '',
    end_date: ''
  });

  const { mutate: updateExperience, isPending: isUpdating } = useUpdateExperience();
  const { mutate: addExperience, isPending: isAdding } = useAddExperience();

  // Parse experience data from profile context
  const getExperienceData = (): ExperienceData[] => {
    if (!profileData?.experience) return [];
    
    try {
      let experienceArray = [];
      
      if (typeof profileData.experience === 'string') {
        experienceArray = JSON.parse(profileData.experience);
      } else if (Array.isArray(profileData.experience)) {
        experienceArray = profileData.experience;
      }
      
      // Ensure proper data types
      return experienceArray.map((exp: any) => ({
        ...exp,
        years: exp.years ? Number(exp.years) : 1,
        currently_working: Boolean(exp.currently_working)
      }));
    } catch (error) {
      console.error('Error parsing experience data:', error);
    }
    return [];
  };

  useEffect(() => {
    const experienceData = getExperienceData();
    setExperiences(experienceData);
  }, [profileData]);

  const handleEdit = () => {
    setIsEditing(true);
    const experienceData = getExperienceData();
    setExperiences([...experienceData]);
  };

  const handleCancel = () => {
    setIsEditing(false);
    const experienceData = getExperienceData();
    setExperiences([...experienceData]);
    setNewExperience({
      job_title: '',
      company: '',
      duration: '',
      years: 1,
      description: '',
      currently_working: false,
      start_date: '',
      end_date: ''
    });
  };

  const handleSave = () => {
    // Ensure data types are correct before sending
    const sanitizedExperiences = experiences.map((exp) => ({
      ...exp,
      years: Number(exp.years) || 1,
      currently_working: Boolean(exp.currently_working)
    }));
    
    updateExperience(sanitizedExperiences, {
      onSuccess: () => {
        setIsEditing(false);
        setProfileData({
          ...profileData,
          experience: [...sanitizedExperiences],
        });
      },
      onError: (error) => {
        console.error("API Error:", error);
      }
    });
  };

  const handleAddExperience = () => {
    if (newExperience.job_title.trim() && newExperience.company.trim()) {
      setExperiences([...experiences, { ...newExperience }]);
      setNewExperience({
        job_title: '',
        company: '',
        duration: '',
        years: 1,
        description: '',
        currently_working: false,
        start_date: '',
        end_date: ''
      });
    }
  };

  const handleRemoveExperience = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  const handleExperienceChange = (index: number, field: keyof ExperienceData, value: string | number | boolean) => {
    const updatedExperiences = [...experiences];
    updatedExperiences[index] = { ...updatedExperiences[index], [field]: value };
    setExperiences(updatedExperiences);
  };

  const hasContent = getExperienceData().length > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <Briefcase className="w-2 h-2 lg:w-4 lg:h-4 text-orange-600" />
          </div>
          <h3 className="text-xs lg:text-lg font-semibold text-gray-900">Work Experience</h3>
        </div>
        
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-2 h-2 lg:w-4 lg:h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-2 h-2 lg:w-4 lg:h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-2 h-2 lg:w-4 lg:h-4" />
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {!isEditing ? (
        <div>
          {hasContent ? (
            <div className="space-y-4">
              {getExperienceData().map((exp: any, index: number) => (
                <div key={index} className="border-blue-500 pl-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-xs lg:text-sm">{exp.job_title}</h4>
                      <p className="font-light text-xs lg:text-sm">{exp.company}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <Calendar className="w-3 h-3 lg:w-4 lg:h-4" />
                        <span>{exp.duration}</span>
                        {exp.currently_working && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-[9px] lg:text-xs">
                            Current
                          </span>
                        )}
                      </div>
                      {exp.description && (
                        <p className="text-gray-700 mt-2 text-xs lg:text-sm leading-relaxed">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-xs lg:text-sm">Add something about yourself</p>
              <button
                onClick={handleEdit}
                className="mt-3 text-blue-600 text-xs lg:text-sm font-medium hover:text-blue-700"
              >
                Work Experience
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Existing Experiences */}
          {experiences.map((exp, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-gray-900 text-xs lg:text-sm">Experience {index + 1}</h4>
                <button
                  onClick={() => handleRemoveExperience(index)}
                  className="text-red-600 hover:bg-red-50 p-1 rounded"
                >
                  <Trash2 className="w-3 h-3 lg:w-4 lg:h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={exp.job_title}
                    onChange={(e) => handleExperienceChange(index, 'job_title', e.target.value)}
                    className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. Senior Developer"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                    className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. Microsoft"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={exp.duration}
                    onChange={(e) => handleExperienceChange(index, 'duration', e.target.value)}
                    className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. 2023-2024"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Years</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={exp.years || 1}
                    onChange={(e) => handleExperienceChange(index, 'years', Number(e.target.value) || 1)}
                    className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={exp.start_date || ''}
                    onChange={(e) => handleExperienceChange(index, 'start_date', e.target.value)}
                    className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={exp.end_date || ''}
                    onChange={(e) => handleExperienceChange(index, 'end_date', e.target.value)}
                    disabled={exp.currently_working}
                    className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exp.currently_working || false}
                  onChange={(e) => handleExperienceChange(index, 'currently_working', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-xs lg:text-sm text-gray-700">I currently work here</label>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={exp.description}
                  onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                  rows={3}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Describe your role, responsibilities, and achievements..."
                />
              </div>
            </div>
          ))}

          {/* Add New Experience */}
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900 text-xs lg:text-sm">Add New Experience</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={newExperience.job_title}
                  onChange={(e) => setNewExperience({...newExperience, job_title: e.target.value})}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. Product Manager"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={newExperience.company}
                  onChange={(e) => setNewExperience({...newExperience, company: e.target.value})}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. Google"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Duration</label>
                <input
                  type="text"
                  value={newExperience.duration}
                  onChange={(e) => setNewExperience({...newExperience, duration: e.target.value})}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. 2023-Present"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Years</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={newExperience.years || 1}
                  onChange={(e) => setNewExperience({...newExperience, years: Number(e.target.value) || 1})}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={newExperience.start_date || ''}
                  onChange={(e) => setNewExperience({...newExperience, start_date: e.target.value})}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={newExperience.end_date || ''}
                  onChange={(e) => setNewExperience({...newExperience, end_date: e.target.value})}
                  disabled={newExperience.currently_working}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newExperience.currently_working || false}
                onChange={(e) => setNewExperience({...newExperience, currently_working: e.target.checked})}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-xs lg:text-sm text-gray-700">I currently work here</label>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newExperience.description}
                onChange={(e) => setNewExperience({...newExperience, description: e.target.value})}
                rows={3}
                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="Describe your role, responsibilities, and achievements..."
              />
            </div>
            
            <button
              onClick={handleAddExperience}
              disabled={!newExperience.job_title.trim() || !newExperience.company.trim()}
              className="w-full px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-200 text-xs lg:text-sm"
            >
              <Plus className="w-3 h-3 lg:w-4 lg:h-4" />
              Add Experience
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ExperienceSection;