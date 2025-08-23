"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Briefcase, X, Check, Plus, Trash2 } from 'lucide-react';
import { useUpdateSkills, useAddSkill, useDeleteSkill } from '@/src/lib/profile.queries';
import { SkillData } from '@/src/lib/profile.api';

interface SkillsProps {
  data: SkillData[];
}

const SkillsSection: React.FC<SkillsProps> = ({ data = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [skills, setSkills] = useState<SkillData[]>(data);
  const [newSkill, setNewSkill] = useState<SkillData>({
    skill_name: '',
    skill_category: 'technical',
    proficiency: 'beginner',
    years_experience: 1
  });

  const { mutate: updateSkills, isPending: isUpdating } = useUpdateSkills();
  const { mutate: addSkill, isPending: isAdding } = useAddSkill();
  const { mutate: deleteSkill, isPending: isDeleting } = useDeleteSkill();

  const handleEdit = () => {
    setIsEditing(true);
    setSkills([...data]);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSkills([...data]);
    setNewSkill({
      skill_name: '',
      skill_category: 'technical',
      proficiency: 'beginner',
      years_experience: 1
    });
  };

const handleSave = () => {
  // Debugging before sending
  console.log("🔍 Saving skills...");
  console.log("🔍 Current skills state:", skills);

  updateSkills(skills, {
    onSuccess: (response) => {
      console.log("✅ API Success:", response);
      setIsEditing(false);
    },
    onError: (error) => {
      console.error("❌ API Error:", error);
      console.error("❌ Error response:", error?.response?.data);
      console.error("❌ Error status:", error?.response?.status);
    }
  });
};


const handleAddSkill = () => {
  if (newSkill.skill_name.trim()) {
    console.log("➕ Adding new skill:", newSkill);
    setSkills([...skills, { ...newSkill }]);
    setNewSkill({
      skill_name: '',
      skill_category: 'technical',
      proficiency: 'beginner',
      years_experience: 1
    });
  } else {
    console.warn("⚠️ Tried to add empty skill");
  }
};


  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleSkillChange = (index: number, field: keyof SkillData, value: string | number) => {
    const updatedSkills = [...skills];
    updatedSkills[index] = { ...updatedSkills[index], [field]: value };
    setSkills(updatedSkills);
  };

  const getProficiencyColor = (proficiency: string) => {
    switch (proficiency) {
      case 'expert': return 'bg-green-100 text-green-800';
      case 'advanced': return 'bg-blue-100 text-blue-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Professional Skill</h3>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.map((skill, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{skill.skill_name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProficiencyColor(skill.proficiency)}`}>
                      {skill.proficiency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="capitalize">{skill.skill_category}</span>
                    <span>{skill.years_experience} years</span>
                  </div>
                </div>
              ))}
            </div>
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
                Professional Skills
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Existing Skills */}
          {skills.map((skill, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Skill Name</label>
                <input
                  type="text"
                  value={skill.skill_name}
                  onChange={(e) => handleSkillChange(index, 'skill_name', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. JavaScript"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={skill.skill_category}
                  onChange={(e) => handleSkillChange(index, 'skill_category', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="technical">Technical</option>
                  <option value="soft">Soft Skill</option>
                  <option value="language">Language</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Proficiency</label>
                <select
                  value={skill.proficiency}
                  onChange={(e) => handleSkillChange(index, 'proficiency', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Years</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={skill.years_experience || 1}
                  onChange={(e) => handleSkillChange(index, 'years_experience', parseInt(e.target.value))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => handleRemoveSkill(index)}
                  className="w-full px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Add New Skill */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Skill Name</label>
              <input
                type="text"
                value={newSkill.skill_name}
                onChange={(e) => setNewSkill({...newSkill, skill_name: e.target.value})}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g. Python"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                value={newSkill.skill_category}
                onChange={(e) => setNewSkill({...newSkill, skill_category: e.target.value})}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="technical">Technical</option>
                <option value="soft">Soft Skill</option>
                <option value="language">Language</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Proficiency</label>
              <select
                value={newSkill.proficiency}
                onChange={(e) => setNewSkill({...newSkill, proficiency: e.target.value})}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Years</label>
              <input
                type="number"
                min="0"
                max="50"
                value={newSkill.years_experience || 1}
                onChange={(e) => setNewSkill({...newSkill, years_experience: parseInt(e.target.value)})}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleAddSkill}
                disabled={!newSkill.skill_name.trim()}
                className="w-full px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SkillsSection;