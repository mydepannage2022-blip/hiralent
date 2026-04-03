"use client";

import React, { useState } from "react";
import { Plus, BarChart2, Clock, CheckCircle } from "lucide-react";
import InterviewList from "@/src/components/company/dashboard/interviews/InterviewList";
import AssignInterviewModal from "@/src/components/company/dashboard/interviews/AssignInterviewModal";
import InterviewDetailsModal from "@/src/components/company/dashboard/interviews/InterviewDetailsModal";
import { useCompanyInterviews } from "@/src/lib/interview/interview.queries";
import { AIInterviewStatus } from "@/src/types/interview.types";

export default function InterviewsPage() {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const { data, refetch } = useCompanyInterviews();

  const handleViewDetails = (interviewId: string) => {
    setSelectedInterviewId(interviewId);
    setShowDetailsModal(true);
  };

  const total = data?.length ?? 0;
  const pending = data?.filter(i => i.status === AIInterviewStatus.PENDING).length ?? 0;
  const completed = data?.filter(i => i.status === AIInterviewStatus.COMPLETED).length ?? 0;

  return (
    <div className="space-y-5">

      {/* Hero Banner */}
      <div className="bg-[#005DDC] rounded-2xl px-6 py-5 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">AI Interviews</h2>
            <p className="text-blue-200 text-sm mt-0.5">
              Automated video interviews scored on soft skills &amp; technical fit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          {/* Quick stats */}
          <div className="hidden md:flex items-center gap-5 text-sm">
            <div className="flex items-center gap-2 text-white/70">
              <BarChart2 className="w-4 h-4" />
              <span className="font-semibold text-white">{total}</span> total
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <Clock className="w-4 h-4" />
              <span className="font-semibold text-white">{pending}</span> pending
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <CheckCircle className="w-4 h-4" />
              <span className="font-semibold text-white">{completed}</span> completed
            </div>
          </div>

          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#005DDC] rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Assign Interview
          </button>
        </div>
      </div>

      {/* Interview List */}
      <InterviewList onViewDetails={handleViewDetails} />

      {/* Modals */}
      <AssignInterviewModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onSuccess={refetch}
      />

      {selectedInterviewId && (
        <InterviewDetailsModal
          open={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedInterviewId(null);
          }}
          interviewId={selectedInterviewId}
        />
      )}
    </div>
  );
}
