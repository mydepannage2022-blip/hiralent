// frontend/app/candidate/dashboard/skills-assessment/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import AssessmentCard from '@/src/components/candidate/dashboard/skills-assessment/AssessmentCard';
import Button from '@/src/components/layout/Button';
import SmartLink from '@/src/components/layout/SmartLink';
import { useProfile } from '@/src/context/ProfileContext';
import { useAssessmentHistory } from '@/src/lib/profile/assessment.queries';
import { HistoryItem, AssessmentHistory } from '@/src/types/assessment.types';

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

const AssessmentHubPage = () => {
  const router = useRouter();
  const { profileData } = useProfile();

  const { 
    data: historyResponse, 
    isLoading: isLoadingHistory, 
    error: historyError 
  } = useAssessmentHistory();

  const historyData = historyResponse as AssessmentHistory | undefined;
  const realAssessmentHistory: HistoryItem[] = historyData?.success ? historyData.data.assessments : [];

  const [availableAssessments, setAvailableAssessments] = useState<any[]>([]);

  const assessmentHistory = realAssessmentHistory.map(history => ({
    id: history.assessmentId,
    skillName: history.skillCategory,
    assessmentType: 'Assessment',
    score: history.overallScore,
    skillLevel: history.skillLevel,
    completedAt: history.completedAt,
    status: 'completed' as const,
    timeSpent: 'Completed',
    questionsAnswered: 25,
    totalQuestions: 25
  }));

  useEffect(() => {
    if (profileData?.skills && profileData.skills.length > 0 && realAssessmentHistory.length > 0) {
      const completedSkillsAssessments = profileData.skills
        .filter((skill: ProfileSkill) => {
          return realAssessmentHistory.some(
            history => history.skillCategory.toLowerCase() === skill.skill_name.toLowerCase()
          );
        })
        .map((skill: ProfileSkill) => {
          const completedAssessment = realAssessmentHistory.find(
            history => history.skillCategory.toLowerCase() === skill.skill_name.toLowerCase()
          );

          return {
            id: `${skill.skill_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-assessment`,
            name: skill.skill_name,
            description: `${skill.skill_category.charAt(0).toUpperCase() + skill.skill_category.slice(1)} skill assessment covering ${skill.proficiency} level concepts with ${skill.years_experience} years experience`,
            questionCount: skill.proficiency === 'beginner' ? 15 : skill.proficiency === 'intermediate' ? 20 : 25,
            timeEstimate: skill.proficiency === 'beginner' ? '15-20 mins' : skill.proficiency === 'intermediate' ? '25-30 mins' : '35-40 mins',
            difficulty: skill.proficiency.toUpperCase() as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
            isRecommended: skill.confidence_score < 70 || !skill.is_verified,
            isCompleted: true, 
            lastScore: completedAssessment?.overallScore,
            category: skill.skill_category === 'technical' ? 'Programming' : 
                     skill.skill_category === 'soft' ? 'Soft Skills' : 'Certification'
          };
        });
      
      setAvailableAssessments(completedSkillsAssessments);
    } else {
      // Empty state - no completed assessments
      setAvailableAssessments([]);
    }
  }, [profileData?.skills, realAssessmentHistory]);

  const handleStartAssessment = (assessmentId: string) => {
    router.push(`/candidate/dashboard/skills-assessment/instructions?skill=${assessmentId}`);
  };

  const handleNewAssessment = () => {
    router.push('/candidate/dashboard/skills-assessment/start');
  };

  const handleViewResults = (assessmentId: string) => {
    router.push(`/candidate/dashboard/skills-assessment/results/${assessmentId}`);
  };

  // Loading state
  if (isLoadingHistory) {
    return (
      <div className="bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-4 mx-auto"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-8 mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg p-6 border border-gray-200">
                  <div className="h-6 bg-gray-300 rounded mb-3"></div>
                  <div className="h-4 bg-gray-300 rounded mb-4"></div>
                  <div className="h-10 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      <div className="mx-auto space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <SmartLink
              href="/candidate/dashboard/skills-assessment/start"
              className="px-4 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors text-sm"
            >
              Start Assessments
            </SmartLink>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#222]">Recent Assessments</h2>
            <SmartLink
              href="/candidate/dashboard/skills-assessment/history"
              className="text-sm text-[#005DDC] hover:underline"
            >
              View All History
            </SmartLink>
          </div>

          {assessmentHistory.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200">
                {assessmentHistory.slice(0, 5).map((history, index) => (
                  <motion.div
                    key={history.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-[#222]">{history.skillName}</h3>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                            {history.assessmentType}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                            {history.skillLevel}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[#757575]">
                          <span>Score: {history.score}%</span>
                          <span>Status: {history.timeSpent}</span>
                          <span>Completed: {new Date(history.completedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <SmartLink
                        href={`/candidate/dashboard/skills-assessment/results/${history.id}`}
                        className="px-4 py-2 text-sm text-[#005DDC] border border-[#005DDC] rounded-md hover:bg-blue-50 transition-colors"
                      >
                        View Results
                      </SmartLink>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
              <div className="text-[#757575] mb-4">No assessments completed yet</div>
              <p className="text-sm text-[#757575] mb-6">
                Take your first assessment to track your skill progress
              </p>
              <SmartLink
                href="/candidate/dashboard/skills-assessment/start"
                className="px-6 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors inline-block"
              >
                Take Your First Assessment
              </SmartLink>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
};

export default AssessmentHubPage;