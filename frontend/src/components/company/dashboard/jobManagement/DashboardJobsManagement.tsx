"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Edit,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Sparkles,
  Shield,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Save,
  Tag,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useAuth } from "../../../../context/AuthContext";

import JobApplicantsModal from "./JobApplicantsModal";
import CreateJobWizardModal from "./CreateJobWizardModal";

/* =============================
   Types
============================= */

type JobStatus =
  | "Active"
  | "Draft"
  | "Paused"
  | "Closed"
  | "Cancelled"
  | "Archived";

type JobType = "full_time" | "part_time" | "contract" | "internship"| "freelance";

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
  status: "Draft",
};

/* =============================
   Helpers & Styles (match Assessments)
============================= */

const LOGO_BLUE = "#1B73E8";

const panel =
  "";

const softInput =
  "w-full pl-4 pr-4 py-2.5 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400";

const softSelect =
  "pl-2 pr-4 py-2.5 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900";

const pill =
  "inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-semibold border";

function formatJobType(t?: JobType | null) {
  if (!t) return "—";
  return t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusChipStyle(s: JobStatus) {
  switch (s) {
    case "Active":
      return "text-[#005edc]";
    case "Draft":
      return "text-[#005edc]";
    case "Paused":
      return "text-[#005edc]";
    case "Closed":
      return "text-[#005edc]";
    case "Cancelled":
      return "text-[#005edc]";
    case "Archived":
      return "text-[#005edc]";
    default:
      return "text-[#005edc]";
  }
}

function typeChipStyle(t?: JobType | null) {
  switch (t) {
    case "full_time":
      return "text-[#005edc]";
    case "part_time":
      return "text-[#005edc]";
    case "contract":
      return "text-[#005edc]";
    case "internship":
      return "text-[#005edc]";
    case "freelance":
      return "text-[#005edc]";
    default:
      return "text-[#005edc]";
  }
}

function truncateWithEllipsis(text: string, maxChars: number) {
  const clean = (text || "").trim();
  if (clean.length <= maxChars) return { short: clean, isTruncated: false };
  return { short: clean.slice(0, maxChars).trimEnd() + "…", isTruncated: true };
}

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
   ONE Modal for Create + Edit (kept)
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

  useEffect(() => {
    if (!visible) return;

    if (mode === "create") {
      setFormData(emptyFormData);
      setNewSkill("");
      setNewQuestion("");
      return;
    }

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
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white rounded-lg shadow-2xl"
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
                {isEdit ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
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
                    setFormData((prev) => ({ ...prev, location: e.target.value }))
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
                    setFormData((prev) => ({ ...prev, department: e.target.value }))
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
                  <option value="freelance">Freelance</option>
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
                    setFormData((prev) => ({ ...prev, salary_range: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., 35k–55k MAD / month"
                />
              </div>
            </div>

            {/* Job Status */}
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
                <option value="DRAFT">{isEdit ? "Draft" : "Save as Draft"}</option>
                <option value="ACTIVE">{isEdit ? "Active" : "Publish Immediately"}</option>
                <option value="PAUSED">Paused</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
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
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
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
   Pagination (match Assessments)
============================= */

const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}> = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
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
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
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
      className="flex items-center justify-between mt-6 px-4 py-3 bg-white rounded-2xl border border-gray-200"
    >
      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-900">{startItem}</span> to{" "}
        <span className="font-semibold text-gray-900">{endItem}</span> of{" "}
        <span className="font-semibold text-gray-900">{totalItems}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4 text-gray-600" />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>

        {getPageNumbers().map((page, idx) => (
          <React.Fragment key={idx}>
            {page === "..." ? (
              <span className="px-3 py-2 text-gray-400">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  currentPage === page
                    ? "bg-blue-600 text-white shadow-sm"
                    : "border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                }`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </motion.div>
  );
};

/* =============================
   API Service (kept)
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

  async deleteJob(token: string, jobId: string) {
    const API_BASE =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

    const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
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
  const router = useRouter();
  const { token } = useAuth();

  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortFilter, setSortFilter] = useState<"latest" | "oldest">("latest");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  const [createWizardOpen, setCreateWizardOpen] = useState(false);

  // Modal state (kept)
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editingJob, setEditingJob] = useState<CompanyJob | null>(null);

  // Applicants modal (kept)
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [jobForApplicants, setJobForApplicants] = useState<CompanyJob | null>(null);

  // ✅ description “see more” (same behavior as assessments)
  const [expandedDescIds, setExpandedDescIds] = useState<Record<string, boolean>>({});

  const loadJobs = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await jobService.getMyCompanyJobs(token);
      if (response.success) setJobs(response.data || []);
      else setError(response.message || "Failed to load jobs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while loading jobs");
      console.error("Error loading jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadJobs();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleOpenApplicants = (job: CompanyJob) => {
    setJobForApplicants(job);
    setShowApplicantsModal(true);
  };

  const handleCreateJob = () => {
    setModalMode(null);
    setEditingJob(null);
    setCreateWizardOpen(true);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingJob(null);
  };

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
      setCreateWizardOpen(false);
    } catch (err) {
      setError(modalMode === "edit" ? "Failed to update job" : "Failed to create job");
      console.error("Error submitting job:", err);
    }
  };

  const filteredJobs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    let list = jobs.filter((job) => {
      const matchesSearch =
        !term ||
        job.title.toLowerCase().includes(term) ||
        (job.location?.toLowerCase() ?? "").includes(term) ||
        (job.department?.toLowerCase() ?? "").includes(term);

      const matchesStatus = statusFilter === "ALL" || job.status === statusFilter;
      const matchesType = jobTypeFilter === "ALL" || job.job_type === jobTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });

    list = [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortFilter === "latest" ? db - da : da - db;
    });

    return list;
  }, [jobs, searchTerm, statusFilter, jobTypeFilter, sortFilter]);

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, jobTypeFilter, sortFilter]);

  const stats = useMemo(
    () => ({
      total: jobs.length,
      active: jobs.filter((j) => j.status === "Active").length,
      draft: jobs.filter((j) => j.status === "Draft").length,
      applications: jobs.reduce((acc, job) => acc + (job.applications_count || 0), 0),
    }),
    [jobs]
  );

  if (!token) {
    return (
      <div className="min-h-screen grid place-items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`${panel} p-10 text-center max-w-lg`}
        >
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: LOGO_BLUE }}
          >
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Login required</h2>
          <p className="text-gray-600 mt-2">Please sign in to manage your jobs.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Custom Scrollbar Styles (kept) */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #1B73E8 0%, #1557B0 100%);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #1557B0 0%, #0D47A1 100%);
        }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #1B73E8 #f1f5f9; }
      `}</style>

      {/* Modals (kept) */}
      <AnimatePresence>
        {createWizardOpen && (
          <CreateJobWizardModal
            open={createWizardOpen}
            onClose={() => setCreateWizardOpen(false)}
            onSubmit={submitJob}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalMode === "edit" && (
          <JobFormModal
            key={`job-form-edit-${editingJob?.job_id || "none"}`}
            visible={modalMode === "edit"}
            mode="edit"
            job={editingJob}
            onClose={closeModal}
            onSubmit={submitJob}
          />
        )}
      </AnimatePresence>

      {/* Applicants modal (kept) */}
      <JobApplicantsModal
        open={showApplicantsModal}
        job={jobForApplicants}
        token={token}
        onClose={() => {
          setShowApplicantsModal(false);
          setJobForApplicants(null);
        }}
      />

      {/* ✅ SAME LAYOUT AS ASSESSMENTS: full width content wrapper */}
      <div className="w-full">
        {/* Analytics (same grid behavior as assessments) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total},
            { label: "Active", value: stats.active},
            { label: "Draft", value: stats.draft},
            { label: "Applications", value: stats.applications},
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-gray-200 bg-white flex justify-between items-center p-4">
              <div className={`text-xl font-black`}>{s.value}</div>
              <div className="text-xs text-black/50 font-semibold">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters toolbar (same as assessments: flex wrap, not stacked) */}
        <div className={`${panel} mt-4`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 text-sm" />
              <input
                type="text"
                placeholder="Search by title, location, or department…"
                className={softInput + " pl-10"}
                value={searchTerm}

                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="min-w-[180px]">
              <select
                className={softSelect + " w-full"}
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
              >
                <option value="ALL">All Types</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>

            <div className="min-w-[180px]">
              <select
                className={softSelect + " w-full"}
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

            <div className="min-w-[160px]">
              <select
                className={softSelect + " w-full"}
                value={sortFilter}
                onChange={(e) => setSortFilter(e.target.value as "latest" | "oldest")}
              >
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>

            {/* Floating create button (same vibe as assessments) */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCreateJob}
            className="bottom-6 right-6 text-white px-5 py-3 rounded-sm shadow-2xl z-50 flex items-center gap-2 text-sm"
            style={{ background: LOGO_BLUE, boxShadow: "0 20px 50px rgba(27,115,232,0.25)" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Plus className="w-4 h-4" />
            New Job
          </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-5">
          {loading ? (
            <motion.div
              className="flex items-center justify-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="relative">
                <motion.div
                  className="w-16 h-16 border-4 border-gray-200 rounded-full"
                  style={{ borderTopColor: LOGO_BLUE }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-7 h-7" style={{ color: LOGO_BLUE }} />
                </div>
              </div>
              <div className="ml-5">
                <p className="text-gray-900 font-bold text-lg">Loading jobs…</p>
                <p className="text-gray-500 text-sm">Fetching your job postings</p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`${panel} p-8 text-center`}
            >
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Jobs</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadJobs}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold"
              >
                Retry
              </button>
            </motion.div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedJobs.map((job, idx) => {
                  const descExpanded = !!expandedDescIds[job.job_id];
                  const { short, isTruncated } = truncateWithEllipsis(job.description || "", 170);

                  return (
                    <motion.div
                      key={job.job_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      whileHover={{ y: -2 }}
                      onClick={() => router.push(`/company/dashboard/jobManagement/${job.job_id}`)}
                      className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-5 cursor-pointer hover:border-blue-200 hover:shadow-[0_12px_30px_rgba(16,24,40,0.08)] transition-all"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className={`${pill} ${statusChipStyle(job.status)}`}>
                              {job.status}
                            </span>

                            <span className={`${pill} ${typeChipStyle(job.job_type)}`}>
                              {formatJobType(job.job_type)}
                            </span>

                            <span className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {new Date(job.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <h3
                            className="text-[16px] md:text-[17px] font-medium text-gray-900 leading-snug truncate"
                            title={job.title}
                          >
                            {job.title}
                          </h3>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span className="truncate">{job.location}</span>
                            </div>

                            {job.salary_range && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                <span className="truncate">{job.salary_range}</span>
                              </div>
                            )}
                          </div>

                          {/* description with see more */}
                          <div className="mt-2 text-sm text-gray-600">
                            <span>{descExpanded ? job.description : short}</span>
                            {isTruncated && (
                              <button
                                className="ml-2 text-[12px] font-bold"
                                style={{ color: LOGO_BLUE }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setExpandedDescIds((p) => ({
                                    ...p,
                                    [job.job_id]: !p[job.job_id],
                                  }));
                                }}
                              >
                                {descExpanded ? "See less" : "See more"}
                              </button>
                            )}
                          </div>

                          {job.required_skills?.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {job.required_skills.slice(0, 6).map((skill) => (
                                <span
                                  key={skill}
                                  className="px-2.5 py-1  text-[#1B73E8] rounded-sm text-[11px] font-medium border border-blue-100"
                                >
                                  {skill}
                                </span>
                              ))}
                              {job.required_skills.length > 6 && (
                                <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded-lg text-[11px] font-medium border border-gray-200">
                                  +{job.required_skills.length - 6}
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>

                        {/* Right side: applicants quick pill (like assessments right metrics) */}
                        <div className="shrink-0 flex gap-2 lg:flex-col lg:items-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenApplicants(job);
                            }}
                            className="px-3 py-2 rounded-sm border border-blue-200 flex items-center gap-2 min-w-[170px] hover:bg-blue-100 transition-colors"
                          >
                            <Users className="w-4 h-4 text-blue-700" />
                            <div className="leading-tight text-left">
                              <div className="text-[10px] font-medium text-blue-700/80">Applicants</div>
                              <div className="text-[15px] font-black text-gray-900">
                                {job.applications_count ?? 0}
                              </div>
                            </div>
                          </button>

                          <div className="hidden lg:block text-[11px] text-gray-500 font-semibold mt-1">
                            Open details →
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredJobs.length}
                itemsPerPage={itemsPerPage}
              />

              {filteredJobs.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`${panel} p-14 text-center mt-5`}
                >
                  <div
                    className="w-20 h-20 rounded-3xl border flex items-center justify-center mx-auto mb-4"
                    style={{ background: "#EAF2FE", borderColor: "#CFE2FF" }}
                  >
                    <FileText className="w-9 h-9" style={{ color: LOGO_BLUE }} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">No jobs found</h3>
                  <p className="text-gray-600 mb-5">Try adjusting filters or create your first job.</p>
                  <button
                    onClick={handleCreateJob}
                    className="text-white px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 shadow-sm"
                    style={{ background: LOGO_BLUE }}
                  >
                    <Plus size={20} />
                    Create Job
                  </button>
                </motion.div>
              )}
            </>
          )}
        </div>


      </div>
    </div>
  );
};

export default JobsManagement;
