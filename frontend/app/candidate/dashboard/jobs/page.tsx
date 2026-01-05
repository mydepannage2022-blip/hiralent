'use client';

import React, { useState } from 'react';
import { Briefcase, Filter } from 'lucide-react';
import JobList from '@/src/components/candidate/dashboard/jobs/JobList';
import JobFilters from '@/src/components/candidate/dashboard/jobs/JobFilters';
import { useJobs } from '@/src/lib/jobs/jobs.queries';
import { JobFilters as JobFiltersType } from '@/src/lib/jobs/jobs.api';

export default function JobsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<JobFiltersType>({
    status: 'ACTIVE',
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // Fetch all jobs with filters
  const {
    data: jobsData,
    isLoading: jobsLoading,
    error: jobsError,
  } = useJobs(filters);

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

  return (
    <div>
      <div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar (Desktop) */}
          <div className="hidden lg:block">
            <JobFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />
          </div>

          {/* Mobile Filter Toggle */}
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

          {/* Jobs List */}
          <div className="lg:col-span-3">
            {/* Error State */}
            {jobsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">
                  Failed to load jobs. Please try again later.
                </p>
              </div>
            )}

            {/* Results Count */}
            {jobsData && !jobsLoading && (
              <div className="mb-4 text-sm text-gray-600">
                Showing {jobsData?.jobs?.length || 0} of {jobsData?.pagination?.total || 0} jobs
              </div>
            )}

            {/* Jobs List */}
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
        </div>
      </div>
    </div>
  );
}