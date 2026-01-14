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

  // Check for active filters (excluding default pagination/sort values)
  const hasActiveFilters = Boolean(
    filters.search_term ||
    filters.job_type ||
    filters.experience_level ||
    filters.remote_option ||
    filters.location ||
    filters.company_id ||
    filters.salary_min ||
    filters.salary_max ||
    filters.skills
  );

  return (
    <div className="bg-white rounded-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm text-gray-700 mb-2">
          Search
        </label>
        <input
          type="text"
          placeholder="Job title, keywords..."
          value={filters.search_term || ''}
          onChange={(e) => handleChange('search_term', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-normal"
        />
      </div>

      {/* Location */}
      <div className="mb-6">
        <label className="block text-sm text-gray-700 mb-2">
          Location
        </label>
        <input
          type="text"
          placeholder="City, state, or country..."
          value={filters.location || ''}
          onChange={(e) => handleChange('location', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-normal"
        />
      </div>

      {/* Job Type */}
      <div className="mb-6">
        <label className="block text-sm text-gray-700 mb-2">
          Job Type
        </label>
      <select
        value={filters.job_type || ''}
        onChange={(e) => handleChange('job_type', e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-normal"
      >
        <option value="">All Types</option>
        <option value="full_time">Full-time</option>
        <option value="part_time">Part-time</option>
        <option value="contract">Contract</option>
        <option value="internship">Internship</option>
        <option value="freelance">Freelance</option>
      </select>

      </div>

      {/* Experience Level */}
      <div className="mb-6">
        <label className="block text-sm text-gray-700 mb-2">
          Experience Level
        </label>
      <select
        value={filters.experience_level || ''}
        onChange={(e) => handleChange('experience_level', e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-normal"
      >
        <option value="">All Levels</option>
        <option value="entry">Entry Level</option>
        <option value="mid">Mid Level</option>
        <option value="senior">Senior Level</option>
        <option value="executive">Executive</option>
      </select>

      </div>

      {/* Remote Option */}
      <div className="mb-6">
        <label className="block text-sm text-gray-700 mb-2">
          Work Setting
        </label>
      <select
        value={filters.remote_option || ''}
        onChange={(e) => handleChange('remote_option', e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-normal"
      >
        <option value="">All Settings</option>
        <option value="fully_remote">Remote</option>
        <option value="hybrid">Hybrid</option>
        <option value="office_only">On-site</option>
      </select>

      </div>

      {/* Salary Range */}
      <div className="mb-6">
        <label className="block text-sm text-gray-700 mb-2">
          Salary Range
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min salary"
            value={filters.salary_min || ''}
            onChange={(e) => handleChange('salary_min', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
          <input
            type="number"
            placeholder="Max salary"
            value={filters.salary_max || ''}
            onChange={(e) => handleChange('salary_max', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
      </div>

      {/* Sort By */}
      <div className="mb-6">
        <label className="block text-sm text-gray-700 mb-2">
          Sort By
        </label>
        <select
          value={filters.sort_by || 'created_at'}
          onChange={(e) => handleChange('sort_by', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-normal"
        >
          <option value="created_at">Most Recent</option>
          <option value="title">Job Title</option>
          <option value="company_id">Company Name</option>
          <option value="salary">Salary</option>
        </select>
      </div>

      {/* Sort Order */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">
          Order
        </label>
        <select
          value={filters.sort_order || 'desc'}
          onChange={(e) => handleChange('sort_order', e.target.value as 'asc' | 'desc')}
          className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-normal"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
    </div>
  );
};

export default JobFilters;