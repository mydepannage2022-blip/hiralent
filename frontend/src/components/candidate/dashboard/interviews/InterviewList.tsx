'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Search, Loader2 } from 'lucide-react';
import InterviewCard from './InterviewCard';
import type { CandidateInterviewListItem, AIInterviewStatus } from '@/src/types/interview.types';

interface InterviewListProps {
  interviews: CandidateInterviewListItem[];
  isLoading: boolean;
  error: string | null;
  onStartInterview: (interviewId: string) => void;
  onViewInterview: (interviewId: string) => void;
}

type FilterTab = 'all' | 'pending' | 'completed';

const InterviewList: React.FC<InterviewListProps> = ({
  interviews,
  isLoading,
  error,
  onStartInterview,
  onViewInterview,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
  ];

  const filteredInterviews = interviews.filter((interview) => {
    // Filter by status
    if (activeFilter === 'pending') {
      if (interview.status !== 'PENDING' && interview.status !== 'IN_PROGRESS') {
        return false;
      }
    } else if (activeFilter === 'completed') {
      if (interview.status !== 'COMPLETED') {
        return false;
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        interview.jobTitle.toLowerCase().includes(query) ||
        interview.companyName?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#005DDC] animate-spin mb-4" />
        <p className="text-gray-500">Loading your interviews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-[#005DDC] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeFilter === tab.key
                  ? 'bg-white text-[#005DDC] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by job or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#005DDC] focus:border-transparent w-full sm:w-64"
          />
        </div>
      </div>

      {/* Interview Grid */}
      {filteredInterviews.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-medium text-gray-900 mb-2">No interviews found</h3>
          <p className="text-gray-500 text-sm text-center max-w-sm">
            {interviews.length === 0
              ? "You don't have any interviews assigned yet. Check back later!"
              : 'No interviews match your current filters.'}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredInterviews.map((interview) => (
              <InterviewCard
                key={interview.interviewId}
                interview={interview}
                onStart={() => onStartInterview(interview.interviewId)}
                onView={() => onViewInterview(interview.interviewId)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default InterviewList;
