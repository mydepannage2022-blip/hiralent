"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Briefcase,
  Calendar,
  Clock,
  TrendingUp,
  MessageSquare,
  Brain,
  Users,
  Target,
  Lightbulb,
  Shield,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useInterviewDetails } from "@/src/lib/interview/interview.queries";
import type { InterviewDetailedResult } from "@/src/types/interview.types";

interface InterviewDetailsModalProps {
  open: boolean;
  onClose: () => void;
  interviewId: string;
}

const InterviewDetailsModal: React.FC<InterviewDetailsModalProps> = ({
  open,
  onClose,
  interviewId,
}) => {
  const { data, isLoading, error } = useInterviewDetails(interviewId);
  const [activeTab, setActiveTab] = useState<"overview" | "transcript">("overview");

  if (!open) return null;

  const modalContent = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-[#001F3F] to-[#003366] text-white px-6 py-5">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-2xl font-bold mb-1">Interview Details</h2>
              <p className="text-blue-100 text-sm">
                Complete analysis and transcript
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "overview"
                    ? "border-[#001F3F] text-[#001F3F]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Overview & Analysis
              </button>
              <button
                onClick={() => setActiveTab("transcript")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "transcript"
                    ? "border-[#001F3F] text-[#001F3F]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Full Transcript
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001F3F]" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <AlertCircle className="w-12 h-12 text-red-500" />
                  <p className="text-gray-700 font-medium">Failed to load interview details</p>
                  <p className="text-sm text-gray-500">Please try again later</p>
                </div>
              ) : data ? (
                <>
                  {activeTab === "overview" && <OverviewTab data={data} />}
                  {activeTab === "transcript" && <TranscriptTab data={data} />}
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

// ==================== Overview Tab ====================

const OverviewTab: React.FC<{ data: InterviewDetailedResult }> = ({ data }) => {
  const formatDate = (date?: Date | string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Score */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-blue-900">Overall Score</span>
          </div>
          <p className="text-3xl font-bold text-blue-900">{data.overallScore}/100</p>
        </div>

        {/* Qualification */}
        <div className={`rounded-xl p-5 border ${
          data.qualification === "QUALIFIED"
            ? "bg-gradient-to-br from-green-50 to-green-100 border-green-200"
            : data.qualification === "NOT_QUALIFIED"
            ? "bg-gradient-to-br from-red-50 to-red-100 border-red-200"
            : "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200"
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${
              data.qualification === "QUALIFIED"
                ? "bg-green-500"
                : data.qualification === "NOT_QUALIFIED"
                ? "bg-red-500"
                : "bg-yellow-500"
            }`}>
              {data.qualification === "QUALIFIED" ? (
                <CheckCircle className="w-5 h-5 text-white" />
              ) : (
                <AlertCircle className="w-5 h-5 text-white" />
              )}
            </div>
            <span className={`text-sm font-medium ${
              data.qualification === "QUALIFIED"
                ? "text-green-900"
                : data.qualification === "NOT_QUALIFIED"
                ? "text-red-900"
                : "text-yellow-900"
            }`}>
              Qualification
            </span>
          </div>
          <p className={`text-xl font-bold ${
            data.qualification === "QUALIFIED"
              ? "text-green-900"
              : data.qualification === "NOT_QUALIFIED"
              ? "text-red-900"
              : "text-yellow-900"
          }`}>
            {data.qualification?.replace("_", " ")}
          </p>
        </div>

        {/* Duration */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-purple-900">Duration</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {formatDuration(data.duration)}
          </p>
        </div>
      </div>

      {/* Evaluation Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-[#001F3F]" />
          Evaluation Summary
        </h3>

        <div className="space-y-4">
          {/* Recommendation */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Recommendation</p>
            <p className="text-gray-900">{data.evaluation.recommendation}</p>
          </div>

          {/* Fit Score */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Role Fit Score</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#001F3F] rounded-full transition-all"
                  style={{ width: `${data.evaluation.fitScore}%` }}
                />
              </div>
              <span className="font-semibold text-[#001F3F]">
                {data.evaluation.fitScore}/100
              </span>
            </div>
          </div>

          {/* Strengths */}
          {data.evaluation.strengths.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Strengths
              </p>
              <ul className="space-y-1.5">
                {data.evaluation.strengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas for Improvement */}
          {data.evaluation.areasForImprovement.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-600" />
                Areas for Improvement
              </p>
              <ul className="space-y-1.5">
                {data.evaluation.areasForImprovement.map((area, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-yellow-600 mt-0.5">•</span>
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Red Flags */}
          {data.evaluation.redFlags.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Red Flags
              </p>
              <ul className="space-y-1.5">
                {data.evaluation.redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Soft Skills Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-[#001F3F]" />
          Soft Skills Analysis
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SoftSkillCard
            name="Communication"
            score={data.softSkills.communication.score}
            evidence={data.softSkills.communication.evidence}
            icon={<MessageSquare className="w-5 h-5" />}
          />
          <SoftSkillCard
            name="Problem Solving"
            score={data.softSkills.problemSolving.score}
            evidence={data.softSkills.problemSolving.evidence}
            icon={<Lightbulb className="w-5 h-5" />}
          />
          <SoftSkillCard
            name="Leadership"
            score={data.softSkills.leadership.score}
            evidence={data.softSkills.leadership.evidence}
            icon={<Target className="w-5 h-5" />}
          />
          <SoftSkillCard
            name="Teamwork"
            score={data.softSkills.teamwork.score}
            evidence={data.softSkills.teamwork.evidence}
            icon={<Users className="w-5 h-5" />}
          />
          <SoftSkillCard
            name="Adaptability"
            score={data.softSkills.adaptability.score}
            evidence={data.softSkills.adaptability.evidence}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <SoftSkillCard
            name="Critical Thinking"
            score={data.softSkills.criticalThinking.score}
            evidence={data.softSkills.criticalThinking.evidence}
            icon={<Brain className="w-5 h-5" />}
          />
        </div>
      </div>

      {/* Sentiment Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#001F3F]" />
          Sentiment Analysis
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Confidence</p>
            <p className="font-semibold text-gray-900 capitalize">
              {data.sentiment.overall.confidence}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Tone</p>
            <p className="font-semibold text-gray-900 capitalize">
              {data.sentiment.overall.tone}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Engagement</p>
            <p className="font-semibold text-gray-900 capitalize">
              {data.sentiment.overall.engagement.replace("_", " ")}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Consistency</p>
            <p className="font-semibold text-gray-900 capitalize">
              {data.sentiment.overall.consistency}
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">{data.sentiment.summary}</p>
        </div>
      </div>

      {/* Questions & Responses */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4">Questions & Responses</h3>
        <div className="space-y-4">
          {data.questions.map((question, index) => {
            const response = data.responses.find((r) => r.questionId === question.questionId);
            return (
              <QuestionResponseCard
                key={question.questionId}
                question={question}
                response={response}
                index={index}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==================== Transcript Tab ====================

const TranscriptTab: React.FC<{ data: InterviewDetailedResult }> = ({ data }) => {
  const formatTime = (timestamp: Date | string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {data.transcript.map((entry, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg ${
            entry.role === "ai"
              ? "bg-blue-50 border border-blue-200"
              : "bg-gray-50 border border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                entry.role === "ai" ? "bg-blue-500" : "bg-gray-600"
              }`}
            >
              {entry.role === "ai" ? "AI" : "C"}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {entry.role === "ai" ? "AI Interviewer" : "Candidate"}
              </p>
              <p className="text-xs text-gray-500">{formatTime(entry.timestamp)}</p>
            </div>
          </div>
          <p className="text-gray-700 pl-11">{entry.content}</p>
        </div>
      ))}
    </div>
  );
};

// ==================== Helper Components ====================

const SoftSkillCard: React.FC<{
  name: string;
  score: number;
  evidence: string[];
  icon: React.ReactNode;
}> = ({ name, score, evidence, icon }) => {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-[#001F3F]">{icon}</div>
          <span className="font-medium text-gray-900">{name}</span>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-sm font-semibold ${getScoreColor(score)}`}
        >
          {score}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#001F3F] rounded-full transition-all"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Evidence */}
      {evidence.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            <span>Evidence ({evidence.length})</span>
          </button>

          {expanded && (
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              {evidence.map((item, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

const QuestionResponseCard: React.FC<{
  question: any;
  response: any;
  index: number;
}> = ({ question, response, index }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-500">
              Question {index + 1}
            </span>
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              {question.type}
            </span>
            {question.category && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {question.category}
              </span>
            )}
          </div>
          <p className="text-gray-900 font-medium">{question.questionText}</p>
        </div>
      </div>

      {response && (
        <>
          <div className="pl-4 border-l-2 border-gray-200 mb-3">
            <p className="text-sm text-gray-700">
              {expanded
                ? response.responseText
                : response.responseText.slice(0, 150) +
                  (response.responseText.length > 150 ? "..." : "")}
            </p>
            {response.responseText.length > 150 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-[#001F3F] hover:underline mt-1"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>

          {/* Analysis Scores */}
          {response.analysis && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-gray-50 rounded px-2 py-1.5">
                <p className="text-gray-500 mb-0.5">Relevance</p>
                <p className="font-semibold text-gray-900">
                  {response.analysis.relevanceScore}/100
                </p>
              </div>
              <div className="bg-gray-50 rounded px-2 py-1.5">
                <p className="text-gray-500 mb-0.5">Completeness</p>
                <p className="font-semibold text-gray-900">
                  {response.analysis.completenessScore}/100
                </p>
              </div>
              <div className="bg-gray-50 rounded px-2 py-1.5">
                <p className="text-gray-500 mb-0.5">Clarity</p>
                <p className="font-semibold text-gray-900">
                  {response.analysis.clarityScore}/100
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InterviewDetailsModal;
