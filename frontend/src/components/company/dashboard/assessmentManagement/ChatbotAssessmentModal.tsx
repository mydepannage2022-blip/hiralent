"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Bot,
  User,
  Sparkles,
  Send,
  MessageSquare,
  ClipboardList,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Lightbulb,
  CheckSquare,
  Target,
} from "lucide-react";

import { useAuth } from "../../../../context/AuthContext";

/* =============================
   Types (match CompanyJob)
============================= */
export type JobStatus =
  | "ACTIVE"
  | "DRAFT"
  | "PAUSED"
  | "CLOSED"
  | "CANCELLED"
  | "ARCHIVED";

export type JobType = "full_time" | "part_time" | "contract" | "internship";

export interface CompanyJob {
  job_id: string;
  company_id?: string;
  title: string;
  location: string;
  description: string;
  salary_range: string | null;
  required_skills: string[];
  status: JobStatus;
  job_type: JobType | null;
  department: string | null;
  experience_level?: string | null;
  education_level?: string | null;
  remote_option?: string | null;
  urgency_level?: string | null;
  visa_sponsored?: boolean | null;
  relocation_assistance?: boolean | null;
  application_deadline?: string | null;
  max_applications?: number | null;
  auto_reject_after?: number | null;
  screening_questions?: string[];
  created_at: string;
  updated_at: string;
  applications_count?: number;
}

type ChatRole = "user" | "assistant";

interface QuickReply {
  label: string;
  value: string;
}

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  ts: number;
  quickReplies?: QuickReply[];
}

/**
 * Minimal mirror of backend ChatbotAssessmentData
 * (only what we want to display in UI)
 */
interface QuestionRecommendation {
  category: string;
  count: number;
  difficulty?: string;
}

interface ChatbotAssessmentConfig {
  assessment_id?: string;

  job_title?: string;
  job_description?: string;
  specific_requirements?: string[];

  role_context?: string;
  role_details?: string;

  // canonical skills
  technical_skills?: string[];
  // optional from backend: union of tech + tools, etc.
  extracted_skills?: string[];

  // raw user text (debug only)
  skills_raw_input?: string;

  domains?: string[];
  tools_platforms?: string[];
  skill_category?: string;

  assessment_type?: string;
  difficulty?: string;

  // raw question text (debug only)
  question_types_raw?: string;
  question_categories?: string[];

  question_mix?: { [category: string]: number };
  question_recommendations?: QuestionRecommendation[];

  time_limit?: number;
  total_questions?: number;
  passing_score?: number;

  status?: string;

  [key: string]: any;
}

