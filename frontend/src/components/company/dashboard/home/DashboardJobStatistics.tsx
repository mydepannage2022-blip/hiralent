"use client";

import React, { useEffect, useState } from "react";
import { API_V1_BASE } from "@/src/lib/config/api";
import {
  AreaChart,
  Area,
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
  Clock,
  FileWarning,
} from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";

type JobStatus =
  | "ACTIVE" | "DRAFT" | "PAUSED" | "CLOSED" | "CANCELLED" | "ARCHIVED"
  | "Active" | "Draft" | "Paused" | "Closed" | "Cancelled" | "Archived";

interface CompanyJob {
  job_id: string;
  title: string;
  status: JobStatus;
  job_type: string | null;
  created_at: string;
  application_deadline?: string | null;
  urgency_level?: string | null;
  applications_count?: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const RANK_COLORS = ["#F59E0B", "#94A3B8", "#CD7C2F"];
const norm = (s: string) => s.toUpperCase();

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
        const BASE = API_V1_BASE;
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

  const totalJobs = jobs.length;
  const totalApplications = jobs.reduce((s, j) => s + (j.applications_count ?? 0), 0);
  const activeJobs = jobs.filter((j) => norm(j.status) === "ACTIVE").length;
  const closedJobs = jobs.filter((j) => norm(j.status) === "CLOSED").length;
  const draftJobs = jobs.filter((j) => norm(j.status) === "DRAFT").length;
  const fillRate = totalJobs === 0 ? 0 : Math.round((closedJobs / totalJobs) * 100);
  const jobsWithApps = jobs.filter((j) => (j.applications_count ?? 0) > 0);
  const avgApplications = jobsWithApps.length === 0 ? 0 : Math.round(totalApplications / jobsWithApps.length);

  const now = Date.now();
  const urgentCount = jobs.filter((j) => {
    if (norm(j.status) !== "ACTIVE") return false;
    if (j.urgency_level === "urgent") return true;
    if (j.application_deadline) {
      const diff = Math.floor((new Date(j.application_deadline).getTime() - now) / 86400000);
      return diff >= 0 && diff <= 7;
    }
    return false;
  }).length;

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

  const topJobs = [...jobs]
    .filter((j) => (j.applications_count ?? 0) > 0)
    .sort((a, b) => (b.applications_count ?? 0) - (a.applications_count ?? 0))
    .slice(0, 3);

  const kpis = [
    { label: "Active Jobs",   value: activeJobs,        sub: `of ${totalJobs} total`,          icon: CheckCircle, color: "#16A34A", bg: "#F0FDF4" },
    { label: "Applications",  value: totalApplications, sub: "total received",                  icon: Users,       color: "#1B73E8", bg: "#EAF2FE" },
    { label: "Avg / Job",     value: avgApplications,   sub: "applications per role",           icon: TrendingUp,  color: "#7C3AED", bg: "#F5F3FF" },
    { label: "Fill Rate",     value: `${fillRate}%`,    sub: `${closedJobs} positions closed`,  icon: Briefcase,   color: "#EA580C", bg: "#FFF7ED" },
    { label: "Urgent",        value: urgentCount,       sub: "deadline ≤ 7 days",              icon: Clock,       color: "#DC2626", bg: "#FEF2F2" },
    { label: "Drafts",        value: draftJobs,         sub: "unpublished jobs",                icon: FileWarning, color: "#6B7280", bg: "#F9FAFB" },
  ];

  return (
    <div className="bg-white w-full rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-col sm:flex-row mb-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Job Statistics</h3>
          <p className="text-xs text-gray-400 mt-0.5">Jan – Dec {currentYear}</p>
        </div>
        <div className="flex gap-1 mt-2 sm:mt-0 bg-gray-100 rounded-lg p-1">
          {(["jobs", "applications"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {v === "jobs" ? "Jobs" : "Applications"}
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
          {/* 6 KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
            {kpis.map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="rounded-xl p-3.5 border border-gray-100"
                style={{ backgroundColor: bg }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500">{label}</p>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center bg-white/80">
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Area Chart */}
          <div className="w-full h-48 mb-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B73E8" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#1B73E8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey={view}
                  stroke="#1B73E8"
                  strokeWidth={2}
                  fill="url(#areaGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#1B73E8" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top Performing Jobs */}
          {topJobs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Top Performing Jobs
              </p>
              <div className="space-y-2.5">
                {topJobs.map((job, i) => {
                  const pct =
                    totalApplications === 0
                      ? 0
                      : Math.round(((job.applications_count ?? 0) / totalApplications) * 100);
                  return (
                    <div key={job.job_id} className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: RANK_COLORS[i] }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="truncate text-gray-700 font-medium max-w-[160px]">
                            {job.title}
                          </span>
                          <span className="text-gray-400 flex-shrink-0 ml-2">
                            {job.applications_count} apps · {pct}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: RANK_COLORS[i] }}
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
