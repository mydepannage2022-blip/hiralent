"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Play,
  Eye,
  Calendar,
  Building,
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
  BarChart3,
  Layers,
} from "lucide-react";
import AssessmentQuestionsSummary from "./AssessmentQuestionsSummary";
import AssessmentAnalyticsModal from "./AssessmentAnalyticsModal";
import { useAuth } from "../../../../context/AuthContext";

/* =============================
   Types (match Prisma schema)
============================= */

type EmployerAssessmentStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "ARCHIVED"
  | "EXPIRED";

type AssessmentCreationMethod =
  | "JOB_DESCRIPTION_PARSE"
  | "CHATBOT_GUIDED"
  | "MANUAL";

type DifficultyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

type AssessmentType =
  | "QUICK_CHECK"
  | "COMPREHENSIVE"
  | "CERTIFICATION"
  | "COMPANY_SPECIFIC";

interface EmployerAssessment {
  assessment_id: string;
  company_id: string;
  job_id: string;
  title: string;
  description: string;
  status: EmployerAssessmentStatus;
  assessment_type: AssessmentType;
  skill_category: string;
  difficulty: DifficultyLevel;
  time_limit: number;
  total_questions: number;
  passing_score: number | null;
  question_ids: string[];
  settings?: any;
  creation_method: AssessmentCreationMethod;
  extracted_skills: string[];
  enhanced_data?: any;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;

  // optional extra fields coming from API
  candidate_count?: number;
  completion_rate?: number;
  job?: {
    title: string;
    department?: string | null;
  };
}

interface CompanyJob {
  job_id: string;
  title: string;
  department: string | null;
}

/* =============================
   Form Types
============================= */

interface AssessmentFormData {
  job_id: string;
  title: string;
  description: string;
  assessment_type: AssessmentType;
  skill_category: string;
  difficulty: DifficultyLevel;
  time_limit: string; // string in form, convert to number on submit
  total_questions: string;
  passing_score: string;
  status: EmployerAssessmentStatus;
  extracted_skills: string[];
}

