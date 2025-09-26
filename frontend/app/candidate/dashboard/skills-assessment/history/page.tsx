// frontend/app/candidate/dashboard/skills-assessment/history/page.tsx

"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  Target, 
  Award, 
  TrendingUp, 
  Calendar,
  Eye,
  RefreshCw,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useAssessmentHistory } from '@/src/lib/profile/assessment.queries';
import { formatTimeSpent, getSkillLevelColor, getScoreColor } from '@/src/lib/profile/assessment.api';
import { HistoryItem, AssessmentHistory } from '@/src/types/assessment.types';
import SmartLink from '@/src/components/layout/SmartLink';

const AssessmentHistoryPage = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'COMPLETED' | 'IN_PROGRESS' | 'ABANDONED'>('all');
  const [skillFilter, setSkillFilter] = useState<string>('all');

  const { 
    data: historyResponse, 
    isLoading, 
    error, 
    refetch 
  } = useAssessmentHistory();

  // Simple type assertion - no complex casting needed
  const historyData = historyResponse as AssessmentHistory | undefined;
  const assessments: HistoryItem[] = historyData?.success ? historyData.data.assessments : [];
  const totalAssessments: number = historyData?.success ? historyData.data.total : 0;
  const skillProgress = historyData?.success ? historyData.data.skillProgress : {};

  // Get unique skills for filter dropdown
  const availableSkills: string[] = Array.from(new Set(assessments.map((a: HistoryItem) => a.skillCategory)));

  // Filter assessments based on search and filters
  const filteredAssessments: HistoryItem[] = assessments.filter((assessment: HistoryItem) => {
    const matchesSearch = assessment.skillCategory.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || assessment.status === statusFilter;
    const matchesSkill = skillFilter === 'all' || assessment.skillCategory === skillFilter;
    
    return matchesSearch && matchesStatus && matchesSkill;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'ABANDONED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'ABANDONED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleViewResults = (assessmentId: string) => {
    router.push(`/candidate/dashboard/skills-assessment/results/${assessmentId}`);
  };

  const calculateAverageScore = (): number => {
    const completedAssessments = assessments.filter((a: HistoryItem) => a.status === 'COMPLETED');
    if (completedAssessments.length === 0) return 0;
    
    const totalScore = completedAssessments.reduce((acc: number, a: HistoryItem) => acc + a.overallScore, 0);
    return Math.round(totalScore / completedAssessments.length);
  };

  const getCompletedCount = (): number => {
    return assessments.filter((a: HistoryItem) => a.status === 'COMPLETED').length;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6">
                  <div className="h-4 bg-gray-300 rounded w-2/3 mb-2"></div>
                  <div className="h-6 bg-gray-300 rounded w-1/3"></div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6">
                  <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-[#222] mb-2">Failed to Load History</h2>
            <p className="text-[#757575] mb-4">We couldn't load your assessment history</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#222]">Assessment History</h1>
            <p className="text-[#757575] mt-1">
              View your completed assessments and track your progress
            </p>
          </div>
          <SmartLink
            href="/candidate/dashboard/skills-assessment"
            className="px-4 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors"
          >
            Take New Assessment
          </SmartLink>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Target className="h-5 w-5 text-[#005DDC]" />
              </div>
              <div>
                <p className="text-sm text-[#757575]">Total Assessments</p>
                <p className="text-2xl font-bold text-[#222]">{totalAssessments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-[#757575]">Completed</p>
                <p className="text-2xl font-bold text-[#222]">{getCompletedCount()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-[#757575]">Average Score</p>
                <p className="text-2xl font-bold text-[#222]">{calculateAverageScore()}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#757575]" />
              <input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#005DDC] focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#005DDC] focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ABANDONED">Abandoned</option>
            </select>

            {/* Skill Filter */}
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#005DDC] focus:border-transparent"
            >
              <option value="all">All Skills</option>
              {availableSkills.map((skill: string) => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Assessment List */}
        <div className="space-y-4">
          {filteredAssessments.length > 0 ? (
            filteredAssessments.map((assessment: HistoryItem, index: number) => (
              <motion.div
                key={assessment.assessmentId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-[#222]">
                        {assessment.skillCategory}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(assessment.status)}`}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(assessment.status)}
                          {assessment.status.replace('_', ' ').toLowerCase()}
                        </div>
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-md ${getSkillLevelColor(assessment.skillLevel)}`}>
                        {assessment.skillLevel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-[#757575]">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        <span className={getScoreColor(assessment.overallScore)}>
                          {assessment.overallScore}% Score
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{formatTimeSpent(assessment.timeSpent)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <span>{assessment.totalQuestions} Questions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(assessment.completedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {assessment.improvement && (
                      <div className="mt-2 text-sm text-green-600">
                        <TrendingUp className="h-4 w-4 inline mr-1" />
                        {assessment.improvement}
                      </div>
                    )}
                  </div>

                  {assessment.status === 'COMPLETED' && (
                    <button
                      onClick={() => handleViewResults(assessment.assessmentId)}
                      className="flex items-center gap-2 px-4 py-2 text-[#005DDC] border border-[#005DDC] rounded-md hover:bg-blue-50 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      View Results
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-[#222] mb-2">No Assessments Found</h3>
              <p className="text-[#757575] mb-6">
                {searchQuery || statusFilter !== 'all' || skillFilter !== 'all' 
                  ? 'No assessments match your current filters. Try adjusting your search criteria.' 
                  : 'You haven\'t taken any assessments yet. Start your first assessment to track your progress!'
                }
              </p>
              {(!searchQuery && statusFilter === 'all' && skillFilter === 'all') && (
                <SmartLink
                  href="/candidate/dashboard/skills-assessment"
                  className="px-6 py-3 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors"
                >
                  Take Your First Assessment
                </SmartLink>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        {filteredAssessments.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-[#757575]">
              Showing {filteredAssessments.length} of {totalAssessments} assessments
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentHistoryPage;