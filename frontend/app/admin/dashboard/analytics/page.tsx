"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Users,
  Briefcase,
  FileText,
  ClipboardCheck,
  Building2,
  RefreshCw,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { adminFetch } from "@/src/lib/admin/api";

interface Overview {
  totalUsers: number;
  usersByRole: Record<string, number>;
  agenciesByStatus: Record<string, number>;
  totalJobs: number;
  totalApplications: number;
  totalAssessments: number;
  signups: { last7Days: number; last30Days: number };
  generatedAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  candidate: "Candidates",
  company_admin: "Companies",
  agency_admin: "Agency Admins",
  superadmin: "Admins",
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await adminFetch<Overview>("/admin/analytics/overview"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cards = data
    ? [
        { label: "Total Users", value: data.totalUsers, icon: <Users className="w-6 h-6" />, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Jobs", value: data.totalJobs, icon: <Briefcase className="w-6 h-6" />, color: "text-indigo-600", bg: "bg-indigo-50" },
        { label: "Applications", value: data.totalApplications, icon: <FileText className="w-6 h-6" />, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Assessments", value: data.totalAssessments, icon: <ClipboardCheck className="w-6 h-6" />, color: "text-amber-600", bg: "bg-amber-50" },
      ]
    : [];

  const roleEntries = data ? Object.entries(data.usersByRole).sort((a, b) => b[1] - a[1]) : [];
  const maxRole = roleEntries.reduce((m, [, v]) => Math.max(m, v), 0) || 1;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
              <p className="text-slate-500">Platform-wide totals at a glance</p>
            </div>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <button onClick={load} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Try Again
          </button>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Top stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cards.map((c) => (
              <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className={`${c.bg} p-3 rounded-lg inline-flex ${c.color} mb-3`}>{c.icon}</div>
                <p className="text-3xl font-bold text-slate-900">{c.value.toLocaleString()}</p>
                <p className="text-sm text-slate-500 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Users by role */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Users by Role</h2>
              {roleEntries.length === 0 ? (
                <p className="text-slate-500 text-sm">No users yet.</p>
              ) : (
                <div className="space-y-3">
                  {roleEntries.map(([role, count]) => (
                    <div key={role}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{ROLE_LABELS[role] || role}</span>
                        <span className="font-semibold text-slate-800">{count.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / maxRole) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signups + agencies */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold text-slate-800">New Signups</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <p className="text-2xl font-bold text-emerald-700">{data.signups.last7Days}</p>
                    <p className="text-sm text-slate-500">Last 7 days</p>
                  </div>
                  <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
                    <p className="text-2xl font-bold text-sky-700">{data.signups.last30Days}</p>
                    <p className="text-sm text-slate-500">Last 30 days</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Agencies by Status</h2>
                </div>
                {Object.keys(data.agenciesByStatus).length === 0 ? (
                  <p className="text-slate-500 text-sm">No agencies yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(data.agenciesByStatus).map(([status, count]) => (
                      <div key={status} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-lg font-bold text-slate-800">{count}</span>{" "}
                        <span className="text-xs text-slate-500">{status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-right">
            Generated {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>
      ) : null}
    </div>
  );
}
