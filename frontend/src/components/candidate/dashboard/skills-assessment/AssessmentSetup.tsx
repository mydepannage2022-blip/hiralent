"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Clock, 
  FileCheck, 
  AlertTriangle, 
  ChevronRight,
  ArrowLeft,
  Zap,
  Target,
  Loader2
} from 'lucide-react';
import AssessmentCard from './AssessmentCard';

interface AssessmentType {
  id: 'QUICK_CHECK' | 'COMPREHENSIVE';
  name: string;
  description: string;
  questionCount: string;
  timeEstimate: string;
  icon: React.ReactNode;
  features: string[];
}

interface SkillCategory {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  timeEstimate: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  isRecommended?: boolean;
  category: string;
}

interface AssessmentSetupProps {
  availableSkills?: SkillCategory[];
  onStartAssessment?: (skillId: string, type: string) => void;
  isLoading?: boolean;
}

const AssessmentSetup: React.FC<AssessmentSetupProps> = ({
  availableSkills = [],
  onStartAssessment,
  isLoading = false
}) => {
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'QUICK_CHECK' | 'COMPREHENSIVE'>('COMPREHENSIVE');
  const [currentStep, setCurrentStep] = useState<'TYPE' | 'SKILL'>('TYPE');

  const assessmentTypes: AssessmentType[] = [
    {
      id: 'QUICK_CHECK',
      name: 'Quick Check',
      description: 'Fast skill evaluation with essential questions',
      questionCount: '5',
      timeEstimate: '3-6 mins',
      icon: <Zap className="h-6 w-6" />,
      features: ['Core concepts only', 'Instant results', 'Basic skill level']
    },
    {
      id: 'COMPREHENSIVE',
      name: 'Comprehensive Test',
      description: 'In-depth assessment with detailed analysis',
      questionCount: '5',
      timeEstimate: '4-5 mins',
      icon: <Target className="h-6 w-6" />,
      features: ['Detailed evaluation', 'Skill breakdown', 'Learning recommendations']
    }
  ];

  const handleTypeSelect = (type: 'QUICK_CHECK' | 'COMPREHENSIVE') => {
    setSelectedType(type);
    setCurrentStep('SKILL');
  };

  const handleSkillSelect = (skillId: string) => {
    setSelectedSkill(skillId);
  };

  const handleStartAssessment = () => {
    if (selectedSkill && onStartAssessment && !isLoading) {
      onStartAssessment(selectedSkill, selectedType);
    }
  };

  const handleBackToType = () => {
    setCurrentStep('TYPE');
    setSelectedSkill('');
  };

  const groupSkillsByCategory = () => {
    const grouped = availableSkills.reduce((acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill);
      return acc;
    }, {} as Record<string, SkillCategory[]>);

    const categoryOrder = ['Technical', 'Soft Skills', 'Certification', 'General'];
    const sortedCategories = categoryOrder.filter(cat => grouped[cat]);
    const otherCategories = Object.keys(grouped).filter(cat => !categoryOrder.includes(cat));
    
    return [...sortedCategories, ...otherCategories].reduce((acc, category) => {
      acc[category] = grouped[category];
      return acc;
    }, {} as Record<string, SkillCategory[]>);
  };

  const groupedSkills = groupSkillsByCategory();

  return (
    <div className="w-full">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${currentStep === 'TYPE' ? 'text-[#005DDC]' : 'text-[#005DDC]'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
              ${currentStep === 'TYPE' ? 'bg-blue-50 border-1 border-[#005DDC]' : 'bg-blue-50 border-1 border-[#005DDC]'}`}>
              1
            </div>
            <span className="font-normal">Assessment Type</span>
          </div>
          <ChevronRight className="h-5 w-5 text-[#757575]" />
          <div className={`flex items-center gap-2 ${currentStep === 'SKILL' ? 'text-[#005DDC]' : 'text-[#757575]'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
              ${currentStep === 'SKILL' ? 'bg-blue-50 border-1 border-[#005DDC]' : 'bg-gray-50 border-1 border-gray-300'}`}>
              2
            </div>
            <span className="font-normal">Select Skill</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Assessment Type Selection */}
        {currentStep === 'TYPE' && (
          <motion.div
            key="type-selection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-[#222] mb-2">Choose Assessment Type</h2>
              <p className="text-[#757575]">Select the type that best fits your needs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {assessmentTypes.map((type) => (
                <motion.div
                  key={type.id}
                  whileHover={{ y: -4 }}
                  className={`p-6 border rounded-lg cursor-pointer transition-all ${
                    selectedType === type.id 
                      ? 'border-[#005DDC] bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                  onClick={() => handleTypeSelect(type.id)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg text-[#005DDC]">
                      {type.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[#222]">{type.name}</h3>
                      <p className="text-[#757575] text-sm">{type.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-4 text-sm text-[#757575]">
                    <div className="flex items-center gap-1">
                      <FileCheck className="h-4 w-4" />
                      <span>{type.questionCount} questions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{type.timeEstimate}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {type.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-[#757575]">
                        <div className="w-1.5 h-1.5 bg-[#005DDC] rounded-full"></div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {currentStep === 'SKILL' && (
          <motion.div
            key="skill-selection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3 border border-blue-200 rounded-lg px-8 py-2">
                <div>
                  <span className="font-medium text-[#005DDC] text-xs lg:text-sm">
                    {assessmentTypes.find(t => t.id === selectedType)?.name}
                  </span>
                  <span className="text-[#005DDC] text-xs ml-2">
                    • {assessmentTypes.find(t => t.id === selectedType)?.timeEstimate}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button 
                  onClick={handleBackToType}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm text-[#757575] hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                > 
                <ArrowLeft className="h-4 w-4" />
                  Change Type
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <div className="flex gap-4">
                <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-800 mb-3 text-sm">Important Guidelines</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-yellow-700">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></div>
                      <span>Ensure stable internet connection</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></div>
                      <span>Find quiet environment</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></div>
                      <span>Do not switch tabs during test</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></div>
                      <span>Each question has time limit</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              {Object.entries(groupedSkills).map(([category, skills]) => (
                <div key={category} className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-medium text-[#222]">{category}</h3>
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-sm text-[#757575]">{skills.length} skill{skills.length > 1 ? 's' : ''}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 items-stretch">
                    {skills.map((skill) => (
                      <div
                        key={skill.id}
                        className={selectedSkill === skill.id ? 'ring-2 ring-[#005DDC] rounded-lg' : ''}
                      >
                        <AssessmentCard
                          {...skill}
                          onClick={() => handleSkillSelect(skill.id)}
                          className={selectedSkill === skill.id ? 'border-[#005DDC] bg-blue-50' : ''}
                          showButton={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* No skills available message */}
            {availableSkills.length === 0 && (
              <div className="text-center py-12">
                <div className="text-[#757575] mb-4">No skills available for assessment</div>
                <p className="text-sm text-[#999]">Please add skills to your profile to start taking assessments</p>
              </div>
            )}

            {/* Start Assessment Button */}
            {availableSkills.length > 0 && (
              <div className="flex justify-center">
                <button
                  onClick={handleStartAssessment}
                  disabled={!selectedSkill || isLoading}
                  className={`
                    px-10 py-3 rounded-md text-lg font-medium transition-all
                    flex items-center gap-3 cursor-pointer
                    ${(!selectedSkill || isLoading)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#005DDC] text-white hover:bg-[#004EB7] hover:shadow-lg'
                    }
                  `}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Preparing Assessment...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      <span>Start Assessment</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {isLoading && (
              <p className="text-center text-sm text-gray-600 mt-4">
                Please wait while we prepare your personalized assessment...
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssessmentSetup;