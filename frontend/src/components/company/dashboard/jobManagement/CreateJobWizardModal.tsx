"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_HOST } from "@/src/lib/config/api";
import {
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Save,
  Sparkles,
  FileText,
  MapPin,
  Building,
  DollarSign,
  Users,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

/* =============================
   Types (copy-compatible)
============================= */

type JobStatus =
  | "ACTIVE"
  | "DRAFT"
  | "PAUSED"
  | "CLOSED"
  | "CANCELLED"
  | "ARCHIVED";

type JobType =
  | "full_time"
  | "part_time"
  | "contract"
  | "internship"
  | "freelance";

interface JobFormData {
  title: string;
  location: string;
  description: string;
  department: string;
  job_type: JobType;
  salary_range: string;
  required_skills: string[];
  experience_level: string;
  education_level: string;
  remote_option: string;
  urgency_level: string;
  visa_sponsored: boolean;
  relocation_assistance: boolean;
  application_deadline: string;
  max_applications: string;
  auto_reject_after: string;
  screening_questions: string[];
  status: JobStatus;
}

const emptyFormData: JobFormData = {
  title: "",
  location: "",
  description: "",
  department: "",
  job_type: "full_time",
  salary_range: "",
  required_skills: [],
  experience_level: "",
  education_level: "",
  remote_option: "",
  urgency_level: "",
  visa_sponsored: false,
  relocation_assistance: false,
  application_deadline: "",
  max_applications: "",
  auto_reject_after: "",
  screening_questions: [],
  status: "DRAFT",
};

type StepKey = "BASICS" | "DETAILS" | "REQUIREMENTS" | "SETTINGS" | "REVIEW";

const steps: { key: StepKey; title: string; subtitle: string; icon: any }[] = [
  { key: "BASICS", title: "Basics", subtitle: "Title, location, department", icon: Building },
  { key: "DETAILS", title: "Job Details", subtitle: "Type, salary, description", icon: FileText },
  { key: "REQUIREMENTS", title: "Requirements", subtitle: "Skills & screening questions", icon: Target },
  { key: "SETTINGS", title: "Settings", subtitle: "Status, limits, deadlines", icon: Clock },
  { key: "REVIEW", title: "Review & Create", subtitle: "Double-check before publishing", icon: Sparkles },
];

interface CreateJobWizardModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => void | Promise<void>;
}

/* =============================
   AI types
============================= */

type AISuggestions = {
  title?: string;
  department?: string;
  description?: string;

  titleSuggestions?: string[];
  departmentSuggestions?: string[];
  senioritySuggestions?: string[];
  workplaceTypeSuggestions?: string[];
  miniSummary?: string;

  variants?: string[];
  sections?: any;
  fullDescription?: string;
};

/* =============================
   Helpers
============================= */

