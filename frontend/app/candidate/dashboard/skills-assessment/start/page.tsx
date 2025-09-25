"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AssessmentSetup from '@/src/components/candidate/dashboard/skills-assessment/AssessmentSetup';

const AssessmentStartPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const skillId = searchParams.get('skill');

  // Mock data - replace with actual API calls later
  const availableSkills = [
    {
      id: 'react',
      name: 'React',
      description: 'Frontend development with React library, hooks, state management',
      questionCount: 22,
      timeEstimate: '25-30 mins',
      difficulty: 'INTERMEDIATE' as const,
      isRecommended: true,
      category: 'Frontend'
    },
    {
      id: 'javascript',
      name: 'JavaScript',
      description: 'Core JavaScript programming, ES6+, async/await, DOM',
      questionCount: 25,
      timeEstimate: '30-35 mins',
      difficulty: 'INTERMEDIATE' as const,
      category: 'Programming'
    },
    {
      id: 'nodejs',
      name: 'Node.js',
      description: 'Backend development, Express, APIs, database integration',
      questionCount: 20,
      timeEstimate: '25-30 mins',
      difficulty: 'ADVANCED' as const,
      category: 'Backend'
    },
    {
      id: 'python',
      name: 'Python',
      description: 'Python programming, data structures, algorithms',
      questionCount: 23,
      timeEstimate: '28-32 mins',
      difficulty: 'INTERMEDIATE' as const,
      category: 'Programming'
    },
    {
      id: 'typescript',
      name: 'TypeScript',
      description: 'TypeScript development, type safety, advanced patterns',
      questionCount: 18,
      timeEstimate: '20-25 mins',
      difficulty: 'ADVANCED' as const,
      category: 'Programming'
    },
    {
      id: 'sql',
      name: 'SQL',
      description: 'Database queries, joins, optimization, stored procedures',
      questionCount: 20,
      timeEstimate: '22-28 mins',
      difficulty: 'INTERMEDIATE' as const,
      category: 'Database'
    }
  ];

  const handleStartAssessment = async (skillId: string, assessmentType: string) => {
    setIsLoading(true);
    
    try {
      // Mock API call - replace with actual API
      console.log('Starting assessment:', { skillId, assessmentType });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock assessment ID - would come from API response
      const assessmentId = `assessment_${Date.now()}`;
      
      // Navigate to instructions page
      router.push(`/candidate/dashboard/skills-assessment/instructions?id=${assessmentId}&skill=${skillId}&type=${assessmentType}`);
      
    } catch (error) {
      console.error('Failed to start assessment:', error);
      alert('Failed to start assessment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If skillId is provided, filter the available skills to show that one first
  const filteredSkills = skillId 
    ? [
        ...availableSkills.filter(skill => skill.id === skillId),
        ...availableSkills.filter(skill => skill.id !== skillId)
      ]
    : availableSkills;

  return (
    <div className="bg-gray-50">
      <div className="w-full mx-auto">
        <div className=" py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#757575] hover:text-[#222] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Assessments
          </button>
        </div>

        {/* Assessment Setup Component */}
        <AssessmentSetup
          availableSkills={filteredSkills}
          onStartAssessment={handleStartAssessment}
          isLoading={isLoading}
        />

        {/* Additional Information */}
        <div className="p-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-base font-semibold text-[#222] mb-8">Why Take Skills Assessments?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#005DDC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-medium text-[#222] mb-2">Validate Your Skills</h4>
                <p className="text-sm text-[#757575]">Get objective measurement of your technical abilities</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100  rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#005DDC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="font-medium text-[#222] mb-2">Identify Growth Areas</h4>
                <p className="text-sm text-[#757575]">Discover strengths and areas for improvement</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100  rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#005DDC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h4 className="font-medium text-[#222] mb-2">Get Learning Resources</h4>
                <p className="text-sm text-[#757575]">Receive personalized recommendations for improvement</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentStartPage;