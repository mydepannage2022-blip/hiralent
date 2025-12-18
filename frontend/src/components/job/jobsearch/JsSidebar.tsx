'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { JobFilters } from '@/src/lib/jobs/jobs.api';

interface JsSidebarProps {
  filters: JobFilters;
  onFilterChange: (filters: JobFilters) => void;
}

const JsSidebar: React.FC<JsSidebarProps> = ({ filters, onFilterChange }) => {
  const [openSections, setOpenSections] = useState({
    jobtype: true,
    workmodes: true,
    educationlevel: false,
    publicationdate: false,
    salarymonthly: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleFilterChange = (key: keyof JobFilters, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value || undefined,
      page: 1, // Reset to page 1
    });
  };

  const clearAllFilters = () => {
    onFilterChange({
      status: 'ACTIVE',
      page: 1,
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  };

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => 
      key !== 'status' && 
      key !== 'page' && 
      key !== 'limit' && 
      key !== 'sort_by' && 
      key !== 'sort_order' && 
      value !== undefined && 
      value !== ''
  );

  const Section = ({
    title,
    name,
    children,
  }: {
    title: string;
    name: keyof typeof openSections;
    children: React.ReactNode;
  }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState('0px');

    useEffect(() => {
      if (openSections[name]) {
        const scrollHeight = contentRef.current?.scrollHeight || 0;
        setHeight(`${scrollHeight}px`);
      } else {
        setHeight('0px');
      }
    }, [openSections, name]);

    return (
      <div className='mb-0 px-2'>
        <div
          className="flex justify-between items-center cursor-pointer px-2 py-2 hover:bg-gray-50 rounded-lg transition-colors"
          onClick={() => toggleSection(name)}
        >
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {openSections[name] ? (
            <ChevronUp size={20} className="text-gray-600" />
          ) : (
            <ChevronDown size={20} className="text-gray-600" />
          )}
        </div>

        <div
          ref={contentRef}
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            maxHeight: height,
            opacity: openSections[name] ? 1 : 0,
          }}
        >
          <div className="mt-2 space-y-2 px-2">{children}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Header */}
      <div className='px-6 py-4 border-b border-gray-200'>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear all
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <p className="text-xs text-gray-500">
            {Object.keys(filters).filter(k => 
              !['status', 'page', 'limit', 'sort_by', 'sort_order'].includes(k) && 
              filters[k as keyof JobFilters]
            ).length} active filters
          </p>
        )}
      </div>

      <div className="px-4 py-4 space-y-2">
        {/* Job Type */}
        <Section title="Job Type" name="jobtype">
          {['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'].map(type => (
            <label key={type} className="flex items-center gap-3 text-sm text-gray-700 hover:text-gray-900 cursor-pointer py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-colors">
              <input
                type="radio"
                name="job_type"
                checked={filters.job_type === type}
                onChange={() => handleFilterChange('job_type', type)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span>{type}</span>
            </label>
          ))}
        </Section>

        <hr className="my-2 border-gray-200" />

        {/* Work Modes */}
        <Section title="Work Mode" name="workmodes">
          {['Remote', 'Hybrid', 'On-site'].map(mode => (
            <label key={mode} className="flex items-center gap-3 text-sm text-gray-700 hover:text-gray-900 cursor-pointer py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-colors">
              <input
                type="radio"
                name="remote_option"
                checked={filters.remote_option === mode}
                onChange={() => handleFilterChange('remote_option', mode)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span>{mode}</span>
            </label>
          ))}
        </Section>

        <hr className="my-2 border-gray-200" />

        {/* Education Level */}
        <Section title="Experience Level" name="educationlevel">
          {['Entry Level', 'Mid Level', 'Senior Level', 'Lead', 'Executive'].map(level => (
            <label key={level} className="flex items-center gap-3 text-sm text-gray-700 hover:text-gray-900 cursor-pointer py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-colors">
              <input
                type="radio"
                name="experience_level"
                checked={filters.experience_level === level}
                onChange={() => handleFilterChange('experience_level', level)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span>{level}</span>
            </label>
          ))}
        </Section>
      </div>
    </div>
  );
};

export default JsSidebar;
