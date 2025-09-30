"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Trophy,
  ArrowRight,
  Download,
  Share2,
  RefreshCw,
  BarChart3
} from 'lucide-react';

const AssessmentCompletePage = () => {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id as string;

  const [showCelebration, setShowCelebration] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);
  const [results, setResults] = useState<any>(null);

  // Mock processing and results
  useEffect(() => {
    const processResults = async () => {
      setIsProcessing(true);
      
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock results data
      const mockResults = {
        assessmentId: assessmentId,
        skillName: 'React',
        assessmentType: 'Comprehensive Assessment',
        overallScore: 78,
        skillLevel: 'Intermediate',
        completedAt: new Date().toISOString(),
        timeSpent: 1680, // 28 minutes
        totalQuestions: 25,
        correctAnswers: 19,
        incorrectAnswers: 5,
        partialAnswers: 1,
        passStatus: 'passed' as const,
        achievements: [
          'First React Assessment Completed',
          'Scored Above 75%',
          'Perfect Score on React Basics'
        ]
      };
      
      setResults(mockResults);
      setIsProcessing(false);
      
      // Show celebration for good scores
      if (mockResults.overallScore >= 70) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 4000);
      }
    };

    processResults();
  }, [assessmentId]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleViewDetailedResults = () => {
    router.push(`/candidate/dashboard/skills-assessment/results/${assessmentId}`);
  };

  const handleRetakeAssessment = () => {
    router.push(`/candidate/dashboard/skills-assessment/start?skill=react`);
  };

  const handleDownloadCertificate = () => {
    console.log('Downloading certificate for:', assessmentId);
    // Mock download
    const link = document.createElement('a');
    link.href = '#';
    link.download = `${results.skillName}_Certificate_${results.overallScore}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('Certificate download started!');
  };

  const handleShareResults = () => {
    const shareText = `I just completed a ${results.skillName} assessment and scored ${results.overallScore}%! 🎉`;
    
    if (navigator.share) {
      navigator.share({
        title: 'My Assessment Results',
        text: shareText,
        url: window.location.origin + `/candidate/dashboard/skills-assessment/results/${assessmentId}`
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Results shared to clipboard!');
    }
  };

  const handleBackToDashboard = () => {
    router.push('/candidate/dashboard/skills-assessment');
  };

  // Processing screen
  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          {/* Animated processing indicator */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-6"
          />
          
          <h2 className="text-2xl font-semibold text-[#222] mb-4">Processing Your Results</h2>
          <p className="text-[#757575] mb-6">
            Our AI is analyzing your performance and generating personalized insights...
          </p>
          
          {/* Processing steps */}
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-[#757575]">Evaluating answers</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-[#757575]">Calculating skill level</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="h-5 w-5 bg-blue-600 rounded-full"
              />
              <span className="text-sm text-blue-700">Generating recommendations</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Celebration Effect */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="text-8xl"
          >
            🎉
          </motion.div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Trophy className="h-10 w-10 text-green-600" />
          </motion.div>
          
          <h1 className="text-4xl font-bold text-[#222] mb-3">
            Assessment Completed! 🎉
          </h1>
          <p className="text-lg text-[#757575] mb-2">
            Congratulations on completing your {results.skillName} assessment
          </p>
          <p className="text-sm text-[#757575]">
            Completed on {new Date(results.completedAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </motion.div>

        {/* Score Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-gray-200 rounded-xl p-8 mb-6 text-center"
        >
          <div className="flex items-center justify-center gap-8">
            <div>
              <div className="text-6xl font-bold text-[#005DDC] mb-2">
                {results.overallScore}%
              </div>
              <div className="text-[#757575]">Overall Score</div>
            </div>
            <div className="h-16 w-px bg-gray-200"></div>
            <div>
              <div className="text-3xl font-semibold text-[#222] mb-2 flex items-center gap-2">
                <Trophy className="h-8 w-8 text-orange-500" />
                {results.skillLevel}
              </div>
              <div className="text-[#757575]">Skill Level</div>
            </div>
          </div>

          {/* Score interpretation */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800 font-medium">
              {results.overallScore >= 90 ? "Outstanding performance! You've mastered this skill." :
               results.overallScore >= 80 ? "Excellent work! You have strong competency in this area." :
               results.overallScore >= 70 ? "Great job! You have good understanding with room for growth." :
               results.overallScore >= 60 ? "Good effort! Focus on improvement areas to advance your skills." :
               "Keep practicing! Use the recommendations to strengthen your knowledge."}
            </p>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{results.correctAnswers}</div>
            <div className="text-xs text-[#757575]">Correct Answers</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600 mb-1">{results.incorrectAnswers}</div>
            <div className="text-xs text-[#757575]">Incorrect</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">{formatTime(results.timeSpent)}</div>
            <div className="text-xs text-[#757575]">Time Spent</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {Math.round((results.correctAnswers / results.totalQuestions) * 100)}%
            </div>
            <div className="text-xs text-[#757575]">Accuracy</div>
          </div>
        </motion.div>

        {/* Achievements */}
        {results.achievements && results.achievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white border border-gray-200 rounded-lg p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-[#222] mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Achievements Unlocked
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.achievements.map((achievement: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-yellow-800">{achievement}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
        >
          <button
            onClick={handleViewDetailedResults}
            className="bg-white border border-[#005DDC] rounded-lg p-6 text-left hover:bg-blue-50 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <BarChart3 className="h-8 w-8 text-[#005DDC]" />
              <ArrowRight className="h-5 w-5 text-[#005DDC] group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-semibold text-[#222] mb-2">View Detailed Results</h3>
            <p className="text-sm text-[#757575]">
              See question-by-question analysis and performance insights
            </p>
          </button>

          {results.passStatus === 'passed' && results.overallScore >= 75 && (
            <button
              onClick={handleDownloadCertificate}
              className="bg-white border border-green-500 rounded-lg p-6 text-left hover:bg-green-50 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <Download className="h-8 w-8 text-green-600" />
                <ArrowRight className="h-5 w-5 text-green-600 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="font-semibold text-[#222] mb-2">Download Certificate</h3>
              <p className="text-sm text-[#757575]">
                Get your achievement certificate in PDF format
              </p>
            </button>
          )}

          <button
            onClick={handleRetakeAssessment}
            className="bg-white border border-orange-500 rounded-lg p-6 text-left hover:bg-orange-50 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <RefreshCw className="h-8 w-8 text-orange-600" />
              <ArrowRight className="h-5 w-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-semibold text-[#222] mb-2">Retake Assessment</h3>
            <p className="text-sm text-[#757575]">
              Try again to improve your score and skill level
            </p>
          </button>

          <button
            onClick={handleShareResults}
            className="bg-white border border-purple-500 rounded-lg p-6 text-left hover:bg-purple-50 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <Share2 className="h-8 w-8 text-purple-600" />
              <ArrowRight className="h-5 w-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-semibold text-[#222] mb-2">Share Achievement</h3>
            <p className="text-sm text-[#757575]">
              Share your success on LinkedIn and social media
            </p>
          </button>

          <button
            onClick={handleBackToDashboard}
            className="bg-white border border-gray-300 rounded-lg p-6 text-left hover:bg-gray-50 transition-colors group md:col-span-2 lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="h-8 w-8 text-[#757575]" />
              <ArrowRight className="h-5 w-5 text-[#757575] group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-semibold text-[#222] mb-2">Continue Learning Journey</h3>
            <p className="text-sm text-[#757575]">
              Explore more assessments and advance your skills further
            </p>
          </button>
        </motion.div>

        {/* Next Steps Suggestion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 text-center"
        >
          <h3 className="text-lg font-semibold text-[#222] mb-2">What's Next?</h3>
          <p className="text-[#757575] mb-4">
            Based on your {results.skillLevel} level in {results.skillName}, we recommend:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              Advanced React Patterns
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
              React Testing
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
              Performance Optimization
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AssessmentCompletePage;