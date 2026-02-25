"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface DashboardStatusProps {
  showOn?: "mobile" | "desktop" | "all";
}

const STATUS_CONFIG = [
  { key: "APPLIED", label: "Applied", color: "#3B82F6" },
  { key: "SCREENING", label: "Screening", color: "#F59E0B" },
  { key: "ASSESSMENT_REQUIRED", label: "Assessment", color: "#F97316" },
  { key: "INTERVIEW_REQUIRED", label: "Interview", color: "#8B5CF6" },
  { key: "SHORTLISTED", label: "Shortlisted", color: "#10B981" },
  { key: "OFFERED", label: "Offered", color: "#059669" },
  { key: "HIRED", label: "Hired", color: "#047857" },
  { key: "REJECTED", label: "Rejected", color: "#EF4444" },
];

export default function ApplicationStats({ showOn = "all" }: DashboardStatusProps) {
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  let visibilityClass = "";
  if (showOn === "mobile") visibilityClass = "block md:hidden";
  else if (showOn === "desktop") visibilityClass = "hidden md:block";

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/candidate/applications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const counts: Record<string, number> = {};
          (data.items || []).forEach((app: any) => {
            counts[app.status] = (counts[app.status] || 0) + 1;
          });
          setStatusCounts(counts);
        }
      } catch (err) {
        console.error("Failed to fetch application stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const chartData = STATUS_CONFIG.map((s) => ({
    label: s.label,
    value: statusCounts[s.key] || 0,
    color: s.color,
  })).filter((d) => d.value > 0);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  if (loading) {
    return (
      <div className={`bg-white w-full rounded-xl p-6 ${visibilityClass}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/2"></div>
          <div className="h-28 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white w-full rounded-xl p-6 ${visibilityClass}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="lg:text-sm xl:text-lg font-semibold text-gray-900">Application Status</h3>
        <span className="text-xs text-gray-500">{total} Total</span>
      </div>

      {total === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">No applications yet</p>
          <p className="text-xs text-gray-400 mt-1">Apply to jobs to see your stats here</p>
        </div>
      ) : (
        <div className="flex justify-start items-center gap-4">
          <div className="relative w-28 h-28 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={48}
                  startAngle={-90}
                  endAngle={270}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-gray-900">{total}</span>
              <span className="text-[9px] text-gray-500">Total</span>
            </div>
          </div>

          <div className="space-y-2 flex-1">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs text-gray-700">{item.label}</span>
                </div>
                <span className="text-xs font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
