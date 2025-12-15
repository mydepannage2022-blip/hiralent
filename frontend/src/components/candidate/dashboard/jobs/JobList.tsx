'use client';

import React from 'react';
import JobCard from './JobCard';
import { Job, JobRecommendation } from '@/src/lib/jobs/jobs.api';
import { Loader2 } from 'lucide-react';

interface JobListProps {
  jobs: JobRecommendation[] | Job[];
  isLoading: boolean;
  showMatchScore?: boolean;
}

const JobList: React.FC<JobListProps> = ({ jobs, isLoading, showMatchScore = false }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-600">
            Try adjusting your filters or check back later for new opportunities.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {jobs.map((item) => {
        // Check if it's a JobRecommendation or Job
        const isRecommendation = 'job' in item;
        const job = isRecommendation ? (item as JobRecommendation).job : (item as Job);
        const matchScore = isRecommendation ? (item as JobRecommendation).match_score : undefined;

        return (
          <JobCard
            key={job.job_id}
            job={job}
            matchScore={matchScore}
            showMatchScore={showMatchScore}
          />
        );
      })}
    </div>
  );
};

export default JobList;
