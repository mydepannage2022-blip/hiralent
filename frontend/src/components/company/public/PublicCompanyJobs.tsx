// frontend/src/components/company/public/PublicCompanyJobs.tsx

"use client";

import React from "react";
import Link from "next/link";
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  ArrowRight,
  Building2,
} from "lucide-react";
import { usePublicCompanyJobs } from "@/src/lib/company/employer.queries";

interface PublicCompanyJobsProps {
  slug: string;
  companyName: string;
}

export default function PublicCompanyJobs({ slug, companyName }: PublicCompanyJobsProps) {
  const { data, isLoading, isError } = usePublicCompanyJobs(slug, { limit: 5 });

  const jobs = data?.jobs || [];
  const totalJobs = data?.total || 0;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-[#EDEDED] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase size={18} color="#005DDC" />
          <h2 className="text-[16px] font-semibold text-[#1a1a1a]">
            Open Positions
          </h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-[#F5F5F5] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-[#EDEDED] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase size={18} color="#005DDC" />
          <h2 className="text-[16px] font-semibold text-[#1a1a1a]">
            Open Positions
          </h2>
        </div>
        <p className="text-[13px] text-[#888] text-center py-8">
          Failed to load jobs
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#EDEDED] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Briefcase size={18} color="#005DDC" />
          <h2 className="text-[16px] font-semibold text-[#1a1a1a]">
            Open Positions
          </h2>
          {totalJobs > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-medium bg-[#EFF5FF] text-[#005DDC] rounded-full">
              {totalJobs}
            </span>
          )}
        </div>
        {totalJobs > 5 && (
          <Link
            href={`/jobs?company=${slug}`}
            className="text-[13px] font-medium text-[#005DDC] hover:text-[#0046B3] transition-colors"
          >
            View all
          </Link>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-10">
          <Building2 size={36} color="#ccc" className="mx-auto mb-3" />
          <p className="text-[14px] font-medium text-[#888]">
            No open positions
          </p>
          <p className="text-[12px] text-[#aaa] mt-1">
            Check back later for new opportunities
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job: any) => (
            <Link
              key={job.job_id}
              href={`/jobs/${job.job_id}`}
              className="block p-4 border border-[#EDEDED] rounded-lg hover:border-[#005DDC] hover:bg-[#FAFBFF] transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-semibold text-[#1a1a1a] group-hover:text-[#005DDC] transition-colors truncate">
                    {job.title}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                    {job.location && (
                      <div className="flex items-center gap-1 text-[12px] text-[#666]">
                        <MapPin size={12} color="#888" />
                        <span>{job.location}</span>
                      </div>
                    )}
                    {job.employment_type && (
                      <div className="flex items-center gap-1 text-[12px] text-[#666]">
                        <Clock size={12} color="#888" />
                        <span>{job.employment_type}</span>
                      </div>
                    )}
                    {(job.salary_min || job.salary_max) && (
                      <div className="flex items-center gap-1 text-[12px] text-[#666]">
                        <DollarSign size={12} color="#888" />
                        <span>
                          {job.salary_min && job.salary_max
                            ? `${formatSalary(job.salary_min)} - ${formatSalary(job.salary_max)}`
                            : job.salary_min
                            ? `From ${formatSalary(job.salary_min)}`
                            : `Up to ${formatSalary(job.salary_max)}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {job.tags.slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[11px] font-medium bg-[#F5F5F5] text-[#666] rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {job.tags.length > 3 && (
                        <span className="text-[11px] text-[#888]">
                          +{job.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <ArrowRight
                  size={18}
                  color="#ccc"
                  className="flex-shrink-0 group-hover:text-[#005DDC] transition-colors"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatSalary(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount}`;
}
