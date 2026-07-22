'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import JobSearch from '@/src/components/job/JobSearch';
import JsSidebar from '@/src/components/job/jobsearch/JsSidebar';
import JobList from '@/src/components/candidate/dashboard/jobs/JobList';
import { useJobs } from '@/src/lib/jobs/jobs.queries';
import { JobFilters as JobFiltersType } from '@/src/lib/jobs/jobs.api';
import type { CandidateJobListItemDTO } from '@/src/types/candidate.jobs.types';
import { Briefcase, Loader2 } from 'lucide-react';
import { locationOptions } from '@/src/constants/groupedLocationOptions';

// Custom styles for react-select
const customSelectStyles = {
  control: (base: any) => ({
    ...base,
    border: 'none',
    boxShadow: 'none',
    '&:hover': { border: 'none' },
  }),
  indicatorSeparator: () => ({ display: 'none' }),
};

export default function FindJobPage() {
  const [filters, setFilters] = useState<JobFiltersType>({
    status: 'ACTIVE',
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // Fetch jobs with filters
  const { data: jobsData, isLoading, error } = useJobs(filters);

  // Public browse: adapt the plain Job[] into the list item shape JobList expects.
  // Eligibility is per-candidate and requires auth, so we pass a neutral placeholder
  // and use eligibilityMode="useItem" below — no per-card eligibility requests fire
  // for anonymous visitors.
  const jobItems: CandidateJobListItemDTO[] = useMemo(
    () =>
      (jobsData?.jobs ?? []).map((job) => ({
        job_id: job.job_id,
        title: job.title,
        location: job.location ?? null,
        experience_level: job.experience_level ?? null,
        required_skills: job.required_skills ?? [],
        status: job.status,
        eligibility: { eligible: true, reasons: [], missingSkills: [], missingFields: [] },
      })),
    [jobsData?.jobs]
  );

  // Handle search from JobSearch component
  const handleSearch = (title: string, location: { value: string; label: string } | null) => {
    setFilters({
      ...filters,
      search_term: title || undefined,
      // You can map location.value to your backend's location field
      page: 1, // Reset to page 1 on new search
    });
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Search */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold mb-2">Find Your Dream Job</h1>
            <p className="text-xl text-blue-100 mb-8">
              Browse thousands of opportunities from top companies
            </p>

            {/* Search Bar */}
            <JobSearch
              locationOptions={locationOptions}
              onSearch={handleSearch}
              customStyles={customSelectStyles}
            />
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Sidebar - Hidden on mobile */}
          <aside className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="sticky top-8">
              <JsSidebar
                filters={filters}
                onFilterChange={setFilters}
              />
            </div>
          </aside>

          {/* Jobs List */}
          <main className="flex-1 min-w-0">
            {/* Error State */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
              >
                <p className="text-red-800">
                  Failed to load jobs. Please try again later.
                </p>
              </motion.div>
            )}

            {/* Results Header */}
            {jobsData?.jobs && !isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-gray-700">
                  <Briefcase className="w-5 h-5" />
                  <span className="font-medium">
                    {jobsData.pagination?.total || 0} jobs found
                  </span>
                </div>

                {/* Sort Dropdown */}
                <select
                  value={filters.sort_by}
                  onChange={(e) => setFilters({ ...filters, sort_by: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="created_at">Most Recent</option>
                  <option value="title">Job Title</option>
                  <option value="company_id">Company</option>
                </select>
              </motion.div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {/* Job Cards */}
            {!isLoading && (
              <JobList
                items={jobItems}
                isLoading={false}
                showMatchScore={false}
                eligibilityMode="useItem"
                showEligibility={false}
                detailsHrefBase="/job/jobdetails"
              />
            )}

            {/* Pagination */}
            {jobsData?.pagination && jobsData.pagination.totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-8 flex items-center justify-center gap-2"
              >
                <button
                  onClick={() => handlePageChange((filters.page || 1) - 1)}
                  disabled={filters.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, jobsData.pagination.totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 rounded-lg transition-colors ${
                          filters.page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {jobsData.pagination.totalPages > 5 && (
                    <>
                      <span className="px-2">...</span>
                      <button
                        onClick={() => handlePageChange(jobsData.pagination.totalPages)}
                        className={`w-10 h-10 rounded-lg transition-colors ${
                          filters.page === jobsData.pagination.totalPages
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {jobsData.pagination.totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => handlePageChange((filters.page || 1) + 1)}
                  disabled={filters.page === jobsData.pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </motion.div>
            )}

            {/* No Results */}
            {!isLoading && jobsData?.jobs && jobsData.jobs.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl border border-gray-200 p-12 text-center"
              >
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No jobs found
                </h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search or filters to find more opportunities
                </p>
                <button
                  onClick={() => setFilters({
                    status: 'ACTIVE',
                    page: 1,
                    limit: 20,
                    sort_by: 'created_at',
                    sort_order: 'desc',
                  })}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear all filters
                </button>
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
