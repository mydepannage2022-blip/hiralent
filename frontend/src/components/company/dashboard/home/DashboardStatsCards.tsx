"use client";
import { Users2, MessagesSquare, CalendarCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { API_V1_BASE } from "@/src/lib/config/api";

const API_BASE = API_V1_BASE;

const DashboardStatsCards = () => {
  const { token } = useAuth();
  const [candidatesToReview, setCandidatesToReview] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/jobs/company/dashboard-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setCandidatesToReview(data?.data?.candidates_to_review ?? 0))
      .catch(() => setCandidatesToReview(0));
  }, [token]);

  const stats = [
    {
      label: "Candidates to review",
      value: candidatesToReview,
      icon: Users2,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Messages received",
      value: null,
      icon: MessagesSquare,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
    },
    {
      label: "Interviews scheduled",
      value: null,
      icon: CalendarCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-4"
        >
          <div className={`${stat.bg} ${stat.border} border rounded-lg p-2.5 shrink-0`}>
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-2xl font-bold text-gray-900 leading-none mb-1">
              {stat.value === null ? (
                <span className="text-gray-300">—</span>
              ) : stat.value === undefined ? (
                <span className="inline-block w-8 h-5 bg-gray-100 rounded animate-pulse" />
              ) : (
                stat.value
              )}
            </div>
            <div className="text-xs text-gray-500 leading-tight">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStatsCards;
