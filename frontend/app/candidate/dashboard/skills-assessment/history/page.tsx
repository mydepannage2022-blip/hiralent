"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
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
  AlertCircle,
  Download,
  BarChart3,
  Brain,
  XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAssessmentHistory } from '@/src/lib/profile/assessment.queries';
import { HistoryItem, AssessmentHistory } from '@/src/types/assessment.types';

const AssessmentHistoryPage = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'skill'>('date');

  const { 
    data: historyResponse, 
    isLoading, 
    error, 
    refetch 
  } = useAssessmentHistory();

  const historyData = historyResponse as AssessmentHistory | undefined;
  const assessments: HistoryItem[] = historyData?.success ? historyData.data.assessments : [];
  const skillProgress = historyData?.success ? historyData.data.skillProgress : {};
  const summary = historyData?.success ? historyData.data.summary : null;

  const filteredAssessments = useMemo(() => {
    let filtered = assessments.filter((assessment) => {
      const matchesSearch = assessment.skillCategory.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSkill = skillFilter === 'all' || assessment.skillCategory === skillFilter;
      return matchesSearch && matchesSkill;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      } else if (sortBy === 'score') {
        return b.overallScore - a.overallScore;
      } else {
        return a.skillCategory.localeCompare(b.skillCategory);
      }
    });

    return filtered;
  }, [assessments, searchQuery, skillFilter, sortBy]);

  const uniqueSkills = useMemo(() => {
    return Array.from(new Set(assessments.map(a => a.skillCategory)));
  }, [assessments]);

  const handleViewResults = (assessmentId: string) => {
    router.push(`/candidate/dashboard/skills-assessment/results/${assessmentId}`);
  };

  const handleRetakeAssessment = (skillName: string) => {
    router.push('/candidate/dashboard/skills-assessment/start');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleExportHistory = () => {
    if (assessments.length === 0) return;

    const csvData = assessments.map(a => ({
      Skill: a.skillCategory,
      Score: a.overallScore,
      Level: a.skillLevel,
      'Questions Correct': `${a.correctAnswers}/${a.totalQuestions}`,
      'Time Spent': formatTime(a.timeSpent),
      'Completed At': new Date(a.completedAt).toLocaleDateString(),
      Improvement: a.improvement || 'N/A'
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => row[h as keyof typeof row]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg p-6 border border-gray-200">
                  <div className="h-16 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="h-64 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 py-8 px-4">
        <div className="">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#222] mb-2">Unable to Load History</h2>
            <p className="text-[#757575] mb-6">There was an error loading your assessment history.</p>
            <button
              onClick={() => refetch()}
              className="px-6 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center mb-8">
            <div className="w-full flex items-center justify-between gap-3 mt-4 lg:mt-0">
              <button
                onClick={() => router.push('/candidate/dashboard/skills-assessment')}
                className="px-4 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors"
              >
                Take New Assessment
              </button>


              {assessments.length > 0 && (
                <button
                  onClick={handleExportHistory}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 text-[#757575] rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              )}
              
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        {assessments.length > 0 && summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Target className="h-5 w-5 text-[#005DDC]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#757575]">Total Assessments</p>
                    <p className="text-2xl font-bold text-[#222]">{summary.totalAssessments}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Brain className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[#757575]">Unique Skills</p>
                    <p className="text-2xl font-bold text-[#222]">{summary.uniqueSkills}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[#757575]">Average Score</p>
                    <p className="text-2xl font-bold text-[#222]">{Math.round(summary.averageScore)}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[#757575]">Time Invested</p>
                    <p className="text-2xl font-bold text-[#222]">
                      {Math.round(summary.totalTimeSpent / 60)}m
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        {assessments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-white rounded-lg p-6 border border-gray-200 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#757575]" />
                  <input
                    type="text"
                    placeholder="Search skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005DDC] focus:border-transparent"
                  />
                </div>

                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005DDC] focus:border-transparent"
                >
                  <option value="all">All Skills</option>
                  {uniqueSkills.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'score' | 'skill')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005DDC] focus:border-transparent"
                >
                  <option value="date">Sort by Date</option>
                  <option value="score">Sort by Score</option>
                  <option value="skill">Sort by Skill</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Assessment History Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {filteredAssessments.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#757575] uppercase tracking-wider">
                        Skill
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#757575] uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#757575] uppercase tracking-wider">
                        Questions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#757575] uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#757575] uppercase tracking-wider">
                        Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#757575] uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#757575] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAssessments.map((assessment) => (
                      <tr
                        key={assessment.assessmentId}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-[#222]">
                            {assessment.skillCategory}
                          </div>
                          {assessment.improvement && (
                            <div className={`text-xs ${
                              assessment.improvement.startsWith('+') ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {assessment.improvement}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#222]">
                              {assessment.overallScore}%
                            </span>
                            <div className="w-16 h-2 rounded-full bg-gray-200">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  assessment.overallScore >= 80 ? 'bg-green-500' :
                                  assessment.overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${assessment.overallScore}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-medium">{assessment.correctAnswers}</span>
                            <span className="text-[#757575]">/</span>
                            <span className="text-[#757575]">{assessment.totalQuestions}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-sm text-[#757575]">
                            <Clock className="h-4 w-4" />
                            {formatTime(assessment.timeSpent)}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            assessment.skillLevel === 'EXPERT' ? 'bg-purple-100 text-purple-800' :
                            assessment.skillLevel === 'ADVANCED' ? 'bg-blue-100 text-blue-800' :
                            assessment.skillLevel === 'INTERMEDIATE' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {assessment.skillLevel}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#757575]">
                          {new Date(assessment.completedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewResults(assessment.assessmentId)}
                              className="text-[#005DDC] hover:text-[#004EB7] flex items-center gap-1 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </button>
                            <button
                              onClick={() => handleRetakeAssessment(assessment.skillCategory)}
                              className="text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Retake
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
              <AlertCircle className="h-12 w-12 text-[#757575] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#222] mb-2">
                {assessments.length === 0 ? 'No Assessments Yet' : 'No Assessments Found'}
              </h3>
              <p className="text-[#757575] mb-6">
                {assessments.length === 0 
                  ? 'You haven\'t completed any assessments yet. Start your first assessment to track your progress.' 
                  : 'No assessments match your current filters.'}
              </p>
              {(searchQuery || skillFilter !== 'all') && assessments.length > 0 ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSkillFilter('all');
                  }}
                  className="px-4 py-2 text-[#005DDC] border border-[#005DDC] rounded-md hover:bg-blue-50 transition-colors mr-4"
                >
                  Clear Filters
                </button>
              ) : null}
              <button
                onClick={() => router.push('/candidate/dashboard/skills-assessment')}
                className="px-6 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors"
              >
                Take Assessment
              </button>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
};

export default AssessmentHistoryPage;