"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import AssessmentCard from '@/src/components/candidate/dashboard/skills-assessment/AssessmentCard';
import Button from '@/src/components/layout/Button';

const AssessmentHubPage = () => {
  const router = useRouter();

  // Mock data - replace with actual API calls later
  const availableAssessments = [
    {
      id: 'javascript-assessment',
      name: 'JavaScript',
      description: 'Core JavaScript programming, ES6+, async/await, DOM manipulation',
      questionCount: 25,
      timeEstimate: '30-35 mins',
      difficulty: 'INTERMEDIATE' as const,
      isRecommended: false,
      isCompleted: true,
      lastScore: 78,
      category: 'Programming'
    },
  ];

  const assessmentHistory = [
    {
      id: '1',
      skillName: 'JavaScript',
      assessmentType: 'Comprehensive',
      score: 78,
      skillLevel: 'Intermediate',
      completedAt: '2024-01-15',
      status: 'completed' as const,
      timeSpent: '28m 45s',
      questionsAnswered: 25,
      totalQuestions: 25
    },
    {
      id: '2',
      skillName: 'HTML/CSS',
      assessmentType: 'Quick Check',
      score: 92,
      skillLevel: 'Advanced',
      completedAt: '2024-01-12',
      status: 'completed' as const,
      timeSpent: '12m 30s',
      questionsAnswered: 10,
      totalQuestions: 10
    }
  ];

  const handleStartAssessment = (assessmentId: string) => {
    router.push(`/candidate/dashboard/skills-assessment/start?skill=${assessmentId}`);
  };

  const handleNewAssessment = () => {
    router.push('/candidate/dashboard/skills-assessment/start');
  };
  const handleViewResults = (assessmentId: string) => {
    router.push(`/candidate/dashboard/skills-assessment/results/${assessmentId}`);
  };

  return (
    <div className="w-full mx-auto py-4">
      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-medium text-[#005DDC] mb-1">3</div>
          <div className="text-sm text-[#757575]">Available Tests</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-medium text-[#005DDC] mb-1">2</div>
          <div className="text-sm text-[#757575]">Completed</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-medium text-[#005DDC] mb-1">85%</div>
          <div className="text-sm text-[#757575]">Average Score</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-medium text-[#005DDC] mb-1">1h 20m</div>
          <div className="text-sm text-[#757575]">Total Time</div>
        </div>
      </motion.div>

      {/* Available Assessments */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-[#222]">Available Assessments</h2>
          {/* <span className="text-sm text-[#757575]">{availableAssessments.length} assessments</span> */}
         <Button
          variant="dark"
          text="Start New Assessment"
          onClick={() => handleNewAssessment()}
        />
        
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableAssessments.map((assessment, index) => (
            <motion.div
              key={assessment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <AssessmentCard
                {...assessment}
                onClick={() => handleStartAssessment(assessment.id)}
              />
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Recent History */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#222]">Recent Assessments</h2>
          <button className="text-sm text-[#005DDC] hover:underline">
            View All History
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {assessmentHistory.map((history, index) => (
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
                      <span>Time: {history.timeSpent}</span>
                      <span>Questions: {history.questionsAnswered}/{history.totalQuestions}</span>
                      <span>Completed: {new Date(history.completedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewResults(history.id)}
                    className="px-4 py-2 text-sm text-[#005DDC] border border-[#005DDC] rounded-md hover:bg-blue-50 transition-colors"
                  >
                    View Results
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {assessmentHistory.length === 0 && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <div className="text-[#757575] mb-4">No assessments completed yet</div>
            <button
              onClick={() => handleStartAssessment('react-assessment')}
              className="px-6 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors"
            >
              Take Your First Assessment
            </button>
          </div>
        )}
      </motion.section>
    </div>
  );
};

export default AssessmentHubPage;