"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, FileText, Star, CheckCircle } from 'lucide-react';

interface AssessmentCardProps {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  timeEstimate: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  isRecommended?: boolean;
  isCompleted?: boolean;
  lastScore?: number;
  category?: string;
  onClick?: () => void;
  className?: string;
  showButton?: boolean; // New prop to control button visibility
  buttonText?: string;  // Custom button text
}

const AssessmentCard: React.FC<AssessmentCardProps> = ({
  id,
  name,
  description,
  questionCount,
  timeEstimate,
  difficulty,
  isRecommended = false,
  isCompleted = false,
  lastScore,
  category = 'Technical',
  onClick,
  className = '',
  showButton = true,  // Default to true
  buttonText        // Custom button text
}) => {
  
  // Difficulty colors - following Hiralent pattern
  const getDifficultyConfig = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return { color: 'text-green-600 bg-green-50', label: 'Beginner' };
      case 'INTERMEDIATE':
        return { color: 'text-yellow-600 bg-yellow-50', label: 'Intermediate' };
      case 'ADVANCED':
        return { color: 'text-orange-600 bg-orange-50', label: 'Advanced' };
      case 'EXPERT':
        return { color: 'text-red-600 bg-red-50', label: 'Expert' };
      default:
        return { color: 'text-gray-600 bg-gray-50', label: 'Unknown' };
    }
  };

  const difficultyConfig = getDifficultyConfig(difficulty);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`bg-white border border-gray-200 rounded-lg p-6 cursor-pointer 
        hover:shadow-lg transition-all duration-200 ${className}`}
      onClick={onClick}
    >
      {/* Header with badges */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-2">
          {isRecommended && (
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-[#005DDC] text-[10px] rounded-md">
              <Star className="w-3 h-3" />
              Recommended
            </span>
          )}
          {isCompleted && (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-[10px] rounded-md">
              <CheckCircle className="w-3 h-3" />
              Completed
            </span>
          )}
        </div>
        <span className={`px-2 py-1 text-[10px] rounded-md ${difficultyConfig.color}`}>
          {difficultyConfig.label}
        </span>
      </div>

      {/* Skill name and category */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[#222] mb-1">{name}</h3>
        <span className="text-xs text-[#757575]">{category}</span>
      </div>

      {/* Description */}
      <p className="text-[#757575] text-xs mb-4 leading-relaxed">
        {description}
      </p>

      {/* Assessment info */}
      <div className="flex items-center gap-4 mb-4 text-xs text-[#757575]">
        <div className="flex items-center gap-1 text-[9px]">
          <FileText className="w-4 h-4" />
          <span>{questionCount} questions</span>
        </div>
        <div className="flex items-center gap-1 text-[9px]">
          <Clock className="w-4 h-4" />
          <span>{timeEstimate}</span>
        </div>
      </div>
      {/* Last score (if completed) */}
      {isCompleted && lastScore !== undefined && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-md">
          <span className="text-xs text-[#757575]">Last Score:</span>
          <span className="font-normal text-[#005DDC]">{lastScore}%</span>
        </div>
      )}

      {/* Action button - Using Hiralent button style */}
      {showButton && (
        <button 
          className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            isCompleted 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-[#005DDC] text-white hover:bg-[#004EB7]'
          }`}
        >
          {buttonText || (isCompleted ? 'Retake Assessment' : 'Start Assessment')}
        </button>
      )}
    </motion.div>
  );
};

export default AssessmentCard;