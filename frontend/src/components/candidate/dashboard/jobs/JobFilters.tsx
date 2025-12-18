'use client';

import React from 'react';
import { X } from 'lucide-react';
import { JobFilters as JobFiltersType } from '@/src/lib/jobs/jobs.api';

interface JobFiltersProps {
  filters: JobFiltersType;
  onFilterChange: (filters: JobFiltersType) => void;
  onClearFilters: () => void;
}

const JobFilters: React.FC<JobFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const handleChange = (key: keyof JobFiltersType, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value || undefined,
      page: 1, // Reset to page 1 when filters change
    });
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== ''
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search
        </label>
        <input
          type="text"
          placeholder="Job title, keywords..."
          value={filters.search_term || ''}
          onChange={(e) => handleChange('search_term', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Job Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Job Type
        </label>
        <select
          value={filters.job_type || ''}
          onChange={(e) => handleChange('job_type', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Types</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
          <option value="Internship">Internship</option>
          <option value="Freelance">Freelance</option>
        </select>
      </div>

      {/* Experience Level */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Experience Level
        </label>
        <select
          value={filters.experience_level || ''}
          onChange={(e) => handleChange('experience_level', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Levels</option>
          <option value="Entry Level">Entry Level</option>
          <option value="Mid Level">Mid Level</option>
          <option value="Senior Level">Senior Level</option>
          <option value="Lead">Lead</option>
          <option value="Executive">Executive</option>
        </select>
      </div>

      {/* Remote Option */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Work Setting
        </label>
        <select
          value={filters.remote_option || ''}
          onChange={(e) => handleChange('remote_option', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Settings</option>
          <option value="Remote">Remote</option>
          <option value="Hybrid">Hybrid</option>
          <option value="On-site">On-site</option>
        </select>
      </div>

      {/* Sort By */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sort By
        </label>
        <select
          value={filters.sort_by || 'created_at'}
          onChange={(e) => handleChange('sort_by', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="created_at">Most Recent</option>
          <option value="title">Job Title</option>
          <option value="company_id">Company Name</option>
        </select>
      </div>

      {/* Sort Order */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Order
        </label>
        <select
          value={filters.sort_order || 'desc'}
          onChange={(e) => handleChange('sort_order', e.target.value as 'asc' | 'desc')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
    </div>
  );
};

export default JobFilters;
