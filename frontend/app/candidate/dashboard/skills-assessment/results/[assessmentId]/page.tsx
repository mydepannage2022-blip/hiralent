"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AssessmentResults from '@/src/components/candidate/dashboard/skills-assessment/AssessmentResults';
import SkillRecommendationsTab from '@/src/components/candidate/dashboard/skills-assessment/SkillRecommendationsTab';
import { useAssessmentResults, useSkillRecommendations } from '@/src/lib/profile/assessment.queries';
import { AssessmentResults as AssessmentResultsType } from '@/src/types/assessment.types';

const AssessmentResultsPage = () => {
  const router = useRouter();
  const params = useParams();
  // Guard useParams() which can be null/undefined in some Next runtime/type contexts
  const assessmentId = params?.assessmentId ? String(params.assessmentId) : '';

  const [activeTab, setActiveTab] = useState<'results' | 'breakdown' | 'recommendations'>('results');

  const { 
    data: resultsResponse, 
    isLoading: isLoadingResults, 
    error: resultsError 
  } = useAssessmentResults(assessmentId, Boolean(assessmentId));

  const { 
    data: recommendationsResponse, 
    isLoading: isLoadingRecommendations 
  } = useSkillRecommendations();

  useEffect(() => {
    if (!assessmentId) {
      toast.error('Assessment ID not found');
      if (typeof window !== 'undefined') router.push('/candidate/dashboard/skills-assessment');
    }
  }, [assessmentId, router]);

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

  const resultsData = resultsResponse?.success 
    ? transformResultsData(resultsResponse) 
    : null;

  const handleRetakeAssessment = () => {
    router.push('/candidate/dashboard/skills-assessment/start');
  };

  const handleDownloadReport = () => {
    toast.success('Report download started!');
  };

  const handleShareResults = () => {
    if (!resultsData) return;
    
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

  if (isLoadingResults) {
    return (
      <div className="bg-gray-50 py-8">
        <div className="px-4">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#005DDC] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-[#222] mb-2">Loading Your Results</h2>
            <p className="text-[#757575]">Analyzing your performance and generating insights...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!resultsData) {
    return (
      <div className="bg-gray-50 py-8">
        <div className="px-4">
          <div className="bg-white rounded-lg p-8 shadow-sm text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-[#222] mb-2">Unable to Load Results</h3>
            <p className="text-[#757575] mb-6">
              {resultsError?.message || 'Failed to fetch assessment results. Please try again.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleBackToDashboard}
                className="px-6 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 border border-gray-300 text-[#757575] rounded-md hover:bg-gray-50 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'results', label: 'Results Overview' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="">
        {/* Content */}
        <div className="w-full">
          {activeTab === 'results' && (
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
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultsPage;