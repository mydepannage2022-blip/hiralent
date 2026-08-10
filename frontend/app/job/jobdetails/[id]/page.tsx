'use client';

import React, { use } from 'react';
import { useJob } from '@/src/lib/jobs/jobs.queries';
import { MapPin, Briefcase, Clock, DollarSign, Building2, Globe, Loader2, ArrowLeft, Share2, Bookmark } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface JobDetailsPageProps {
  params: Promise<{ id: string }>;
}

const JobDetailsPage = ({ params }: JobDetailsPageProps) => {
  const { id } = use(params);
  const router = useRouter();

  const { data: job, isLoading, error } = useJob(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl text-gray-900 mb-2">Job not found</h2>
          <p className="text-gray-600 mb-4">
            The job you're looking for doesn't exist or has been removed.
          </p>
          <a
            href="/candidate/dashboard/jobs"
            className="text-blue-600 hover:text-blue-700 underline text-sm  "
          >
            Browse all jobs
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-22 pb-12">
      {/* Max Width Container - Same as Header */}
      <div className="max-w-7xl mx-auto">
        
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm  ">Back to jobs</span>
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Company Logo */}
            <div className="w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-sm flex items-center justify-center flex-shrink-0 border border-gray-200">
              {job.companyProfile?.logo_url ? (
                <img
                  src={job.companyProfile.logo_url}
                  alt={job.companyProfile.company_name || 'Company'}
                  className="w-20 h-20 object-contain rounded"
                />
              ) : (
                <Building2 className="w-12 h-12 text-gray-400" />
              )}
            </div>

            {/* Job Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl text-gray-900 mb-2">{job.title}</h1>
                  <p className="text-lg text-gray-700 text-sm ">
                    {job.companyProfile?.company_name || job.company?.full_name || 'Company'}
                  </p>
                </div>

                {/* Action Buttons (Desktop) */}
                <div className="hidden lg:flex items-center gap-3">
                  <button
                    className="p-2 border border-gray-300 rounded-sm hover:bg-gray-50 transition-colors"
                    title="Save job"
                  >
                    <Bookmark className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    className="p-2 border border-gray-300 rounded-sm hover:bg-gray-50 transition-colors"
                    title="Share job"
                  >
                    <Share2 className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Quick Details */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                {job.location && (
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-sm">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm  ">{job.location}</span>
                  </div>
                )}

                {job.job_type && (
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-sm">
                    <Briefcase className="w-4 h-4" />
                    <span className="text-sm  ">{job.job_type}</span>
                  </div>
                )}

                {job.experience_level && (
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-sm">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm  ">{job.experience_level}</span>
                  </div>
                )}

                {job.salary_range && (
                  <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-sm">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-green-700">{job.salary_range}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {job.remote_option && (
                  <span className="px-3 py-1.5 bg-purple-50 text-purple-700 text-sm rounded-sm border border-purple-200">
                    {job.remote_option}
                  </span>
                )}
                {job.visa_sponsored && (
                  <span className="px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-sm border border-green-200">
                    ✓ Visa Sponsored
                  </span>
                )}
              </div>
            </div>

            {/* Apply Button (Desktop) */}
            <div className="hidden lg:block">
              <button
                disabled
                className="px-8 py-3 bg-gray-300 text-gray-500 rounded-sm cursor-not-allowed transition-all"
                title="Application feature coming soon"
              >
                Apply Now
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">Coming soon</p>
            </div>
          </div>

          {/* Apply Button (Mobile) */}
          <div className="lg:hidden mt-6 pt-6 border-t border-gray-200">
            <button
              disabled
              className="w-full px-8 py-3 bg-gray-300 text-gray-500 rounded-sm cursor-not-allowed"
              title="Application feature coming soon"
            >
              Apply Now
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">Coming soon</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Job Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Job Description */}
            {job.description && (
              <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-8">
                <h2 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
                  Job Description
                </h2>
                <div
                  className="text-gray-700 prose prose-blue max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              </div>
            )}

            {/* Required Skills */}
            {job.required_skills && job.required_skills.length > 0 && (
              <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-8">
                <h2 className="text-lg text-gray-900 mb-4">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-blue-700 rounded-sm text-xs border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Company Info */}
          <div className="lg:col-span-1">
            {job.companyProfile && (
              <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6 sticky top-8">
                <h2 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  About the Company
                </h2>
                
                <div className="space-y-4">
                  {job.companyProfile.company_name && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Company Name</p>
                      <p className="text-gray-900">{job.companyProfile.company_name}</p>
                    </div>
                  )}

                  {job.companyProfile.industry && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Industry</p>
                      <p className="text-gray-900">{job.companyProfile.industry}</p>
                    </div>
                  )}

                  {job.companyProfile.website && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Website</p>
                      <a
                        href={job.companyProfile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 hover:underline break-all"
                      >
                        {job.companyProfile.website}
                      </a>
                    </div>
                  )}

                  {job.location && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Location</p>
                      <p className="text-gray-900">{job.location}</p>
                    </div>
                  )}
                </div>

                {/* View Company Profile Button */}
                <button
                  onClick={() => router.push(`/company/${job.company_id}`)}
                  className="w-full mt-6 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-sm transition-colors"
                >
                  View Company Profile
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default JobDetailsPage;
