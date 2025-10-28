"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Gift, X, Check, Plus, Trash2 } from 'lucide-react';
import { useUpdateJobBenefits } from '@/src/lib/profile/profile.queries';
import { JobBenefitData } from '@/src/lib/profile/profile.api';
import { useProfile } from '@/src/context/ProfileContext';

const JobBenefitsSection: React.FC = () => {
  const { profileData, setProfileData } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [benefits, setBenefits] = useState<JobBenefitData[]>([]);
  const [newBenefit, setNewBenefit] = useState<JobBenefitData>({
    benefit_type: 'health_insurance',
    importance: 'preferred',
    notes: ''
  });

  const { mutate: updateJobBenefits, isPending: isUpdating } = useUpdateJobBenefits();

  // Parse job benefits data from profile context
  const getJobBenefitsData = (): JobBenefitData[] => {
    if (!profileData?.job_benefits) return [];
    
    try {
      let benefitsArray = [];
      
      if (typeof profileData.job_benefits === 'string') {
        benefitsArray = JSON.parse(profileData.job_benefits);
      } else if (Array.isArray(profileData.job_benefits)) {
        benefitsArray = profileData.job_benefits;
      }
      
      return benefitsArray.map((benefit: any) => ({
        benefit_type: benefit.benefit_type || 'health_insurance',
        importance: benefit.importance || 'preferred',
        notes: benefit.notes || ''
      }));
    } catch (error) {
      console.error('Error parsing job benefits data:', error);
    }
    return [];
  };

  useEffect(() => {
    const benefitsData = getJobBenefitsData();
    setBenefits(benefitsData);
  }, [profileData]);

  const handleEdit = () => {
    setIsEditing(true);
    const benefitsData = getJobBenefitsData();
    setBenefits([...benefitsData]);
  };

  const handleCancel = () => {
    setIsEditing(false);
    const benefitsData = getJobBenefitsData();
    setBenefits([...benefitsData]);
    setNewBenefit({
      benefit_type: 'health_insurance',
      importance: 'preferred',
      notes: ''
    });
  };

  const handleSave = () => {
    // Sanitize data before sending
    const sanitizedBenefits = benefits.map(benefit => ({
      ...benefit,
      notes: (benefit.notes || '').substring(0, 200) // Limit notes to 200 chars as per backend schema
    }));
    
    updateJobBenefits(sanitizedBenefits, {
      onSuccess: () => {
        setIsEditing(false);
        setProfileData({
          ...profileData,
          job_benefits: [...sanitizedBenefits],
        });
      },
      onError: (error) => {
        console.error("API Error:", error);
      }
    });
  };

  const handleAddBenefit = () => {
    if (newBenefit.benefit_type.trim()) {
      setBenefits([...benefits, { ...newBenefit }]);
      setNewBenefit({
        benefit_type: 'health_insurance',
        importance: 'preferred',
        notes: ''
      });
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const handleBenefitChange = (index: number, field: keyof JobBenefitData, value: string) => {
    const updatedBenefits = [...benefits];
    updatedBenefits[index] = { ...updatedBenefits[index], [field]: value };
    setBenefits(updatedBenefits);
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'required': return 'bg-red-100 text-red-800';
      case 'preferred': return 'bg-blue-100 text-blue-800';
      case 'nice_to_have': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBenefitIcon = (benefitType: string) => {
    switch (benefitType) {
      case 'health_insurance': return '🏥';
      case 'dental_insurance': return '🦷';
      case 'vision_insurance': return '👁️';
      case 'retirement_401k': return '💰';
      case 'paid_time_off': return '🏖️';
      case 'flexible_hours': return '⏰';
      case 'remote_work': return '🏠';
      case 'professional_development': return '📚';
      case 'gym_membership': return '💪';
      case 'stock_options': return '📈';
      case 'bonus_structure': return '💎';
      case 'parental_leave': return '👶';
      case 'mental_health_support': return '🧠';
      case 'life_insurance': return '🛡️';
      case 'disability_insurance': return '♿';
      case 'commuter_benefits': return '🚌';
      case 'food_allowance': return '🍽️';
      case 'education_reimbursement': return '🎓';
      case 'conference_allowance': return '🎤';
      case 'wellness_programs': return '🌱';
      case 'childcare_assistance': return '🧸';
      case 'relocation_assistance': return '📦';
      case 'phone_internet_allowance': return '📱';
      case 'coworking_space_access': return '💼';
      case 'sabbatical_leave': return '🌍';
      case 'pet_insurance': return '🐕';
      case 'legal_assistance': return '⚖️';
      case 'employee_discounts': return '🏷️';
      case 'team_building_events': return '🎉';
      case 'flexible_pto': return '📅';
      default: return '🎁';
    }
  };

  const formatBenefitType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const hasContent = getJobBenefitsData().length > 0;

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
            <Gift className="w-2 h-2 lg:w-4 lg:h-4 text-purple-600" />
          </div>
          <h3 className="text-xs lg:text-lg font-semibold text-gray-900">Preferred Job Benefits</h3>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getJobBenefitsData().map((benefit: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <span className="text-lg">{getBenefitIcon(benefit.benefit_type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 text-xs lg:text-sm">
                        {formatBenefitType(benefit.benefit_type)}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-[9px] lg:text-xs font-medium ${getImportanceColor(benefit.importance)}`}>
                        {benefit.importance.replace('_', ' ')}
                      </span>
                    </div>
                    {benefit.notes && (
                      <p className="text-gray-600 text-[10px] lg:text-xs">{benefit.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-xs lg:text-sm">Add your preferred job benefits</p>
              <button
                onClick={handleEdit}
                className="mt-3 text-blue-600 text-xs lg:text-sm font-medium hover:text-blue-700"
              >
                Job benefits
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Existing Benefits */}
          {benefits.map((benefit, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Benefit Type</label>
                <select
                  value={benefit.benefit_type}
                  onChange={(e) => handleBenefitChange(index, 'benefit_type', e.target.value)}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="health_insurance">Health Insurance</option>
                  <option value="remote_work">Remote Work</option>
                  <option value="flexible_hours">Flexible Hours</option>
                  <option value="professional_development">Professional Development</option>
                  <option value="stock_options">Stock Options</option>
                  <option value="paid_time_off">Paid Time Off</option>
                  <option value="gym_membership">Gym Membership</option>
                  <option value="retirement_401k">Retirement 401k</option>
                  <option value="bonus_structure">Bonus Structure</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Importance</label>
                <select
                  value={benefit.importance}
                  onChange={(e) => handleBenefitChange(index, 'importance', e.target.value)}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="required">Required</option>
                  <option value="preferred">Preferred</option>
                  <option value="nice_to_have">Nice to Have</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={benefit.notes || ''}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      handleBenefitChange(index, 'notes', e.target.value);
                    }
                  }}
                  maxLength={200}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Additional details..."
                />
                <span className="text-xs text-gray-400">{(benefit.notes || '').length}/200</span>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => handleRemoveBenefit(index)}
                  className="w-full px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs lg:text-sm flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Add New Benefit */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Benefit Type</label>
              <select
                value={newBenefit.benefit_type}
                onChange={(e) => setNewBenefit({...newBenefit, benefit_type: e.target.value})}
                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="health_insurance">Health Insurance</option>
                <option value="remote_work">Remote Work</option>
                <option value="flexible_hours">Flexible Hours</option>
                <option value="professional_development">Professional Development</option>
                <option value="stock_options">Stock Options</option>
                <option value="paid_time_off">Paid Time Off</option>
                <option value="gym_membership">Gym Membership</option>
                <option value="retirement_401k">Retirement 401k</option>
                <option value="bonus_structure">Bonus Structure</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Importance</label>
              <select
                value={newBenefit.importance}
                onChange={(e) => setNewBenefit({...newBenefit, importance: e.target.value})}
                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="required">Required</option>
                <option value="preferred">Preferred</option>
                <option value="nice_to_have">Nice to Have</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={newBenefit.notes || ''}
                onChange={(e) => {
                  if (e.target.value.length <= 200) {
                    setNewBenefit({...newBenefit, notes: e.target.value});
                  }
                }}
                maxLength={200}
                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Additional details..."
              />
              <span className="text-xs text-gray-400">{(newBenefit.notes || '').length}/200</span>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleAddBenefit}
                className="w-full px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs lg:text-sm flex items-center justify-center gap-1"
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

export default JobBenefitsSection;