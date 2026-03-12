"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  RotateCcw,
  SkipBack,
  SkipForward,
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
  const [activeTab, setActiveTab] = useState<"overview" | "transcript" | "video">("overview");

  if (!open) return null;

  const modalContent = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
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
            <div className="relative bg-linear-to-r from-[#001F3F] to-[#003366] text-white px-6 py-5">
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
              <button
                onClick={() => setActiveTab("video")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "video"
                    ? "border-[#001F3F] text-[#001F3F]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Video className="w-4 h-4" />
                Video Recording
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
                  {activeTab === "video" && <VideoTab interviewId={interviewId} interviewDuration={data.duration} />}
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
        <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
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
            ? "bg-linear-to-br from-green-50 to-green-100 border-green-200"
            : data.qualification === "NOT_QUALIFIED"
            ? "bg-linear-to-br from-red-50 to-red-100 border-red-200"
            : "bg-linear-to-br from-yellow-50 to-yellow-100 border-yellow-200"
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
        <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
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
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Role Fit Score</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                data.evaluation.fitScore >= 70
                  ? 'bg-green-100 text-green-700'
                  : data.evaluation.fitScore >= 40
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
              }`}>
                {data.evaluation.fitScore >= 70 ? 'Good Fit' : data.evaluation.fitScore >= 40 ? 'Average' : 'Low Fit'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    data.evaluation.fitScore >= 70
                      ? 'bg-green-500'
                      : data.evaluation.fitScore >= 40
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${data.evaluation.fitScore}%` }}
                />
              </div>
              <span className={`font-bold text-lg ${
                data.evaluation.fitScore >= 70
                  ? 'text-green-600'
                  : data.evaluation.fitScore >= 40
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}>
                {data.evaluation.fitScore}
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

// ==================== Video Tab ====================

// Helper to format seconds as MM:SS or HH:MM:SS
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

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  // Use interview duration from database, fallback to video metadata
  const [duration, setDuration] = useState(interviewDuration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch video
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem("authToken");
        if (!token) {
          setError("Authentication required. Please log in again.");
          setIsLoading(false);
          return;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/interviews/${interviewId}/video-stream`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
          const msg =
            response.status === 404
              ? "Video not found."
              : response.status === 403
              ? "Permission denied."
              : `Failed to load video (${response.status})`;
          setError(msg);
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
    return () => {
      if (videoBlobRef.current) {
        URL.revokeObjectURL(videoBlobRef.current);
        videoBlobRef.current = null;
      }
    };
  }, [interviewId]);

  // Auto-hide controls
  useEffect(() => {
    if (isPlaying && !isHovering) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    } else {
      setShowControls(true);
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, isHovering]);

  // Video events
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      // Try to get duration from video if not set
      if (!duration && videoRef.current.duration && isFinite(videoRef.current.duration)) {
        setDuration(videoRef.current.duration);
      }
    }
  }, [duration]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current?.duration && isFinite(videoRef.current.duration) && !interviewDuration) {
      setDuration(videoRef.current.duration);
    }
  }, [interviewDuration]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (progressRef.current && videoRef.current && duration > 0) {
        const rect = progressRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = pct * duration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    },
    [duration]
  );

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    setIsMuted(v === 0);
  }, []);

  const skip = useCallback(
    (sec: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + sec));
      }
    },
    [duration]
  );

  const toggleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
          <Video className="w-10 h-10 text-blue-300" />
        </div>
        <p className="text-gray-700 font-medium mb-2">Video Not Available</p>
        <p className="text-sm text-gray-500 text-center max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Container */}
      <div
        ref={containerRef}
        className="relative bg-linear-to-b from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={() => setShowControls(true)}
      >
        {/* Aspect ratio wrapper */}
        <div className="aspect-video">
          {/* Loading */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-linear-to-b from-gray-800 to-gray-900 z-10">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" />
              </div>
              <p className="text-gray-400 text-sm mt-4 font-medium">Loading interview recording...</p>
            </div>
          )}

          {/* Video */}
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

          {/* Center Play Button */}
          {videoBlob && !isPlaying && !isLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20"
              onClick={togglePlay}
            >
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl hover:bg-blue-500 hover:scale-110 transition-all duration-200 ring-4 ring-blue-600/30">
                <Play className="w-9 h-9 text-white ml-1.5" fill="white" />
              </div>
            </div>
          )}
        </div>

        {/* Controls Container */}
        {videoBlob && (
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-linear-to-t from-black via-black/70 to-transparent" />

            {/* Controls Content */}
            <div className="relative px-4 pb-4 pt-12">
              {/* Progress Bar */}
              <div
                ref={progressRef}
                className="group/progress mb-4 cursor-pointer"
                onClick={handleProgressClick}
              >
                {/* Track Background */}
                <div className="relative h-1.5 group-hover/progress:h-2 transition-all duration-200 rounded-full overflow-hidden bg-white/20">
                  {/* Buffered (lighter) */}
                  <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: '100%' }} />
                  {/* Progress (blue) */}
                  <div
                    className="absolute inset-y-0 left-0 bg-linear-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between">
                {/* Left Controls */}
                <div className="flex items-center gap-2">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="w-11 h-11 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" fill="white" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" fill="white" />
                    )}
                  </button>

                  {/* Skip Buttons */}
                  <button
                    onClick={() => skip(-10)}
                    className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
                    title="Rewind 10s"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => skip(10)}
                    className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
                    title="Forward 10s"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-1 ml-2 group/vol">
                    <button
                      onClick={toggleMute}
                      className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <div className="w-0 group-hover/vol:w-24 overflow-hidden transition-all duration-300">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 ml-1 accent-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Time Display */}
                  <div className="text-white text-sm ml-3 font-medium tracking-wide">
                    <span className="text-white">{formatTime(currentTime)}</span>
                    <span className="text-white/50 mx-2">/</span>
                    <span className="text-white/70">{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleFullscreen}
                    className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
                    title="Fullscreen"
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Info Card */}
      <div className="flex items-center justify-between p-4 bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-gray-900 font-semibold">Interview Recording</p>
            <p className="text-sm text-gray-500">
              {duration > 0 ? (
                <>Total Duration: <span className="font-medium text-blue-600">{formatTime(duration)}</span></>
              ) : (
                "Loading duration..."
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Secure Stream</span>
        </div>
      </div>
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
