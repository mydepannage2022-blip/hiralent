"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Briefcase,
  Users,
  TrendingUp,
  CheckCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";

type JobStatus = "ACTIVE" | "DRAFT" | "PAUSED" | "CLOSED" | "CANCELLED" | "ARCHIVED"
  | "Active" | "Draft" | "Paused" | "Closed" | "Cancelled" | "Archived";

type JobType = "full_time" | "part_time" | "contract" | "internship" | "freelance";

interface CompanyJob {
  job_id: string;
  title: string;
  status: JobStatus;
  job_type: JobType | null;
  created_at: string;
  applications_count?: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DashboardJobStatistics = () => {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"jobs" | "applications">("jobs");

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";
        const res = await fetch(`${BASE}/jobs/company/my-jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setJobs(data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [token]);

  // ── Stats (all honest & computable from available data) ────────

  const totalJobs = jobs.length;
  const totalApplications = jobs.reduce((s, j) => s + (j.applications_count ?? 0), 0);
  const activeJobs = jobs.filter((j) =>
    j.status === "ACTIVE" || j.status === "Active"
  ).length;
  const jobsWithApps = jobs.filter((j) => (j.applications_count ?? 0) > 0);
  const avgApplications =
    jobsWithApps.length === 0
      ? 0
      : Math.round(totalApplications / jobsWithApps.length);

  // Jobs created per month (current year) — pure creation count
  const currentYear = new Date().getFullYear();
  const chartData = MONTHS.map((month, idx) => {
    const monthJobs = jobs.filter((j) => {
      const d = new Date(j.created_at);
      return d.getFullYear() === currentYear && d.getMonth() === idx;
    });
    return {
      month,
      jobs: monthJobs.length,
      applications: monthJobs.reduce((s, j) => s + (j.applications_count ?? 0), 0),
    };
  });

  // Top 3 jobs by applications
  const topJobs = [...jobs]
    .filter((j) => (j.applications_count ?? 0) > 0)
    .sort((a, b) => (b.applications_count ?? 0) - (a.applications_count ?? 0))
    .slice(0, 3);

  const periodLabel = `Jan – Dec ${currentYear}`;

  return (
    <div className="bg-white w-full rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-col sm:flex-row mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Job statistics</h3>
          <p className="text-sm text-gray-500">Showing {periodLabel}</p>
        </div>
        <div className="flex space-x-2 mt-2 sm:mt-0">
          {(["jobs", "applications"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === v ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {v === "jobs" ? "Jobs" : "Applied"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading statistics...</span>
        </div>
      ) : (
        <>
          {/* 4 stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Jobs",   value: totalJobs,         icon: Briefcase,   color: "#1B73E8" },
              { label: "Active",       value: activeJobs,        icon: CheckCircle, color: "#16A34A" },
              { label: "Applications", value: totalApplications, icon: Users,       color: "#7C3AED" },
              { label: "Avg / Job",    value: avgApplications,   icon: TrendingUp,  color: "#EA580C" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex flex-col border rounded-xl py-3 px-4 gap-1">
                <Icon className="w-5 h-5 mb-1" style={{ color }} />
                <p className="text-xl font-bold text-[#353535]">{value}</p>
                <p className="text-xs text-[#757575]">{label}</p>
              </div>
            ))}
          </div>

          {/* Bar chart — jobs created OR applications per month */}
          <div className="w-full h-52 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey={view} fill="#1B73E8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top jobs by applications */}
          {topJobs.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Top jobs by applications
              </p>
              <div className="space-y-2">
                {topJobs.map((job) => {
                  const pct =
                    totalApplications === 0
                      ? 0
                      : Math.round(
                          ((job.applications_count ?? 0) / totalApplications) * 100
                        );
                  return (
                    <div key={job.job_id} className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="truncate text-gray-700 font-medium max-w-[160px]">
                            {job.title}
                          </span>
                          <span className="text-gray-500 flex-shrink-0 ml-2">
                            {job.applications_count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: "#1B73E8" }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardJobStatistics;