"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  TrendingUp, 
  Award, 
  Clock,
  Target,
  BarChart3,
  Download,
  Share2,
  RefreshCw,
  ArrowRight,
  Star,
  Trophy,
  BookOpen,
  Users,
  Calendar
} from 'lucide-react';

interface QuestionResult {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  score: number;
  timeTaken: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  feedback: string;
  category: string;
}

interface AssessmentResultsData {
  assessmentId: string;
  skillName: string;
  assessmentType: string;
  overallScore: number;
  skillLevel: string;
  completedAt: string;
  timeSpent: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  partialAnswers: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  questionResults: QuestionResult[];
  marketInsights?: {
    salaryRange: string;
    demandLevel: 'high' | 'medium' | 'low';
    jobOpenings: number;
  };
}

interface AssessmentResultsProps {
  results: AssessmentResultsData;
  onRetakeAssessment?: () => void;
  onDownloadReport?: () => void;
  onShareResults?: () => void;
  onViewRecommendations?: () => void;
  onBackToDashboard?: () => void;
  showCelebration?: boolean;
  className?: string;
}

const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  results,
  onRetakeAssessment,
  onDownloadReport,
  onShareResults,
  onViewRecommendations,
  onBackToDashboard,
  showCelebration = true,
  className = ''
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'insights'>('overview');

  useEffect(() => {
    if (showCelebration && results.overallScore >= 70) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [showCelebration, results.overallScore]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getSkillLevelIcon = (level: string) => {
    switch (level.toUpperCase()) {
      case 'EXPERT':
        return <Trophy className="h-6 w-6 text-purple-600" />;
      case 'ADVANCED':
        return <Award className="h-6 w-6 text-blue-600" />;
      case 'INTERMEDIATE':
        return <Target className="h-6 w-6 text-orange-600" />;
      case 'BEGINNER':
        return <BookOpen className="h-6 w-6 text-green-600" />;
      default:
        return <Target className="h-6 w-6 text-gray-600" />;
    }
  };

  const getDifficultyStats = () => {
    const stats = {
      BEGINNER: { correct: 0, total: 0 },
      INTERMEDIATE: { correct: 0, total: 0 },
      ADVANCED: { correct: 0, total: 0 },
      EXPERT: { correct: 0, total: 0 }
    };

    results.questionResults.forEach(q => {
      stats[q.difficulty].total++;
      if (q.isCorrect) stats[q.difficulty].correct++;
    });

    return stats;
  };

  const accuracyRate = Math.round((results.correctAnswers / results.totalQuestions) * 100);
  const averageTimePerQuestion = Math.round(results.timeSpent / results.totalQuestions);
  const difficultyStats = getDifficultyStats();

  return (
    <div className={`w-full  ${className}`}>
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-lg p-8 mb-6 shadow-md ${getScoreColor(results.overallScore)}`}
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2 text-[#222]">
            Assessment Completed!
          </h1>
          <p className="text-[#757575] mb-6 text-xs">
            {results.skillName} • {results.assessmentType} Assessment
          </p>
          
          <div className="flex items-center justify-center gap-8 mb-4">
            <div className="text-center">
              <div className="text-base font-normal text-[#005DDC] mb-2">
                {results.overallScore}%
              </div>
              <div className="text-xs text-[#757575] font-normal">Overall Score</div>
            </div>
            <div className="text-center">
              <div className="text-base font-normal text-[#222] mb-2 flex items-center gap-2">
                {results.skillLevel}
              </div>
              <div className="text-xs text-[#757575] font-normal">Skill Level</div>
            </div>
          </div>
          
          <div className="text-xs text-[#757575] font-normal">
            Completed on {new Date(results.completedAt).toLocaleDateString()}
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        <div className="bg-white border border-gray-200 rounded-lg py-2 text-center">
          <div className="text-base font-normal text-[#005DDC] mb-1">{results.correctAnswers}</div>
          <div className="text-[10px] text-[#757575]">Correct Answers</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg py-2 text-center">
          <div className="text-base font-normal text-[#005DDC] mb-1">{accuracyRate}%</div>
          <div className="text-[10px] text-[#757575]">Accuracy Rate</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg py-2 text-center">
          <div className="text-base font-normal text-[#005DDC] mb-1">{formatTime(results.timeSpent)}</div>
          <div className="text-[10px] text-[#757575]">Time Spent</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg py-2 text-center">
          <div className="text-base font-normal text-[#005DDC] mb-1">{averageTimePerQuestion}s</div>
          <div className="text-[10px] text-[#757575]">Avg per Question</div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6">
        <div className="flex border-b border-gray-200">
          {[
            { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
            { key: 'breakdown', label: 'Question Breakdown', icon: <Target className="h-4 w-4" /> },
            { key: 'insights', label: 'Performance Insights', icon: <TrendingUp className="h-4 w-4" /> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'border-[#005DDC] text-[#005DDC] bg-blue-50'
                  : 'border-transparent text-[#757575] hover:text-[#222] hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Performance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#222] mb-4">Performance Summary</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-green-700 ">Correct Answers</span>
                      <span className="font-normal text-green-600">{results.correctAnswers}/{results.totalQuestions}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-red-700">Incorrect Answers</span>
                      <span className="font-normal text-red-600">{results.incorrectAnswers}</span>
                    </div>
                    {results.partialAnswers > 0 && (
                      <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                        <span className="text-yellow-700">Partial Credit</span>
                        <span className="font-normal text-yellow-600">{results.partialAnswers}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#222] mb-4">Difficulty Breakdown</h3>
                  <div className="space-y-3 text-xs">
                    {Object.entries(difficultyStats).map(([level, stats]) => (
                      stats.total > 0 && (
                        <div key={level} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-700 capitalize">{level.toLowerCase()}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-normal text-gray-600">{stats.correct}/{stats.total}</span>
                            <span className="text-xs text-gray-500">
                              ({Math.round((stats.correct / stats.total) * 100)}%)
                            </span>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#222] mb-4 flex items-center gap-2">
                    Strengths
                  </h3>
                  <div className="space-y-2 text-xs">
                    {results.strengths.map((strength, index) => (
                      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800">{strength}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#222] mb-4 flex items-center gap-2">
                    Areas for Improvement
                  </h3>
                  <div className="space-y-2 text-xs">
                    {results.weaknesses.map((weakness, index) => (
                      <div key={index} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-orange-800">{weakness}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Question Breakdown Tab */}
          {activeTab === 'breakdown' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-sm font-semibold text-[#222] mb-4">Detailed Question Analysis</h3>
              
              <div className="space-y-4 overflow-y-auto">
                {results.questionResults.map((question, index) => (
                  <div
                    key={question.questionId}
                    className={`border rounded-lg p-4 ${
                      question.isCorrect 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-[#222] mb-1">
                          Question {index + 1}
                        </h4>
                        <p className="text-xs text-[#757575] font-normal mb-2">{question.questionText}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {question.isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="h-5 w-5 border-2 border-red-500 rounded-full"></div>
                        )}
                        <span className={`text-sm font-normal ${
                          question.isCorrect ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {question.score}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-[#757575]">Your Answer: </span>
                        <span className="font-medium">{question.userAnswer}</span>
                      </div>
                      <div>
                        <span className="text-[#757575]">Correct Answer: </span>
                        <span className="font-medium text-green-600">{question.correctAnswer}</span>
                      </div>
                      <div>
                        <span className="text-[#757575]">Time: </span>
                        <span className="font-medium">{question.timeTaken}s</span>
                      </div>
                    </div>
                    
                    {question.feedback && (
                      <div className="mt-3 p-2 bg-white/50 rounded border">
                        <p className="text-xs text-[#757575]">{question.feedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Performance Insights Tab */}
          {activeTab === 'insights' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              className="space-y-6"
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Recommendations */}
              <div>
                <h3 className="text-sm font-semibold text-[#222] mb-4 flex items-center gap-2">
                  Personalized Recommendations
                </h3>
                <div className="space-y-3 text-xs">
                  {results.recommendations.map((recommendation, index) => (
                    <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Insights */}
              {/* {results.marketInsights && (
                <div>
                  <h3 className="text-sm font-semibold text-[#222] mb-4 flex items-center gap-2">
                    Market Insights
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg shadow-md">
                      <div className="text-base font-semibold mb-1 text-[#005DDC]">
                        {results.marketInsights.salaryRange}
                      </div>
                      <div className="text-xs">Salary Range</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-md">
                      <div className="text-base font-semibold mb-1 text-[#005DDC] capitalize">
                        {results.marketInsights.demandLevel}
                      </div>
                      <div className="text-xs">Demand Level</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-md">
                      <div className="text-base font-semibold mb-1 text-[#005DDC]">
                        {results.marketInsights.jobOpenings.toLocaleString()}
                      </div>
                      <div className="text-xs">Job Openings</div>
                    </div>
                  </div>
                </div>
              )} */}
            </motion.div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white border border-gray-200 rounded-lg p-6"
      >
        <h3 className="text-sm font-semibold text-[#222] mb-4">What's Next?</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* <button
            onClick={onViewRecommendations}
            className="flex items-center gap-3 p-4  cursor-pointer bg-blue-50 text-[#005DDC] rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="text-left">
              <div className="font-semibold text-sm">View Learning Resources</div>
              <div className="text-[10px] opacity-75">Personalized recommendations</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </button> */}

          <button
            onClick={onRetakeAssessment}
            className="flex items-center gap-3 p-4  cursor-pointer bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <div className="text-left">
              <div className="font-semibold text-sm">Retake Assessment</div>
              <div className="text-[10px] opacity-75">Improve your score</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </button>

          <button
            onClick={onDownloadReport}
            className="flex items-center gap-3 p-4  cursor-pointer bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
          >
            <div className="text-left">
              <div className="font-semibold text-sm">Download Report</div>
              <div className="text-[10px] opacity-75">PDF certificate</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </button>

          <button
            onClick={onShareResults}
            className="flex items-center gap-3 p-4  cursor-pointer  bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <div className="text-left">
              <div className="font-semibold text-sm">Share Results</div>
              <div className="text-[10px] opacity-75">LinkedIn & social media</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AssessmentResults;