"use client";

import React, { useEffect, useState } from "react";
import { API_V1_BASE } from "@/src/lib/config/api";
import {
  Users,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Briefcase,
  ArrowUpRight,
  Clock,
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
  if (!t) return null;
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return `${Math.floor(diff / 30)}mo ago`;
}

function urgentDeadline(deadline?: string | null, createdAt?: string): string | null {
  const target = deadline
    ? new Date(deadline).getTime()
    : new Date(createdAt ?? "").getTime() + 30 * 86400000;
  const diff = Math.floor((target - Date.now()) / 86400000);
  if (diff < 0) return "Expired";
  if (diff === 0) return "Last day";
  if (diff <= 7) return `${diff}d left`;
  return null;
}

const norm = (s: string) => s.toUpperCase();

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  ACTIVE:    { label: "Active",    dot: "#16a34a", text: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  DRAFT:     { label: "Draft",     dot: "#d97706", text: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  PAUSED:    { label: "Paused",    dot: "#6366f1", text: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  CLOSED:    { label: "Closed",    dot: "#ef4444", text: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  CANCELLED: { label: "Cancelled", dot: "#9ca3af", text: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
  ARCHIVED:  { label: "Archived",  dot: "#9ca3af", text: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
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
        const BASE = API_V1_BASE;
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

  const activeCount = jobs.filter((j) => norm(j.status) === "ACTIVE").length;
  const totalApps = jobs.reduce((s, j) => s + (j.applications_count ?? 0), 0);

  return (
    <div className="bg-white rounded-xl p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recently Posted Jobs</h3>
        <button
          onClick={() => router.push("/company/dashboard/jobManagement")}
          className="text-xs font-medium text-gray-500 flex items-center gap-1 hover:text-[#1B73E8] transition-colors group"
        >
          View All
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Summary bar */}
      {!loading && !error && jobs.length > 0 && (
        <p className="text-xs text-gray-400 mb-5">
          <span className="font-semibold text-green-600">{activeCount} active</span>
          {" · "}
          <span className="font-semibold text-gray-700">{totalApps}</span> total applications
        </p>
      )}

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

      {/* Job Cards */}
      {!loading && !error && jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map((job) => {
            const statusCfg = STATUS_CONFIG[norm(job.status)] ?? STATUS_CONFIG["DRAFT"];
            const deadline = urgentDeadline(job.application_deadline, job.created_at);
            const apps = job.applications_count ?? 0;
            const jobType = formatJobType(job.job_type);

            return (
              <div
                key={job.job_id}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-gray-100 hover:border-[#1B73E8]/20 hover:bg-[#FAFBFF] transition-all"
              >
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg bg-[#EAF2FE] flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-[#1B73E8]" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{job.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {jobType && <span className="text-[11px] text-gray-400">{jobType}</span>}
                    {jobType && <span className="text-gray-300">·</span>}
                    <span className="text-[11px] text-gray-400">{timeAgo(job.created_at)}</span>
                    {deadline && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-[11px] font-semibold text-red-500 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {deadline}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex-shrink-0 hidden sm:block">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border"
                    style={{
                      backgroundColor: statusCfg.bg,
                      color: statusCfg.text,
                      borderColor: statusCfg.border,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusCfg.dot }} />
                    {statusCfg.label}
                  </span>
                </div>

                {/* Applications */}
                <div className="flex-shrink-0 flex items-center gap-1 min-w-[56px]">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-800">{apps}</span>
                  <span className="text-[11px] text-gray-400">apps</span>
                </div>

                {/* Action */}
                <button
                  onClick={() => router.push(`/company/dashboard/jobManagement/${job.job_id}`)}
                  className="flex-shrink-0 inline-flex items-center gap-1 border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#1B73E8] hover:text-white hover:border-[#1B73E8] transition-all"
                >
                  View
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardRecentlyPostedJobs;
