"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit2, GraduationCap, X, Check, Plus, Trash2, Calendar, BookOpen } from 'lucide-react';
import { useUpdateEducation, useAddEducation } from '@/src/lib/profile/profile.queries';
import { EducationData } from '@/src/lib/profile/profile.api';
import { useProfile } from '@/src/context/ProfileContext';

const EducationSection: React.FC = () => {
  const { profileData, setProfileData } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [educations, setEducations] = useState<EducationData[]>([]);
  const [newEducation, setNewEducation] = useState<EducationData>({
    degree: '',
    institution: '',
    year: '',
    field: '',
    grade: '',
    currently_studying: false
  });

  const { mutate: updateEducation, isPending: isUpdating } = useUpdateEducation();
  const { mutate: addEducation, isPending: isAdding } = useAddEducation();

  // Parse education data from profile context
  const getEducationData = (): EducationData[] => {
    if (!profileData?.education) return [];
    
    try {
      let educationArray = [];
      
      if (typeof profileData.education === 'string') {
        educationArray = JSON.parse(profileData.education);
      } else if (Array.isArray(profileData.education)) {
        educationArray = profileData.education;
      }
      
      // Ensure proper data types
      return educationArray.map((edu: any) => ({
        ...edu,
        currently_studying: Boolean(edu.currently_studying)
      }));
    } catch (error) {
      console.error('Error parsing education data:', error);
    }
    return [];
  };

  useEffect(() => {
    const educationData = getEducationData();
    setEducations(educationData);
  }, [profileData]);

  const handleEdit = () => {
    setIsEditing(true);
    const educationData = getEducationData();
    setEducations([...educationData]);
  };

  const handleCancel = () => {
    setIsEditing(false);
    const educationData = getEducationData();
    setEducations([...educationData]);
    setNewEducation({
      degree: '',
      institution: '',
      year: '',
      field: '',
      grade: '',
      currently_studying: false
    });
  };

  const handleSave = () => {
    // Ensure data types are correct before sending
    const sanitizedEducations = educations.map((edu) => ({
      ...edu,
      grade: (edu.grade || '').substring(0, 20), // Truncate to 20 chars
      currently_studying: Boolean(edu.currently_studying)
    }));
    
    updateEducation(sanitizedEducations, {
      onSuccess: () => {
        setIsEditing(false);
        setProfileData({
          ...profileData,
          education: [...sanitizedEducations],
        });
      },
      onError: (error) => {
        console.error("API Error:", error);
      }
    });
  };

  const handleAddEducation = () => {
    if (newEducation.degree.trim() && newEducation.institution.trim()) {
      setEducations([...educations, { ...newEducation }]);
      setNewEducation({
        degree: '',
        institution: '',
        year: '',
        field: '',
        grade: '',
        currently_studying: false
      });
    }
  };

  const handleRemoveEducation = (index: number) => {
    setEducations(educations.filter((_, i) => i !== index));
  };

  const handleEducationChange = (index: number, field: keyof EducationData, value: string | boolean) => {
    const updatedEducations = [...educations];
    updatedEducations[index] = { ...updatedEducations[index], [field]: value };
    setEducations(updatedEducations);
  };

  const hasContent = getEducationData().length > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-sm border border-gray-200 p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-sm flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-semibold text-gray-900">Education</h3>
            {hasContent && <p className="text-xs text-gray-500">{getEducationData().length} qualification{getEducationData().length > 1 ? 's' : ''}</p>}
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
            <div className="max-h-[450px] overflow-y-auto pr-2 education-scrollbar">
              <div className="space-y-4">
                {getEducationData().map((edu: any, index: number) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative pl-5 pb-4 border-l-2 border-green-200 last:pb-0"
                  >
                    {/* Timeline dot - fully visible */}
                    <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 bg-green-600 rounded-full border-2 border-white shadow-sm" />
                    
                    <div className="bg-gray-50 rounded-md p-3 border border-gray-200 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-xs lg:text-sm truncate">{edu.degree}</h4>
                          <p className="text-green-600 font-medium text-[11px] lg:text-xs truncate">{edu.institution}</p>
                        </div>
                        {edu.currently_studying && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[9px] font-semibold border border-blue-200 flex-shrink-0">
                            <BookOpen className="w-2.5 h-2.5" />
                            Studying
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px] lg:text-xs text-gray-600 mb-2">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span className="font-medium">{edu.year}</span>
                      </div>
                      
                      {edu.field && (
                        <div className="flex items-start gap-2 text-[10px] lg:text-xs text-gray-700 mb-1">
                          <span className="font-semibold text-gray-600 flex-shrink-0">Field:</span>
                          <span className="truncate">{edu.field}</span>
                        </div>
                      )}
                      
                      {edu.grade && (
                        <div className="flex items-start gap-2 text-[10px] lg:text-xs text-gray-700">
                          <span className="font-semibold text-gray-600 flex-shrink-0">Grade:</span>
                          <span className="font-medium text-green-600">{edu.grade}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-3">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">No education added yet</h4>
              <p className="text-xs text-gray-500 mb-3">Share your academic background</p>
              <button
                onClick={handleEdit}
                className="text-xs lg:text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Add Education
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="max-h-[600px] overflow-y-auto pr-2 education-scrollbar space-y-4">
          {/* Existing Education */}
          {educations.map((edu, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-green-600" />
                  Education {index + 1}
                </h4>
                <button
                  onClick={() => handleRemoveEducation(index)}
                  className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Degree *</label>
                  <select
                    value={edu.degree}
                    onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Select degree</option>
                    <option value="Bachelor's">Bachelor's</option>
                    <option value="Master's">Master's</option>
                    <option value="PhD">PhD</option>
                    <option value="Associate">Associate</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Diploma">Diploma</option>
                    <option value="High School">High School</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Institution *</label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g. Harvard University"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Year/Period</label>
                  <input
                    type="text"
                    value={edu.year}
                    onChange={(e) => handleEducationChange(index, 'year', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g. 2020-2024"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Field of Study</label>
                  <input
                    type="text"
                    value={edu.field}
                    onChange={(e) => handleEducationChange(index, 'field', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g. Computer Science"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Grade/GPA (Optional)</label>
                  <input
                    type="text"
                    value={edu.grade || ''}
                    onChange={(e) => {
                      if (e.target.value.length <= 20) {
                        handleEducationChange(index, 'grade', e.target.value);
                      }
                    }}
                    maxLength={20}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g. 3.8 GPA"
                  />
                  <span className="text-xs text-gray-400 mt-1">{(edu.grade || '').length}/20</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  checked={edu.currently_studying || false}
                  onChange={(e) => handleEducationChange(index, 'currently_studying', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label className="text-sm text-gray-700">Currently studying here</label>
              </div>
            </div>
          ))}

          {/* Add New Education */}
          <div className="p-4 border-2 border-dashed border-green-300 bg-green-50/30 rounded-lg">
            <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-600" />
              Add New Education
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Degree *</label>
                <select
                  value={newEducation.degree}
                  onChange={(e) => setNewEducation({...newEducation, degree: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Select degree</option>
                  <option value="Bachelor's">Bachelor's</option>
                  <option value="Master's">Master's</option>
                  <option value="PhD">PhD</option>
                  <option value="Associate">Associate</option>
                  <option value="Certificate">Certificate</option>
                  <option value="Diploma">Diploma</option>
                  <option value="High School">High School</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Institution *</label>
                <input
                  type="text"
                  value={newEducation.institution}
                  onChange={(e) => setNewEducation({...newEducation, institution: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. MIT"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Year/Period</label>
                <input
                  type="text"
                  value={newEducation.year}
                  onChange={(e) => setNewEducation({...newEducation, year: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. 2022-2026"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Field of Study</label>
                <input
                  type="text"
                  value={newEducation.field}
                  onChange={(e) => setNewEducation({...newEducation, field: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. Data Science"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Grade/GPA (Optional)</label>
                <input
                  type="text"
                  value={newEducation.grade || ''}
                  onChange={(e) => {
                    if (e.target.value.length <= 20) {
                      setNewEducation({...newEducation, grade: e.target.value});
                    }
                  }}
                  maxLength={20}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. 3.8 GPA"
                />
                <span className="text-xs text-gray-400 mt-1">{(newEducation.grade || '').length}/20</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-3 px-1">
              <input
                type="checkbox"
                checked={newEducation.currently_studying || false}
                onChange={(e) => setNewEducation({...newEducation, currently_studying: e.target.checked})}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label className="text-sm text-gray-700">Currently studying here</label>
            </div>
            
            <button
              onClick={handleAddEducation}
              disabled={!newEducation.degree.trim() || !newEducation.institution.trim()}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Education
            </button>
          </div>
        </div>
      )}

      {/* Custom Scrollbar */}
      <style jsx>{`
        .education-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .education-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        
        .education-scrollbar::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 3px;
        }
        
        .education-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </motion.div>
  );
};

export default EducationSection;