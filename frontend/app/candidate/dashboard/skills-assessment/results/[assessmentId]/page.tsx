"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AssessmentResults from '@/src/components/candidate/dashboard/skills-assessment/AssessmentResults';
import SkillBreakdown from '@/src/components/candidate/dashboard/skills-assessment/SkillBreakdown';
import RecommendationsCard from '@/src/components/candidate/dashboard/skills-assessment/RecommendationsCard';

const AssessmentResultsPage = () => {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'results' | 'breakdown' | 'recommendations'>('results');

  // Mock results data - replace with API call
  const mockResults = {
    assessmentId: assessmentId,
    skillName: 'React',
    assessmentType: 'Comprehensive Assessment',
    overallScore: 78,
    skillLevel: 'Intermediate',
    completedAt: new Date().toISOString(),
    timeSpent: 1680, // in seconds
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
      },
      {
        questionId: 'q2',
        questionText: 'Explain the concept of React Hooks and provide an example of useState.',
        userAnswer: 'Hooks are functions that let you use state and other React features in functional components.',
        correctAnswer: 'Hooks are functions that allow functional components to use state and lifecycle features.',
        isCorrect: false,
        score: 65,
        timeTaken: 120,
        difficulty: 'INTERMEDIATE' as const,
        feedback: 'Good basic understanding, but could provide more detailed examples.',
        category: 'React Hooks'
      }
    ],
    marketInsights: {
      salaryRange: '$75k - $120k',
      demandLevel: 'high' as const,
      jobOpenings: 15420
    }
  };

  // Mock skill breakdown data
  const mockSkillBreakdown = {
    skillName: 'React',
    overallScore: 78,
    skillLevel: 'Intermediate',
    strengths: [
      {
        name: 'Component Architecture',
        score: 92,
        category: 'Architecture',
        description: 'Excellent understanding of component design patterns',
        confidence: 95
      },
      {
        name: 'JSX & Rendering',
        score: 88,
        category: 'Core Concepts',
        description: 'Strong grasp of JSX syntax and conditional rendering',
        confidence: 90
      }
    ],
    weaknesses: [
      {
        name: 'Performance Optimization',
        score: 45,
        category: 'Advanced',
        description: 'Limited knowledge of React performance optimization techniques',
        improvement: 'Practice React.memo, useMemo, and useCallback patterns',
        priority: 'high' as const
      },
      {
        name: 'Testing',
        score: 52,
        category: 'Quality Assurance',
        description: 'Basic testing knowledge but lacks advanced testing strategies',
        improvement: 'Learn Jest, React Testing Library, and component testing best practices',
        priority: 'medium' as const
      }
    ],
    recommendations: [
      'Focus on React performance optimization techniques',
      'Practice writing comprehensive unit tests',
      'Learn advanced React patterns like render props and HOCs',
      'Study React DevTools for debugging and profiling'
    ],
    marketInsights: {
      salaryRange: '$75k - $120k',
      demandLevel: 'high' as const,
      trendDirection: 'up' as const,
      jobOpenings: 15420
    }
  };

  // Mock recommendations data
  const mockRecommendations = {
    skillName: 'React',
    currentLevel: 'Intermediate',
    overallScore: 78,
    learningResources: [
      {
        id: '1',
        title: 'React Performance Optimization',
        type: 'course' as const,
        provider: 'React Training',
        duration: '4 hours',
        difficulty: 'ADVANCED' as const,
        rating: 4.8,
        url: 'https://example.com/react-performance',
        price: 'paid',
        description: 'Deep dive into React performance patterns and optimization techniques',
        tags: ['performance', 'optimization', 'advanced']
      },
      {
        id: '2',
        title: 'Testing React Components',
        type: 'course' as const,
        provider: 'Testing Library',
        duration: '3 hours',
        difficulty: 'INTERMEDIATE' as const,
        rating: 4.7,
        url: 'https://example.com/react-testing',
        price: 'free',
        description: 'Learn to test React components effectively with modern testing tools',
        tags: ['testing', 'jest', 'react-testing-library']
      }
    ],
    skillRecommendations: [
      {
        skill: 'TypeScript with React',
        reason: 'Enhance code reliability and developer experience',
        priority: 'high' as const,
        marketValue: '+15% salary potential',
        timeToLearn: '4-6 weeks'
      },
      {
        skill: 'Next.js Framework',
        reason: 'Popular React framework for production applications',
        priority: 'medium' as const,
        marketValue: '+20% job opportunities',
        timeToLearn: '3-4 weeks'
      }
    ],
    careerPaths: [
      {
        id: '1',
        title: 'Senior Frontend Developer',
        description: 'Lead frontend development with advanced React skills',
        steps: [
          'Master React performance optimization',
          'Learn advanced state management (Redux Toolkit)',
          'Gain experience with React testing strategies',
          'Understand micro-frontend architectures'
        ],
        timeEstimate: '8-12 months',
        salaryRange: '$90k - $140k',
        demandLevel: 'high' as const
      }
    ],
    nextSteps: [
      'Complete a React performance optimization course',
      'Build a project using React.memo and useMemo',
      'Write comprehensive tests for a React application',
      'Learn and implement a state management solution',
      'Study Next.js for full-stack React development'
    ]
  };

  useEffect(() => {
    // Mock API call to fetch results
    const fetchResults = async () => {
      try {
        setLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch results:', error);
        setLoading(false);
      }
    };

    fetchResults();
  }, [assessmentId]);

  const handleRetakeAssessment = () => {
    router.push(`/candidate/dashboard/skills-assessment/start?skill=react`);
  };

  const handleDownloadReport = async () => {
    // Mock download functionality
    console.log('Downloading report for assessment:', assessmentId);
    alert('Report download started! Check your downloads folder.');
  };

  const handleShareResults = () => {
    const shareText = `I just completed a ${mockResults.skillName} assessment and scored ${mockResults.overallScore}%! 🎉`;
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      navigator.share({
        title: 'My Assessment Results',
        text: shareText,
        url: shareUrl
      });
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      alert('Results link copied to clipboard!');
    }
  };

  const handleViewRecommendations = () => {
    setActiveTab('recommendations');
  };

  const handleBackToDashboard = () => {
    router.push('/candidate/dashboard/skills-assessment');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-[#222] mb-2">Analyzing Your Performance</h2>
          <p className="text-[#757575]">Please wait while we prepare your detailed results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={handleBackToDashboard}
                className="flex items-center gap-2 text-[#757575] hover:text-[#222] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Assessments
              </button>
              
              {/* Tab Navigation */}
              <div className="flex gap-6">
                {[
                  { key: 'results', label: 'Results Overview' },
                  { key: 'breakdown', label: 'Skill Analysis' },
                  { key: 'recommendations', label: 'Recommendations' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`pb-2 border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-[#005DDC] text-[#005DDC] font-medium'
                        : 'border-transparent text-[#757575] hover:text-[#222]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {activeTab === 'results' && (
          <AssessmentResults
            results={mockResults}
            onRetakeAssessment={handleRetakeAssessment}
            onDownloadReport={handleDownloadReport}
            onShareResults={handleShareResults}
            onViewRecommendations={handleViewRecommendations}
            onBackToDashboard={handleBackToDashboard}
            showCelebration={true}
          />
        )}

        {activeTab === 'breakdown' && (
          <SkillBreakdown
            skillName={mockSkillBreakdown.skillName}
            overallScore={mockSkillBreakdown.overallScore}
            skillLevel={mockSkillBreakdown.skillLevel}
            strengths={mockSkillBreakdown.strengths}
            weaknesses={mockSkillBreakdown.weaknesses}
            recommendations={mockSkillBreakdown.recommendations}
            marketInsights={mockSkillBreakdown.marketInsights}
          />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationsCard
            skillName={mockRecommendations.skillName}
            currentLevel={mockRecommendations.currentLevel}
            overallScore={mockRecommendations.overallScore}
            learningResources={mockRecommendations.learningResources}
            skillRecommendations={mockRecommendations.skillRecommendations}
            careerPaths={mockRecommendations.careerPaths}
            nextSteps={mockRecommendations.nextSteps}
          />
        )}
      </div>
    </div>
  );
};

export default AssessmentResultsPage;