interface ChatbotAssessmentModalProps {
  open: boolean;
  job: CompanyJob | null;
  onClose: () => void;
  onAssessmentCreated?: () => void;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

/* =============================
   Small helpers
============================= */

// Minimal markdown-ish formatter: **bold**, bullets, new lines
const formatMessageHtml = (text: string): string => {
  let html = text;

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Bullets: lines starting with "-" or "*"
  html = html.replace(/^[\s]*[-*]\s+/gm, "• ");

  // New lines
  html = html.replace(/\n/g, "<br/>");
  return html;
};

const titleCase = (s: string | undefined | null): string => {
  if (!s) return "";
  return s
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const formatCategoryLabel = (cat: string): string => {
  if (!cat) return "";
  // handle things like "SYSTEM_DESIGN" or "system_design"
  return titleCase(cat.replace(/-/g, " "));
};

/**
 * Config for cute icon + gradient per quick reply
 * (similar to your screenshot: blue sparkles, purple bulb, etc.)
 */
const quickReplyConfigs = [
  {
    gradient: "from-blue-500 to-cyan-500",
    icon: Sparkles,
    iconColor: "text-blue-600",
  },
  {
    gradient: "from-purple-500 to-pink-500",
    icon: Lightbulb,
    iconColor: "text-yellow-500",
  },
  {
    gradient: "from-emerald-500 to-teal-500",
    icon: CheckSquare,
    iconColor: "text-emerald-600",
  },
  {
    gradient: "from-amber-500 to-orange-500",
    icon: Target,
    iconColor: "text-red-500",
  },
];

/* =============================
   Component
============================= */

const ChatbotAssessmentModal: React.FC<ChatbotAssessmentModalProps> = ({
  open,
  job,
  onClose,
  onAssessmentCreated,
}) => {
  const { token } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionText, setCompletionText] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  // live view of chatbot-configured assessment
  const [assessmentConfig, setAssessmentConfig] =
    useState<ChatbotAssessmentConfig | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const mapBackendMessages = (backendMessages: any[]): ChatMessage[] => {
    if (!backendMessages) return [];
    return backendMessages.map((m) => {
      let quickReplies: QuickReply[] | undefined;

      const rawQR = m.quick_replies || m.metadata?.quick_replies;
      if (Array.isArray(rawQR) && rawQR.length > 0) {
        quickReplies = rawQR
          .map((qr: any): QuickReply | null => {
            if (!qr) return null;
            if (typeof qr === "string") {
              return { label: qr, value: qr };
            }
            const value = qr.value ?? qr.label;
            const label = qr.label ?? qr.value;
            if (!value) return null;
            return { label: label || value, value };
          })
          .filter(Boolean) as QuickReply[];
      }

      return {
        id: m.id || `${m.type}-${m.timestamp}`,
        role: m.type === "assistant" ? "assistant" : "user",
        text: m.content,
        ts: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
        quickReplies,
      };
    });
  };

  const syncAssessmentConfigFromSession = (session: any | undefined) => {
    if (!session || !session.assessment_data) return;
    setAssessmentConfig(session.assessment_data as ChatbotAssessmentConfig);

    const maybeId =
      session.assessment_data.assessment_id || session.assessment_id;
    if (maybeId && !assessmentId) {
      setAssessmentId(maybeId);
    }
  };

  /* =============================
     Init / reset
  ============================= */
  useEffect(() => {
    if (!open || !job) {
      setMessages([]);
      setInput("");
      setIsSending(false);
      setIsInitializing(false);
      setError(null);
      setSessionId(null);
      setIsCompleted(false);
      setCompletionText(null);
      setAssessmentId(null);
      setAssessmentConfig(null);
      return;
    }

    const initSession = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        const payload = {
          job_id: job.job_id,
          title: `Assessment for ${job.title}`,
          // short description for assessments created via chatbot
          description:
            "Assessment auto-generated from the chat with the AI assistant. Please review and customize as needed.",
          initial: {
            job_title: job.title,
            job_description: job.description,
            specific_requirements: job.required_skills?.slice(0, 6) || [],
          },
        };

        const res = await fetch(
          `${API_BASE_URL}/employer-assessments/with-chatbot`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json();
        if (!res.ok) {
          const msg =
            data?.message ||
            data?.error ||
            "Failed to start chatbot-guided assessment.";
          setError(msg);
          setMessages([
            {
              id: "welcome-fallback",
              role: "assistant",
              ts: Date.now(),
              text:
                `Let’s design an assessment for **${job.title}**.\n\n` +
                `Tell me level, skills (comma-separated) and duration in one short message.`,
            },
          ]);
          return;
        }

        const chatbotSession = data.chatbot_session || data.session;
        const assessment = data.assessment;

        if (assessment?.assessment_id) setAssessmentId(assessment.assessment_id);
        if (chatbotSession?.session_id) setSessionId(chatbotSession.session_id);

        // sync config from backend
        syncAssessmentConfigFromSession(chatbotSession);

        if (chatbotSession?.messages?.length) {
          setMessages(mapBackendMessages(chatbotSession.messages));
        } else {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              ts: Date.now(),
              text:
                `You’re creating an assessment for **${job.title}**.\n\n` +
                `Please send in **one message**:\n` +
                `• Level (junior / mid / senior)\n` +
                `• Skills with commas (e.g. Power BI, DAX, SQL)\n` +
                `• Duration and questions (e.g. 60 min, 20 questions)`,
            },
          ]);
        }

        if (chatbotSession?.current_step === "completed") {
          setIsCompleted(true);
          setCompletionText(
            "This chatbot session is already completed. You can review the assessment in My Assessments."
          );
          onAssessmentCreated?.();
        }
      } catch (err) {
        console.error("Error initializing chatbot assessment:", err);
        setError(
          "Something went wrong while starting the chatbot. Please try again."
        );
      } finally {
        setIsInitializing(false);
      }
    };

    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job?.job_id]);

  /* =============================
     Auto-scroll (keep your logic)
  ============================= */
  useEffect(() => {
    if (!chatEndRef.current) return;
    chatEndRef.current.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isSending]);

  if (!open || !job) return null;

  const pushMessage = (role: ChatRole, text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${role}-${Date.now()}-${prev.length}`,
        role,
        text,
        ts: Date.now(),
      },
    ]);
  };

  /* =============================
     Core send logic (shared)
  ============================= */
  const sendMessage = async (rawContent: string) => {
    const content = rawContent.trim();
    if (!content || isSending || !sessionId || isCompleted) return;

    setIsSending(true);
    setError(null);
    pushMessage("user", content);

    try {
      const res = await fetch(
        `${API_BASE_URL}/employer-assessments/chatbot/message`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            session_id: sessionId,
            message: content,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        const msg =
          data?.message ||
          data?.error ||
          "Failed to send message to chatbot. Please try again.";
        setError(msg);
        return;
      }

      const backendSession = data.session || data.chatbot_session;

      if (backendSession?.messages) {
        setMessages(mapBackendMessages(backendSession.messages));
      } else if (data.reply) {
        pushMessage("assistant", data.reply);
      }

      // refresh assessment config from backend session
      syncAssessmentConfigFromSession(backendSession);

      if (data.is_completed) {
        setIsCompleted(true);
        setCompletionText(
          data.reply ||
            "Your chatbot session is completed and the assessment draft is ready."
        );
        const aId =
          backendSession?.assessment_data?.assessment_id || assessmentId;
        if (aId) setAssessmentId(aId);
        onAssessmentCreated?.();
      }
    } catch (err) {
      console.error("Error sending chatbot message:", err);
      setError(
        "Something went wrong while talking to the chatbot. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  /* =============================
     Send from textarea
  ============================= */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    setInput("");
    await sendMessage(content);
  };

  /* =============================
     Send from quick-reply button
  ============================= */
  const handleQuickReply = async (value: string) => {
    await sendMessage(value);
  };

  const handleCloseAndReview = () => {
    onAssessmentCreated?.();
    onClose();
  };

  const inputPlaceholder = isCompleted
    ? "Chat session is completed. Review your assessment in My Assessments."
    : "Who do you want to assess today?";

  // Derived values from assessmentConfig (purely from chatbot output)
  const totalQuestionsFromConfig =
    assessmentConfig?.total_questions ??
    assessmentConfig?.question_recommendations?.reduce(
      (sum, q) => sum + (q.count || 0),
      0
    ) ??
    undefined;

  // Skills to display in snapshot: prefer technical_skills, fallback to extracted_skills
  const displaySkills: string[] =
    assessmentConfig && assessmentConfig.technical_skills?.length
      ? assessmentConfig.technical_skills
      : assessmentConfig && assessmentConfig.extracted_skills?.length
      ? assessmentConfig.extracted_skills
      : [];

  // Last assistant message with quick replies (so suggestions appear only once)
  const lastAssistantWithQuickRepliesId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (
        m.role === "assistant" &&
        m.quickReplies &&
        m.quickReplies.length > 0
      ) {
        return m.id;
      }
    }
    return null;
  })();

  /* =============================
     UI
  ============================= */
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[11000] flex items-center justify-center px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal card */}
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: "spring", damping: 24 }}
            className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            {/* Gradient header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] text-white flex-shrink-0">
              <div className="absolute inset-0 opacity-10">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                    backgroundSize: "24px 24px",
                  }}
                />
              </div>

              <div className="relative px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <Bot className="w-5 h-5 text-white" />
                    </motion.div>
                    <div>
                      <h2 className="text-lg font-black tracking-tight">
                        AI Assessment Designer
                      </h2>
                      <p className="text-blue-100 text-xs">
                        Chat with the assistant to design an assessment draft
                        you can edit later.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {assessmentConfig?.status === "ready_for_generation" && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-50 text-[11px] font-semibold border border-emerald-200/70">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Draft ready to generate
                      </span>
                    )}
                    <motion.button
                      onClick={onClose}
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Wave bottom */}
              <div className="absolute bottom-0 left-0 right-0">
                <svg
                  viewBox="0 0 1440 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full"
                >
                  <path
                    d="M0 20h1440V10c-157.5 0-315-10-472.5-10S652.5 10 495 10 180 0 0 0v20z"
                    fill="white"
                  />
                </svg>
              </div>
            </div>

            {/* Body content */}
            <div className="flex-1 flex flex-col md:flex-row gap-6 px-6 pb-4 pt-2 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
              {/* LEFT: guidance + live config */}
              <div className="hidden md:flex flex-col w-full md:w-72 gap-3 flex-shrink-0">
                {/* How to talk to it */}
                <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 p-4 shadow-[0_10px_40px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/60 text-[#1B73E8] shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      How to talk to it
                    </p>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-600">
                    <li>• Describe the role briefly.</li>
                    <li>• The assistant guides each step.</li>
                    <li>• List skills simply (Power BI, SQL, DAX).</li>
                    <li>• Use % for question mix if you want.</li>
                    <li>
                      • Keep answers short and clear — the assistant handles the
                      flow.
                    </li>
                  </ul>
                  <p className="mt-3 text-[11px] text-slate-400">
                    The assistant builds the assessment draft. You can edit
                    everything afterwards.
                  </p>
                </div>

                {/* Live assessment snapshot */}
                {assessmentConfig && (
                  <div
                    className="
                      rounded-2xl border border-slate-200 bg-white/90 
                      p-4 shadow-[0_10px_40px_rgba(15,23,42,0.03)] 
                      flex flex-col gap-2
                      max-h-80 overflow-y-auto pr-1 custom-scrollbar
                    "
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-900">
                        Assessment snapshot
                      </p>
                      {assessmentConfig.status === "ready_for_generation" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Ready
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-600">
                      <p>
                        <span className="font-semibold">Type: </span>
                        {assessmentConfig.assessment_type
                          ? titleCase(assessmentConfig.assessment_type)
                          : "Not set yet"}
                      </p>
                      <p>
                        <span className="font-semibold">Difficulty: </span>
                        {assessmentConfig.difficulty
                          ? titleCase(assessmentConfig.difficulty)
                          : "Not set yet"}
                      </p>
                      <p>
                        <span className="font-semibold">Category: </span>
                        {assessmentConfig.skill_category
                          ? titleCase(assessmentConfig.skill_category)
                          : "General"}
                      </p>
                      <p>
                        <span className="font-semibold">Duration: </span>
                        {assessmentConfig.time_limit
                          ? `${assessmentConfig.time_limit} min`
                          : "Not decided yet"}
                      </p>
                      <p>
                        <span className="font-semibold">Questions: </span>
                        {totalQuestionsFromConfig ??
                          "Let the assistant propose a number"}
                      </p>
                    </div>

                    {assessmentConfig.question_recommendations &&
                      assessmentConfig.question_recommendations.length > 0 && (
                        <div className="mt-2 border-t border-slate-100 pt-2">
                          <p className="text-[11px] font-semibold text-slate-800 mb-1">
                            Distribution
                          </p>
                          <ul className="space-y-0.5 text-[11px] text-slate-600">
                            {assessmentConfig.question_recommendations.map(
                              (q, idx) => (
                                <li key={`${q.category}-${idx}`}>
                                  • {q.count}×{" "}
                                  {formatCategoryLabel(q.category)}{" "}
                                  {q.difficulty &&
                                    `(${titleCase(q.difficulty)})`}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                    {displaySkills.length > 0 && (
                      <div className="mt-2 border-t border-slate-100 pt-2">
                        <p className="text-[11px] font-semibold text-slate-800 mb-1">
                          Skills to assess
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {displaySkills.slice(0, 8).map((skill, idx) => (
                            <span
                              key={`${skill}-${idx}`}
                              className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] text-slate-700"
                            >
                              {skill}
                            </span>
                          ))}
                          {displaySkills.length > 8 && (
                            <span className="text-[10px] text-slate-400">
                              + {displaySkills.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT: chat column */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* status banners */}
                {(error || isCompleted || isInitializing) && (
                  <div className="flex flex-col gap-2 mb-2">
                    {error && (
                      <div className="flex items-start gap-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 mt-[2px]" />
                        <span>{error}</span>
                      </div>
                    )}
                    {isInitializing && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Initializing the AI assistant…</span>
                      </div>
                    )}
                    {isCompleted && (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-800 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="font-semibold">
                            Assessment draft created
                          </span>
                        </div>
                        <p className="leading-relaxed">
                          {completionText}
                          <br />
                          You can now{" "}
                          <span className="font-semibold">
                            review it in “My Assessments”
                          </span>
                          {assessmentId && (
                            <>
                              {" "}
                              (ID: <code>{assessmentId}</code>).
                            </>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* messages (scrolling area) */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-3 space-y-3 custom-scrollbar"
                >
                  {messages.map((m) => {
                    const isAssistant = m.role === "assistant";
                    const html = formatMessageHtml(m.text);

                    const showQuickReplies =
                      isAssistant &&
                      !isCompleted &&
                      m.id === lastAssistantWithQuickRepliesId &&
                      m.quickReplies &&
                      m.quickReplies.length > 0;

                    return (
                      <div
                        key={m.id}
                        className={`flex ${
                          isAssistant ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div
                          className={`flex max-w-[78%] gap-2 ${
                            isAssistant ? "flex-row" : "flex-row-reverse"
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm ${
                              isAssistant
                                ? "bg-[#1B73E8]/10 text-[#1B73E8]"
                                : "bg-slate-800 text-white"
                            }`}
                          >
                            {isAssistant ? (
                              <Bot className="w-3.5 h-3.5" />
                            ) : (
                              <User className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="flex flex-col gap-1 max-w-full">
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed break-words shadow-sm ${
                                isAssistant
                                  ? "bg-white/90 border border-slate-200 text-slate-800"
                                  : "bg-gradient-to-r from-[#1B73E8] to-[#4F46E5] text-white"
                              }`}
                            >
                              <div
                                className="prose prose-xs max-w-none prose-p:my-0 prose-ul:my-1 prose-li:my-0"
                                dangerouslySetInnerHTML={{ __html: html }}
                              />
                            </motion.div>

                            {/* colorful quick replies with icon element */}
                            {showQuickReplies && (
                              <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col gap-1 mt-1.5"
                              >
                                <span className="text-[10px] uppercase tracking-wide text-slate-400 flex items-center gap-1">
                                  <SlidersHorizontal className="w-3 h-3" />
                                  Suggested replies
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {m.quickReplies!.map((qr, qrIdx) => {
                                    const cfg =
                                      quickReplyConfigs[
                                        qrIdx % quickReplyConfigs.length
                                      ];
                                    const Icon = cfg.icon;

                                    return (
                                      <motion.button
                                        key={qr.value}
                                        type="button"
                                        onClick={() =>
                                          handleQuickReply(qr.value)
                                        }
                                        disabled={isSending || isCompleted}
                                        whileHover={{
                                          scale: 1.03,
                                          translateY: -1,
                                        }}
                                        whileTap={{ scale: 0.97 }}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white shadow-md bg-gradient-to-r ${cfg.gradient} disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                                          <Icon
                                            className={`w-3 h-3 ${cfg.iconColor}`}
                                          />
                                        </span>
                                        <span>{qr.label}</span>
                                      </motion.button>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isSending && !isCompleted && (
                    <div className="flex justify-start">
                      <div className="flex max-w-[78%] gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#1B73E8]/10 text-[#1B73E8] shadow-sm">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div className="rounded-2xl px-3 py-2 text-xs bg-slate-50 border border-slate-200 text-slate-500 flex items-center gap-2 shadow-sm">
                          <span className="inline-flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-150" />
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-300" />
                          </span>
                          <span>AI is thinking…</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.length === 0 && !isInitializing && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-[#1B73E8]" />
                      </div>
                      <p>Send level, skills (commas) and duration to start.</p>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* input + footer */}
                <form
                  onSubmit={handleSend}
                  className="mt-3 border-t border-slate-100 pt-3 flex flex-col gap-2"
                >
                  <div className="flex items-end gap-2">
                    <div className="flex-1 bg-slate-50/80 rounded-2xl border border-slate-200 px-3 py-2 flex items-start gap-2 shadow-inner">
                      <MessageSquare className="w-4 h-4 text-slate-400 mt-1" />
                      <textarea
                        className="flex-1 resize-none border-none outline-none text-sm py-1 max-h-24 min-h-[32px] bg-transparent"
                        placeholder={inputPlaceholder}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={
                          isSending ||
                          isInitializing ||
                          isCompleted ||
                          !sessionId
                        }
                      />
                    </div>

                    <motion.button
                      type="submit"
                      whileHover={{
                        scale: !isSending && !isCompleted ? 1.02 : 1,
                      }}
                      whileTap={{
                        scale: !isSending && !isCompleted ? 0.97 : 1,
                      }}
                      disabled={
                        isSending ||
                        isInitializing ||
                        isCompleted ||
                        !sessionId ||
                        !input.trim()
                      }
                      className="flex items-center justify-center px-5 py-2 rounded-full bg-gradient-to-r from-[#1B73E8] to-[#4F46E5] text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          Send
                        </>
                      )}
                    </motion.button>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[11px] text-slate-400">
                    {isCompleted && (
                      <button
                        type="button"
                        onClick={handleCloseAndReview}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>View assessment in My Assessments</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatbotAssessmentModal;
