"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Save,
  Tag,
  AlertTriangle,
  Building,
  FileText,
  Layers,
  Clock,
  Target,
  Sparkles,
} from "lucide-react";

/* =============================
   Types (keep compatible)
============================= */

type EmployerAssessmentStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "ARCHIVED"
  | "EXPIRED";

type DifficultyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

type AssessmentType =
  | "QUICK_CHECK"
  | "COMPREHENSIVE"
  | "CERTIFICATION"
  | "COMPANY_SPECIFIC";

type AssessmentCreationMethod = "JOB_DESCRIPTION_PARSE" | "CHATBOT_GUIDED" | "MANUAL";

interface CompanyJob {
  job_id: string;
  title: string;
  department: string | null;
}

interface AssessmentFormData {
  job_id: string;
  title: string;
  description: string;
  assessment_type: AssessmentType;
  difficulty: DifficultyLevel;
  time_limit: string;
  total_questions: string;
  passing_score: string;
  status: EmployerAssessmentStatus;
  skill_category: string;
  extracted_skills: string[];
}

const emptyAssessmentForm: AssessmentFormData = {
  job_id: "",
  title: "",
  description: "",
  assessment_type: "QUICK_CHECK",
  difficulty: "INTERMEDIATE",
  time_limit: "60",
  total_questions: "20",
  passing_score: "70",
  status: "DRAFT",
  skill_category: "",
  extracted_skills: [],
};

type StepKey = "BASICS" | "SETUP" | "SKILLS" | "REVIEW";

const steps: { key: StepKey; title: string; subtitle: string; icon: any }[] = [
  { key: "BASICS", title: "Basics", subtitle: "Job, title, description", icon: FileText },
  { key: "SETUP", title: "Setup", subtitle: "Type, difficulty, time & scoring", icon: Layers },
  { key: "SKILLS", title: "Skills", subtitle: "Skill category & key skills", icon: Target },
  { key: "REVIEW", title: "Review & Create", subtitle: "Double-check before creating", icon: Sparkles },
];

interface CreateAssessmentWizardModalProps {
  open: boolean;
  jobs: CompanyJob[];
  onClose: () => void;
  onSubmit: (payload: any) => void | Promise<void>;
}

/* =============================
   Component
============================= */

const CreateAssessmentWizardModal: React.FC<CreateAssessmentWizardModalProps> = ({
  open,
  jobs,
  onClose,
  onSubmit,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState<AssessmentFormData>(emptyAssessmentForm);
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const bodyRef = useRef<HTMLDivElement | null>(null);

  const step = steps[stepIndex];
  const StepIcon = step.icon;
  const isLast = step.key === "REVIEW";

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setFormData(emptyAssessmentForm);
    setNewSkill("");
    setErrorMsg(null);
    setLoading(false);
  }, [open]);

  useEffect(() => {
    if (errorMsg && bodyRef.current) bodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [errorMsg]);

  const progress = useMemo(() => {
    const pct = ((stepIndex + 1) / steps.length) * 100;
    return Math.max(5, Math.min(100, pct));
  }, [stepIndex]);

  const validateStep = (): string | null => {
    const s = step.key;

    if (s === "BASICS") {
      if (!formData.job_id) return "Job is required.";
      if (!formData.title.trim()) return "Assessment title is required.";
      if (!formData.description.trim()) return "Description is required.";
      return null;
    }

    if (s === "SETUP") {
      const tl = Number(formData.time_limit);
      const tq = Number(formData.total_questions);
      const ps = Number(formData.passing_score);

      if (Number.isNaN(tl) || tl < 5) return "Time limit must be a number (>= 5).";
      if (Number.isNaN(tq) || tq < 1) return "Total questions must be a number (>= 1).";
      if (Number.isNaN(ps) || ps < 0 || ps > 100) return "Passing score must be 0–100.";
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
    if (formData.extracted_skills.includes(trimmed)) return setNewSkill("");
    setFormData((p) => ({ ...p, extracted_skills: [...p.extracted_skills, trimmed] }));
    setNewSkill("");
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData((p) => ({
      ...p,
      extracted_skills: p.extracted_skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleSkillKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const handleCreate = async () => {
    const err = validateStep();
    if (err) {
      setErrorMsg(err);
      setStepIndex(0);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        job_id: formData.job_id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        assessment_type: formData.assessment_type,
        difficulty: formData.difficulty,
        time_limit: Number(formData.time_limit),
        total_questions: Number(formData.total_questions),
        passing_score: Number(formData.passing_score),
        status: formData.status,
        skill_category: formData.skill_category.trim() || "General",
        extracted_skills: formData.extracted_skills,
        question_ids: [],
        creation_method: "MANUAL" as AssessmentCreationMethod,
        auto_generated: false,
        settings: {},
      };

      await onSubmit(payload);
      onClose();
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to create assessment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
            className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            {/* Header (same vibe as Job wizard) */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] text-white flex-shrink-0">
              <div className="absolute inset-0 opacity-10">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                    backgroundSize: "24px 24px",
                  }}
                />
              </div>

              <div className="relative px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <motion.div
                      className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-md"
                      whileHover={{ scale: 1.05, rotate: 6 }}
                    >
                      <Plus className="w-5 h-5" />
                    </motion.div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[11px] rounded-full bg-white/15 border border-white/20 uppercase font-semibold tracking-wide">
                          Step {stepIndex + 1}/{steps.length}
                        </span>
                        <span className="px-2 py-0.5 text-[11px] rounded-full bg-emerald-400/20 border border-emerald-200/60 text-emerald-50 font-semibold">
                          Manual Assessment
                        </span>
                      </div>
                      <h2 className="text-xl font-black tracking-tight mt-1">{step.title}</h2>
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
                <div className="relative mt-4 h-2 w-full rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    className="absolute left-0 top-0 h-full bg-white/80 rounded-full"
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
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
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

              {/* wave bottom */}
              <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1440 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                  <path
                    d="M0 20h1440V10c-157.5 0-315-10-472.5-10S652.5 10 495 10 180 0 0 0v20z"
                    fill="white"
                  />
                </svg>
              </div>
            </div>

            {/* Body */}
            <div
              ref={bodyRef}
              className="flex-1 min-h-0 overflow-y-auto px-6 pb-5 pt-4 bg-gradient-to-br from-slate-50 via-white to-slate-50"
            >
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <div className="font-semibold">{errorMsg}</div>
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
                  className="rounded-3xl border border-slate-200 bg-white/90 shadow-[0_10px_40px_rgba(15,23,42,0.04)] p-5"
                >
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                      <StepIcon className="w-5 h-5 text-[#1B73E8]" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900">{step.title}</div>
                      <div className="text-xs text-slate-500">{step.subtitle}</div>
                    </div>
                  </div>

                  {/* BASICS */}
                  {step.key === "BASICS" && (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Job *</label>
                        <div className="relative">
                          <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <select
                            value={formData.job_id}
                            onChange={(e) => setFormData((p) => ({ ...p, job_id: e.target.value }))}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Select job to attach</option>
                            {jobs.map((j) => (
                              <option key={j.job_id} value={j.job_id}>
                                {j.title}
                                {j.department ? ` – ${j.department}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Assessment Title *
                        </label>
                        <input
                          value={formData.title}
                          onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                          className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="e.g., Full-Stack JavaScript Assessment"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Description *
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                          rows={7}
                          className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                          placeholder="What this assessment covers, expectations, rules..."
                        />
                      </div>
                    </div>
                  )}

                  {/* SETUP */}
                  {step.key === "SETUP" && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Type
                          </label>
                          <div className="relative">
                            <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <select
                              value={formData.assessment_type}
                              onChange={(e) =>
                                setFormData((p) => ({
                                  ...p,
                                  assessment_type: e.target.value as AssessmentType,
                                }))
                              }
                              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="QUICK_CHECK">Quick check</option>
                              <option value="COMPREHENSIVE">Comprehensive</option>
                              <option value="CERTIFICATION">Certification</option>
                              <option value="COMPANY_SPECIFIC">Company-specific</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Difficulty
                          </label>
                          <select
                            value={formData.difficulty}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, difficulty: e.target.value as DifficultyLevel }))
                            }
                            className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="BEGINNER">Beginner</option>
                            <option value="INTERMEDIATE">Intermediate</option>
                            <option value="ADVANCED">Advanced</option>
                            <option value="EXPERT">Expert</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Status
                          </label>
                          <select
                            value={formData.status}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, status: e.target.value as EmployerAssessmentStatus }))
                            }
                            className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="DRAFT">Save as Draft</option>
                            <option value="ACTIVE">Activate Immediately</option>
                            <option value="PAUSED">Paused</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="ARCHIVED">Archived</option>
                            <option value="EXPIRED">Expired</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Time Limit (min)
                          </label>
                          <div className="relative">
                            <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="number"
                              min={5}
                              value={formData.time_limit}
                              onChange={(e) => setFormData((p) => ({ ...p, time_limit: e.target.value }))}
                              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Total Questions
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={formData.total_questions}
                            onChange={(e) => setFormData((p) => ({ ...p, total_questions: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Passing Score (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={formData.passing_score}
                            onChange={(e) => setFormData((p) => ({ ...p, passing_score: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SKILLS */}
                  {step.key === "SKILLS" && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Skill Category
                        </label>
                        <input
                          value={formData.skill_category}
                          onChange={(e) => setFormData((p) => ({ ...p, skill_category: e.target.value }))}
                          className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="e.g., Frontend, Backend, Data..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Key Skills to Assess
                        </label>

                        <div className="flex gap-2">
                          <input
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyDown={handleSkillKeyPress}
                            className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="Add skill (React, Node.js...)"
                          />
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={addSkill}
                            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-[#1B73E8] to-[#4F46E5] text-white font-semibold flex items-center gap-2 shadow-md"
                          >
                            <Plus className="w-4 h-4" />
                            Add
                          </motion.button>
                        </div>

                        {formData.extracted_skills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {formData.extracted_skills.map((skill) => (
                              <div
                                key={skill}
                                className="flex items-center gap-2 bg-slate-50 text-slate-700 px-3 py-2 rounded-2xl border border-slate-200"
                              >
                                <Tag className="w-3 h-3 text-[#1B73E8]" />
                                <span className="text-sm font-medium">{skill}</span>
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
                    </div>
                  )}

                  {/* REVIEW */}
                  {step.key === "REVIEW" && (
                    <div className="space-y-5">
                      <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <div className="font-extrabold text-slate-900 text-lg">
                          {formData.title?.trim() || "Untitled assessment"}
                        </div>
                        <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                          {formData.description?.trim() || "No description yet."}
                        </div>

                        <div className="mt-4 border-t border-slate-200 pt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs text-slate-500 font-semibold">Type</div>
                            <div className="font-bold text-slate-900">{formData.assessment_type}</div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs text-slate-500 font-semibold">Difficulty</div>
                            <div className="font-bold text-slate-900">{formData.difficulty}</div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs text-slate-500 font-semibold">Timing</div>
                            <div className="font-bold text-slate-900">
                              {formData.total_questions} Q · {formData.time_limit} min · {formData.passing_score}%
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="text-xs text-slate-500 font-semibold mb-2">
                            Skills ({formData.extracted_skills.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {formData.extracted_skills.length ? (
                              formData.extracted_skills.map((s) => (
                                <span
                                  key={s}
                                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-slate-50 text-slate-700"
                                >
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-500">No skills added</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#1B73E8]" />
                        Tip: Keep status as <b>DRAFT</b> if you want to finalize questions later.
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
                  className="px-5 py-2.5 rounded-full border border-slate-200 bg-white text-slate-800 font-semibold flex items-center gap-2 hover:bg-slate-50"
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
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#1B73E8] to-[#4F46E5] text-white font-semibold flex items-center gap-2 shadow-md"
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
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Create Assessment
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

export default CreateAssessmentWizardModal;
