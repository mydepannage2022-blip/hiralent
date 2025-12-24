'use client';

import React, { useState } from 'react';
import { Briefcase, Sparkles, Filter } from 'lucide-react';
import JobList from '@/src/components/candidate/dashboard/jobs/JobList';
import JobFilters from '@/src/components/candidate/dashboard/jobs/JobFilters';
import { useJobRecommendations, useJobs } from '@/src/lib/jobs/jobs.queries';
import { JobFilters as JobFiltersType } from '@/src/lib/jobs/jobs.api';

export default function JobsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommended' | 'all'>('recommended');
  const [filters, setFilters] = useState<JobFiltersType>({
    status: 'ACTIVE',
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // Fetch AI recommendations
  const {
    data: recommendations,
    isLoading: recommendationsLoading,
    error: recommendationsError,
  } = useJobRecommendations(20, {
    enabled: activeTab === 'recommended',
  });

  // Fetch all jobs with filters
  const {
    data: jobsData,
    isLoading: jobsLoading,
    error: jobsError,
  } = useJobs(filters, {
    enabled: activeTab === 'all',
  });

  const handleFilterChange = (newFilters: JobFiltersType) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      status: 'ACTIVE',
      page: 1,
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  };

  const isLoading = activeTab === 'recommended' ? recommendationsLoading : jobsLoading;
  const hasError = activeTab === 'recommended' ? recommendationsError : jobsError;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className=" px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="flex items-center">
            <button
              onClick={() => setActiveTab('recommended')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'recommended'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              Recommended For You
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Briefcase className="w-5 h-5" />
              All Jobs
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar (Desktop) */}
          <div className="hidden lg:block">
            {activeTab === 'all' && (
              <JobFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
              />
            )}
          </div>

          {/* Mobile Filter Toggle */}
          {activeTab === 'all' && (
            <div className="lg:hidden mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-5 h-5" />
                Filters
              </button>

              {/* Mobile Filters Overlay */}
              {showFilters && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
                  <div className="bg-white h-full overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold">Filters</h2>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                    <JobFilters
                      filters={filters}
                      onFilterChange={(newFilters) => {
                        handleFilterChange(newFilters);
                        setShowFilters(false);
                      }}
                      onClearFilters={() => {
                        handleClearFilters();
                        setShowFilters(false);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Jobs List */}
          <div className={activeTab === 'all' ? 'lg:col-span-3' : 'lg:col-span-4'}>
            {/* Error State */}
            {hasError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">
                  Failed to load jobs. Please try again later.
                </p>
              </div>
            )}

            {/* Recommended Tab */}
            {activeTab === 'recommended' && (
              <div>
                {recommendationsError && !recommendationsLoading && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold text-yellow-900 mb-2">
                      Unable to load recommendations
                    </h3>
                    <p className="text-yellow-800 text-sm mb-4">
                      Make sure you've uploaded your CV and completed your profile to get
                      personalized job recommendations.
                    </p>
                    <button
                      onClick={() => setActiveTab('all')}
                      className="text-sm text-yellow-900 underline hover:no-underline"
                    >
                      Browse all jobs instead
                    </button>
                  </div>
                )}
                <JobList
                  jobs={recommendations || []}
                  isLoading={recommendationsLoading}
                  showMatchScore={true}
                />
              </div>
            )}

            {/* All Jobs Tab */}
            {activeTab === 'all' && (
              <div>
                {/* Results Count */}
                {jobsData && !jobsLoading && (
                  <div className="mb-4 text-sm text-gray-600">
                    Showing {jobsData?.jobs?.length || 0} of {jobsData?.pagination?.total || 0} jobs

                  </div>
                )}

                <JobList
                  jobs={jobsData?.jobs || []}
                  isLoading={jobsLoading}
                  showMatchScore={false}
                />

                {/* Pagination */}
            {jobsData?.pagination && jobsData.pagination.totalPages > 1 && (
  <div className="mt-8 flex items-center justify-center gap-2">
    <button
      onClick={() =>
        handleFilterChange({ ...filters, page: (filters.page || 1) - 1 })
      }
      disabled={filters.page === 1}
      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
    >
      Previous
    </button>

    <span className="px-4 py-2 text-sm text-gray-700">
      Page {filters.page || 1} of {jobsData.pagination.totalPages}
    </span>

    <button
      onClick={() =>
        handleFilterChange({ ...filters, page: (filters.page || 1) + 1 })
      }
      disabled={filters.page === jobsData.pagination.totalPages}
      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
    >
      Next
    </button>
  </div>
)}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
