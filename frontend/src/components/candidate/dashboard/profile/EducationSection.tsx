"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, GraduationCap, X, Check, Plus, Trash2, Calendar } from 'lucide-react';
import { useUpdateEducation, useAddEducation } from '@/src/lib/profile.queries';
import { EducationData } from '@/src/lib/profile.api';

interface EducationProps {
  data: EducationData[];
}

const EducationSection: React.FC<EducationProps> = ({ data = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [educations, setEducations] = useState<EducationData[]>(data);
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

  const handleEdit = () => {
    setIsEditing(true);
    setEducations([...data]);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEducations([...data]);
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
    updateEducation(educations, {
      onSuccess: () => {
        setIsEditing(false);
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

  const hasContent = data && data.length > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Education</h3>
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
              disabled={isUpdating}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
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
              {data.map((edu, index) => (
                <div key={index} className="border-l-4 border-green-500 pl-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{edu.degree}</h4>
                      <p className="text-green-600 font-medium">{edu.institution}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{edu.year}</span>
                        </div>
                        {edu.currently_studying && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            Currently Studying
                          </span>
                        )}
                      </div>
                      {edu.field && (
                        <p className="text-gray-600 mt-1 text-sm">Field: {edu.field}</p>
                      )}
                      {edu.grade && (
                        <p className="text-gray-600 text-sm">Grade: {edu.grade}</p>
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
              <p className="text-gray-500 text-sm">Add your Education</p>
              <button
                onClick={handleEdit}
                className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700"
              >
                Education
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Existing Education */}
          {educations.map((edu, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-gray-900">Education {index + 1}</h4>
                <button
                  onClick={() => handleRemoveEducation(index)}
                  className="text-red-600 hover:bg-red-50 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Degree Level</label>
                  <select
                    value={edu.degree}
                    onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">University Name</label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. Harvard University"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date of Study</label>
                  <input
                    type="text"
                    value={edu.year}
                    onChange={(e) => handleEducationChange(index, 'year', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. 2020-2024 or 2024"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date of Study</label>
                  <input
                    type="text"
                    value={edu.field}
                    onChange={(e) => handleEducationChange(index, 'field', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. Computer Science"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={edu.currently_studying}
                  onChange={(e) => handleEducationChange(index, 'currently_studying', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm text-gray-700">I am currently studying</label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={edu.grade || ''}
                  onChange={(e) => handleEducationChange(index, 'grade', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Describe your studies, achievements, etc..."
                />
              </div>
            </div>
          ))}

          {/* Add New Education */}
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">Add New Education</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Degree Level</label>
                <select
                  value={newEducation.degree}
                  onChange={(e) => setNewEducation({...newEducation, degree: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">University Name</label>
                <input
                  type="text"
                  value={newEducation.institution}
                  onChange={(e) => setNewEducation({...newEducation, institution: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. MIT"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date of Study</label>
                <input
                  type="text"
                  value={newEducation.year}
                  onChange={(e) => setNewEducation({...newEducation, year: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. 2022-2026"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date of Study</label>
                <input
                  type="text"
                  value={newEducation.field}
                  onChange={(e) => setNewEducation({...newEducation, field: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. Data Science"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newEducation.currently_studying}
                onChange={(e) => setNewEducation({...newEducation, currently_studying: e.target.checked})}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm text-gray-700">I am currently studying</label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newEducation.grade || ''}
                onChange={(e) => setNewEducation({...newEducation, grade: e.target.value})}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="Describe your studies, achievements, etc..."
              />
            </div>
            
            <button
              onClick={handleAddEducation}
              disabled={!newEducation.degree.trim() || !newEducation.institution.trim()}
              className="w-full px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-200"
            >
              <Plus className="w-4 h-4" />
              Add Education
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default EducationSection;