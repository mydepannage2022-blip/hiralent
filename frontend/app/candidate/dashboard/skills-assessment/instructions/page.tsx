"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import InstructionsBrief from '@/src/components/candidate/dashboard/skills-assessment/InstructionsBrief';

const AssessmentInstructionsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const assessmentId = searchParams?.get?.('id') ?? '';
  const skillId = searchParams?.get?.('skill') ?? '';
  const assessmentType = (searchParams?.get?.('type') as 'QUICK_CHECK' | 'COMPREHENSIVE') ?? 'COMPREHENSIVE';

  // Mock assessment info - replace with API call later
  const [assessmentInfo, setAssessmentInfo] = useState({
    skillName: 'React',
    assessmentType: 'COMPREHENSIVE' as const,
    totalQuestions: 22,
    timeLimit: 30,
    difficulty: 'Intermediate',
    questionTypes: ['Multiple Choice', 'Coding', 'Scenario-Based', 'True/False']
  });

  // Update assessment info based on URL parameters
  useEffect(() => {
    if (skillId && assessmentType) {
      // Mock data mapping - replace with API call
      const skillMapping: Record<string, any> = {
        'react': {
          skillName: 'React',
          assessmentType: assessmentType,
          totalQuestions: assessmentType === 'QUICK_CHECK' ? 10 : 22,
          timeLimit: assessmentType === 'QUICK_CHECK' ? 15 : 30,
          difficulty: 'Intermediate',
          questionTypes: ['Multiple Choice', 'Coding', 'Scenario-Based']
        },
        'javascript': {
          skillName: 'JavaScript',
          assessmentType: assessmentType,
          totalQuestions: assessmentType === 'QUICK_CHECK' ? 12 : 25,
          timeLimit: assessmentType === 'QUICK_CHECK' ? 18 : 35,
          difficulty: 'Intermediate',
          questionTypes: ['Multiple Choice', 'Coding', 'True/False']
        },
        'nodejs': {
          skillName: 'Node.js',
          assessmentType: assessmentType,
          totalQuestions: assessmentType === 'QUICK_CHECK' ? 8 : 20,
          timeLimit: assessmentType === 'QUICK_CHECK' ? 12 : 28,
          difficulty: 'Advanced',
          questionTypes: ['Multiple Choice', 'Coding', 'Scenario-Based']
        },
        'python': {
          skillName: 'Python',
          assessmentType: assessmentType,
          totalQuestions: assessmentType === 'QUICK_CHECK' ? 10 : 23,
          timeLimit: assessmentType === 'QUICK_CHECK' ? 15 : 32,
          difficulty: 'Intermediate',
          questionTypes: ['Multiple Choice', 'Coding', 'Algorithm']
        },
        'typescript': {
          skillName: 'TypeScript',
          assessmentType: assessmentType,
          totalQuestions: assessmentType === 'QUICK_CHECK' ? 8 : 18,
          timeLimit: assessmentType === 'QUICK_CHECK' ? 12 : 25,
          difficulty: 'Advanced',
          questionTypes: ['Multiple Choice', 'Coding', 'Type Definitions']
        },
        'sql': {
          skillName: 'SQL',
          assessmentType: assessmentType,
          totalQuestions: assessmentType === 'QUICK_CHECK' ? 10 : 20,
          timeLimit: assessmentType === 'QUICK_CHECK' ? 15 : 28,
          difficulty: 'Intermediate',
          questionTypes: ['Multiple Choice', 'Query Writing', 'Database Design']
        }
      };

      const skillInfo = skillMapping[skillId] || skillMapping['react'];
      setAssessmentInfo(skillInfo);
    }
  }, [skillId, assessmentType]);

  const handleStartTest = async () => {
    if (!assessmentId) {
      console.error('Assessment ID not found');
      return;
    }

    setIsLoading(true);
    
    try {
      // Mock API call to actually start the assessment
      console.log('Starting assessment test:', assessmentId);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Navigate to the actual test page
      router.push(`/candidate/dashboard/skills-assessment/test/${assessmentId}`);
      
    } catch (error) {
      console.error('Failed to start test:', error);
      alert('Failed to start test. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  // Redirect if no assessment ID
  useEffect(() => {
    if (!assessmentId) {
      router.push('/candidate/dashboard/skills-assessment');
    }
  }, [assessmentId, router]);

  if (!assessmentId) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#757575]">Loading assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      {/* Back Navigation */}
      <div className="p-6 pb-0">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 text-[#757575] hover:text-[#222] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Setup
        </button>
      </div>

      {/* Instructions Component */}
      <InstructionsBrief
        assessmentInfo={assessmentInfo}
        onStartTest={handleStartTest}
        onGoBack={handleGoBack}
        isLoading={isLoading}
      />

      {/* Additional Tips */}
      <div className="w-full p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#222] mb-4">Pro Tips for Success</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-[#222] mb-2">Before Starting:</h4>
              <ul className="space-y-1 text-sm text-[#757575]">
                <li>• Close unnecessary browser tabs</li>
                <li>• Ensure stable internet connection</li>
                <li>• Find a quiet, distraction-free environment</li>
                <li>• Have a notepad ready for rough work</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-[#222] mb-2">During the Test:</h4>
              <ul className="space-y-1 text-sm text-[#757575]">
                <li>• Read questions carefully before answering</li>
                <li>• Don't spend too much time on one question</li>
                <li>• Use the elimination method for multiple choice</li>
                <li>• Review your answers if time permits</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentInstructionsPage;