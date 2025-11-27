"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Bot,
  User,
  Sparkles,
  Send,
  MessageSquare,
  ClipboardList,
  Shield,
  Loader2,
  CheckCircle2,
  Info,
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

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  ts: number;
}

interface ChatbotAssessmentModalProps {
  open: boolean;
  job: CompanyJob | null;
  onClose: () => void;
  /** parent can refresh "My assessments" */
  onAssessmentCreated?: () => void;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

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

  /* =============================
     Helpers
  ============================= */
  const mapBackendMessages = (backendMessages: any[]): ChatMessage[] => {
    if (!backendMessages) return [];
    return backendMessages.map((m) => ({
      id: m.id || `${m.type}-${m.timestamp}`,
      role: m.type === "assistant" ? "assistant" : "user",
      text: m.content,
      ts: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
    }));
  };

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  /* =============================
     Initialize chatbot session
  ============================= */
  useEffect(() => {
    if (!open || !job) {
      // reset when closed
      setMessages([]);
      setInput("");
      setIsSending(false);
      setIsInitializing(false);
      setError(null);
      setSessionId(null);
      setIsCompleted(false);
      setCompletionText(null);
      setAssessmentId(null);
      return;
    }

    const initSession = async () => {
      setIsInitializing(true);
      setError(null);
      try {
        const payload = {
          job_id: job.job_id,
          title: `Chatbot Assessment for ${job.title}`,
          description: "Assessment created with chatbot-guided flow",
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
          // fallback welcome message
          setMessages([
            {
              id: "welcome-fallback",
              role: "assistant",
              ts: Date.now(),
              text:
                `Hi! Let's design an assessment for **${job.title}**.\n\n` +
                `Describe the role and what you want to evaluate, and I'll help you structure the assessment.`,
            },
          ]);
          return;
        }

        const chatbotSession = data.chatbot_session || data.session;
        const assessment = data.assessment;

        if (assessment?.assessment_id) {
          setAssessmentId(assessment.assessment_id);
        }

        if (chatbotSession?.session_id) {
          setSessionId(chatbotSession.session_id);
        }

        if (chatbotSession?.messages?.length) {
          setMessages(mapBackendMessages(chatbotSession.messages));
        } else {
          // safety welcome
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              ts: Date.now(),
              text:
                `Hi! Let's design an assessment for **${job.title}**.\n\n` +
                `Tell me what you really want to evaluate (technical, problem-solving, culture fit, etc.).`,
            },
          ]);
        }

        if (chatbotSession?.current_step === "completed") {
          setIsCompleted(true);
          setCompletionText(
            "This chatbot session is already completed. You can review the assessment in your My Assessments section."
          );
          if (onAssessmentCreated) onAssessmentCreated();
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

  if (!open || !job) return null;

  const pushMessage = (role: ChatRole, text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${role}-${Date.now()}-${prev.length}`, role, text, ts: Date.now() },
    ]);
  };

  /* =============================
     Send message to chatbot
  ============================= */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || isSending || !sessionId || isCompleted) return;

    setInput("");
    setIsSending(true);
    setError(null);

    // optimistic user bubble
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
        // fallback if only reply field
        pushMessage("assistant", data.reply);
      }

      if (data.is_completed) {
        setIsCompleted(true);
        setCompletionText(
          data.reply ||
            "Your chatbot session is completed and the assessment draft is ready."
        );
        const aId =
          backendSession?.assessment_data?.assessment_id || assessmentId;
        if (aId) setAssessmentId(aId);
        if (onAssessmentCreated) onAssessmentCreated();
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

  const handleCloseAndReview = () => {
    if (onAssessmentCreated) onAssessmentCreated();
    onClose();
  };

  const inputPlaceholder = isCompleted
    ? "Chat session is completed. Review your assessment in My Assessments."
    : "Explain what you want to evaluate or ask the AI to propose an assessment structure...";

  /* =============================
     UI
  ============================= */
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[11000] flex items-center justify-center p-4"
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

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="relative w-full max-w-4xl h-[90vh] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1B73E8] via-[#1664ce] to-[#1557B0] p-6 text-white flex-shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center shadow-sm"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Bot className="w-5 h-5" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">
                      Chat with AI Assessment Designer
                    </h2>
                    <p className="text-blue-100 text-xs md:text-sm">
                      Job:{" "}
                      <span className="font-semibold">{job.title}</span> ·{" "}
                      {job.location}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0 flex-col md:flex-row bg-slate-50/60">
              {/* Left: Job summary */}
              <div className="hidden md:flex md:flex-col w-full md:w-64 border-r border-slate-200 bg-slate-50 p-4 gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#1B73E8]" />
                  <span className="text-xs font-semibold text-[#0d2950]">
                    Job Snapshot
                  </span>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-2 text-xs text-[#1b3058] shadow-xs">
                  <p className="font-semibold text-[13px]">{job.title}</p>
                  <p className="text-gray-500">
                    {job.location} ·{" "}
                    {job.job_type
                      ? job.job_type.replace("_", " ").toUpperCase()
                      : "TYPE N/A"}
                  </p>
                  {job.department && (
                    <p className="text-[11px] text-gray-500">
                      Dept:{" "}
                      <span className="font-semibold text-gray-700">
                        {job.department}
                      </span>
                    </p>
                  )}

                  {job.required_skills?.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[11px] font-semibold text-gray-600 mb-1">
                        Key skills
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {job.required_skills.slice(0, 6).map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[11px] text-[#1B73E8] font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.required_skills.length > 6 && (
                          <span className="px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-[10px] text-gray-500">
                            +{job.required_skills.length - 6}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-indigo-50/80 border border-indigo-100 p-3 space-y-1 text-[11px] text-[#1b2551]">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-[#1B73E8]" />
                    <span className="font-semibold">Tips</span>
                  </div>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Describe what you want to test.</li>
                    <li>Ask for question types & difficulty.</li>
                    <li>Share your ideal seniority level.</li>
                  </ul>
                </div>

                <div className="mt-auto rounded-xl bg-white border border-slate-200 p-3 text-[11px] text-slate-600 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 mt-[2px]" />
                  <span>
                    The chatbot will automatically build a draft assessment
                    linked to this job posting.
                  </span>
                </div>
              </div>

              {/* Right: Chat area */}
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Status / error */}
                {(error || isCompleted || isInitializing) && (
                  <div className="px-4 pt-3 flex-shrink-0">
                    {error && (
                      <div className="mb-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex gap-2 items-start">
                        <Info className="w-3.5 h-3.5 mt-[2px]" />
                        <span>{error}</span>
                      </div>
                    )}
                    {isInitializing && (
                      <div className="mb-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800 flex gap-2 items-center">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>
                          Initializing AI Assessment Designer for this job...
                        </span>
                      </div>
                    )}
                    {isCompleted && (
                      <div className="mb-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 flex flex-col gap-1">
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
                            review it in the “My Assessments” section
                          </span>
                          {assessmentId && (
                            <> (ID: <code>{assessmentId}</code>).</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {messages.map((m) => {
                    const isAssistant = m.role === "assistant";
                    return (
                      <div
                        key={m.id}
                        className={`flex ${
                          isAssistant ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div
                          className={`flex max-w-[75%] gap-2 ${
                            isAssistant ? "flex-row" : "flex-row-reverse"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                              isAssistant
                                ? "bg-[#1B73E8]/10 text-[#1B73E8]"
                                : "bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {isAssistant ? (
                              <Bot className="w-4 h-4" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </div>
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed break-words overflow-hidden shadow-sm ${
                              isAssistant
                                ? "bg-slate-50 border border-slate-200 text-slate-800"
                                : "bg-[#1B73E8] text-white"
                            }`}
                          >
                            {m.text}
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}

                  {isSending && !isCompleted && (
                    <div className="flex justify-start">
                      <div className="flex max-w-[75%] gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#1B73E8]/10 text-[#1B73E8] shadow-sm">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="rounded-2xl px-3 py-2 text-xs bg-slate-50 border border-slate-200 text-slate-500 flex items-center gap-1">
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
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm">
                      <Sparkles className="w-6 h-6 mb-2 text-[#1B73E8]" />
                      Start chatting to design your assessment.
                    </div>
                  )}
                </div>

                {/* Input */}
                <form
                  onSubmit={handleSend}
                  className="border-t border-gray-200 p-3 bg-gray-50/80 flex-shrink-0"
                >
                  <div className="flex items-end gap-2">
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 px-3 py-2 flex items-start gap-2 shadow-sm">
                      <MessageSquare className="w-4 h-4 text-gray-400 mt-1" />
                      <textarea
                        className="flex-1 resize-none border-none outline-none text-sm py-1 max-h-24 min-h-[32px]"
                        placeholder={inputPlaceholder}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={
                          isSending || isInitializing || isCompleted || !sessionId
                        }
                      />
                    </div>

                    <motion.button
                      type="submit"
                      whileHover={{ scale: !isSending && !isCompleted ? 1.05 : 1 }}
                      whileTap={{ scale: !isSending && !isCompleted ? 0.95 : 1 }}
                      disabled={
                        isSending ||
                        isInitializing ||
                        isCompleted ||
                        !sessionId ||
                        !input.trim()
                      }
                      className="flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
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

                  <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      <span>
                        Ask: “Create a 90-minute advanced assessment with 30
                        questions focusing on Python, LLMs, and problem-solving.”
                      </span>
                    </div>

                    {isCompleted && (
                      <button
                        type="button"
                        onClick={handleCloseAndReview}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500 text-white font-semibold shadow-sm hover:bg-emerald-600 transition-colors"
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
