"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Clock, 
  Target, 
  TrendingUp,
  FileText,
  Award,
  Download,
  Share2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

interface AssessmentSummary {
  assessmentId: string;
  skillName: string;
  assessmentType: string;
  completedAt: string;
  totalQuestions: number;
  answeredQuestions: number;
  timeSpent: number;
  totalTimeAllowed: number;
  overallScore: number;
  skillLevel: string;
  passStatus: 'passed' | 'failed' | 'partial';
}

interface QuickStats {
  correctAnswers: number;
  incorrectAnswers: number;
  partialAnswers: number;
  skippedQuestions: number;
  averageTimePerQuestion: number;
  difficultyBreakdown: {
    beginner: { correct: number; total: number };
    intermediate: { correct: number; total: number };
    advanced: { correct: number; total: number };
  };
}

interface AssessmentCompleteProps {
  assessment: AssessmentSummary;
  quickStats: QuickStats;
  onViewDetailedResults?: () => void;
  onRetakeAssessment?: () => void;
  onDownloadCertificate?: () => void;
  onShareResults?: () => void;
  onBackToDashboard?: () => void;
  showCelebration?: boolean;
  className?: string;
}

const AssessmentComplete: React.FC<AssessmentCompleteProps> = ({
  assessment,
  quickStats,
  onViewDetailedResults,
  onRetakeAssessment,
  onDownloadCertificate,
  onShareResults,
  onBackToDashboard,
  showCelebration = true,
  className = ''
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (showCelebration && assessment.passStatus === 'passed') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [showCelebration, assessment.passStatus]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'passed':
        return {
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: <CheckCircle className="h-8 w-8 text-green-600" />,
          title: 'Assessment Completed Successfully!',
          message: 'Congratulations! You have successfully completed the assessment.'
        };
      case 'failed':
        return {
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: <Target className="h-8 w-8 text-red-600" />,
          title: 'Assessment Completed',
          message: 'You have completed the assessment. Review your results and consider retaking.'
        };
      case 'partial':
        return {
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          icon: <Clock className="h-8 w-8 text-orange-600" />,
          title: 'Assessment Partially Completed',
          message: 'Some questions were not fully answered. Review your performance below.'
        };
      default:
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: <FileText className="h-8 w-8 text-gray-600" />,
          title: 'Assessment Completed',
          message: 'Your assessment has been submitted successfully.'
        };
    }
  };

  const statusConfig = getStatusConfig(assessment.passStatus);
  const accuracyPercentage = Math.round((quickStats.correctAnswers / assessment.answeredQuestions) * 100);

  const handleActionWithLoading = async (action?: () => void | Promise<void>) => {
    if (!action) return;
    setIsLoading(true);
    try {
      await action();
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="animate-pulse text-6xl">🎉</div>
        </div>
      )}

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${statusConfig.bg} ${statusConfig.border} border rounded-lg p-8 mb-6`}
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-4"
          >
            {statusConfig.icon}
          </motion.div>
          
          <h1 className={`text-3xl font-bold mb-2 ${statusConfig.color}`}>
            {statusConfig.title}
          </h1>
          <p className="text-[#757575] mb-6">{statusConfig.message}</p>
          
          {/* Score Display */}
          <div className="flex items-center justify-center gap-8 mb-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#005DDC] mb-1">
                {assessment.overallScore}%
              </div>
              <div className="text-sm text-[#757575]">Overall Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-[#222] mb-1">
                {assessment.skillLevel}
              </div>
              <div className="text-sm text-[#757575]">Skill Level</div>
            </div>
          </div>
          
          <div className="text-sm text-[#757575]">
            {assessment.skillName} • {assessment.assessmentType} Assessment
          </div>
        </div>
      </motion.div>

      {/* Quick Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white border border-gray-200 rounded-lg p-6 mb-6"
      >
        <h2 className="text-xl font-semibold text-[#222] mb-4">Assessment Summary</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {assessment.answeredQuestions}/{assessment.totalQuestions}
            </div>
            <div className="text-xs text-blue-700">Questions Answered</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {quickStats.correctAnswers}
            </div>
            <div className="text-xs text-green-700">Correct Answers</div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {formatTime(assessment.timeSpent)}
            </div>
            <div className="text-xs text-orange-700">Time Spent</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {accuracyPercentage}%
            </div>
            <div className="text-xs text-purple-700">Accuracy Rate</div>
          </div>
        </div>

        {/* Performance Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-[#222] mb-3">Answer Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                <span className="text-sm text-green-700">Correct</span>
                <span className="font-medium text-green-600">{quickStats.correctAnswers}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                <span className="text-sm text-red-700">Incorrect</span>
                <span className="font-medium text-red-600">{quickStats.incorrectAnswers}</span>
              </div>
              {quickStats.partialAnswers > 0 && (
                <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                  <span className="text-sm text-yellow-700">Partial</span>
                  <span className="font-medium text-yellow-600">{quickStats.partialAnswers}</span>
                </div>
              )}
              {quickStats.skippedQuestions > 0 && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">Skipped</span>
                  <span className="font-medium text-gray-600">{quickStats.skippedQuestions}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-[#222] mb-3">Difficulty Analysis</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                <span className="text-sm text-green-700">Beginner</span>
                <span className="font-medium text-green-600">
                  {quickStats.difficultyBreakdown.beginner.correct}/{quickStats.difficultyBreakdown.beginner.total}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                <span className="text-sm text-yellow-700">Intermediate</span>
                <span className="font-medium text-yellow-600">
                  {quickStats.difficultyBreakdown.intermediate.correct}/{quickStats.difficultyBreakdown.intermediate.total}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                <span className="text-sm text-red-700">Advanced</span>
                <span className="font-medium text-red-600">
                  {quickStats.difficultyBreakdown.advanced.correct}/{quickStats.difficultyBreakdown.advanced.total}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white border border-gray-200 rounded-lg p-6"
      >
        <h2 className="text-xl font-semibold text-[#222] mb-4">What's Next?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* View Detailed Results */}
          <button
            onClick={() => handleActionWithLoading(onViewDetailedResults)}
            disabled={isLoading}
            className="flex items-center gap-3 p-4 border border-[#005DDC] bg-blue-50 text-[#005DDC] rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <FileText className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">View Detailed Results</div>
              <div className="text-xs opacity-75">See breakdown & analysis</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </button>

          {/* Download Certificate */}
          {assessment.passStatus === 'passed' && (
            <button
              onClick={() => handleActionWithLoading(onDownloadCertificate)}
              disabled={isLoading}
              className="flex items-center gap-3 p-4 border border-green-500 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <Award className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Download Certificate</div>
                <div className="text-xs opacity-75">PDF certificate</div>
              </div>
              <Download className="h-4 w-4 ml-auto" />
            </button>
          )}

          {/* Retake Assessment */}
          <button
            onClick={() => handleActionWithLoading(onRetakeAssessment)}
            disabled={isLoading}
            className="flex items-center gap-3 p-4 border border-orange-500 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Retake Assessment</div>
              <div className="text-xs opacity-75">Improve your score</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </button>

          {/* Share Results */}
          <button
            onClick={() => handleActionWithLoading(onShareResults)}
            disabled={isLoading}
            className="flex items-center gap-3 p-4 border border-purple-500 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
          >
            <Share2 className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Share Results</div>
              <div className="text-xs opacity-75">Social media & LinkedIn</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </button>

          {/* Back to Dashboard */}
          <button
            onClick={() => handleActionWithLoading(onBackToDashboard)}
            disabled={isLoading}
            className="flex items-center gap-3 p-4 border border-gray-300 bg-gray-50 text-[#757575] rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 md:col-span-2 lg:col-span-1"
          >
            <TrendingUp className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Back to Dashboard</div>
              <div className="text-xs opacity-75">Continue learning</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </button>
        </div>
      </motion.div>

      {/* Assessment Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4"
      >
        <div className="text-center text-sm text-[#757575]">
          <div className="mb-2">
            Assessment completed on {new Date(assessment.completedAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div className="flex items-center justify-center gap-4 text-xs">
            <span>Assessment ID: {assessment.assessmentId}</span>
            <span>•</span>
            <span>Time Limit: {formatTime(assessment.totalTimeAllowed)}</span>
            <span>•</span>
            <span>Average Time/Question: {Math.round(quickStats.averageTimePerQuestion)}s</span>
          </div>
        </div>
      </motion.div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#005DDC] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[#222]">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentComplete;