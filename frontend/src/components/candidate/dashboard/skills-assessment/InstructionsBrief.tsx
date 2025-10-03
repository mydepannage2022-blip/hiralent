"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Play,
  ArrowLeft,
  FileText,
  Target,
  Zap,
  Shield,
  Ban,
  Eye
} from 'lucide-react';

interface AssessmentInfo {
  skillName: string;
  assessmentType: 'QUICK_CHECK' | 'COMPREHENSIVE';
  totalQuestions: number;
  timeLimit: number;
  difficulty: string;
  questionTypes?: string[];
}

interface InstructionsBriefProps {
  assessmentInfo: AssessmentInfo;
  onStartTest?: () => void;
  onGoBack?: () => void;
  isLoading?: boolean;
}

const InstructionsBrief: React.FC<InstructionsBriefProps> = ({
  assessmentInfo,
  onStartTest,
  onGoBack,
  isLoading = false
}) => {
  const [isAgreed, setIsAgreed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Start countdown when user agrees
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      onStartTest?.();
    }
  }, [countdown, onStartTest]);

  const handleStartAssessment = () => {
    if (!isAgreed) return;
    setCountdown(3);
  };

  // Security rules - simplified for Hiralent style
  const securityRules = [
    {
      icon: <Ban className="h-5 w-5 text-red-500" />,
      title: "No Tab Switching",
      description: "Switching tabs will be detected and may end your assessment"
    },
    {
      icon: <Eye className="h-5 w-5 text-red-500" />,
      title: "No External Help",
      description: "Using search engines or AI tools is not allowed"
    },
    {
      icon: <Shield className="h-5 w-5 text-red-500" />,
      title: "No Copy/Paste",
      description: "Copy and paste functions are disabled"
    },
    {
      icon: <Clock className="h-5 w-5 text-red-500" />,
      title: "Time Limits",
      description: "Each question has a strict time limit"
    }
  ];

  const assessmentGuidelines = [
    {
      icon: <Target className="h-5 w-5 text-[#005DDC]" />,
      title: "Read Carefully",
      description: "Take time to understand each question"
    },
    {
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      title: "Answer All Questions",
      description: "Try to answer every question, even if unsure"
    },
    {
      icon: <Clock className="h-5 w-5 text-orange-500" />,
      title: "Manage Time",
      description: "Don't spend too long on single questions"
    },
    {
      icon: <FileText className="h-5 w-5 text-purple-500" />,
      title: "Review When Possible",
      description: "Check your answers if time permits"
    }
  ];

  const getAssessmentTypeIcon = () => {
    return assessmentInfo.assessmentType === 'QUICK_CHECK' ? 
      <Zap className="h-6 w-6" /> : 
      <Target className="h-6 w-6" />;
  };

  const getAssessmentTypeName = () => {
    return assessmentInfo.assessmentType === 'QUICK_CHECK' ? 
      'Quick Check' : 
      'Comprehensive Assessment';
  };

  // Countdown overlay
  if (countdown !== null && countdown > 0) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center text-white"
        >
          <motion.div
            key={countdown}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-8xl font-bold mb-4"
          >
            {countdown}
          </motion.div>
          <p className="text-2xl">Assessment starting...</p>
          <p className="text-lg text-gray-300 mt-2">Get ready!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      {/* Header - Hiralent style */}
      <div className="text-center mb-8">
        <h1 className="text-xl lg:text-4xl font-semibold text-[#222] mb-3">Assessment Instructions</h1>
        <p className="text-[#757575] text-xs">
          Please read these instructions carefully before starting
        </p>
      </div>

      {/* Assessment Overview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[#222]">{assessmentInfo.skillName}</h2>
            <p className="text-[#757575] text-xs">{getAssessmentTypeName()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white rounded-lg">
            <div className="text-lg font-bold text-[#222]">{assessmentInfo.totalQuestions}</div>
            <div className="text-xs text-[#757575]">Questions</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg">
            <div className="text-lg font-bold text-[#222]">{assessmentInfo.timeLimit}</div>
            <div className="text-xs text-[#757575]">Minutes</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg">
            <div className="text-base font-bold text-[#222]">{assessmentInfo.difficulty}</div>
            <div className="text-xs text-[#757575]">Level</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg">
            <div className="text-base font-bold text-[#222]">Auto</div>
            <div className="text-xs text-[#757575]">Scoring</div>
          </div>
        </div>
      </div>

      {/* Security Rules */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-semibold text-[#222]">Security Rules</h2>
          {/* <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-md">Strictly Enforced</span> */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {securityRules.map((rule, index) => (
            <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                {rule.icon}
                <div>
                  <h3 className="font-normal text-base text-red-800 mb-1">{rule.title}</h3>
                  <p className="text-[10px] text-red-700">{rule.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-red-100 border border-red-300 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-normal mb-1 text-base">Violation Warning:</p>
              <p className="text-red-700 text-[10px]">
                Security violations are automatically detected. Maximum 3 violations allowed before termination.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Guidelines */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold text-[#222]">Assessment Guidelines</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assessmentGuidelines.map((guideline, index) => (
            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                {guideline.icon}
                <div>
                  <h3 className="font-medium text-[#222] mb-1">{guideline.title}</h3>
                  <p className="text-sm text-[#757575]">{guideline.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question Types */}
      {assessmentInfo.questionTypes && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[#222] mb-4">Question Types</h2>
          <div className="flex flex-wrap gap-2">
            {assessmentInfo.questionTypes.map((type, index) => (
              <span key={index} className="px-3 py-1 bg-blue-50 text-[#005DDC] text-sm rounded-md border border-blue-200">
                {type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Agreement Checkbox */}
      <div className="mb-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agreement"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 text-[#005DDC] border-2 border-gray-300 rounded focus:ring-[#005DDC]"
            />
            <div>
              <label htmlFor="agreement" className="font-medium text-[#222] cursor-pointer">
                I acknowledge and agree to the following:
              </label>
              <ul className="text-sm text-[#757575] mt-2 space-y-1">
                <li>• I have read and understood all security rules and guidelines</li>
                <li>• I will not use any external help, resources, or AI assistance</li>
                <li>• I understand that violations will result in assessment termination</li>
                <li>• I am ready to start in a distraction-free environment</li>
                <li>• I consent to browser activity monitoring during assessment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-[#757575] hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>

        <button
          onClick={handleStartAssessment}
          disabled={!isAgreed || isLoading}
          className={`px-8 py-3 rounded-md text-lg font-medium transition-colors ${
            isAgreed 
              ? 'bg-[#005DDC] hover:bg-[#004EB7] text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Loading Questions...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Start Assessment Now
            </div>
          )}
        </button>
      </div>

      {/* Final Reminder */}
      <div className="mt-6 text-center">
        <p className="text-sm text-[#757575]">
          Once you start, you cannot pause or restart the assessment. Make sure you're ready!
        </p>
      </div>
    </div>
  );
};

export default InstructionsBrief;