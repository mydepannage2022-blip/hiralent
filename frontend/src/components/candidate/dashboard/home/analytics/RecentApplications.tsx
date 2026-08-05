"use client";

import React, { useState, useEffect } from "react";
import { Briefcase, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight, FileText } from "lucide-react";
import SmartLink from "../../../../layout/SmartLink";
import { API_V1_BASE } from "@/src/lib/config/api";

interface Application {
  application_id: string;
  status: string;
  applied_at: string;
  relevance_score: number | null;
  job: {
    job_id: string;
    title: string;
    location: string;
    experience_level: string | null;
    status: string;
  };
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  APPLIED: { label: "Applied", color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
  SCREENING: { label: "Screening", color: "text-yellow-600", bg: "bg-yellow-50", icon: FileText },
  ASSESSMENT_REQUIRED: { label: "Assessment", color: "text-orange-600", bg: "bg-orange-50", icon: AlertCircle },
  INTERVIEW_REQUIRED: { label: "Interview", color: "text-purple-600", bg: "bg-purple-50", icon: AlertCircle },
  SHORTLISTED: { label: "Shortlisted", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
  OFFERED: { label: "Offered", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
  HIRED: { label: "Hired", color: "text-green-700", bg: "bg-green-100", icon: CheckCircle },
  REJECTED: { label: "Rejected", color: "text-red-500", bg: "bg-red-50", icon: XCircle },
};

export default function RecentApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(
          `${API_V1_BASE}/candidate/applications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setApplications(data.items?.slice(0, 5) || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        console.error("Failed to fetch applications:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="bg-white w-full rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-16 bg-gray-100 rounded-lg"></div>
          <div className="h-16 bg-gray-100 rounded-lg"></div>
          <div className="h-16 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white w-full rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Applications</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {total > 0 ? `${total} total application${total !== 1 ? "s" : ""}` : "No applications yet"}
          </p>
        </div>
        {total > 5 && (
          <SmartLink
            href="/candidate/dashboard/applications"
            className="text-sm font-medium text-[#005DDC] hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </SmartLink>
        )}
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Briefcase size={24} className="text-[#005DDC]" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No applications yet</p>
          <p className="text-xs text-gray-500 mb-4">Start applying to jobs to track your progress</p>
          <SmartLink
            href="/job/findjob"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#005DDC] rounded-lg hover:bg-[#0046B3] transition-colors"
          >
            <Briefcase size={14} />
            Find Jobs
          </SmartLink>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const config = statusConfig[app.status] || statusConfig.APPLIED;
            const StatusIcon = config.icon;
            return (
              <div
                key={app.application_id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon size={16} className={config.color} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {app.job.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {app.job.location || "Remote"} • {formatDate(app.applied_at)}
                    </p>
                  </div>
                </div>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${config.bg} ${config.color} flex-shrink-0 ml-2`}>
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