function normalizeGeneratedText(raw: string): string {
  let s = (raw ?? "").toString();

  // Normalize line endings
  s = s.replace(/\r\n/g, "\n");

  // Remove common "ChatGPT-like" markdown bullets / headings
  s = s.replace(/^\s*#{1,6}\s+/gm, ""); // headings
  s = s.replace(/^\s*[-*•]\s+/gm, ""); // bullets
  s = s.replace(/^\s*\d+\)\s+/gm, ""); // 1)
  s = s.replace(/^\s*\d+\.\s+/gm, ""); // 1.
  s = s.replace(/^\s*[-*]\s*\*\*(.+?)\*\*\s*:?/gm, "$1:"); // - **Title**:
  s = s.replace(/\*\*(.+?)\*\*/g, "$1"); // **bold**
  s = s.replace(/`{1,3}([^`]+)`{1,3}/g, "$1"); // inline/backticks
  s = s.replace(/^\s*>+\s?/gm, ""); // blockquotes

  // Remove separators
  s = s.replace(/^\s*[-_]{3,}\s*$/gm, "");

  // Fix extra blank lines
  s = s.replace(/\n{3,}/g, "\n\n").trim();

  return s;
}

function toneLabel(t: "formal" | "friendly" | "concise") {
  if (t === "formal") return "Professional";
  if (t === "friendly") return "Friendly";
  return "Concise";
}

function toneHint(lang: "fr" | "en", t: "formal" | "friendly" | "concise") {
  if (lang === "fr") {
    if (t === "formal") return "Style corporate, clair, sans jargon inutile.";
    if (t === "friendly") return "Chaleureux mais pro, humain, accueillant.";
    return "Court, direct, orienté responsabilités & impact.";
  }
  if (t === "formal") return "Corporate tone, clear, no fluff.";
  if (t === "friendly") return "Warm but professional, human-friendly.";
  return "Short, direct, responsibility-focused.";
}

function improveInstruction(lang: "fr" | "en") {
  return lang === "fr"
    ? "Réécris la description de façon professionnelle, lisible, sans markdown, sans puces, sans titres formatés. Fais des paragraphes courts, clairs, orientés responsabilités et exigences."
    : "Rewrite the description in a professional, readable way: no markdown, no bullet points, no formatted headings. Use short paragraphs, clear responsibilities and requirements.";
}

/* =============================
   Component
============================= */

const CreateJobWizardModal: React.FC<CreateJobWizardModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState<JobFormData>(emptyFormData);
  const [newSkill, setNewSkill] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);

  // scroll to top when error appears
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const step = steps[stepIndex];
  const isLast = step.key === "REVIEW";

  const API_BASE = API_HOST;
  const API_V1 = `${API_BASE}/api/v1`;

  const [aiLanguage, setAiLanguage] = useState<"fr" | "en">("fr");
  const [aiTone, setAiTone] = useState<"formal" | "friendly" | "concise">("formal");
const titleDisplayCount =
  (aiSuggestions?.title ? 1 : 0) +
  (aiSuggestions?.titleSuggestions?.slice(0, 3).length ?? 0);

  function getToken() {
    if (typeof window === "undefined") return "";
    return (
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("authToken") ||
      ""
    );
  }

  function buildAuthHeader(token: string): Record<string, string> {
    const t = token.trim();
    if (!t) return {};
    return t.toLowerCase().startsWith("bearer ")
      ? { Authorization: t }
      : { Authorization: `Bearer ${t}` };
  }

  async function apiPost<T>(path: string, body: any): Promise<T> {
    const token = getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? buildAuthHeader(token) : {}),
    };

    const res = await fetch(`${API_V1}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    if (!res.ok) {
      console.error("API failed:", res.status, text.slice(0, 800));
      throw new Error(`API failed: ${res.status}`);
    }

    if (!contentType.includes("application/json")) {
      console.error("Expected JSON, got:", contentType, text.slice(0, 800));
      throw new Error("Server did not return JSON");
    }

    return JSON.parse(text);
  }

  /* =============================
     AI functions
  ============================= */

  const runStep1Suggest = async () => {
    setAiLoading(true);
    try {
      const data: any = await apiPost("/jobs/ai/step1-suggest", {
        jobTitle: formData.title,
        location: formData.location,
        department: formData.department,
      });

      setAiSuggestions(data?.data ?? data);
    } catch (e) {
      console.error("AI step1 error", e);
    } finally {
      setAiLoading(false);
    }
  };

  const runStep2Generate = async () => {
    setAiLoading(true);
    try {
      const data: any = await apiPost("/jobs/ai/step2-generate", {
        jobTitle: formData.title,
        location: formData.location,
        department: formData.department,
        jobType: formData.job_type,
        salaryRange: formData.salary_range || "",
        tone: aiTone,
        language: aiLanguage,
      });

      const payload = data?.data ?? data;
      const candidate = payload?.variants?.[0] || payload?.description || payload?.fullDescription || "";

      if (candidate) {
        setFormData((p) => ({ ...p, description: normalizeGeneratedText(candidate) }));
      }
    } catch (e) {
      console.error("AI step2 error", e);
    } finally {
      setAiLoading(false);
    }
  };

  const runImprove = async (instruction: string) => {
    setAiLoading(true);
    try {
      const data: any = await apiPost("/jobs/ai/improve", {
        text: formData.description,
        instruction,
        tone: aiTone, // keep same tone
        language: aiLanguage,
      });

      const payload = data?.data ?? data;
      const candidate = payload?.variants?.[0] || payload?.description || payload?.fullDescription || "";

      if (candidate) {
        setFormData((p) => ({ ...p, description: normalizeGeneratedText(candidate) }));
      }
    } catch (e) {
      console.error("AI improve error", e);
    } finally {
      setAiLoading(false);
    }
  };

  const runAISuggestions = async () => {
    await runStep1Suggest();
  };

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setFormData(emptyFormData);
    setNewSkill("");
    setNewQuestion("");
    setErrorMsg(null);
    setLoading(false);
    setAiLoading(false);
    setAiSuggestions(null);
  }, [open]);

  useEffect(() => {
    if (errorMsg && bodyRef.current) {
      bodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [errorMsg]);

  const progress = useMemo(() => {
    const pct = ((stepIndex + 1) / steps.length) * 100;
    return Math.max(5, Math.min(100, pct));
  }, [stepIndex]);

  const validateStep = (): string | null => {
    const s = step.key;

    if (s === "BASICS") {
      if (!formData.title.trim()) return "Job title is required.";
      if (!formData.location.trim()) return "Location is required.";
      return null;
    }

    if (s === "DETAILS") {
      if (!formData.description.trim()) return "Job description is required.";
      if (!formData.job_type) return "Job type is required.";
      return null;
    }

    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) return setErrorMsg(err);
    setErrorMsg(null);
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const back = () => {
    setErrorMsg(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    if (formData.required_skills.includes(trimmed)) return setNewSkill("");
    setFormData((p) => ({
      ...p,
      required_skills: [...p.required_skills, trimmed],
    }));
    setNewSkill("");
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData((p) => ({
      ...p,
      required_skills: p.required_skills.filter((s) => s !== skillToRemove),
    }));
  };

  const addQuestion = () => {
    const trimmed = newQuestion.trim();
    if (!trimmed) return;
    if (formData.screening_questions.includes(trimmed)) return setNewQuestion("");
    setFormData((p) => ({
      ...p,
      screening_questions: [...p.screening_questions, trimmed],
    }));
    setNewQuestion("");
  };

  const removeQuestion = (qToRemove: string) => {
    setFormData((p) => ({
      ...p,
      screening_questions: p.screening_questions.filter((q) => q !== qToRemove),
    }));
  };

  const handleSkillKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const handleQuestionKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addQuestion();
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.location.trim() || !formData.description.trim()) {
      setErrorMsg("Please fill required fields: title, location, description.");
      setStepIndex(0);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        title: formData.title.trim(),
        location: formData.location.trim(),
        description: formData.description.trim(),
        department: formData.department || null,
        job_type: formData.job_type,
        required_skills: formData.required_skills,
        salary_range: formData.salary_range || null,
        experience_level: formData.experience_level || null,
        education_level: formData.education_level || null,
        remote_option: formData.remote_option || null,
        urgency_level: formData.urgency_level || null,
        visa_sponsored: formData.visa_sponsored,
        relocation_assistance: formData.relocation_assistance,
        application_deadline: formData.application_deadline || null,
        max_applications: formData.max_applications ? Number(formData.max_applications) : null,
        auto_reject_after: formData.auto_reject_after ? Number(formData.auto_reject_after) : null,
        screening_questions: formData.screening_questions,
        status: formData.status,
      };

      await onSubmit(payload);
      onClose();
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to create job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Premium suggestion item (no emojis)
  const SuggestionItem = ({
    text,
    sub,
    onPick,
  }: {
    text: string;
    sub?: string;
    onPick: () => void;
  }) => (
    <button
      type="button"
      onClick={onPick}
      className="group w-full text-left rounded-md border border-slate-200 bg-white px-3 py-2 hover:border-blue-300 hover:bg-blue-50/40 transition flex items-start justify-between gap-3"
    >
      <div className="min-w-0">
        <div className="text-sm text-slate-900 truncate">{text}</div>
        {sub ? <div className="text-xs text-slate-500 mt-0.5">{sub}</div> : null}
      </div>
      <span className="shrink-0 text-xs text-blue-700 opacity-0 group-hover:opacity-100 transition">
        Use
      </span>
    </button>
  );

  if (!open) return null;

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

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: "spring", damping: 24 }}
            className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] text-white flex-shrink-0">
              <div className="relative px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[9px] rounded-sm bg-white/15 border border-white/20 uppercase tracking-wide">
                          Step {stepIndex + 1}/{steps.length}
                        </span>
                        <span className="px-2 py-0.5 text-[9px] rounded-sm bg-emerald-400/20 border border-emerald-200/60 text-emerald-50">
                          New Job
                        </span>
                      </div>
                      <h2 className="text-lg font-medium font-black mt-1">{step.title}</h2>
                      <p className="text-blue-100 text-sm">{step.subtitle}</p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Progress */}
                <div className="relative mt-4 h-2 w-full rounded-sm bg-white/20 overflow-hidden">
                  <motion.div
                    className="absolute left-0 top-0 h-full bg-white/80 rounded-lg"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.35 }}
                  />
                </div>

                {/* Step chips */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {steps.map((s, i) => {
                    const active = i === stepIndex;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setStepIndex(i)}
                        className={`px-2 py-1/2 rounded-sm text-[11px] border transition-all ${
                          active
                            ? "bg-white text-[#0D2A5B] border-white"
                            : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                        }`}
                      >
                        {s.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Body */}
            <div
              ref={bodyRef}
              className="flex-1 min-h-0 overflow-y-auto px-6 pb-5 pt-4 bg-gradient-to-br from-slate-50 via-white to-slate-50 custom-scrollbar"
            >
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <div>{errorMsg}</div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg border border-slate-200 bg-white/90 shadow-[0_10px_40px_rgba(15,23,42,0.04)] p-5"
                >
                  <div className="flex items-center gap-2 mb-5">
                    <div>
                      <div className="text-slate-900">{step.title}</div>
                      <div className="text-xs text-slate-500">{step.subtitle}</div>
                    </div>
                  </div>

                  {/* BASICS */}
                  {step.key === "BASICS" && (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm text-slate-700 mb-2">Job Title *</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                          className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="e.g., Senior Frontend Developer"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-700 mb-2">Location *</label>
                          <div className="relative">
                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={formData.location}
                              onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              placeholder="e.g., Casablanca"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-slate-700 mb-2">Department</label>
                          <div className="relative">
                            <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={formData.department}
                              onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              placeholder="e.g., Engineering"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Smart Assist – Basics */}
                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-blue-700" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">Smart Assist</div>
                              <div className="text-xs text-slate-500">Suggestions based on your inputs</div>
                            </div>
                          </div>

                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={runAISuggestions}
                            disabled={aiLoading}
                            className="px-3 py-2 text-xs rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                          >
                            {aiLoading ? "Generating…" : "Get suggestions"}
                          </motion.button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Title suggestions */}
                          
                          <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                Job Title
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                                3
                              </span>
                            </div>

                            <div className="space-y-2">
                              {aiSuggestions?.title ? (
                                <SuggestionItem
                                  text={aiSuggestions.title}
                                  sub="Recommended"
                                  onPick={() => setFormData((p) => ({ ...p, title: aiSuggestions.title! }))}
                                />
                              ) : null}

                              {aiSuggestions?.titleSuggestions?.slice(0, titleDisplayCount).map((t) => (
                                <SuggestionItem
                                  key={t}
                                  text={t}
                                  onPick={() => setFormData((p) => ({ ...p, title: t }))}
                                />
                              ))}

                              {!aiSuggestions?.title && !aiSuggestions?.titleSuggestions?.length ? (
                                <div className="text-xs text-slate-500">No title suggestions yet.</div>
                              ) : null}
                            </div>
                          </div>

                          {/* Department suggestions */}
                          <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                                <Building className="w-4 h-4 text-slate-400" />
                                Department
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                                3
                              </span>
                            </div>

                            <div className="space-y-2">
                              {aiSuggestions?.department ? (
                                <SuggestionItem
                                  text={aiSuggestions.department}
                                  sub="Recommended"
                                  onPick={() => setFormData((p) => ({ ...p, department: aiSuggestions.department! }))}
                                />
                              ) : null}

                              {aiSuggestions?.departmentSuggestions?.slice(0, 3).map((d) => (
                                <SuggestionItem
                                  key={d}
                                  text={d}
                                  onPick={() => setFormData((p) => ({ ...p, department: d }))}
                                />
                              ))}

                              {!aiSuggestions?.department && !aiSuggestions?.departmentSuggestions?.length ? (
                                <div className="text-xs text-slate-500">No department suggestions yet.</div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DETAILS */}
                  {step.key === "DETAILS" && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-700 mb-2">Job Type *</label>
                          <select
                            value={formData.job_type}
                            onChange={(e) => setFormData((p) => ({ ...p, job_type: e.target.value as JobType }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="full_time">Full Time</option>
                            <option value="part_time">Part Time</option>
                            <option value="contract">Contract</option>
                            <option value="internship">Internship</option>
                            <option value="freelance">Freelance</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm text-slate-700 mb-2">Salary Range</label>
                          <div className="relative">
                            <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={formData.salary_range}
                              onChange={(e) => setFormData((p) => ({ ...p, salary_range: e.target.value }))}
                              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              placeholder="e.g., 35k–55k MAD / month"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Smart Assist – Description */}
                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-blue-700" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">Writing Assistant</div>
                              <div className="text-xs text-slate-500">
                                {toneLabel(aiTone)} • {aiLanguage.toUpperCase()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                              <span className="text-[11px] text-slate-500">Lang</span>
                              <select
                                value={aiLanguage}
                                onChange={(e) => setAiLanguage(e.target.value as any)}
                                className="text-xs bg-transparent outline-none"
                                title="Language"
                              >
                                <option value="fr">FR</option>
                                <option value="en">EN</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                              <span className="text-[11px] text-slate-500">Tone</span>
                              <select
                                value={aiTone}
                                onChange={(e) => setAiTone(e.target.value as any)}
                                className="text-xs bg-transparent outline-none"
                                title="Tone"
                              >
                                <option value="formal">Professional</option>
                                <option value="concise">Concise</option>
                                <option value="friendly">Friendly</option>
                              </select>
                            </div>

                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={runStep2Generate}
                              disabled={aiLoading}
                              className="px-3 py-2 text-xs rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                              title="Generate description"
                            >
                              {aiLoading ? "Generating…" : "Draft"}
                            </motion.button>

                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => runImprove(improveInstruction(aiLanguage))}
                              disabled={aiLoading || !formData.description.trim()}
                              className="px-3 py-2 text-xs rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60"
                              title="Refine current description"
                            >
                              Refine
                            </motion.button>
                          </div>
                        </div>

                        <div className="text-xs text-slate-500">
                          {toneHint(aiLanguage, aiTone)}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-slate-700 mb-2">Job Description *</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                          rows={8}
                          className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                          placeholder="Responsibilities, requirements, culture..."
                        />
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500">
                            Tip: Keep it readable—short paragraphs, clear responsibilities.
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((p) => ({ ...p, description: normalizeGeneratedText(p.description) }))
                            }
                            className="text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50"
                            title="Remove markdown / formatting"
                          >
                            Clean formatting
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* REQUIREMENTS */}
                  {step.key === "REQUIREMENTS" && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm text-slate-700 mb-2">
                          Required Skills & Technologies
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyDown={handleSkillKeyPress}
                            className="flex-1 px-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="Add skill (React, Python...)"
                          />
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={addSkill}
                            className="px-4 py-3 rounded-sm bg-gradient-to-r from-[#1B73E8] to-[#4F46E5] text-white flex items-center gap-2 shadow-md"
                          >
                            <Plus className="w-4 h-4" />
                            Add
                          </motion.button>
                        </div>

                        {formData.required_skills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {formData.required_skills.map((skill) => (
                              <div
                                key={skill}
                                className="flex items-center gap-2 bg-slate-50 text-blue-700 px-2 py-1 rounded-sm border border-slate-200"
                              >
                                <span className="text-sm">{skill}</span>
                                <button
                                  type="button"
                                  onClick={() => removeSkill(skill)}
                                  className="hover:text-red-600 transition-colors"
                                  title="Remove"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm text-slate-700 mb-2">Screening Questions</label>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            onKeyDown={handleQuestionKeyPress}
                            className="flex-1 px-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="Add screening question"
                          />
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={addQuestion}
                            className="px-4 py-3 rounded-sm bg-gradient-to-r from-[#1B73E8] to-[#4F46E5] text-white flex items-center gap-2 shadow-md"
                          >
                            <Plus className="w-4 h-4" />
                            Add
                          </motion.button>
                        </div>

                        {formData.screening_questions.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {formData.screening_questions.map((q) => (
                              <div
                                key={q}
                                className="flex items-start justify-between gap-2 bg-white border border-slate-200 rounded-sm px-3 py-2"
                              >
                                <span className="text-sm text-slate-800">{q}</span>
                                <button
                                  type="button"
                                  onClick={() => removeQuestion(q)}
                                  className="mt-0.5 hover:text-red-600 transition-colors"
                                  title="Remove"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SETTINGS */}
                  {step.key === "SETTINGS" && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm text-slate-700 mb-2">Initial Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as JobStatus }))}
                          className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="DRAFT">Save as Draft</option>
                          <option value="ACTIVE">Publish Immediately</option>
                          <option value="PAUSED">Paused</option>
                          <option value="CLOSED">Closed</option>
                          <option value="CANCELLED">Cancelled</option>
                          <option value="ARCHIVED">Archived</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-700 mb-2">Application Deadline</label>
                          <input
                            type="date"
                            value={formData.application_deadline}
                            onChange={(e) => setFormData((p) => ({ ...p, application_deadline: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            min={new Date().toISOString().split("T")[0]}
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-slate-700 mb-2">Maximum Applications</label>
                          <input
                            type="number"
                            min={0}
                            value={formData.max_applications}
                            onChange={(e) => setFormData((p) => ({ ...p, max_applications: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="e.g., 100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-slate-700 mb-2">Auto-Reject After (Days)</label>
                        <input
                          type="number"
                          min={0}
                          value={formData.auto_reject_after}
                          onChange={(e) => setFormData((p) => ({ ...p, auto_reject_after: e.target.value }))}
                          className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="e.g., 30"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={formData.visa_sponsored}
                            onChange={(e) => setFormData((p) => ({ ...p, visa_sponsored: e.target.checked }))}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          Visa Sponsorship Available
                        </label>

                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={formData.relocation_assistance}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, relocation_assistance: e.target.checked }))
                            }
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          Relocation Assistance
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-700 mb-2">Experience Level</label>
                          <select
                            value={formData.experience_level}
                            onChange={(e) => setFormData((p) => ({ ...p, experience_level: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Select experience level</option>
                            <option value="entry">Entry (0-2 years)</option>
                            <option value="mid">Mid (2-5 years)</option>
                            <option value="senior">Senior (5+ years)</option>
                            <option value="executive">Executive</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm text-slate-700 mb-2">Education Level</label>
                          <select
                            value={formData.education_level}
                            onChange={(e) => setFormData((p) => ({ ...p, education_level: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Select education level</option>
                            <option value="high_school">High School</option>
                            <option value="bachelor">Bachelor</option>
                            <option value="master">Master</option>
                            <option value="phd">PhD</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-700 mb-2">Remote Work Option</label>
                          <select
                            value={formData.remote_option}
                            onChange={(e) => setFormData((p) => ({ ...p, remote_option: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Select remote option</option>
                            <option value="fully_remote">Fully Remote</option>
                            <option value="hybrid">Hybrid</option>
                            <option value="office_only">On-site Only</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm text-slate-700 mb-2">Hiring Urgency</label>
                          <select
                            value={formData.urgency_level}
                            onChange={(e) => setFormData((p) => ({ ...p, urgency_level: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Select urgency</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* REVIEW */}
                  {step.key === "REVIEW" && (
                    <div className="space-y-5">
                      <div className="rounded-sm border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-slate-900 text-base">
                            {formData.title?.trim() || "Untitled job"}
                          </div>
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                            {formData.status}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-700">
                          <div className="inline-flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {formData.location || "—"}
                          </div>
                          <div className="inline-flex items-center gap-1">
                            <Target className="w-4 h-4 text-slate-400" />
                            {formData.job_type?.replace("_", " ").toUpperCase()}
                          </div>
                          {formData.department ? (
                            <div className="inline-flex items-center gap-1">
                              <Building className="w-4 h-4 text-slate-400" />
                              {formData.department}
                            </div>
                          ) : null}
                          {formData.salary_range ? (
                            <div className="inline-flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-slate-400" />
                              {formData.salary_range}
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-4 text-sm text-slate-700 whitespace-pre-wrap border-t border-slate-200 pt-3">
                          {formData.description?.trim() || "No description yet."}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-sm border border-slate-200 p-4 bg-white">
                          <div className="flex items-center gap-2 text-slate-900">
                            <Users className="w-4 h-4 text-slate-400" />
                            Skills ({formData.required_skills.length})
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {formData.required_skills.length ? (
                              formData.required_skills.map((s) => (
                                <span
                                  key={s}
                                  className="px-2.5 py-1 rounded-lg text-[11px] border border-slate-200 bg-slate-50 text-slate-700"
                                >
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-500">No skills added</span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-sm border border-slate-200 p-4 bg-white">
                          <div className="flex items-center gap-2 text-base text-slate-900">
                            <FileText className="w-4 h-4 text-slate-400" />
                            Questions ({formData.screening_questions.length})
                          </div>
                          <div className="mt-2 space-y-2">
                            {formData.screening_questions.length ? (
                              formData.screening_questions.map((q) => (
                                <div
                                  key={q}
                                  className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-sm px-3 py-2"
                                >
                                  {q}
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-slate-500">No questions added</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Tip: Keep status as <b>DRAFT</b> if you want to publish later.
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-slate-100 px-6 py-4 bg-white">
              <div className="flex items-center justify-between gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={stepIndex === 0 ? onClose : back}
                  className="px-5 py-2.5 rounded-sm border border-slate-200 bg-white text-slate-800 flex items-center gap-2 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {stepIndex === 0 ? "Cancel" : "Back"}
                </motion.button>

                {!isLast ? (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={next}
                    className="px-5 py-2.5 rounded-sm bg-gradient-to-r from-[#1B73E8] to-[#4F46E5] text-white flex items-center gap-2 shadow-md"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={loading}
                    onClick={handleCreate}
                    className="px-5 py-2.5 rounded-sm bg-gradient-to-r from-[#1B73E8] to-[#4F46E5] text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-lg"
                      />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Create Job
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateJobWizardModal;
