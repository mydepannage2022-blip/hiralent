"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Play,
  Pause,
  Eye,
  Calendar,
  Building,
  MapPin,
  DollarSign,
  Users,
  Target,
  TrendingUp,
  Sparkles,
  Shield,
  Clock,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Save,
  Tag,
  MessageSquare,
  Upload,
  Bot,
} from "lucide-react";

import { useAuth } from "../../../../context/AuthContext";

import JDParsingModal from "./JDParsingModal";
import ChatbotAssessmentModal from "./ChatbotAssessmentModal";


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
   Form Types
============================= */

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

/* =============================
   Helpers & Styles
============================= */

const panel =
  "rounded-2xl border border-gray-200/60 bg-white shadow-[0_10px_35px_rgba(14,34,92,0.06)]";
const pill =
  "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide border";

const ScrollShadow: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => (
  <div className={`relative ${className || ""}`}>
    <div className="pointer-events-none absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-white to-transparent z-10" />
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-white to-transparent z-10" />
    {children}
  </div>
);

/* =============================
   Assessment Method Selection Modal
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
        transition={{ type: "spring", damping: 25 }}
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B73E8] to-[#1557B0] p-6 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Plus className="w-5 h-5" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold">Create Assessment</h2>
                <p className="text-blue-100 text-sm">
                  Choose how to create assessment for: {job.title}
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

        {/* Methods - Horizontal Layout */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onMethodSelect("JOB_DESCRIPTION_PARSE")}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group h-full"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <motion.div
                  className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Upload className="w-8 h-8 text-blue-600" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-2">
                    From Job Description
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Upload or paste job description to automatically generate assessment
                  </p>
                </div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onMethodSelect("CHATBOT_GUIDED")}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all text-left group h-full"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <motion.div
                  className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Bot className="w-8 h-8 text-green-600" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-2">
                    Chat with AI Assistant
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Interactive AI chat to design customized assessment step by step
                  </p>
                </div>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-500 text-center">
            Both methods will create assessments that appear in your assessment library
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
/* =============================
   ONE Modal for Create + Edit
============================= */

