"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Briefcase,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../context/AuthContext";

type JobStatus =
  | "Active" | "ACTIVE"
  | "Draft" | "DRAFT"
  | "Paused" | "PAUSED"
  | "Closed" | "CLOSED"
  | "Cancelled" | "CANCELLED"
  | "Archived" | "ARCHIVED";

type JobType = "full_time" | "part_time" | "contract" | "internship" | "freelance";

interface CompanyJob {
  job_id: string;
  title: string;
  location: string;
  job_type: JobType | null;
  salary_range: string | null;
  status: JobStatus;
  created_at: string;
  application_deadline?: string | null;
  applications_count?: number;
}

function formatJobType(t?: JobType | null) {
  if (!t) return "—";
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function daysRemainingFromDeadline(deadline?: string | null, createdAt?: string): { label: string; urgent: boolean } {
  // Use application_deadline if available, fallback to created_at + 30
  const target = deadline
    ? new Date(deadline).getTime()
    : new Date(createdAt ?? "").getTime() + 30 * 86400000;

  const diff = Math.floor((target - Date.now()) / 86400000);

  if (diff < 0) return { label: "Expired", urgent: true };
  if (diff === 0) return { label: "Last day", urgent: true };
  return { label: `${diff}d left`, urgent: diff <= 5 };
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  ACTIVE:    { label: "Active",    dot: "#16a34a", text: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  Active:    { label: "Active",    dot: "#16a34a", text: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  DRAFT:     { label: "Draft",     dot: "#d97706", text: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  Draft:     { label: "Draft",     dot: "#d97706", text: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  PAUSED:    { label: "Paused",    dot: "#6366f1", text: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  Paused:    { label: "Paused",    dot: "#6366f1", text: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  CLOSED:    { label: "Closed",    dot: "#ef4444", text: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  Closed:    { label: "Closed",    dot: "#ef4444", text: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  CANCELLED: { label: "Cancelled", dot: "#9ca3af", text: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
  Cancelled: { label: "Cancelled", dot: "#9ca3af", text: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
  ARCHIVED:  { label: "Archived",  dot: "#9ca3af", text: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
  Archived:  { label: "Archived",  dot: "#9ca3af", text: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
};

const DashboardRecentlyPostedJobs = () => {
  const router = useRouter();
  const { token } = useAuth();
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setLoading(false); return; }

    const fetchJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        const BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";
        const res = await fetch(`${BASE}/jobs/company/my-jobs`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
          const sorted = (data.data || [])
            .sort((a: CompanyJob, b: CompanyJob) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            .slice(0, 5);
          setJobs(sorted);
        } else {
          setError(data.message || "Failed to load jobs");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading jobs");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [token]);

  return (
    <div className="bg-white rounded-xl p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-base sm:text-xl font-semibold text-[#222222]">
          Recently Posted Jobs
        </h3>
        <button
          onClick={() => router.push("/company/dashboard/jobManagement")}
          className="text-xs sm:text-base font-medium text-[#222222] flex items-center gap-1 sm:gap-2 hover:text-[#1B73E8] transition-colors group"
        >
          View All
          <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-14 gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading jobs...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center justify-center py-14 gap-2 text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 gap-2">
          <div className="w-10 h-10 rounded-xl bg-[#EAF2FE] flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-[#1B73E8]" />
          </div>
          <p className="text-sm text-gray-500">No jobs posted yet</p>
          <button
            onClick={() => router.push("/company/dashboard/jobManagement")}
            className="text-xs text-[#1B73E8] font-semibold hover:underline"
          >
            Post your first job →
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && jobs.length > 0 && (
        <div className="overflow-x-auto">
          <div className="min-w-[780px]">

            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] bg-[#F4F4F4] text-[#515151] text-xs font-semibold px-4 py-2.5 rounded-xl mb-2">
              <div>Job</div>
              <div>Status</div>
              <div>Applications</div>
              <div>Salary</div>
              <div>Actions</div>
            </div>

            {/* Rows */}
            {jobs.map((job) => {
              const statusCfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG["DRAFT"];
              const { label: deadlineLabel, urgent } = daysRemainingFromDeadline(
                job.application_deadline,
                job.created_at
              );

              return (
                <div
                  key={job.job_id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center px-4 py-3.5 border-b border-[#F0F0F0] hover:bg-[#FAFBFF] transition-colors"
                >
                  {/* Job info */}
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-semibold text-[#222222] truncate" title={job.title}>
                      {job.title}
                    </p>
                    <p className="text-xs text-[#9ca3af] mt-0.5">
                      {formatJobType(job.job_type)}
                      {" · "}
                      <span className={urgent ? "text-red-400 font-semibold" : ""}>
                        {deadlineLabel}
                      </span>
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border"
                      style={{
                        backgroundColor: statusCfg.bg,
                        color: statusCfg.text,
                        borderColor: statusCfg.border,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: statusCfg.dot }}
                      />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Applications */}
                  <div className="flex items-center gap-1.5 text-sm text-[#222222]">
                    <Users className="w-4 h-4 text-[#9ca3af] shrink-0" />
                    <span className="font-semibold">{job.applications_count ?? 0}</span>
                    <span className="text-[#9ca3af] text-xs">apps</span>
                  </div>

                  {/* Salary */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full border border-[#d1d5db] flex items-center justify-center shrink-0">
                      <DollarSign className="w-3 h-3 text-[#6b7280]" />
                    </div>
                    <span className="truncate text-xs text-[#444]" title={job.salary_range ?? "—"}>
                      {job.salary_range ?? "—"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div>
                    <button
                      onClick={() => router.push(`/company/dashboard/jobManagement/${job.job_id}`)}
                      className="inline-flex items-center gap-1.5 border border-[#282828] text-[#282828] px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-[#1B73E8] hover:text-white hover:border-[#1B73E8] transition-all"
                    >
                      View
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardRecentlyPostedJobs;