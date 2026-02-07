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

  // Calculate duration between dates
  const calculateDuration = (startDate: string, endDate: string, isCurrentlyWorking: boolean) => {
    try {
      if (!startDate) return null;
      
      const start = new Date(startDate);
      const end = isCurrentlyWorking ? new Date() : (endDate ? new Date(endDate) : new Date());
      
      const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                     (end.getMonth() - start.getMonth());
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      
      if (years === 0) {
        return `${remainingMonths} ${remainingMonths === 1 ? 'mo' : 'mos'}`;
      } else if (remainingMonths === 0) {
        return `${years} ${years === 1 ? 'yr' : 'yrs'}`;
      } else {
        return `${years} ${years === 1 ? 'yr' : 'yrs'} ${remainingMonths} ${remainingMonths === 1 ? 'mo' : 'mos'}`;
      }
    } catch (error) {
      return null;
    }
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
      className="bg-white rounded-sm border border-gray-200 p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-semibold text-gray-900">Work Experience</h3>
            {hasContent && <p className="text-xs text-gray-500">{getExperienceData().length} position{getExperienceData().length > 1 ? 's' : ''}</p>}
          </div>
        </div>
        
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-sm transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-sm transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {!isEditing ? (
        <div>
          {hasContent ? (
            <div className="max-h-[450px] overflow-y-auto pr-2 experience-scrollbar">
              <div className="space-y-4">
                {getExperienceData().map((exp: any, index: number) => {
                  // Calculate duration from dates
                  const calculatedDuration = calculateDuration(
                    exp.start_date, 
                    exp.end_date, 
                    exp.currently_working
                  );
                  
                  return (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative pl-5 pb-4 border-l-2 border-blue-200 last:pb-0"
                    >
                      {/* Timeline dot - fully visible */}
                      <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white shadow-sm" />
                      
                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-xs lg:text-sm truncate">{exp.job_title}</h4>
                            <p className="text-blue-600 font-medium text-[11px] lg:text-xs truncate">{exp.company}</p>
                          </div>
                          {exp.currently_working && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[9px] font-semibold border border-green-200 flex-shrink-0">
                              <div className="w-1 h-1 bg-green-600 rounded-full animate-pulse" />
                              Current
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-[10px] lg:text-xs text-gray-600 mb-2">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span className="font-medium">{exp.duration}</span>
                          {calculatedDuration && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span>{calculatedDuration}</span>
                            </>
                          )}
                        </div>
                        
                        {exp.description && (
                          <p className="text-gray-700 text-[11px] lg:text-xs leading-relaxed whitespace-pre-line">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">No work experience added yet</h4>
              <p className="text-xs text-gray-500 mb-3">Showcase your professional journey</p>
              <button
                onClick={handleEdit}
                className="text-xs lg:text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Add Work Experience
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="max-h-[600px] overflow-y-auto pr-2 experience-scrollbar space-y-4">
          {/* Existing Experiences */}
          {experiences.map((exp, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  Position {index + 1}
                </h4>
                <button
                  onClick={() => handleRemoveExperience(index)}
                  className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Job Title *</label>
                  <input
                    type="text"
                    value={exp.job_title}
                    onChange={(e) => handleExperienceChange(index, 'job_title', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g. Senior Developer"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Company *</label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g. Microsoft"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Duration</label>
                  <input
                    type="text"
                    value={exp.duration}
                    onChange={(e) => handleExperienceChange(index, 'duration', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g. Jan 2023 - Present"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={exp.start_date || ''}
                    onChange={(e) => handleExperienceChange(index, 'start_date', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={exp.end_date || ''}
                    onChange={(e) => handleExperienceChange(index, 'end_date', e.target.value)}
                    disabled={exp.currently_working}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-3 px-1">
                <input
                  type="checkbox"
                  checked={exp.currently_working || false}
                  onChange={(e) => handleExperienceChange(index, 'currently_working', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label className="text-sm text-gray-700">I currently work here</label>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={exp.description}
                  onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="Describe your responsibilities and achievements..."
                />
              </div>
            </div>
          ))}

          {/* Add New Experience */}
          <div className="p-4 border-2 border-dashed border-blue-300 bg-blue-50/30 rounded-lg">
            <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Add New Position
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Job Title *</label>
                <input
                  type="text"
                  value={newExperience.job_title}
                  onChange={(e) => setNewExperience({...newExperience, job_title: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. Product Manager"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Company *</label>
                <input
                  type="text"
                  value={newExperience.company}
                  onChange={(e) => setNewExperience({...newExperience, company: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. Google"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Duration</label>
                <input
                  type="text"
                  value={newExperience.duration}
                  onChange={(e) => setNewExperience({...newExperience, duration: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. 2023-Present"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={newExperience.start_date || ''}
                  onChange={(e) => setNewExperience({...newExperience, start_date: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={newExperience.end_date || ''}
                  onChange={(e) => setNewExperience({...newExperience, end_date: e.target.value})}
                  disabled={newExperience.currently_working}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-3 px-1">
              <input
                type="checkbox"
                checked={newExperience.currently_working || false}
                onChange={(e) => setNewExperience({...newExperience, currently_working: e.target.checked})}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label className="text-sm text-gray-700">I currently work here</label>
            </div>
            
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea
                value={newExperience.description}
                onChange={(e) => setNewExperience({...newExperience, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                placeholder="Describe your responsibilities and achievements..."
              />
            </div>
            
            <button
              onClick={handleAddExperience}
              disabled={!newExperience.job_title.trim() || !newExperience.company.trim()}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Experience
            </button>
          </div>
        </div>
      )}

      {/* Custom Scrollbar */}
      <style jsx>{`
        .experience-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .experience-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        
        .experience-scrollbar::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 3px;
        }
        
        .experience-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </motion.div>
  );
};

export default ExperienceSection;