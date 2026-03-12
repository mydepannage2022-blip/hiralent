"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Info } from "lucide-react";
import InterviewList from "@/src/components/company/dashboard/interviews/InterviewList";
import AssignInterviewModal from "@/src/components/company/dashboard/interviews/AssignInterviewModal";
import InterviewDetailsModal from "@/src/components/company/dashboard/interviews/InterviewDetailsModal";
import { useCompanyInterviews } from "@/src/lib/interview/interview.queries";

export default function InterviewsPage() {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const { refetch } = useCompanyInterviews();

  const handleViewDetails = (interviewId: string) => {
    setSelectedInterviewId(interviewId);
    setShowDetailsModal(true);
  };

  const handleAssignSuccess = () => {
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAssignModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#003366] transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Assign Interview
        </button>
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900">How AI Interviews Work</h3>
            <p className="text-sm text-blue-700 mt-1">
              Assign an AI interview to a candidate, and they will receive a
              notification to complete it. The AI interviewer will ask questions
              based on the job requirements, focusing 70% on soft skills and 30%
              on technical competencies. Once completed, you can view detailed
              analysis, scores, and transcripts.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Interview List */}
      <InterviewList onViewDetails={handleViewDetails} />

      {/* Assign Interview Modal */}
      <AssignInterviewModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onSuccess={handleAssignSuccess}
      />

      {/* Interview Details Modal */}
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
