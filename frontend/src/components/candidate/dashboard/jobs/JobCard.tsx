'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Briefcase, Clock, TrendingUp, Building2 } from 'lucide-react';
import { Job, JobRecommendation } from '@/src/lib/jobs/jobs.api';
import { createConversation } from '@/src/lib/message/message.api';

interface JobCardProps {
  job: Job;
  matchScore?: number;
  showMatchScore?: boolean;
}


const JobCard: React.FC<JobCardProps> = ({ job, matchScore, showMatchScore = false }) => {
  const router = useRouter();

  const [isMessaging, setIsMessaging] = useState(false);

  
  const handleMessageCompany = async () => {
    if (!job.company_id) {
      alert('Company information not available');
      return;
    }

    setIsMessaging(true);
    try {
      const response = await createConversation({
        participant_id: job.company_id,
      });
      
      if (response.success && response.data?.conversation_id) {
        router.push(`/candidate/dashboard/messages?conversation=${response.data.conversation_id}`);
      } else {
        alert('Failed to start conversation');
      }
    } catch (error) {
      console.error('Message error:', error);
      alert('Failed to start conversation');
    } finally {
      setIsMessaging(false);
    }
  };


  const handleClick = () => {
    router.push(`/job/jobdetails/${job.job_id}`);
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-blue-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Company Logo */}
          <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            {job.companyProfile?.logo_url ? (
              <img
                src={job.companyProfile.logo_url}
                alt={job.companyProfile.company_name || 'Company'}
                className="w-12 h-12 object-contain rounded"
              />
            ) : (
              <Building2 className="w-8 h-8 text-gray-400" />
            )}
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
              {job.title}
            </h3>
            <p className="text-sm text-gray-600 truncate">
              {job.companyProfile?.company_name || job.company?.full_name || 'Company'}
            </p>
          </div>
        </div>

        {/* Match Score Badge */}
        {showMatchScore && matchScore !== undefined && (
          <div
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1 ${getMatchScoreColor(
              matchScore
            )}`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            {Math.round(matchScore)}% Match
          </div>
        )}
      </div>

      {/* Job Details */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-gray-600">
        {job.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            <span>{job.location}</span>
          </div>
        )}

        {job.job_type && (
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-4 h-4" />
            <span>{job.job_type}</span>
          </div>
        )}

        {job.experience_level && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{job.experience_level}</span>
          </div>
        )}
      </div>

      {/* Description Preview */}
      {job.description && (
        <p className="text-sm text-gray-700 mb-4 line-clamp-2">
          {job.description.replace(/<[^>]*>/g, '').substring(0, 150)}...
        </p>
      )}

{/* Footer */}
<div className="flex items-center justify-between pt-4 border-t border-gray-100">
  {/* Salary */}
  <div className="text-sm">
    {job.salary_range ? (
      <span className="font-semibold text-gray-900">{job.salary_range}</span>
    ) : (
      <span className="text-gray-500">Salary not disclosed</span>
    )}
  </div>

  {/* Right Side */}
  <div className="flex items-center gap-3">
    {/* Tags */}
    {job.remote_option && (
      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
        {job.remote_option}
      </span>
    )}
    {job.visa_sponsored && (
      <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
        Visa Sponsored
      </span>
    )}

    {/* Message Button */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleMessageCompany();
      }}
      disabled={isMessaging}
      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isMessaging ? 'Loading...' : 'Message'}
    </button>
  </div>
</div>

    </div>
  );
};

export default JobCard;
