"use client";

import React, { useState, useEffect,useMemo  } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Globe, X, Check, Plus, Trash2 } from 'lucide-react';
import { useUpdateLanguages } from '@/src/lib/profile/profile.queries';
import { useProfile } from '@/src/context/ProfileContext';

interface LanguageData {
  language: string;
  proficiency: 'native' | 'fluent' | 'advanced' | 'intermediate' | 'basic';
}

const LanguagesSection: React.FC = () => {
  const { profileData, setProfileData } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [languages, setLanguages] = useState<LanguageData[]>([]);
  const [newLanguage, setNewLanguage] = useState<LanguageData>({
    language: '',
    proficiency: 'intermediate'
  });

  const { mutate: updateLanguages, isPending: isUpdating } = useUpdateLanguages();

  // Parse languages data from profile context
  const getLanguagesData = (): LanguageData[] => {
    if (!profileData?.languages) return [];
    
    try {
      let languagesArray = [];
      
      if (typeof profileData.languages === 'string') {
        languagesArray = JSON.parse(profileData.languages);
      } else if (Array.isArray(profileData.languages)) {
        languagesArray = profileData.languages;
      }
      
      return languagesArray.map((lang: any) => ({
        language: lang.language || '',
        proficiency: lang.proficiency || 'intermediate'
      }));
    } catch (error) {
      console.error('Error parsing languages data:', error);
    }
    return [];
  };
  const parsedLanguages = useMemo(() => {
  return getLanguagesData();
  }, [profileData?.languages]);


  useEffect(() => {
    if (!isEditing) {
      setLanguages(parsedLanguages);
    }
  }, [parsedLanguages, isEditing]);



  const handleEdit = () => {
    setIsEditing(true);
    const languagesData = getLanguagesData();
    setLanguages([...languagesData]);
  };

  const handleCancel = () => {
    setIsEditing(false);
    const languagesData = getLanguagesData();
    setLanguages([...languagesData]);
    setNewLanguage({ language: '', proficiency: 'intermediate' });
  };

  const handleSave = () => {
    updateLanguages(languages, {
      onSuccess: () => {
        setIsEditing(false);
        setProfileData({
          ...profileData,
          languages: [...languages],
        });
      },
      onError: (error) => {
        console.error("API Error:", error);
      }
    });
  };

  const handleAddLanguage = () => {
    if (newLanguage.language.trim()) {
      setLanguages([...languages, { ...newLanguage }]);
      setNewLanguage({ language: '', proficiency: 'intermediate' });
    }
  };

  const handleRemoveLanguage = (index: number) => {
    setLanguages(languages.filter((_, i) => i !== index));
  };

  const handleLanguageChange = (index: number, field: keyof LanguageData, value: string) => {
    const updatedLanguages = [...languages];
    updatedLanguages[index] = { ...updatedLanguages[index], [field]: value };
    setLanguages(updatedLanguages);
  };

  const getProficiencyColor = (proficiency: string) => {
    switch (proficiency) {
      case 'native': return 'bg-purple-100 text-purple-800';
      case 'fluent': return 'bg-green-100 text-green-800';
      case 'advanced': return 'bg-blue-100 text-blue-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const hasContent = getLanguagesData().length > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Globe className="w-2 h-2 lg:w-4 lg:h-4 text-indigo-600" />
          </div>
          <h3 className="text-xs lg:text-lg font-semibold text-gray-900">Languages</h3>
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {getLanguagesData().map((lang: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-xs lg:text-sm">{lang.language}</h4>
                    <span className={`inline-block mt-1 px-2 py-1 rounded-full text-[9px] lg:text-xs font-medium ${getProficiencyColor(lang.proficiency)}`}>
                      {lang.proficiency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-xs lg:text-sm">Add your language skills</p>
              <button
                onClick={handleEdit}
                className="mt-3 text-blue-600 text-xs lg:text-sm font-medium hover:text-blue-700"
              >
                Languages
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Existing Languages */}
          {languages.map((lang, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
                <input
                  type="text"
                  value={lang.language}
                  onChange={(e) => handleLanguageChange(index, 'language', e.target.value)}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. English"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Proficiency</label>
                <select
                  value={lang.proficiency}
                  onChange={(e) => handleLanguageChange(index, 'proficiency', e.target.value)}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="native">Native</option>
                  <option value="fluent">Fluent</option>
                  <option value="advanced">Advanced</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="basic">Basic</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => handleRemoveLanguage(index)}
                  className="w-full px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs lg:text-sm flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Add New Language */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
              <input
                type="text"
                value={newLanguage.language}
                onChange={(e) => setNewLanguage({...newLanguage, language: e.target.value})}
                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g. Spanish"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Proficiency</label>
              <select
                value={newLanguage.proficiency}
                onChange={(e) => setNewLanguage({...newLanguage, proficiency: e.target.value as any})}
                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="native">Native</option>
                <option value="fluent">Fluent</option>
                <option value="advanced">Advanced</option>
                <option value="intermediate">Intermediate</option>
                <option value="basic">Basic</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleAddLanguage}
                disabled={!newLanguage.language.trim()}
                className="w-full px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs lg:text-sm flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default LanguagesSection;