type ModalMode = "create" | "edit";

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

  // when modal opens or mode/job changes → reset or prefill
  useEffect(() => {
    if (!visible) return;

    if (mode === "create") {
      setFormData(emptyFormData);
      setNewSkill("");
      setNewQuestion("");
      return;
    }

    // EDIT MODE
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.location.trim() ||
      !formData.description.trim()
    ) {
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
        max_applications: formData.max_applications
          ? Number(formData.max_applications)
          : null,
        auto_reject_after: formData.auto_reject_after
          ? Number(formData.auto_reject_after)
          : null,
        screening_questions: formData.screening_questions,
        status: formData.status,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error("Error submitting job:", err);
      alert(
        mode === "create"
          ? "Failed to create job. Please try again."
          : "Failed to update job. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

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
      required_skills: prev.required_skills.filter(
        (skill) => skill !== skillToRemove
      ),
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
      screening_questions: prev.screening_questions.filter(
        (q) => q !== qToRemove
      ),
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

  if (!visible) return null;

  const isEdit = mode === "edit";

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
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B73E8] to-[#1557B0] p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                {isEdit ? (
                  <Edit className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </motion.div>
              <div>
                <h2 className="text-xl font-bold">
                  {isEdit ? "Edit Job Posting" : "Create New Job"}
                </h2>
                <p className="text-blue-100 text-sm">
                  {isEdit
                    ? "Update the job details and requirements"
                    : "Fill in the job information to create a new posting"}
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

        {/* Form */}
        <ScrollShadow className="max-h-[60vh] overflow-y-auto p-6 custom-scrollbar">
          <form
            id={isEdit ? "edit-job-form" : "create-job-form"}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Job Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Job Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., Senior Frontend Developer"
                required
              />
            </div>

            {/* Location & Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., Casablanca..."
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
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      department: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., Engineering, Marketing..."
                />
              </div>
            </div>

            {/* Job Type & Salary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Job Type *
                </label>
                <select
                  value={formData.job_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      job_type: e.target.value as JobType,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Salary Range
                </label>
                <input
                  type="text"
                  value={formData.salary_range}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      salary_range: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., 35k–55k MAD / month"
                />
              </div>
            </div>

            {/* Job Status (moved from details to form) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {isEdit ? "Job Status" : "Initial Job Status"}
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value as JobStatus,
                  }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="DRAFT">
                  {isEdit ? "Draft" : "Save as Draft"}
                </option>
                <option value="ACTIVE">
                  {isEdit ? "Active" : "Publish Immediately"}
                </option>
                <option value="PAUSED">Paused</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            {/* Experience & Education */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Experience Level
                </label>
                <select
                  value={formData.experience_level}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      experience_level: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select experience level</option>
                  <option value="entry">Entry Level (0-2 years)</option>
                  <option value="mid">Mid Level (2-5 years)</option>
                  <option value="senior">Senior Level (5+ years)</option>
                  <option value="executive">Executive Level</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Education Level
                </label>
                <select
                  value={formData.education_level}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      education_level: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select education level</option>
                  <option value="high_school">High School Diploma</option>
                  <option value="bachelor">Bachelor's Degree</option>
                  <option value="master">Master's Degree</option>
                  <option value="phd">PhD</option>
                </select>
              </div>
            </div>

            {/* Remote Option & Urgency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Remote Work Option
                </label>
                <select
                  value={formData.remote_option}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      remote_option: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select remote option</option>
                  <option value="fully_remote">Fully Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="office_only">On-Site Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hiring Urgency
                </label>
                <select
                  value={formData.urgency_level}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      urgency_level: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select urgency level</option>
                  <option value="low">Low - No urgent need</option>
                  <option value="medium">Medium - 1–2 months</option>
                  <option value="high">High - 2–4 weeks</option>
                  <option value="urgent">Urgent - Immediate hire</option>
                </select>
              </div>
            </div>

            {/* Visa & Relocation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.visa_sponsored}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      visa_sponsored: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Visa Sponsorship Available
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.relocation_assistance}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      relocation_assistance: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Relocation Assistance
              </label>
            </div>

            {/* Application Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Application Deadline
                </label>
                <input
                  type="date"
                  value={formData.application_deadline}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      application_deadline: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Maximum Applications
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.max_applications}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      max_applications: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., 100"
                />
              </div>
            </div>

            {/* Auto Reject */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Auto-Reject After (Days)
              </label>
              <input
                type="number"
                min={0}
                value={formData.auto_reject_after}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    auto_reject_after: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., 30"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Describe the role, responsibilities, requirements, and company culture..."
                required
              />
            </div>

            {/* Required Skills */}
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
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                          className="hover:text-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Screening Questions */}
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
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                          className="mt-0.5 hover:text-red-600 transition-colors"
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

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-end gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              form={isEdit ? "edit-job-form" : "create-job-form"}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : isEdit ? (
                <Save className="w-5 h-5" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              {isEdit ? "Save Changes" : "Create Job"}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* =============================
   Pagination Component
============================= */

const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++)
          pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between mt-6 px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl border border-gray-200"
    >
      <div className="text-sm text-gray-600">
        Showing{" "}
        <span className="font-semibold text-gray-900">{startItem}</span> to{" "}
        <span className="font-semibold text-gray-900">{endItem}</span> of{" "}
        <span className="font-semibold text-gray-900">{totalItems}</span> jobs
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4 text-gray-600" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </motion.button>

        {getPageNumbers().map((page, idx) => (
          <React.Fragment key={idx}>
            {page === "..." ? (
              <span className="px-3 py-2 text-gray-400">...</span>
            ) : (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPageChange(page as number)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  currentPage === page
                    ? "bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white shadow-md shadow-blue-200"
                    : "border border-gray-200 bg-white hover:bg-blue-50 text-gray-700"
                }`}
              >
                {page}
              </motion.button>
            )}
          </React.Fragment>
        ))}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4 text-gray-600" />
        </motion.button>
      </div>
    </motion.div>
  );
};

/* =============================
   API Service
============================= */

const jobService = {
  async getMyCompanyJobs(token: string) {
    const API_BASE =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

    const response = await fetch(`${API_BASE}/jobs/company/my-jobs`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  },

  async createJob(token: string, jobData: any) {
    const API_BASE =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

    const response = await fetch(`${API_BASE}/jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jobData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  },

  async updateJob(token: string, jobId: string, jobData: any) {
    const API_BASE =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

    const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jobData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  },

  async updateJobStatus(token: string, jobId: string, status: JobStatus) {
    const API_BASE =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

    const response = await fetch(`${API_BASE}/jobs/${jobId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  },

  async deleteJob(token: string, jobId: string) {
    const API_BASE =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

    const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  },
};

/* =============================
   Main Component
============================= */

const JobsManagement: React.FC = () => {
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<CompanyJob | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editingJob, setEditingJob] = useState<CompanyJob | null>(null);
  const [assessmentMethodModal, setAssessmentMethodModal] = useState(false);
  // NEW: assessment creation flow modals
  const [showJDParsingModal, setShowJDParsingModal] = useState(false);
  const [showChatbotModal, setShowChatbotModal] = useState(false);

  const { token } = useAuth();

  const loadJobs = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await jobService.getMyCompanyJobs(token);
      if (response.success) {
        setJobs(response.data || []);
      } else {
        setError(response.message || "Failed to load jobs");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while loading jobs"
      );
      console.error("Error loading jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadJobs();
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleCreateJob = () => {
    setEditingJob(null);
    setModalMode("create");
  };

  const handleEditJob = (job: CompanyJob) => {
    setEditingJob(job);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingJob(null);
  };

  // Submit job: create or update depending on modalMode + editingJob
  const submitJob = async (payload: any) => {
    if (!token) return;

    try {
      if (modalMode === "edit" && editingJob) {
        await jobService.updateJob(token, editingJob.job_id, payload);
      } else {
        await jobService.createJob(token, payload);
      }

      await loadJobs();
      closeModal();
    } catch (err) {
      setError(
        modalMode === "edit"
          ? "Failed to update job"
          : "Failed to create job"
      );
      console.error("Error submitting job:", err);
    }
  };

  const handleStatusChange = async (job: CompanyJob, newStatus: JobStatus) => {
    if (!token) return;

    try {
      const response = await jobService.updateJobStatus(
        token,
        job.job_id,
        newStatus
      );
      if (response.success) {
        await loadJobs();
        setSelectedJob((prev) =>
          prev && prev.job_id === job.job_id ? { ...prev, status: newStatus } : prev
        );
      }
    } catch (err) {
      setError("Failed to update job status");
    }
  };

  const handleDelete = async (job: CompanyJob) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to delete "${job.title}"?`)) return;

    try {
      const response = await jobService.deleteJob(token, job.job_id);
      if (response.success) {
        await loadJobs();
        setSelectedJob(null);
      }
    } catch (err) {
      setError("Failed to delete job");
    }
  };

  const handleCreateAssessment = (job: CompanyJob) => {
    setSelectedJob(job);
    setAssessmentMethodModal(true);
  };

  const handleAssessmentMethodSelect = (
    method: "JOB_DESCRIPTION_PARSE" | "CHATBOT_GUIDED"
  ) => {
    setAssessmentMethodModal(false);

    if (!selectedJob) return;

    if (method === "JOB_DESCRIPTION_PARSE") {
      setShowChatbotModal(false);
      setShowJDParsingModal(true);
    } else {
      setShowJDParsingModal(false);
      setShowChatbotModal(true);
    }
  };


  const filteredJobs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return jobs.filter((job) => {
      const matchesSearch =
        !term ||
        job.title.toLowerCase().includes(term) ||
        (job.location?.toLowerCase() ?? "").includes(term) ||
        (job.department?.toLowerCase() ?? "").includes(term);
      const matchesStatus = statusFilter === "ALL" || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      total: jobs.length,
      active: jobs.filter((j) => j.status === "ACTIVE").length,
      draft: jobs.filter((j) => j.status === "DRAFT").length,
      applications: jobs.reduce(
        (acc, job) => acc + (job.applications_count || 0),
        0
      ),
    }),
    [jobs]
  );

  if (!token) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F6FAFF]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`${panel} p-10 text-center max-w-lg`}
        >
          <motion.div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#1B73E8] to-[#0D47A1] flex items-center justify-center shadow-lg"
            animate={{ rotate: [0, 5, 0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-black text-[#0D2A5B]">Login required</h2>
          <p className="text-[#334b7a] mt-2">
            Please sign in to manage your jobs.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6FAFF]">
      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #1B73E8 0%, #1557B0 100%);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #1557B0 0%, #0D47A1 100%);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #1B73E8 #f1f5f9;
        }
      `}</style>

      {/* Modals */}
      <AnimatePresence>
        {modalMode && (
          <JobFormModal
            key={`job-form-${modalMode}-${editingJob?.job_id || "new"}`}
            visible={!!modalMode}
            mode={modalMode}
            job={editingJob}
            onClose={closeModal}
            onSubmit={submitJob}
          />
        )}
      </AnimatePresence>

      {/* Assessment method selection */}
      {selectedJob && (
        <AssessmentMethodModal
          visible={assessmentMethodModal}
          job={selectedJob}
          onClose={() => setAssessmentMethodModal(false)}
          onMethodSelect={handleAssessmentMethodSelect}
        />
      )}

      {/* JD Parsing flow */}
      <JDParsingModal
        open={showJDParsingModal}
        job={selectedJob}
        onClose={() => setShowJDParsingModal(false)}
        onAssessmentCreated={() => {
          // later you can refresh the assessments list here
        }}
      />

      {/* Chatbot guided flow */}
      <ChatbotAssessmentModal
        open={showChatbotModal}
        job={selectedJob}
        onClose={() => setShowChatbotModal(false)}
        onAssessmentCreated={() => {
          // later you can refresh the assessments list here
        }}
      />


      {/* HEADER */}
      <div className="relative border-b border-gray-200/70 bg-white overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-20 -right-20 w-96 h-96 bg-[#1B73E8]/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 30, 0],
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-20 -left-20 w-96 h-96 bg-[#0D47A1]/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -30, 0],
            }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${panel} px-6 py-5`}
          >
            <div className="flex items-start gap-3">
              <motion.div className="w-12 h-12 bg-gradient-to-br from-[#1B73E8] to-[#0D47A1] rounded-xl flex items-center justify-center shadow-lg">
                <Building className="w-6 h-6 text-white" />
              </motion.div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0D2A5B]">
                  Job Management
                </h1>
                <p className="text-sm md:text-[15px] text-[#2c477b]/80 mt-1 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Manage your job postings and candidate pipeline
                </p>
              </div>
              <motion.div
                className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <motion.div
                  className="w-2 h-2 bg-green-500 rounded-full"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-xs font-bold text-[#0D2A5B]">LIVE</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
            {[
              {
                key: "total",
                label: "Total Jobs",
                value: stats.total,
                icon: FileText,
                card: "bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-blue-300/40",
                badge: "bg-blue-600",
              },
              {
                key: "active",
                label: "Active Jobs",
                value: stats.active,
                icon: Target,
                card: "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-emerald-300/40",
                badge: "bg-emerald-600",
              },
              {
                key: "draft",
                label: "Draft Jobs",
                value: stats.draft,
                icon: Clock,
                card: "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-300/40",
                badge: "bg-amber-600",
              },
              {
                key: "applications",
                label: "Total Applications",
                value: stats.applications,
                icon: Users,
                card: "bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-300/40",
                badge: "bg-purple-600",
              },
            ].map((s, i) => (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className={`rounded-2xl border ${s.card} p-5 shadow-[0_10px_35px_rgba(14,34,92,0.06)] cursor-pointer`}
              >
                <div className="flex items-center justify-between">
                  <motion.div
                    className={`w-10 h-10 rounded-xl ${s.badge} text-white flex items-center justify-center shadow-lg`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <s.icon className="w-5 h-5" />
                  </motion.div>
                  <TrendingUp className="w-4 h-4 text-[#0D2A5B]/50" />
                </div>
                <motion.div
                  className="mt-3 text-3xl font-black text-[#0D2A5B]"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 + 0.2, type: "spring" }}
                >
                  {s.value}
                </motion.div>
                <div className="text-xs text-[#0D2A5B]/70 mt-1">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <motion.div
            className="flex items-center justify-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="relative">
              <motion.div
                className="w-20 h-20 border-4 border-blue-200 border-t-[#1B73E8] rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-8 h-8 text-[#1B73E8]" />
                </motion.div>
              </div>
            </div>
            <div className="ml-6">
              <motion.p
                className="text-gray-900 font-bold text-lg"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Loading Jobs...
              </motion.p>
              <p className="text-gray-600 text-sm">
                Fetching your job postings
              </p>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${panel} p-8 text-center`}
          >
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Error Loading Jobs
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadJobs}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Try Again
            </motion.button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* JOB LIST */}
            <div className="lg:col-span-2">
              <motion.div
                className="flex items-center justify-between mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h2 className="text-xl font-black text-[#0D2A5B] flex items-center gap-2">
                  <Eye className="w-6 h-6 text-[#1B73E8]" />
                  Job Postings
                </h2>
                <motion.span
                  className="px-3 py-1 bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white rounded-full text-xs font-bold shadow-lg"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {filteredJobs.length} jobs
                </motion.span>
              </motion.div>

              {/* Filters */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${panel} p-4 mb-6`}
              >
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search jobs by title, location, or department..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PAUSED">Paused</option>
                    <option value="CLOSED">Closed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </motion.div>

              {/* Jobs List */}
              <div className="space-y-4">
                {paginatedJobs.map((job, idx) => (
                  <motion.div
                    key={job.job_id}
                    initial={{ opacity: 0, y: 20, x: -20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ y: -5, x: 5, scale: 1.02 }}
                    onClick={() => setSelectedJob(job)}
                    className={`${panel} p-6 cursor-pointer border-2 transition-all duration-300 ${
                      selectedJob?.job_id === job.job_id
                        ? "border-[#1B73E8] shadow-xl shadow-blue-200/50"
                        : "border-transparent hover:border-blue-200 hover:shadow-lg"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <motion.span
                          whileHover={{ scale: 1.1 }}
                          className={`${pill} ${
                            job.status === "ACTIVE"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : job.status === "DRAFT"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : job.status === "PAUSED"
                              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                              : job.status === "CLOSED"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : job.status === "CANCELLED"
                              ? "bg-gray-50 text-gray-700 border-gray-300"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {job.status}
                        </motion.span>
                        <motion.span
                          whileHover={{ scale: 1.1 }}
                          className={`${pill} ${
                            job.job_type === "full_time"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : job.job_type === "part_time"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : job.job_type === "contract"
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }`}
                        >
                          {job.job_type?.replace("_", " ").toUpperCase() || "—"}
                        </motion.span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(job.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <motion.h3
                      className="text-[15.5px] font-extrabold text-[#142c52] leading-snug mb-2"
                      whileHover={{ x: 5 }}
                    >
                      {job.title}
                    </motion.h3>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{job.location}</span>
                      </div>
                      {job.salary_range && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span>{job.salary_range}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-[#2b3952]/80 line-clamp-2 mb-3">
                      {job.description}
                    </p>

                    {job.required_skills?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {job.required_skills.slice(0, 4).map((skill, i) => (
                          <motion.span
                            key={skill}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ scale: 1.1, y: -2 }}
                            className="px-2.5 py-1 bg-blue-50 text-[#1B73E8] rounded-lg text-[11px] font-medium border border-blue-100"
                          >
                            {skill}
                          </motion.span>
                        ))}
                        {job.required_skills.length > 4 && (
                          <motion.span
                            whileHover={{ scale: 1.1 }}
                            className="px-2 py-1 bg-gray-50 text-gray-600 rounded-lg text-[11px] font-medium border border-gray-200"
                          >
                            +{job.required_skills.length - 4}
                          </motion.span>
                        )}
                      </div>
                    ) : null}
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredJobs.length}
                itemsPerPage={itemsPerPage}
              />

              {filteredJobs.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`${panel} p-14 text-center`}
                >
                  <motion.div
                    className="w-24 h-24 bg-emerald-100 rounded-3xl border border-emerald-200 flex items-center justify-center mx-auto mb-4"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <FileText className="w-10 h-10 text-emerald-600" />
                  </motion.div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">
                    No jobs found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Create your first job posting to get started.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCreateJob}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto"
                  >
                    <Plus size={20} />
                    Create First Job
                  </motion.button>
                </motion.div>
              )}
            </div>

            {/* JOB DETAILS */}
            <AnimatePresence mode="wait">
              {selectedJob ? (
                <motion.div
                  key={selectedJob.job_id}
                  initial={{ opacity: 0, x: 30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={`${panel} p-6 sticky top-6 max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar`}
                >
                  <motion.div
                    className="-m-6 mb-6 p-6 rounded-t-2xl bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] relative overflow-hidden"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                  >
                    <div className="relative">
                      <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        <Shield className="w-6 h-6" />
                        Job Details
                      </h2>
                      <p className="text-blue-100 text-sm mt-1">
                        Complete job information
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    className="mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      {selectedJob.title}
                    </h3>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">
                          {selectedJob.location}
                        </span>
                      </div>

                      {selectedJob.department && (
                        <div className="flex items-center gap-3 text-sm">
                          <Building className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">
                            {selectedJob.department}
                          </span>
                        </div>
                      )}

                      {selectedJob.salary_range && (
                        <div className="flex items-center gap-3 text-sm">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">
                            {selectedJob.salary_range}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">
                          Created{" "}
                          {new Date(
                            selectedJob.created_at
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <motion.div
                        className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <FileText className="w-5 h-5 text-[#1B73E8]" />
                      </motion.div>
                      <h3 className="font-bold text-gray-900">
                        Job Description
                      </h3>
                    </div>
                    <div className="rounded-xl p-4 border border-gray-200 bg-white">
                      <ScrollShadow className="max-h-60 overflow-auto custom-scrollbar">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                          {selectedJob.description}
                        </p>
                      </ScrollShadow>
                    </div>
                  </motion.div>

                  <motion.div
                    className="mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <motion.div
                        className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Target className="w-5 h-5 text-green-600" />
                      </motion.div>
                      <h3 className="font-bold text-gray-900">
                        Required Skills
                      </h3>
                      <motion.span
                        className="ml-auto px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {selectedJob.required_skills.length}
                      </motion.span>
                    </div>

                    {selectedJob.required_skills.length === 0 ? (
                      <div className="rounded-xl p-4 border border-gray-200 bg-gray-50 text-center">
                        <p className="text-sm text-gray-600">
                          No skills specified
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.required_skills.map((skill, i) => (
                          <motion.span
                            key={skill}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ scale: 1.1, y: -2 }}
                            className="px-3 py-2 bg-blue-50 text-[#1B73E8] rounded-lg text-sm font-medium border border-blue-100"
                          >
                            {skill}
                          </motion.span>
                        ))}
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    className="flex flex-col gap-3 pt-4 border-t border-gray-200"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCreateAssessment(selectedJob)}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
                    >
                      <Plus className="w-5 h-5" />
                      Create Assessment
                    </motion.button>

                    <div className="grid grid-cols-2 gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEditJob(selectedJob)}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(selectedJob)}
                        className="bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </motion.button>
                    </div>

                    {/* Status dropdown removed from details view */}
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`${panel} p-10 text-center sticky top-6`}
                >
                  <motion.div
                    className="relative w-20 h-20 mx-auto mb-4"
                    animate={{
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Eye className="w-20 h-20 text-[#1B73E8] mx-auto" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-[#0D2A5B] mb-1">
                    Select a job
                  </h3>
                  <p className="text-[#29406e] text-sm">
                    Click a job from your list to view details and manage it.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Create Job Floating Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreateJob}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white p-4 rounded-full shadow-2xl shadow-blue-500/30 z-50"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>
    </div>
  );
};

export default JobsManagement;