const emptyAssessmentForm: AssessmentFormData = {
  job_id: "",
  title: "",
  description: "",
  assessment_type: "QUICK_CHECK",
  skill_category: "",
  difficulty: "INTERMEDIATE",
  time_limit: "60",
  total_questions: "20",
  passing_score: "70",
  status: "DRAFT",
  extracted_skills: [],
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
   Modal for Create + Edit Assessment
============================= */

type ModalMode = "create" | "edit";

interface AssessmentFormModalProps {
  visible: boolean;
  mode: ModalMode;
  assessment: EmployerAssessment | null;
  jobs: CompanyJob[];
  onClose: () => void;
  onSubmit: (payload: any) => void | Promise<void>;
}

const AssessmentFormModal: React.FC<AssessmentFormModalProps> = ({
  visible,
  mode,
  assessment,
  jobs,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<AssessmentFormData>(
    emptyAssessmentForm
  );
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    if (mode === "create" || !assessment) {
      setFormData(emptyAssessmentForm);
      setNewSkill("");
      return;
    }

    // EDIT MODE → prefill from assessment
    setFormData({
      job_id: assessment.job_id || "",
      title: assessment.title || "",
      description: assessment.description || "",
      assessment_type: assessment.assessment_type || "QUICK_CHECK",
      skill_category: assessment.skill_category || "",
      difficulty: assessment.difficulty || "INTERMEDIATE",
      time_limit: String(assessment.time_limit ?? 60),
      total_questions: String(assessment.total_questions ?? 20),
      passing_score:
        assessment.passing_score !== null &&
        assessment.passing_score !== undefined
          ? String(assessment.passing_score)
          : "70",
      status: assessment.status || "DRAFT",
      extracted_skills: Array.isArray(assessment.extracted_skills)
        ? [...assessment.extracted_skills]
        : [],
    });
    setNewSkill("");
  }, [visible, mode, assessment?.assessment_id]);

  const isEdit = mode === "edit";

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    if (formData.extracted_skills.includes(trimmed)) return;

    setFormData((prev) => ({
      ...prev,
      extracted_skills: [...prev.extracted_skills, trimmed],
    }));
    setNewSkill("");
  };

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      extracted_skills: prev.extracted_skills.filter((s) => s !== skill),
    }));
  };

  const handleSkillKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.job_id ||
      !formData.description.trim()
    ) {
      alert("Please fill all required fields (Job, Title, Description).");
      return;
    }

    const timeLimitNumber = Number(formData.time_limit);
    const totalQuestionsNumber = Number(formData.total_questions);
    const passingScoreNumber = Number(formData.passing_score);

    if (
      Number.isNaN(timeLimitNumber) ||
      Number.isNaN(totalQuestionsNumber) ||
      Number.isNaN(passingScoreNumber)
    ) {
      alert("Time limit, total questions and passing score must be numbers.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        job_id: formData.job_id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        assessment_type: formData.assessment_type,
        skill_category: formData.skill_category.trim() || "General",
        difficulty: formData.difficulty,
        time_limit: timeLimitNumber,
        total_questions: totalQuestionsNumber,
        passing_score: passingScoreNumber,
        extracted_skills: formData.extracted_skills,
        status: formData.status,
        question_ids: assessment?.question_ids || [], // Preserve existing questions
        creation_method: "MANUAL" as AssessmentCreationMethod,
        auto_generated: false,
        settings: assessment?.settings || {}, // Preserve existing settings
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error("Error submitting assessment:", err);
      alert(
        isEdit
          ? "Failed to update assessment. Please try again."
          : "Failed to create assessment. Please try again."
      );
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
                  {isEdit ? "Edit Assessment" : "Create New Assessment"}
                </h2>
                <p className="text-blue-100 text-sm">
                  {isEdit
                    ? "Update assessment settings and skills to evaluate"
                    : "Define a manual assessment: timing, difficulty and skills"}
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
            id={isEdit ? "edit-assessment-form" : "create-assessment-form"}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Job & Title */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Job *
                </label>
                <select
                  value={formData.job_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, job_id: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="">Select job to attach</option>
                  {jobs.map((job) => (
                    <option key={job.job_id} value={job.job_id}>
                      {job.title}
                      {job.department ? ` – ${job.department}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assessment Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., Frontend Technical Assessment"
                  required
                />
              </div>
            </div>

            {/* Type, Difficulty, Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assessment Type
                </label>
                <select
                  value={formData.assessment_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      assessment_type: e.target.value as AssessmentType,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="QUICK_CHECK">Quick check</option>
                  <option value="COMPREHENSIVE">Comprehensive</option>
                  <option value="CERTIFICATION">Certification</option>
                  <option value="COMPANY_SPECIFIC">Company-specific</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      difficulty: e.target.value as DifficultyLevel,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {isEdit ? "Status" : "Initial Status"}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as EmployerAssessmentStatus,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="DRAFT">
                    {isEdit ? "Draft" : "Save as Draft"}
                  </option>
                  <option value="ACTIVE">
                    {isEdit ? "Active" : "Activate Immediately"}
                  </option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>
            </div>

            {/* Skill category & meta numbers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Skill Category
                </label>
                <input
                  type="text"
                  value={formData.skill_category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      skill_category: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., Frontend, Backend, Design..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Time Limit (minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  value={formData.time_limit}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      time_limit: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="60"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Total Questions
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.total_questions}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      total_questions: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="20"
                />
              </div>
            </div>

            {/* Passing score + note */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.passing_score}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      passing_score: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="70"
                />
              </div>

              <div className="md:col-span-2 flex items-end">
                <div className="text-xs text-gray-500">
                  This is a manual assessment builder. AI chatbot & JD parsing
                  flows will have their own dedicated screens later, but all
                  assessments appear in the same list.
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assessment Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Describe what this assessment measures, expected seniority, and any specific instructions for candidates..."
                required
              />
            </div>

            {/* Skills to assess */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Key Skills to Assess
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={handleSkillKeyPress}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Add skill (e.g., React, System design, Communication...)"
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

                {formData.extracted_skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.extracted_skills.map((skill) => (
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
              form={isEdit ? "edit-assessment-form" : "create-assessment-form"}
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
              {isEdit ? "Save Changes" : "Create Assessment"}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* =============================
   Pagination (Assessments)
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
        <span className="font-semibold text-gray-900">{totalItems}</span>{" "}
        assessments
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
   API Service (Assessments + Jobs)
============================= */

const assessmentService = {
  async list(token: string) {
    const API_BASE =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

    const response = await fetch(`${API_BASE}/employer-assessments`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const json = await response.json();
    return json;
  },

  async create(token: string, payload: any) {
    const API_BASE =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

    const response = await fetch(`${API_BASE}/employer-assessments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  },

  async update(token: string, assessment_id: string, payload: any) {
    const API_BASE =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

    const cleanPayload = {
      assessment_id,
      // Basic info
      title: payload.title,
      description: payload.description,
      status: payload.status,
      job_id: payload.job_id,

      // Assessment configuration
      assessment_type: payload.assessment_type,
      skill_category: payload.skill_category,
      difficulty: payload.difficulty,
      time_limit: payload.time_limit,
      total_questions: payload.total_questions,
      passing_score: payload.passing_score,

      // Skills and data
      extracted_skills: payload.extracted_skills,

      // Settings
      settings: payload.settings || {},
    };

    console.log("Sending update payload:", cleanPayload);

    const response = await fetch(`${API_BASE}/employer-assessments`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cleanPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Update failed:", errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  },

  async updateStatus(
    token: string,
    assessment_id: string,
    status: EmployerAssessmentStatus
  ) {
    const API_BASE =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

    const response = await fetch(`${API_BASE}/employer-assessments/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assessment_id, status }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  },

  async remove(token: string, assessment_id: string) {
    const API_BASE =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

    const response = await fetch(`${API_BASE}/employer-assessments`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assessment_id }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const json = await response.json().catch(() => ({}));
    return json;
  },
};

const jobService = {
  async getMyCompanyJobs(token: string): Promise<CompanyJob[]> {
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

    const data = await response.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data.map((job: any) => ({
        job_id: job.job_id,
        title: job.title,
        department: job.department ?? null,
      }));
    }
    if (Array.isArray(data)) {
      return data.map((job: any) => ({
        job_id: job.job_id,
        title: job.title,
        department: job.department ?? null,
      }));
    }
    return [];
  },
};

/* =============================
   Main Component
============================= */

const AssessmentsManagement: React.FC = () => {
  const [assessments, setAssessments] = useState<EmployerAssessment[]>([]);
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAssessment, setSelectedAssessment] =
    useState<EmployerAssessment | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editingAssessment, setEditingAssessment] =
    useState<EmployerAssessment | null>(null);

  // Analytics modal state
  const [analyticsAssessment, setAnalyticsAssessment] =
    useState<EmployerAssessment | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  const { token } = useAuth();

  const openAnalytics = (assessment: EmployerAssessment) => {
    setAnalyticsAssessment(assessment);
    setShowAnalyticsModal(true);
  };

  const closeAnalytics = () => {
    setShowAnalyticsModal(false);
    setAnalyticsAssessment(null);
  };

  const loadAll = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [assessRaw, jobsData] = await Promise.all([
        assessmentService.list(token),
        jobService.getMyCompanyJobs(token),
      ]);

      console.log("Assessments API raw response:", assessRaw);

      let list: EmployerAssessment[] = [];

      if (Array.isArray(assessRaw)) {
        list = assessRaw;
      } else if (Array.isArray(assessRaw.data)) {
        list = assessRaw.data;
      } else if (Array.isArray(assessRaw.assessments)) {
        list = assessRaw.assessments;
      } else if (assessRaw.success && Array.isArray(assessRaw.result)) {
        list = assessRaw.result;
      } else if (assessRaw.success === false) {
        throw new Error(
          assessRaw.message || "Failed to load assessments from server"
        );
      } else {
        throw new Error("Unexpected assessments response shape");
      }

      const normalizedList: EmployerAssessment[] = list.map((a: any) => ({
        ...a,
        extracted_skills: Array.isArray(a.extracted_skills)
          ? a.extracted_skills
          : [],
        question_ids: Array.isArray(a.question_ids) ? a.question_ids : [],
      }));

      setAssessments(normalizedList);
      setJobs(jobsData);
    } catch (err) {
      console.error("Error loading assessments:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while loading assessments"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleCreateAssessment = () => {
    setEditingAssessment(null);
    setModalMode("create");
  };

  const handleEditAssessment = (assessment: EmployerAssessment) => {
    setEditingAssessment(assessment);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingAssessment(null);
  };

  const submitAssessment = async (payload: any) => {
    if (!token) return;

    try {
      if (modalMode === "edit" && editingAssessment) {
        await assessmentService.update(
          token,
          editingAssessment.assessment_id,
          payload
        );
      } else {
        await assessmentService.create(token, payload);
      }

      await loadAll();
      closeModal();
    } catch (err) {
      console.error("Error submitting assessment:", err);
      setError(
        modalMode === "edit"
          ? "Failed to update assessment"
          : "Failed to create assessment"
      );
    }
  };

  const handleDelete = async (assessment: EmployerAssessment) => {
    if (!token) return;
    if (
      !confirm(
        `Are you sure you want to delete assessment "${assessment.title}"?`
      )
    )
      return;

    try {
      await assessmentService.remove(token, assessment.assessment_id);
      await loadAll();
      setSelectedAssessment(null);
    } catch (err) {
      console.error("Error deleting assessment:", err);
      setError("Failed to delete assessment");
    }
  };

  const handleStatusChange = async (
    assessment: EmployerAssessment,
    newStatus: EmployerAssessmentStatus
  ) => {
    if (!token) return;

    try {
      await assessmentService.updateStatus(
        token,
        assessment.assessment_id,
        newStatus
      );
      await loadAll();

      if (selectedAssessment?.assessment_id === assessment.assessment_id) {
        setSelectedAssessment({ ...assessment, status: newStatus });
      }
    } catch (err) {
      console.error("Error updating assessment status:", err);
      setError("Failed to update assessment status");
    }
  };

  const filteredAssessments = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return assessments.filter((a) => {
      const matchesSearch =
        !term ||
        a.title.toLowerCase().includes(term) ||
        (a.job?.title?.toLowerCase() ?? "").includes(term) ||
        a.skill_category.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "ALL" || a.status === (statusFilter as any);

      return matchesSearch && matchesStatus;
    });
  }, [assessments, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage);
  const paginatedAssessments = filteredAssessments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      total: assessments.length,
      active: assessments.filter((a) => a.status === "ACTIVE").length,
      draft: assessments.filter((a) => a.status === "DRAFT").length,
      candidates: assessments.reduce(
        (acc, a) => acc + (a.candidate_count || 0),
        0
      ),
    }),
    [assessments]
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
          <h2 className="text-2xl font-black text-[#0D2A5B]">
            Login required
          </h2>
          <p className="text-[#334b7a] mt-2">
            Please sign in to manage your assessments.
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

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modalMode && (
          <AssessmentFormModal
            key={`assessment-form-${modalMode}-${editingAssessment?.assessment_id || "new"}`}
            visible={!!modalMode}
            mode={modalMode}
            assessment={editingAssessment}
            jobs={jobs}
            onClose={closeModal}
            onSubmit={submitAssessment}
          />
        )}
      </AnimatePresence>

{/* HEADER (compact) */}
<div className="relative border-b border-gray-200/70 bg-white overflow-hidden">
  {/* Animated background */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      className="absolute -top-12 -right-12 w-72 h-72 bg-[#1B73E8]/10 rounded-full blur-3xl"
      animate={{ scale: [1, 1.15, 1], x: [0, 20, 0] }}
      transition={{ duration: 8, repeat: Infinity }}
    />
    <motion.div
      className="absolute -bottom-12 -left-12 w-72 h-72 bg-[#0D47A1]/10 rounded-full blur-3xl"
      animate={{ scale: [1, 1.2, 1], x: [0, -20, 0] }}
      transition={{ duration: 10, repeat: Infinity }}
    />
  </div>

  <div className="relative max-w-7xl mx-auto px-6 py-4">
    {/* Title card (smaller) */}
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${panel} px-5 py-3`}
    >
      <div className="flex items-center gap-3">
        <motion.div className="w-10 h-10 bg-gradient-to-br from-[#1B73E8] to-[#0D47A1] rounded-xl flex items-center justify-center shadow-lg">
          <Layers className="w-5 h-5 text-white" />
        </motion.div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#0D2A5B] leading-tight">
            Assessment Management
          </h1>
          <p className="text-xs md:text-sm text-[#2c477b]/80 mt-0.5 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Design, launch and track assessments.
          </p>
        </div>

        <motion.div
          className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-full border border-gray-200 shadow-sm"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-[11px] font-bold text-[#0D2A5B]">LIVE</span>
        </motion.div>
      </div>
    </motion.div>

    {/* Stats (smaller) */}
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
      {[
        {
          key: "total",
          label: "Total",
          value: stats.total,
          icon: FileText,
          card: "bg-gradient-to-br from-blue-500/15 to-indigo-500/15 border-blue-300/40",
          badge: "bg-blue-600",
        },
        {
          key: "active",
          label: "Active",
          value: stats.active,
          icon: Play,
          card: "bg-gradient-to-br from-green-500/15 to-emerald-500/15 border-emerald-300/40",
          badge: "bg-emerald-600",
        },
        {
          key: "draft",
          label: "Draft",
          value: stats.draft,
          icon: Clock,
          card: "bg-gradient-to-br from-amber-500/15 to-orange-500/15 border-amber-300/40",
          badge: "bg-amber-600",
        },
        {
          key: "candidates",
          label: "Candidates",
          value: stats.candidates,
          icon: Users,
          card: "bg-gradient-to-br from-purple-500/15 to-pink-500/15 border-purple-300/40",
          badge: "bg-purple-600",
        },
      ].map((s, i) => (
        <motion.div
          key={s.key}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          whileHover={{ y: -3, scale: 1.01 }}
          className={`rounded-2xl border ${s.card} p-4 shadow-[0_10px_35px_rgba(14,34,92,0.06)]`}
        >
          <div className="flex items-center justify-between">
            <motion.div
              className={`w-9 h-9 rounded-xl ${s.badge} text-white flex items-center justify-center shadow-lg`}
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <s.icon className="w-4 h-4" />
            </motion.div>
            <TrendingUp className="w-4 h-4 text-[#0D2A5B]/45" />
          </div>

          <div className="mt-2 text-2xl font-black text-[#0D2A5B]">
            {s.value}
          </div>
          <div className="text-[11px] text-[#0D2A5B]/70 mt-0.5">
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
                Loading assessments...
              </motion.p>
              <p className="text-gray-600 text-sm">
                Fetching your assessment library
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
              Error Loading Assessments
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadAll}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Try Again
            </motion.button>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ASSESSMENT LIST */}
              <div className="lg:col-span-2">
                <motion.div
                  className="flex items-center justify-between mb-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <h2 className="text-xl font-black text-[#0D2A5B] flex items-center gap-2">
                    <Eye className="w-6 h-6 text-[#1B73E8]" />
                    Assessments
                  </h2>
                  <motion.span
                    className="px-3 py-1 bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white rounded-full text-xs font-bold shadow-lg"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {filteredAssessments.length} assessments
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
                        placeholder="Search by assessment, job or skill category..."
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
                      <option value="COMPLETED">Completed</option>
                      <option value="ARCHIVED">Archived</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </div>
                </motion.div>

                {/* Assessments list as cards */}
                <div className="space-y-4">
                  {paginatedAssessments.map((assessment, idx) => {
                    const difficultyLabel =
                      assessment.difficulty === "BEGINNER"
                        ? "Beginner"
                        : assessment.difficulty === "INTERMEDIATE"
                        ? "Intermediate"
                        : assessment.difficulty === "ADVANCED"
                        ? "Advanced"
                        : "Expert";

                    const timeLabel = `${assessment.time_limit} min`;
                    const questionsLabel = `${assessment.total_questions} Q`;
                    const completion =
                      assessment.completion_rate !== undefined &&
                      assessment.completion_rate !== null
                        ? `${assessment.completion_rate}% completed`
                        : assessment.candidate_count
                        ? `${assessment.candidate_count} candidates`
                        : "No data yet";

                    return (
                      <motion.div
                        key={assessment.assessment_id}
                        initial={{ opacity: 0, y: 20, x: -20 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        whileHover={{ y: -5, x: 5, scale: 1.02 }}
                        onClick={() => setSelectedAssessment(assessment)}
                        className={`${panel} p-6 cursor-pointer border-2 transition-all duration-300 ${
                          selectedAssessment?.assessment_id ===
                          assessment.assessment_id
                            ? "border-[#1B73E8] shadow-xl shadow-blue-200/50"
                            : "border-transparent hover:border-blue-200 hover:shadow-lg"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Status pill */}
                            <motion.span
                              whileHover={{ scale: 1.1 }}
                              className={`${pill} ${
                                assessment.status === "ACTIVE"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : assessment.status === "DRAFT"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : assessment.status === "PAUSED"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : assessment.status === "COMPLETED"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : assessment.status === "ARCHIVED"
                                  ? "bg-slate-50 text-slate-700 border-slate-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {assessment.status}
                            </motion.span>

                            {/* Type pill */}
                            <motion.span
                              whileHover={{ scale: 1.1 }}
                              className={`${pill} bg-blue-50 text-blue-700 border-blue-200`}
                            >
                              {assessment.assessment_type}
                            </motion.span>

                            {/* Difficulty pill */}
                            <motion.span
                              whileHover={{ scale: 1.1 }}
                              className={`${pill} ${
                                assessment.difficulty === "BEGINNER"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : assessment.difficulty === "INTERMEDIATE"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : assessment.difficulty === "ADVANCED"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {difficultyLabel} difficulty
                            </motion.span>
                          </div>

                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(
                                assessment.created_at
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <motion.h3
                          className="text-[15.5px] font-extrabold text-[#142c52] leading-snug mb-1"
                          whileHover={{ x: 5 }}
                        >
                          {assessment.title}
                        </motion.h3>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          {assessment.job?.title && (
                            <div className="flex items-center gap-1">
                              <Building className="w-4 h-4" />
                              <span>{assessment.job.title}</span>
                            </div>
                          )}
                          {assessment.skill_category && (
                            <div className="flex items-center gap-1">
                              <Layers className="w-4 h-4" />
                              <span>{assessment.skill_category}</span>
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-[#2b3952]/80 line-clamp-2 mb-3">
                          {assessment.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-gray-600 mt-3">
                          <div className="flex items-center gap-4">
                            <span>
                              <strong>{questionsLabel}</strong> · {timeLabel}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {completion}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                            {assessment.creation_method ===
                            "JOB_DESCRIPTION_PARSE"
                              ? "From JD"
                              : assessment.creation_method ===
                                "CHATBOT_GUIDED"
                              ? "Chatbot / guided flow"
                              : "Manual creation"}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredAssessments.length}
                  itemsPerPage={itemsPerPage}
                />

                {filteredAssessments.length === 0 && !loading && (
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
                      No assessments yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Create a manual assessment to start evaluating
                      candidates.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCreateAssessment}
                      className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto"
                    >
                      <Plus size={20} />
                      Create First Assessment
                    </motion.button>
                  </motion.div>
                )}
              </div>

              {/* ASSESSMENT DETAILS / Right panel */}
              <AnimatePresence mode="wait">
                {selectedAssessment ? (
                  <motion.div
                    key={selectedAssessment.assessment_id}
                    initial={{ opacity: 0, x: 30, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 30, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className={`${panel} p-6 sticky top-6 max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar`}
                  >
                    {/* Header */}
                    <motion.div
                      className="-m-6 mb-6 p-6 rounded-t-2xl bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] relative overflow-hidden"
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                    >
                      <div className="relative">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                          <Target className="w-6 h-6" />
                          Assessment Details
                        </h2>
                        <p className="text-blue-100 text-sm mt-1">
                          Manual assessment configuration
                        </p>
                      </div>
                    </motion.div>

                    {/* Title + basic info */}
                    <motion.div
                      className="mb-6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {selectedAssessment.title}
                      </h3>

                      <div className="grid grid-cols-1 gap-3 text-sm">
                        {selectedAssessment.job?.title && (
                          <div className="flex items-center gap-3">
                            <Building className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">
                              {selectedAssessment.job.title}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <Layers className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">
                            {selectedAssessment.skill_category || "General"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">
                            {selectedAssessment.total_questions} questions ·{" "}
                            {selectedAssessment.time_limit} min · Passing score{" "}
                            {selectedAssessment.passing_score ?? 70}%
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">
                            Created{" "}
                            {new Date(
                              selectedAssessment.created_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>

                    {/* Description */}
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
                          Assessment Description
                        </h3>
                      </div>
                      <div className="rounded-xl p-4 border border-gray-200 bg-white">
                        <ScrollShadow className="max-h-60 overflow-auto custom-scrollbar">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                            {selectedAssessment.description}
                          </p>
                        </ScrollShadow>
                      </div>
                    </motion.div>

                    {/* Skills */}
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
                          Skills to Assess
                        </h3>
                        <motion.span
                          className="ml-auto px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {(selectedAssessment.extracted_skills || []).length}
                        </motion.span>
                      </div>

                      {!selectedAssessment.extracted_skills ||
                      selectedAssessment.extracted_skills.length === 0 ? (
                        <div className="rounded-xl p-4 border border-gray-200 bg-gray-50 text-center">
                          <p className="text-sm text-gray-600">
                            No skills specified yet. Edit this assessment to add
                            skills.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(selectedAssessment.extracted_skills || []).map(
                            (skill, i) => (
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
                            )
                          )}
                        </div>
                      )}
                    </motion.div>

                    {/* Questions summary + generator */}
                    {token && (
                      <motion.div
                        className="mb-6"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                      >
                        <AssessmentQuestionsSummary
                          token={token}
                          assessment={selectedAssessment}
                          onAfterGenerate={loadAll}
                        />
                      </motion.div>
                    )}

                    {/* Actions */}
                    <motion.div
                      className="flex flex-col gap-3 pt-4 border-t border-gray-200"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() =>
                            handleEditAssessment(selectedAssessment)
                          }
                          className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(selectedAssessment)}
                          className="bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openAnalytics(selectedAssessment)}
                          className="bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                        >
                          <BarChart3 className="w-4 h-4" />
                          Analytics
                        </motion.button>
                      </div>
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
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <Layers className="w-20 h-20 text-[#1B73E8] mx-auto" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-[#0D2A5B] mb-1">
                      Assessment builder
                    </h3>
                    <p className="text-[#29406e] text-sm mb-4">
                      Select an assessment on the left to review its
                      configuration...
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Analytics Modal – separate from list container */}
            <AnimatePresence>
              {showAnalyticsModal && analyticsAssessment && token && (
                <AssessmentAnalyticsModal
                  key={analyticsAssessment.assessment_id}
                  token={token}
                  assessment={analyticsAssessment}
                  onClose={closeAnalytics}
                />
              )}
            </AnimatePresence>
          </>
        )}

        {/* Floating "New Assessment" Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreateAssessment}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white px-5 py-3 rounded-full shadow-2xl shadow-blue-500/30 z-50 flex items-center gap-2 text-sm font-semibold"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Plus className="w-4 h-4" />
          New Assessment
        </motion.button>
      </div>
    </div>
  );
};

export default AssessmentsManagement;
