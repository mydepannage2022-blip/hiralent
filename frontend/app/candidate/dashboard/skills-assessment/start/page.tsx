"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AssessmentSetup from '@/src/components/candidate/dashboard/skills-assessment/AssessmentSetup';
import { useProfile } from '@/src/context/ProfileContext';
import { useStartAssessment } from '@/src/lib/profile/assessment.queries';
import SmartLink from '@/src/components/layout/SmartLink';

interface ProfileSkill {
  skill_id: string;
  skill_name: string;
  skill_category: 'technical' | 'soft' | 'certification';
  proficiency: 'beginner' | 'intermediate' | 'advanced';
  years_experience: number;
  confidence_score: number;
  source_type: string;
  is_verified: boolean;
}

interface SkillCategory {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  timeEstimate: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  isRecommended?: boolean;
  category: string;
}

const AssessmentStartPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profileData } = useProfile();
  
  const skillId = searchParams.get('skill');
  
  const startAssessmentMutation = useStartAssessment();

  // Helper functions
  const getQuestionCountByProficiency = (proficiency: string, category: string): number => {
    const baseCount = {
      'beginner': 5,
      'intermediate': 5,
      'advanced': 5
    };

    const categoryMultiplier = {
      'technical': 1.2,
      'soft': 0.8,
      'certification': 1.0
    };

    const base = baseCount[proficiency as keyof typeof baseCount] || 15;
    const multiplier = categoryMultiplier[category as keyof typeof categoryMultiplier] || 1;
    
    return Math.round(base * multiplier);
  };

  const getTimeEstimateByProficiency = (proficiency: string, questionCount: number): string => {
    const timePerQuestion = {
      'beginner': 1.2,
      'intermediate': 1.5,
      'advanced': 1.8
    };

    const multiplier = timePerQuestion[proficiency as keyof typeof timePerQuestion] || 1.5;
    const totalMinutes = Math.round(questionCount * multiplier);
    const minTime = Math.max(10, totalMinutes - 3);
    const maxTime = totalMinutes + 5;

    return `${minTime}-${maxTime} mins`;
  };

  const mapProficiencyToDifficulty = (proficiency: string): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' => {
    switch(proficiency?.toLowerCase()) {
      case 'beginner': return 'BEGINNER';
      case 'intermediate': return 'INTERMEDIATE';
      case 'advanced': return 'ADVANCED';
      default: return 'INTERMEDIATE';
    }
  };

  const getCategoryDisplayName = (category: string): string => {
    switch(category?.toLowerCase()) {
      case 'technical': return 'Technical';
      case 'soft': return 'Soft Skills';
      case 'certification': return 'Certification';
      default: return 'General';
    }
  };

  const getSkillDescription = (skill: ProfileSkill): string => {
    const categoryDesc = {
      'technical': 'Technical proficiency assessment',
      'soft': 'Behavioral and interpersonal skills evaluation',
      'certification': 'Knowledge and expertise validation'
    };

    const proficiencyDesc = {
      'beginner': 'foundational concepts',
      'intermediate': 'practical applications',
      'advanced': 'expert-level scenarios'
    };

    const baseDesc = categoryDesc[skill.skill_category] || 'Skill assessment';
    const levelDesc = proficiencyDesc[skill.proficiency] || 'core concepts';
    const experience = skill.years_experience > 0 ? ` with ${skill.years_experience}+ years experience` : '';

    return `${baseDesc} focusing on ${levelDesc}${experience}`;
  };

  const transformSkillsForAssessment = (): SkillCategory[] => {
    if (!profileData?.skills || !Array.isArray(profileData.skills)) {
      return [];
    }

    const transformedSkills: SkillCategory[] = profileData.skills
      .filter((skill: ProfileSkill) => skill.skill_name && skill.skill_category)
      .map((skill: ProfileSkill) => {
        const questionCount = getQuestionCountByProficiency(skill.proficiency, skill.skill_category);
        const timeEstimate = getTimeEstimateByProficiency(skill.proficiency, questionCount);
        
        return {
          id: skill.skill_id,
          name: skill.skill_name,
          description: getSkillDescription(skill),
          questionCount,
          timeEstimate,
          difficulty: mapProficiencyToDifficulty(skill.proficiency),
          isRecommended: skill.confidence_score < 70 || !skill.is_verified,
          category: getCategoryDisplayName(skill.skill_category)
        };
      });

    return transformedSkills.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      
      const difficultyOrder = { 'ADVANCED': 3, 'INTERMEDIATE': 2, 'BEGINNER': 1, 'EXPERT': 4 };
      return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
    });
  };

  const handleStartAssessment = (skillId: string, assessmentType: string) => {
    const selectedSkill = profileData?.skills?.find((skill: ProfileSkill) => skill.skill_id === skillId);
    
    if (!selectedSkill) {
      toast.error('Selected skill not found');
      return;
    }

    console.log('Starting assessment:', { 
      skillId, 
      assessmentType, 
      skillName: selectedSkill.skill_name,
      proficiency: selectedSkill.proficiency 
    });

    toast.loading('Starting your assessment...', {
      id: 'start-assessment',
      duration: 5000
    });

    startAssessmentMutation.mutate({
      skillCategory: selectedSkill.skill_name,
      assessmentType: assessmentType as 'QUICK_CHECK' | 'COMPREHENSIVE',
      difficulty: mapProficiencyToDifficulty(selectedSkill.proficiency)
    });
  };

  const availableSkills = transformSkillsForAssessment();

  const filteredSkills = skillId 
    ? [
        ...availableSkills.filter(skill => skill.id === skillId),
        ...availableSkills.filter(skill => skill.id !== skillId)
      ]
    : availableSkills;

  return (
    <div className="bg-gray-50">
      <div className="w-full mx-auto">
        <div className="py-4 px-4">
          <SmartLink
            href="/candidate/dashboard/skills-assessment"
            className="flex items-center gap-2 text-[#757575] hover:text-[#222] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Assessments
          </SmartLink>
        </div>

        {/* Loading State */}
        {!profileData && (
          <div className="p-6 text-center">
            <div className="animate-pulse">
              <div className="w-8 h-8 border-4 border-[#005DDC] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-[#757575]">Loading your skills...</div>
            </div>
          </div>
        )}

        {/* No Skills State */}
        {profileData && availableSkills.length === 0 && (
          <div className="p-6 text-center">
            <div className="text-[#757575] mb-4">No skills available for assessment</div>
            <p className="text-sm text-[#757575] mb-6">
              Add skills to your profile to get personalized assessments
            </p>
            <SmartLink
              href="/candidate/dashboard/profile"
              className="px-6 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors"
            >
              Add Skills to Profile
            </SmartLink>
          </div>
        )}

        {/* Assessment Setup Component */}
        {availableSkills.length > 0 && (
          <AssessmentSetup
            availableSkills={filteredSkills}
            onStartAssessment={handleStartAssessment}
            isLoading={startAssessmentMutation.isPending}
          />
        )}

        {/* Additional Information */}
        {availableSkills.length > 0 && (
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
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-[#005DDC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-[#222] mb-2">Identify Growth Areas</h4>
                  <p className="text-sm text-[#757575]">Discover strengths and areas for improvement</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
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
        )}
      </div>
    </div>
  );
};

export default AssessmentStartPage;