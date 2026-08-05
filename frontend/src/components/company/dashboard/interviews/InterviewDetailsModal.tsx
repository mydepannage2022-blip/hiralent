"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { API_V1_BASE } from "@/src/lib/config/api";
import {
  X,
  Briefcase,
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
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Loader2,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useInterviewDetails } from "@/src/lib/interview/interview.queries";
import type { InterviewDetailedResult, CheatingEvent } from "@/src/types/interview.types";

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
  const [activeTab, setActiveTab] = useState<"overview" | "transcript" | "video">("overview");

  if (!open) return null;

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "transcript" as const, label: "Transcript" },
    { id: "video" as const, label: "Recording", icon: <Video className="w-3.5 h-3.5" /> },
  ];

  const modalContent = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-5xl h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-[#005DDC] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Interview Details</h2>
                <p className="text-blue-200 text-xs mt-0.5">Full analysis &amp; recording</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-gray-100 shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                    activeTab === tab.id
                      ? "border-[#005DDC] text-[#005DDC] bg-blue-50/60"
                      : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50/40">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-[#005DDC] animate-spin" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                  <p className="text-gray-600 font-medium">Failed to load interview details</p>
                </div>
              ) : data ? (
                <div className="p-6">
                  {activeTab === "overview" && <OverviewTab data={data} />}
                  {activeTab === "transcript" && <TranscriptTab data={data} />}
                  {activeTab === "video" && <VideoTab interviewId={interviewId} interviewDuration={data.duration} />}
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

// ==================== Overview Tab ====================

const VIOLATION_META: Record<string, { label: string; color: 'red' | 'orange' | 'amber' }> = {
  MULTIPLE_FACES:  { label: 'Multiple faces',          color: 'red' },
  PHONE_DETECTED:  { label: 'Phone detected',           color: 'red' },
  TAB_SWITCH:      { label: 'Tab switch',               color: 'orange' },
  WINDOW_BLUR:     { label: 'App switch',               color: 'orange' },
  NO_FACE:         { label: 'No face',                  color: 'amber' },
  LOOKING_AWAY:    { label: 'Looking away',             color: 'amber' },
};

const violationClasses = {
  red:    { pill: 'bg-red-100 border-red-200 text-red-700',       icon: 'text-red-400' },
  orange: { pill: 'bg-orange-50 border-orange-200 text-orange-700', icon: 'text-orange-400' },
  amber:  { pill: 'bg-amber-50 border-amber-200 text-amber-700',  icon: 'text-amber-400' },
};

const OverviewTab: React.FC<{ data: InterviewDetailedResult }> = ({ data }) => {
  const [showTimeline, setShowTimeline] = useState(false);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const qualColor =
    data.qualification === "QUALIFIED"
      ? { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500" }
      : data.qualification === "NOT_QUALIFIED"
      ? { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" }
      : { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", dot: "bg-yellow-500" };

  const scoreColor =
    data.overallScore >= 70 ? "text-green-600" : data.overallScore >= 40 ? "text-yellow-600" : "text-red-600";

  const events = data.cheatingEvents ?? [];
  const hasViolations = events.length > 0;
  const grouped = events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">

      {/* ── Top stat strip ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Score */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Score</p>
            <p className={`text-3xl font-extrabold ${scoreColor}`}>{data.overallScore}</p>
            <p className="text-[11px] text-gray-400">out of 100</p>
          </div>
        </div>

        {/* Qualification */}
        <div className={`rounded-xl border p-5 flex items-center gap-4 ${qualColor.bg} ${qualColor.border}`}>
          <div className={`w-14 h-14 rounded-full bg-white/60 flex items-center justify-center shrink-0`}>
            {data.qualification === "QUALIFIED"
              ? <CheckCircle className={`w-6 h-6 ${qualColor.text}`} />
              : <AlertCircle className={`w-6 h-6 ${qualColor.text}`} />}
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Verdict</p>
            <p className={`text-lg font-bold ${qualColor.text}`}>{data.qualification?.replace("_", " ")}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${qualColor.dot}`} />
              <p className="text-[11px] text-gray-500">Fit score: {data.evaluation?.fitScore ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Duration */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Duration</p>
            <p className="text-2xl font-bold text-gray-800">{formatDuration(data.duration)}</p>
            <p className="text-[11px] text-gray-400">{data.questions?.length ?? 0} questions</p>
          </div>
        </div>
      </div>

      {/* ── Two-col: Fraud + Sentiment ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Fraud Detection */}
        <div className={`bg-white rounded-xl border p-4 ${hasViolations ? 'border-red-200' : 'border-green-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className={`w-4 h-4 ${hasViolations ? 'text-red-400' : 'text-green-500'}`} />
              <span className="text-sm font-semibold text-gray-800">Fraud Detection</span>
            </div>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              hasViolations ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
            }`}>
              {hasViolations ? `${events.length} events` : 'Clean'}
            </span>
          </div>

          {hasViolations ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(grouped).map(([type, count]) => {
                  const meta = VIOLATION_META[type] ?? { label: type, color: 'amber' as const };
                  const cls = violationClasses[meta.color];
                  return (
                    <span key={type} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cls.pill}`}>
                      <AlertTriangle className={`w-3 h-3 ${cls.icon}`} />
                      {meta.label}
                      <span className="font-bold ml-0.5">×{count}</span>
                    </span>
                  );
                })}
              </div>
              <button
                onClick={() => setShowTimeline(v => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showTimeline ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showTimeline ? 'Hide timeline' : `View timeline`}
              </button>
              {showTimeline && (
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {events.map((event: CheatingEvent, i: number) => {
                    const meta = VIOLATION_META[event.type] ?? { label: event.type, color: 'amber' as const };
                    const cls = violationClasses[meta.color];
                    return (
                      <div key={i} className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border ${cls.pill}`}>
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className={`w-3 h-3 ${cls.icon}`} />
                          <span className="font-medium">{meta.label}</span>
                        </div>
                        <span className="text-gray-400 ml-2">{new Date(event.timestamp).toLocaleTimeString()}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4 shrink-0" />
              No suspicious activity detected.
            </div>
          )}
        </div>

        {/* Sentiment */}
        {data.sentiment?.overall ? (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-800">Sentiment</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { label: 'Confidence', value: data.sentiment.overall.confidence },
                { label: 'Tone', value: data.sentiment.overall.tone },
                { label: 'Engagement', value: data.sentiment.overall.engagement.replace(/_/g, ' ') },
                { label: 'Consistency', value: data.sentiment.overall.consistency },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-gray-800 capitalize mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{data.sentiment.summary}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-gray-300" />
              <span className="text-sm font-semibold text-gray-800">Sentiment</span>
            </div>
            <p className="text-xs text-gray-400">Not available — no responses given.</p>
          </div>
        )}
      </div>

      {/* ── Evaluation ── */}
      {data.evaluation && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-[#005DDC]" />
            <span className="text-sm font-semibold text-gray-800">Evaluation</span>
          </div>

          {/* Recommendation */}
          {data.evaluation.recommendation && (
            <p className="text-sm text-gray-700 mb-4 pb-4 border-b border-gray-100">
              {data.evaluation.recommendation}
            </p>
          )}

          {/* Role Fit Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 font-medium">Role Fit</span>
              <span className={`text-xs font-bold ${
                data.evaluation.fitScore >= 70 ? 'text-green-600' : data.evaluation.fitScore >= 40 ? 'text-yellow-600' : 'text-red-600'
              }`}>{data.evaluation.fitScore}/100</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  data.evaluation.fitScore >= 70 ? 'bg-green-500' : data.evaluation.fitScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${data.evaluation.fitScore}%` }}
              />
            </div>
          </div>

          {/* Strengths / Improvements / Red Flags in 3-col */}
          <div className="grid grid-cols-3 gap-3">
            {data.evaluation.strengths?.length > 0 && (
              <div className="border-l-2 border-green-400 pl-3">
                <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wide mb-1.5">Strengths</p>
                <ul className="space-y-1">
                  {data.evaluation.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                      <span className="text-green-400 mt-0.5 shrink-0">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.evaluation.areasForImprovement?.length > 0 && (
              <div className="border-l-2 border-yellow-400 pl-3">
                <p className="text-[11px] font-semibold text-yellow-600 uppercase tracking-wide mb-1.5">Improve</p>
                <ul className="space-y-1">
                  {data.evaluation.areasForImprovement.map((a, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                      <span className="text-yellow-400 mt-0.5 shrink-0">•</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.evaluation.redFlags?.length > 0 && (
              <div className="border-l-2 border-red-400 pl-3">
                <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wide mb-1.5">Red Flags</p>
                <ul className="space-y-1">
                  {data.evaluation.redFlags.map((f, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                      <span className="text-red-400 mt-0.5 shrink-0">•</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Soft Skills ── */}
      {data.softSkills?.communication ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-[#005DDC]" />
            <span className="text-sm font-semibold text-gray-800">Soft Skills</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Communication',   skill: data.softSkills.communication,   icon: <MessageSquare className="w-3.5 h-3.5" /> },
              { label: 'Problem Solving', skill: data.softSkills.problemSolving,   icon: <Lightbulb className="w-3.5 h-3.5" /> },
              { label: 'Leadership',      skill: data.softSkills.leadership,       icon: <Target className="w-3.5 h-3.5" /> },
              { label: 'Teamwork',        skill: data.softSkills.teamwork,         icon: <Users className="w-3.5 h-3.5" /> },
              { label: 'Adaptability',    skill: data.softSkills.adaptability,     icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { label: 'Critical Thinking', skill: data.softSkills.criticalThinking, icon: <Brain className="w-3.5 h-3.5" /> },
            ].map(({ label, skill, icon }) => (
              <SoftSkillRow key={label} name={label} score={skill.score} evidence={skill.evidence} icon={icon} />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-gray-300" />
            <span className="text-sm font-semibold text-gray-800">Soft Skills</span>
          </div>
          <p className="text-xs text-gray-400">Not available — interview was not completed.</p>
        </div>
      )}

      {/* ── Questions & Responses ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-4 h-4 text-[#005DDC]" />
          <span className="text-sm font-semibold text-gray-800">Questions & Responses</span>
        </div>
        <div className="space-y-3">
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
    <div className="space-y-3">
      {data.transcript.map((entry, index) => (
        <div
          key={index}
          className={`flex gap-3 ${entry.role === 'ai' ? '' : 'flex-row-reverse'}`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
            entry.role === 'ai' ? 'bg-[#005DDC]' : 'bg-gray-400'
          }`}>
            {entry.role === 'ai' ? 'AI' : 'C'}
          </div>
          <div className={`max-w-[75%] ${entry.role === 'ai' ? '' : 'items-end'}`}>
            <p className={`text-[10px] text-gray-400 mb-1 ${entry.role !== 'ai' ? 'text-right' : ''}`}>
              {entry.role === 'ai' ? 'AI Interviewer' : 'Candidate'} · {formatTime(entry.timestamp)}
            </p>
            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              entry.role === 'ai'
                ? 'bg-blue-50 text-gray-800 rounded-tl-sm'
                : 'bg-gray-100 text-gray-800 rounded-tr-sm'
            }`}>
              {entry.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== Video Tab ====================

const formatTime = (seconds: number): string => {
  if (!seconds || !isFinite(seconds) || seconds < 0) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const VideoTab: React.FC<{ interviewId: string; interviewDuration?: number }> = ({
  interviewId,
  interviewDuration,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoBlob, setVideoBlob] = useState<string | null>(null);
  const videoBlobRef = useRef<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(interviewDuration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem("authToken");
        if (!token) { setError("Authentication required."); setIsLoading(false); return; }
        const response = await fetch(
          `${API_V1_BASE}/interviews/${interviewId}/video-stream`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) {
          setError(response.status === 404 ? "Video not found." : response.status === 403 ? "Permission denied." : `Failed to load video (${response.status})`);
          setIsLoading(false);
          return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        if (videoBlobRef.current) URL.revokeObjectURL(videoBlobRef.current);
        videoBlobRef.current = url;
        setVideoBlob(url);
      } catch {
        setError("Failed to load video. Check your connection.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchVideo();
    return () => { if (videoBlobRef.current) { URL.revokeObjectURL(videoBlobRef.current); videoBlobRef.current = null; } };
  }, [interviewId]);

  useEffect(() => {
    if (isPlaying && !isHovering) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    } else {
      setShowControls(true);
    }
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [isPlaying, isHovering]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (!duration && videoRef.current.duration && isFinite(videoRef.current.duration)) setDuration(videoRef.current.duration);
    }
  }, [duration]);

  const handleLoadedMetadata = useCallback(() => {
    const d = videoRef.current?.duration;
    if (d && isFinite(d)) setDuration(d);
  }, []);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && videoRef.current && duration > 0) {
      const rect = progressRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      videoRef.current.currentTime = pct * duration;
      setCurrentTime(pct * duration);
    }
  }, [duration]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      if (isMuted) { videoRef.current.volume = volume || 0.5; setIsMuted(false); }
      else { videoRef.current.volume = 0; setIsMuted(true); }
    }
  }, [isMuted, volume]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    setIsMuted(v === 0);
  }, []);

  const skip = useCallback((sec: number) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + sec));
  }, [duration]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen();
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Video className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-gray-600 font-medium mb-1">Video Not Available</p>
        <p className="text-sm text-gray-400 text-center max-w-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative bg-black rounded-xl overflow-hidden shadow-xl"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={() => setShowControls(true)}
      >
        <div className="aspect-video">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
              <p className="text-gray-400 text-sm mt-3">Loading recording...</p>
            </div>
          )}
          {videoBlob && (
            <video
              ref={videoRef}
              src={videoBlob}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onDurationChange={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onError={() => setError("Failed to play video.")}
              preload="metadata"
            />
          )}
          {videoBlob && !isPlaying && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20" onClick={togglePlay}>
              <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-xl hover:bg-white hover:scale-105 transition-all">
                <Play className="w-7 h-7 text-[#005DDC] ml-1" fill="#005DDC" />
              </div>
            </div>
          )}
        </div>

        {videoBlob && (
          <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
            <div className="relative px-4 pb-4 pt-10">
              <div ref={progressRef} className="group/progress mb-3 cursor-pointer" onClick={handleProgressClick}>
                <div className="h-1 group-hover/progress:h-1.5 transition-all rounded-full bg-white/20 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full w-full" />
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button onClick={togglePlay} className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-all">
                    {isPlaying ? <Pause className="w-4 h-4" fill="white" /> : <Play className="w-4 h-4 ml-0.5" fill="white" />}
                  </button>
                  <button onClick={() => skip(-10)} className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => skip(10)} className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-1 group/vol">
                    <button onClick={toggleMute} className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
                      {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-300">
                      <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-16 h-1 ml-1 accent-blue-400 cursor-pointer" />
                    </div>
                  </div>
                  <span className="text-white/80 text-xs ml-2 font-medium tabular-nums">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                <button onClick={toggleFullscreen} className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== Helper Components ====================

const SoftSkillRow: React.FC<{
  name: string;
  score: number;
  evidence: string[];
  icon: React.ReactNode;
}> = ({ name, score, evidence, icon }) => {
  const [expanded, setExpanded] = useState(false);

  const barColor = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="text-gray-400 shrink-0">{icon}</div>
        <span className="text-xs font-medium text-gray-700 w-32 shrink-0">{name}</span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
        </div>
        <span className={`text-xs font-bold w-8 text-right ${scoreColor}`}>{score}</span>
        {evidence.length > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="text-gray-300 hover:text-gray-500 transition-colors">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {expanded && evidence.length > 0 && (
        <ul className="mt-1.5 ml-8 space-y-0.5">
          {evidence.map((item, i) => (
            <li key={i} className="text-xs text-gray-500 flex items-start gap-1">
              <span className="text-gray-300 shrink-0">•</span>{item}
            </li>
          ))}
        </ul>
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
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
      <div className="flex items-start gap-3 mb-2">
        <span className="w-6 h-6 rounded-full bg-[#005DDC] text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">{question.type}</span>
            {question.category && (
              <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{question.category}</span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-800">{question.questionText}</p>
        </div>
      </div>

      {response?.responseText ? (
        <div className="ml-9">
          <p className="text-sm text-gray-600 leading-relaxed">
            {expanded ? response.responseText : response.responseText.slice(0, 150) + (response.responseText.length > 150 ? "…" : "")}
          </p>
          {response.responseText.length > 150 && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-500 hover:text-blue-700 mt-1">
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
          {response.analysis && (
            <div className="flex gap-2 mt-3">
              {[
                { label: 'Relevance', value: response.analysis.relevanceScore },
                { label: 'Completeness', value: response.analysis.completenessScore },
                { label: 'Clarity', value: response.analysis.clarityScore },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-gray-100 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-[10px] text-gray-400">{label}</p>
                  <p className={`text-sm font-bold ${value >= 70 ? 'text-green-600' : value >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="ml-9 text-xs text-gray-400 italic">No response given</p>
      )}
    </div>
  );
};

export default InterviewDetailsModal;
