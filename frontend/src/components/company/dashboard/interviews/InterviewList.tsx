"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, User, Briefcase, Eye, RefreshCw } from "lucide-react";
import { useCompanyInterviews } from "@/src/lib/interview/interview.queries";
import { InterviewStatusBadge, QualificationBadge, ScoreBadge } from "./InterviewStatusBadge";
import { AIInterviewStatus, RecruiterInterviewListItem } from "@/src/types/interview.types";

type FilterTab = "all" | "pending" | "in_progress" | "completed";

interface InterviewListProps {
  onViewDetails?: (interviewId: string) => void;
}

export default function InterviewList({ onViewDetails }: InterviewListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error, refetch } = useCompanyInterviews();

  const filteredInterviews = useMemo(() => {
    if (!data) return [];

    let filtered = data;

    // Filter by tab
    if (activeTab !== "all") {
      const statusMap: Record<FilterTab, AIInterviewStatus | null> = {
        all: null,
        pending: AIInterviewStatus.PENDING,
        in_progress: AIInterviewStatus.IN_PROGRESS,
        completed: AIInterviewStatus.COMPLETED,
      };
      const targetStatus = statusMap[activeTab];
      if (targetStatus) {
        filtered = filtered.filter((item) => item.status === targetStatus);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.candidateName.toLowerCase().includes(query) ||
          item.candidateEmail.toLowerCase().includes(query) ||
          item.jobTitle.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [data, activeTab, searchQuery]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
  ];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-[#001F3F] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Refresh */}
          <div className="flex gap-2 items-center">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate or job..."
              className="w-full md:w-64 border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm"
            />
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Loading interviews...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <p className="text-red-700">Failed to load interviews.</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm text-[#001F3F] hover:underline"
          >
            Try again
          </button>
        </div>
      ) : !filteredInterviews.length ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <p className="font-semibold text-gray-900">No interviews found</p>
          <p className="text-sm text-gray-600 mt-1">
            {searchQuery || activeTab !== "all"
              ? "Try adjusting your filters."
              : "Assign an interview to a candidate to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInterviews.map((interview, index) => (
            <InterviewCard
              key={interview.interviewId}
              interview={interview}
              index={index}
              onViewDetails={onViewDetails}
              formatDate={formatDate}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface InterviewCardProps {
  interview: RecruiterInterviewListItem;
  index: number;
  onViewDetails?: (interviewId: string) => void;
  formatDate: (dateStr?: string) => string;
  formatTime: (dateStr?: string) => string;
}

function InterviewCard({
  interview,
  index,
  onViewDetails,
  formatDate,
  formatTime,
}: InterviewCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Candidate Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#001F3F] to-[#003366] rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {interview.candidateName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {interview.candidateName}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {interview.candidateEmail}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" />
              {interview.jobTitle}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(interview.scheduledDate)}
              {interview.scheduledDate && (
                <span className="text-gray-400 ml-1">
                  {formatTime(interview.scheduledDate)}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <InterviewStatusBadge status={interview.status} />
            {interview.qualification && (
              <QualificationBadge qualification={interview.qualification} />
            )}
            {interview.overallScore !== undefined && interview.overallScore !== null && (
              <ScoreBadge score={interview.overallScore} />
            )}
          </div>

          {interview.status === AIInterviewStatus.COMPLETED && onViewDetails && (
            <button
              onClick={() => onViewDetails(interview.interviewId)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#001F3F] border border-[#001F3F] rounded-lg hover:bg-[#001F3F] hover:text-white transition-colors"
            >
              <Eye className="w-4 h-4" />
              View Details
            </button>
          )}
        </div>
      </div>

      {/* Timestamps */}
      {(interview.startedAt || interview.completedAt) && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          {interview.startedAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Started: {formatDate(interview.startedAt)} {formatTime(interview.startedAt)}
            </span>
          )}
          {interview.completedAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Completed: {formatDate(interview.completedAt)} {formatTime(interview.completedAt)}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
