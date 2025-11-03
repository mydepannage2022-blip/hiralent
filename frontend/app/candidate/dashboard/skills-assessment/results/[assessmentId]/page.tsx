// frontend/app/candidate/dashboard/skills-assessment/results/[assessmentId]/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AssessmentResults from '@/src/components/candidate/dashboard/skills-assessment/AssessmentResults';
import SkillRecommendationsTab from '@/src/components/candidate/dashboard/skills-assessment/SkillRecommendationsTab';
import RecommendationsCard from '@/src/components/candidate/dashboard/skills-assessment/RecommendationsCard';
import { useAssessmentResults, useSkillRecommendations } from '@/src/lib/profile/assessment.queries';
import { AssessmentResults as AssessmentResultsType } from '@/src/types/assessment.types';

const AssessmentResultsPage = () => {
  const router = useRouter();
  const params = useParams();
  // Guard useParams() which can be null/undefined in some Next runtime/type contexts
  const assessmentId = params?.assessmentId ? String(params.assessmentId) : '';

  const [activeTab, setActiveTab] = useState<'results' | 'breakdown' | 'recommendations'>('results');

  //REAL API INTEGRATION
  const { 
    data: resultsResponse, 
    isLoading: isLoadingResults, 
    error: resultsError 
  } = useAssessmentResults(assessmentId, Boolean(assessmentId));

  const { 
    data: recommendationsResponse, 
    isLoading: isLoadingRecommendations 
  } = useSkillRecommendations();

  // Handle no assessment ID
  useEffect(() => {
    if (!assessmentId) {
      toast.error('Assessment ID not found');
      if (typeof window !== 'undefined') router.push('/candidate/dashboard/skills-assessment');
    }
  }, [assessmentId, router]);

  // Handle API errors
  useEffect(() => {
    if (resultsError) {
      console.error('Results error:', resultsError);
      if (resultsError.message.includes('not completed')) {
        toast.error('Assessment not completed yet');
        router.push(`/candidate/dashboard/skills-assessment/test/${assessmentId}`);
      } else {
        toast.error('Failed to load assessment results');
      }
    }
  }, [resultsError, assessmentId, router]);

  //TRANSFORM API DATA TO COMPONENT FORMAT with null safety
  const transformResultsData = (apiData: AssessmentResultsType) => {
    if (!apiData?.success || !apiData.data) return null;

    return {
      assessmentId: apiData.data.assessmentId || '',
      skillName: apiData.data.skillCategory || 'Unknown Skill',
      assessmentType: 'Comprehensive Assessment',
      overallScore: apiData.data.overallScore || 0,
      skillLevel: apiData.data.skillLevel || 'Beginner',
      completedAt: apiData.data.completedAt || new Date().toISOString(),
      timeSpent: apiData.data.timeSpent || 0,
      totalQuestions: apiData.data.totalQuestions || 0,
      correctAnswers: apiData.data.correctAnswers || 0,
      incorrectAnswers: (apiData.data.totalQuestions || 0) - (apiData.data.correctAnswers || 0),
      partialAnswers: 0,
      strengths: apiData.data.strengths || [],
      weaknesses: apiData.data.weaknesses || [],
      recommendations: apiData.data.recommendations || [],
      questionResults: (apiData.data.questions || []).map(q => ({
        questionId: q.questionId || '',
        questionText: q.questionText || '',
        userAnswer: q.userAnswer || '',
        correctAnswer: q.correctAnswer || '',
        isCorrect: q.isCorrect || false,
        score: q.score || 0,
        timeTaken: q.timeTaken || 0,
        difficulty: (q.difficulty as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT') || 'BEGINNER',
        feedback: q.feedback || '',
        category: q.category || ''
      })),
      marketInsights: {
        salaryRange: '$60k - $120k',
        demandLevel: 'high' as const,
        jobOpenings: 15000
      }
    };
  };

  //FALLBACK MOCK DATA (when API fails)
  const mockResults = {
    assessmentId: assessmentId || 'mock-assessment',
    skillName: 'React',
    assessmentType: 'Comprehensive Assessment',
    overallScore: 78,
    skillLevel: 'Intermediate',
    completedAt: new Date().toISOString(),
    timeSpent: 1680,
    totalQuestions: 25,
    correctAnswers: 19,
    incorrectAnswers: 5,
    partialAnswers: 1,
    strengths: [
      'Strong understanding of React component lifecycle',
      'Excellent knowledge of JSX syntax and usage',
      'Good grasp of state management concepts'
    ],
    weaknesses: [
      'Need improvement in React Hooks advanced patterns',
      'Performance optimization techniques could be stronger',
      'Testing strategies need more practice'
    ],
    recommendations: [
      'Practice more with custom hooks and useEffect cleanup',
      'Study React.memo and useMemo for performance optimization',
      'Learn Jest and React Testing Library for better testing skills'
    ],
    questionResults: [
      {
        questionId: 'q1',
        questionText: 'What is the correct way to create a functional component in React?',
        userAnswer: 'Both A and B are correct',
        correctAnswer: 'Both A and B are correct',
        isCorrect: true,
        score: 100,
        timeTaken: 45,
        difficulty: 'BEGINNER' as const,
        feedback: 'Excellent! You understand the different ways to create React components.',
        category: 'React Basics'
      }
    ],
    marketInsights: {
      salaryRange: '$75k - $120k',
      demandLevel: 'high' as const,
      jobOpenings: 15420
    }
  };

  //DETERMINE DATA SOURCE (API or Mock) with null safety
  const resultsData = (resultsResponse && resultsResponse.success 
    ? transformResultsData(resultsResponse)
    : mockResults) || mockResults;

  const isUsingMockData = !resultsResponse || !resultsResponse.success || !resultsData;

  // Event handlers
  const handleRetakeAssessment = () => {
    router.push('/candidate/dashboard/skills-assessment/start');
  };

  const handleDownloadReport = () => {
    toast.success('Report download started!');
    // Implement actual download logic
  };

  const handleShareResults = () => {
    const shareText = `I scored ${resultsData.overallScore}% on ${resultsData.skillName} assessment!`;
    if (navigator.share) {
      navigator.share({
        title: 'My Assessment Results',
        text: shareText,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      toast.success('Results copied to clipboard!');
    }
  };

  const handleViewRecommendations = () => {
    setActiveTab('recommendations');
  };

  const handleBackToDashboard = () => {
    router.push('/candidate/dashboard/skills-assessment');
  };

  // Loading state
  if (isLoadingResults) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#005DDC] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-[#222] mb-2">Loading Your Results</h2>
            <p className="text-[#757575]">Analyzing your performance and generating insights...</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'results', label: 'Results Overview' },
    { id: 'breakdown', label: 'Skill Breakdown' },
    { id: 'recommendations', label: 'Recommendations' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#222] mb-2">
            Assessment Results
            {isUsingMockData && <span className="text-orange-600 text-lg ml-2">(Demo Mode)</span>}
          </h1>
          <p className="text-[#757575]">
            {resultsData.skillName} • Completed on {new Date(resultsData.completedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-[#005DDC] text-[#005DDC]'
                        : 'border-transparent text-[#757575] hover:text-[#222] hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content with null safety */}
        <div className="w-full">
          {activeTab === 'results' && resultsData && (
            <AssessmentResults
              results={resultsData}
              onRetakeAssessment={handleRetakeAssessment}
              onDownloadReport={handleDownloadReport}
              onShareResults={handleShareResults}
              onViewRecommendations={handleViewRecommendations}
              onBackToDashboard={handleBackToDashboard}
              showCelebration={true}
            />
          )}
          
          {activeTab === 'breakdown' && resultsData && (
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#222] mb-6">Detailed Skill Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div>
                  <h3 className="text-lg font-semibold text-green-600 mb-4">Strengths</h3>
                  <div className="space-y-3">
                    {resultsData.strengths.map((strength, index) => (
                      <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-green-800">{strength}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Areas for Improvement */}
                <div>
                  <h3 className="text-lg font-semibold text-orange-600 mb-4">Areas for Improvement</h3>
                  <div className="space-y-3">
                    {resultsData.weaknesses.map((weakness, index) => (
                      <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-orange-800">{weakness}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-[#222] mb-4">Learning Recommendations</h3>
                <div className="space-y-3">
                  {resultsData.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-blue-800">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <SkillRecommendationsTab />
          )}

          {/* No data fallback */}
          {!resultsData && !isLoadingResults && (
            <div className="bg-white rounded-lg p-8 shadow-sm text-center">
              <div className="text-gray-400 text-6xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-[#222] mb-2">No Results Available</h3>
              <p className="text-[#757575] mb-4">Unable to load assessment results</p>
              <button
                onClick={handleBackToDashboard}
                className="px-4 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* API Status Indicator */}
        {isUsingMockData && (
          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-orange-800 text-sm">
              <strong>Demo Mode:</strong> API results unavailable. Showing sample data for demonstration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentResultsPage;