"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Building,
  MapPin,
  DollarSign,
  Target,
  Shield,
  AlertTriangle,
  FileText,
  ChevronLeft,
  X,
  Save,
  Tag,
  MessageSquare,
  Upload,
  Bot,
  Users,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Clock,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useAuth } from "../../../../context/AuthContext";

import JDParsingModal from "../assessmentManagement/JDParsingModal";
import ChatbotAssessmentModal from "../assessmentManagement/ChatbotAssessmentModal";
import JobApplicantsModal from "./JobApplicantsModal";

/* =============================
   Types
============================= */

type JobStatus =
  | "ACTIVE"
  | "DRAFT"
  | "PAUSED"
  | "CLOSED"
  | "CANCELLED"
  | "ARCHIVED";

type JobType = "full_time" | "part_time" | "contract" | "internship";

interface CompanyJob {
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

/* =============================
   Helpers & Styles (MATCH Assessment Details)
============================= */

const LOGO_BLUE = "#1B73E8";

const panel =
  "rounded-2xl border border-gray-200/60 bg-white shadow-[0_10px_35px_rgba(14,34,92,0.06)]";

const pill =
  "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide border";

const ScrollShadow: React.FC<{ className?: string; children: React.ReactNode }> =
  ({ className, children }) => (
    <div className={`relative ${className || ""}`}>
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-white to-transparent z-10" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-white to-transparent z-10" />
      {children}
    </div>
  );

function formatEnumNice(v?: string) {
  if (!v) return "—";
  return v
    .toLowerCase()
    .split("_")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function statusPillClass(s: JobStatus) {
  switch (s) {
    case "ACTIVE":
      return "bg-green-50 text-green-700 border-green-200";
    case "DRAFT":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "PAUSED":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "CLOSED":
      return "bg-red-50 text-red-700 border-red-200";
    case "CANCELLED":
      return "bg-gray-50 text-gray-700 border-gray-300";
    case "ARCHIVED":
      return "bg-slate-50 text-slate-700 border-slate-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function jobTypePillClass(t?: JobType | null) {
  switch (t) {
    case "full_time":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "part_time":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "contract":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "internship":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function boolText(v?: boolean | null) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

/* =============================
   Assessment Method Selection Modal (kept)
============================= */

interface AssessmentMethodModalProps {
  visible: boolean;
  job: CompanyJob;
  onClose: () => void;
  onMethodSelect: (method: "JOB_DESCRIPTION_PARSE" | "CHATBOT_GUIDED") => void;
}

const AssessmentMethodModal: React.FC<AssessmentMethodModalProps> = ({
  visible,
  job,
  onClose,
  onMethodSelect,
}) => {
  if (!visible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 260 }}
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-[#1B73E8] via-[#2064d6] to-[#1557B0] p-6 text-white relative">
          <div className="absolute -right-10 -top-16 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 bottom-0 w-40 h-40 bg-black/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <motion.div
                className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shadow-md"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Plus className="w-5 h-5" />
              </motion.div>

              <div>
                <div className="inline-flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-[11px] rounded-full bg-white/15 border border-white/20 uppercase font-semibold tracking-wide">
                    AI-powered
                  </span>
                  <span className="px-2 py-0.5 text-[11px] rounded-full bg-emerald-500/80 text-white font-semibold">
                    Recommended
                  </span>
                </div>
                <h2 className="text-xl font-bold leading-tight">
                  Create Assessment
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Choose how you want to generate an assessment for{" "}
                  <span className="font-semibold text-white">{job.title}</span>.
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onMethodSelect("JOB_DESCRIPTION_PARSE")}
              className="w-full p-5 border-2 border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/60 transition-all text-left group relative overflow-hidden"
            >
              <div className="absolute -right-10 -top-10 w-24 h-24 bg-blue-100/70 rounded-full blur-2xl group-hover:bg-blue-200/80" />
              <div className="relative flex flex-col items-center text-center gap-3 h-full">
                <motion.div
                  className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-200"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Upload className="w-7 h-7 text-blue-700" />
                </motion.div>
                <div className="flex-1 flex flex-col gap-1">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-[15px]">
                    From Job Description
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Paste your job description and let the AI generate a complete
                    assessment tailored to this role.
                  </p>
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  <MessageSquare className="w-3 h-3" />
                  <span>Fast start</span>
                </div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onMethodSelect("CHATBOT_GUIDED")}
              className="w-full p-5 border-2 border-gray-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/60 transition-all text-left group relative overflow-hidden"
            >
              <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-emerald-100/80 rounded-full blur-2xl group-hover:bg-emerald-200/90" />
              <div className="relative flex flex-col items-center text-center gap-3 h-full">
                <motion.div
                  className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center group-hover:bg-emerald-200"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Bot className="w-7 h-7 text-emerald-700" />
                </motion.div>
                <div className="flex-1 flex flex-col gap-1">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-[15px]">
                    Chat with AI Assistant
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Design a custom assessment step-by-step in a conversation
                    with the AI hiring assistant.
                  </p>
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  <MessageSquare className="w-3 h-3" />
                  <span>Fully customizable</span>
                </div>
              </div>
            </motion.button>
          </div>
        </div>

        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-2xl">
          <p className="text-[11px] text-gray-500 text-center">
            Both methods will create an AI-generated assessment that appears in
            your <span className="font-semibold text-gray-700">assessment library</span>{" "}
            for reuse and editing.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* =============================
   Edit Modal (kept as-is from your file)
============================= */

type ModalMode = "edit";

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

interface JobFormModalProps {
  visible: boolean;
  mode: ModalMode;
  job: CompanyJob | null;
  onClose: () => void;
  onSubmit: (data: any) => void | Promise<void>;
}

const JobFormModal: React.FC<JobFormModalProps> = ({
  visible,
  mode,
  job,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<JobFormData>(emptyFormData);
  const [newSkill, setNewSkill] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    if (mode === "edit" && job) {
      setFormData({
        title: job.title || "",
        location: job.location || "",
        description: job.description || "",
        department: job.department || "",
        job_type: (job.job_type || "full_time") as JobType,
        salary_range: job.salary_range || "",
        required_skills: Array.isArray(job.required_skills)
          ? [...job.required_skills]
          : [],
        experience_level: job.experience_level || "",
        education_level: job.education_level || "",
        remote_option: job.remote_option || "",
        urgency_level: job.urgency_level || "",
        visa_sponsored: job.visa_sponsored ?? false,
        relocation_assistance: job.relocation_assistance ?? false,
        application_deadline: job.application_deadline
          ? job.application_deadline.slice(0, 10)
          : "",
        max_applications:
          job.max_applications !== undefined && job.max_applications !== null
            ? String(job.max_applications)
            : "",
        auto_reject_after:
          job.auto_reject_after !== undefined && job.auto_reject_after !== null
            ? String(job.auto_reject_after)
            : "",
        screening_questions: Array.isArray(job.screening_questions)
          ? [...job.screening_questions]
          : [],
        status: job.status || "DRAFT",
      });
      setNewSkill("");
      setNewQuestion("");
    }
  }, [visible, mode, job?.job_id]);

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !formData.required_skills.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        required_skills: [...prev.required_skills, trimmed],
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      required_skills: prev.required_skills.filter((s) => s !== skillToRemove),
    }));
  };

  const addQuestion = () => {
    const trimmed = newQuestion.trim();
    if (trimmed && !formData.screening_questions.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        screening_questions: [...prev.screening_questions, trimmed],
      }));
      setNewQuestion("");
    }
  };

  const removeQuestion = (qToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      screening_questions: prev.screening_questions.filter((q) => q !== qToRemove),
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.location.trim() || !formData.description.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
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
    } catch (err) {
      console.error("Error updating job:", err);
      alert("Failed to update job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl"
      >
        <div className="bg-gradient-to-r from-[#1B73E8] to-[#1557B0] p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Edit className="w-5 h-5" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold">Edit Job Posting</h2>
                <p className="text-blue-100 text-sm">
                  Update the job details and requirements
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

        <ScrollShadow className="max-h-[60vh] overflow-y-auto p-6 custom-scrollbar">
          <form id="edit-job-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Job Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Required Skills & Technologies
              </label>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={handleSkillKeyPress}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add required skill (e.g., React, Python...)"
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={addSkill}
                    className="px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </motion.button>
                </div>

                {formData.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.required_skills.map((skill) => (
                      <motion.div
                        key={skill}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200"
                      >
                        <Tag className="w-3 h-3" />
                        <span className="text-sm font-medium">{skill}</span>
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Screening Questions
              </label>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={handleQuestionKeyPress}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add screening question for applicants"
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={addQuestion}
                    className="px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </motion.button>
                </div>

                {formData.screening_questions.length > 0 && (
                  <div className="space-y-2">
                    {formData.screening_questions.map((q) => (
                      <motion.div
                        key={q}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start justify-between gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200"
                      >
                        <span className="text-sm text-gray-800">{q}</span>
                        <button
                          type="button"
                          onClick={() => removeQuestion(q)}
                          className="mt-0.5 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>
        </ScrollShadow>

        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-end gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100"
            >
              Cancel
            </motion.button>

            <motion.button
              type="submit"
              form="edit-job-form"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Save Changes
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* =============================
   API
============================= */

const API_BASE =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

const jobService = {
  async getOne(token: string, jobId: string) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }

    const data = await res.json();
    return data?.data ?? data;
  },

  async updateJob(token: string, jobId: string, jobData: any) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(jobData),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return res.json();
  },

  async deleteJob(token: string, jobId: string) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return res.json();
  },
};

/* =============================
   Main
============================= */

export default function JobDetails({ jobId }: { jobId: string }) {
  const { token } = useAuth();
  const router = useRouter();

  const [job, setJob] = useState<CompanyJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // modals
  const [showEditModal, setShowEditModal] = useState(false);

  const [assessmentMethodModal, setAssessmentMethodModal] = useState(false);
  const [showJDParsingModal, setShowJDParsingModal] = useState(false);
  const [showChatbotModal, setShowChatbotModal] = useState(false);

  const [showApplicantsModal, setShowApplicantsModal] = useState(false);

  // toast
  const [assessmentSuccessMessage, setAssessmentSuccessMessage] = useState<string | null>(null);

  const loadOne = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const data = await jobService.getOne(token, jobId);
      const normalized: CompanyJob = {
        ...data,
        required_skills: Array.isArray(data?.required_skills) ? data.required_skills : [],
        screening_questions: Array.isArray(data?.screening_questions) ? data.screening_questions : [],
      };
      setJob(normalized);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load job");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadOne();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, jobId]);

  useEffect(() => {
    if (!assessmentSuccessMessage) return;
    const timer = setTimeout(() => setAssessmentSuccessMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [assessmentSuccessMessage]);

  const handleAssessmentMethodSelect = (method: "JOB_DESCRIPTION_PARSE" | "CHATBOT_GUIDED") => {
    setAssessmentMethodModal(false);

    if (method === "JOB_DESCRIPTION_PARSE") {
      setShowChatbotModal(false);
      setShowJDParsingModal(true);
    } else {
      setShowJDParsingModal(false);
      setShowChatbotModal(true);
    }
  };

  const submitEdit = async (payload: any) => {
    if (!token || !job) return;
    await jobService.updateJob(token, job.job_id, payload);
    await loadOne();
  };

  const onDelete = async () => {
    if (!token || !job) return;
    if (!confirm(`Are you sure you want to delete "${job.title}"?`)) return;

    try {
      await jobService.deleteJob(token, job.job_id);
      router.push("/company/dashboard/jobManagement");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete job");
    }
  };

  const metaCards = useMemo(() => {
    if (!job) return [];
    return [
      {
        icon: <Users className="w-4 h-4 text-blue-700" />,
        label: "Applicants",
        value: String(job.applications_count ?? 0),
        tone: "border-blue-200 bg-blue-50 text-blue-700",
        onClick: () => setShowApplicantsModal(true),
      },
      {
        icon: <Clock className="w-4 h-4 text-emerald-700" />,
        label: "Deadline",
        value: job.application_deadline ? new Date(job.application_deadline).toLocaleDateString() : "—",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
        onClick: undefined,
      },
      {
        icon: <CheckCircle2 className="w-4 h-4 text-indigo-700" />,
        label: "Remote",
        value: job.remote_option ? formatEnumNice(job.remote_option) : "—",
        tone: "border-indigo-200 bg-indigo-50 text-indigo-700",
        onClick: undefined,
      },
    ];
  }, [job]);

  if (!token) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className={`${panel} p-10 text-center max-w-lg`}>
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: LOGO_BLUE }}
          >
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-[#0D2A5B]">Login required</h2>
          <p className="text-[#334b7a] mt-2">Please sign in to view job details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${LOGO_BLUE}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #1557B0; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: ${LOGO_BLUE} #f1f5f9; }
      `}</style>

      {/* Modals */}
      <AnimatePresence>
        {job && assessmentMethodModal && (
          <AssessmentMethodModal
            visible={assessmentMethodModal}
            job={job}
            onClose={() => setAssessmentMethodModal(false)}
            onMethodSelect={handleAssessmentMethodSelect}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && (
          <JobFormModal
            visible={showEditModal}
            mode="edit"
            job={job}
            onClose={() => setShowEditModal(false)}
            onSubmit={submitEdit}
          />
        )}
      </AnimatePresence>

      {/* JD Parsing flow */}
      <JDParsingModal
        open={showJDParsingModal}
        job={job}
        onClose={() => setShowJDParsingModal(false)}
        onAssessmentCreated={() => {
          setShowJDParsingModal(false);
          setAssessmentSuccessMessage(
            job
              ? `AI-generated assessment for "${job.title}" has been created. You can now review it in your assessment library.`
              : "AI-generated assessment has been created. You can now review it in your assessment library."
          );
        }}
      />

      {/* Chatbot guided flow */}
      <ChatbotAssessmentModal
        open={showChatbotModal}
        job={job}
        onClose={() => setShowChatbotModal(false)}
        onAssessmentCreated={() => {
          setShowChatbotModal(false);
          setAssessmentSuccessMessage(
            job
              ? `Your custom AI-designed assessment for "${job.title}" is ready. You can now review and assign it from your assessment library.`
              : "Your custom AI-designed assessment is ready. You can now review and assign it from your assessment library."
          );
        }}
      />

      {/* Applicants modal */}
      <JobApplicantsModal
        open={showApplicantsModal}
        job={job}
        token={token}
        onClose={() => setShowApplicantsModal(false)}
      />

      {/* Back (same as AssessmentDetails) */}
      <div className="max-w-7xl mx-auto px-6 py-5">
        <button
          onClick={() => router.push("/company/dashboard/jobManagement")}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#0D2A5B] hover:text-[#1B73E8]"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to jobs
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              className="w-20 h-20 border-4 border-blue-200 rounded-full"
              style={{ borderTopColor: LOGO_BLUE }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <div className="ml-6">
              <p className="text-gray-900 font-bold text-lg">Loading job…</p>
              <p className="text-gray-600 text-sm">Fetching job details</p>
            </div>
          </div>
        ) : error ? (
          <div className={`${panel} p-8 text-center`}>
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadOne}
              className="text-white px-6 py-2 rounded-lg"
              style={{ background: LOGO_BLUE }}
            >
              Try Again
            </button>
          </div>
        ) : !job ? (
          <div className={`${panel} p-8 text-center`}>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Job not found</h3>
          </div>
        ) : (
          <>
{/* Header (Assessment Details layout) */}
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  className={`${panel} overflow-hidden`}
>
  <div className="h-1" style={{ background: LOGO_BLUE }} />

  <div className="p-6">
    {/* Row 1: pills left / actions right */}
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${pill} ${statusPillClass(job.status)}`}>
          {formatEnumNice(job.status)}
        </span>

        <span className={`${pill} ${jobTypePillClass(job.job_type)}`}>
          {formatEnumNice(job.job_type || "—")}
        </span>

        {job.department ? (
          <span className={`${pill} bg-slate-50 text-slate-700 border-slate-200`}>
            <Building className="w-3 h-3" />
            {job.department}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button
          onClick={() => setShowEditModal(true)}
          className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-bold flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>

        <button
          onClick={() => setAssessmentMethodModal(true)}
          className="px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2"
          style={{ background: LOGO_BLUE }}
        >
          <Plus className="w-4 h-4" />
          Create Assessment
        </button>

        <button
          onClick={onDelete}
          className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>

    {/* Row 2: title */}
    <h2 className="mt-4 text-2xl font-black text-[#0D2A5B] leading-snug">
      {job.title}
    </h2>

    {/* Row 3: meta grid (tight + no wasted space) */}
    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-700">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-gray-500" />
        {job.location || "—"}
      </div>

      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-gray-500" />
        {job.salary_range || "—"}
      </div>

      <div className="flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-gray-500" />
        Experience: {job.experience_level ? formatEnumNice(job.experience_level) : "—"}
      </div>

      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        Created {new Date(job.created_at).toLocaleDateString()}
      </div>

      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-500" />
        Deadline:{" "}
        <span className="font-bold text-gray-900">
          {job.application_deadline
            ? new Date(job.application_deadline).toLocaleDateString()
            : "—"}
        </span>
      </div>
    </div>
  </div>
</motion.div>


            {/* Description + Skills (same grid structure as AssessmentDetails) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
              <div className={`lg:col-span-2 ${panel} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <FileText className="w-5 h-5" style={{ color: LOGO_BLUE }} />
                  </div>
                  <h4 className="font-black text-[#0D2A5B]">Description</h4>
                </div>

                <div className="rounded-xl p-4 border border-gray-200 bg-white">
                  <ScrollShadow className="max-h-60 overflow-auto custom-scrollbar">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                      {job.description || "—"}
                    </p>
                  </ScrollShadow>
                </div>
              </div>

              <div className={`${panel} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="font-black text-[#0D2A5B]">Required Skills</h4>
                  <span className="ml-auto px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                    {(job.required_skills || []).length}
                  </span>
                </div>

                {!job.required_skills?.length ? (
                  <div className="rounded-xl p-4 border border-dashed border-gray-300 bg-white text-center">
                    <p className="text-sm text-gray-600">No skills specified</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold border border-blue-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Screening Questions + Job Settings (extra sections matching AssessmentDetails “Questions” vibe) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
              <div className={`lg:col-span-2 ${panel} overflow-hidden`}>
                <div className="h-1" style={{ background: LOGO_BLUE }} />
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-indigo-100 rounded-2xl flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-indigo-700" />
                    </div>
                    <div className="font-black text-[#0D2A5B]">Screening Questions</div>
                    <span className="ml-auto px-2 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                      {(job.screening_questions || []).length}
                    </span>
                  </div>

                  <div className="mt-4">
                    {!job.screening_questions?.length ? (
                      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
                        <div className="text-sm text-gray-700 font-bold">No screening questions</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Use <b>Edit</b> to add questions for applicants.
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                        <div className="divide-y divide-gray-100">
                          {job.screening_questions.map((q, idx) => (
                            <div key={`${q}-${idx}`} className="px-4 py-3 hover:bg-slate-50">
                              <div className="text-sm font-semibold text-gray-800">
                                {idx + 1}. {q}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={`${panel} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <SettingsIcon />
                  </div>
                  <h4 className="font-black text-[#0D2A5B]">Job Settings</h4>
                </div>

                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 font-semibold">Remote option</span>
                    <span className="font-bold">{job.remote_option ? formatEnumNice(job.remote_option) : "—"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 font-semibold">Urgency</span>
                    <span className="font-bold">{job.urgency_level ? formatEnumNice(job.urgency_level) : "—"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 font-semibold">Education</span>
                    <span className="font-bold">{job.education_level ? formatEnumNice(job.education_level) : "—"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 font-semibold">Visa sponsored</span>
                    <span className="font-bold">{boolText(job.visa_sponsored)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 font-semibold">Relocation</span>
                    <span className="font-bold">{boolText(job.relocation_assistance)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 font-semibold">Max applications</span>
                    <span className="font-bold">{job.max_applications ?? "—"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 font-semibold">Auto reject after</span>
                    <span className="font-bold">
                      {job.auto_reject_after ? `${job.auto_reject_after} days` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Assessment success toast (kept) */}
      <AnimatePresence>
        {assessmentSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-[11000]"
          >
            <div className="max-w-md rounded-2xl border border-emerald-200 bg-white shadow-xl shadow-emerald-200/40 px-4 py-3 flex items-start gap-3">
              <div className="mt-0.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-emerald-700" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">
                  Assessment created successfully
                </p>
                <p className="text-xs text-gray-700 mt-0.5">
                  {assessmentSuccessMessage}
                </p>
              </div>
              <button
                onClick={() => setAssessmentSuccessMessage(null)}
                className="mt-0.5 p-1 rounded-md hover:bg-emerald-50 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =============================
   Small icon component (avoid extra import)
============================= */

function SettingsIcon() {
  return (
    <span className="w-9 h-9 bg-slate-100 rounded-2xl flex items-center justify-center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
          stroke="#334155"
          strokeWidth="2"
        />
        <path
          d="M19.4 15a7.9 7.9 0 0 0 .1-1 7.9 7.9 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8.3 8.3 0 0 0-1.7-1L15 3h-6l-.9 2.9a8.3 8.3 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.9 7.9 0 0 0-.1 1 7.9 7.9 0 0 0 .1 1l-2 1.5 2 3.5 2.4-1a8.3 8.3 0 0 0 1.7 1L9 21h6l.9-2.9a8.3 8.3 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5Z"
          stroke="#334155"
          strokeWidth="2"
        />
      </svg>
    </span>
  );
}
