"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_V1_BASE } from "@/src/lib/config/api";
import {
  Calendar,
  Building,
  Shield,
  Clock,
  AlertTriangle,
  BarChart3,
  Layers,
  Trash2,
  ChevronLeft,
  X,
  Save,
  Tag,
  Plus,
  Edit,
  Sparkles,
  GripVertical,
  Eye,
  ExternalLink,
  User,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useAuth } from "../../../../context/AuthContext";

import AssessmentAnalyticsModal from "./AssessmentAnalyticsModal";

/* =============================
   Types (kept consistent)
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
  creation_method?: AssessmentCreationMethod;
  extracted_skills: string[];
  enhanced_data?: any;
  auto_generated?: boolean;
  created_at: string;
  updated_at?: string;

  job?: { title: string; department?: string | null };
}

interface CompanyJob {
  job_id: string;
  title: string;
  department: string | null;
}

/* =============================
   Questions
============================= */

type QuestionRow = {
  id: string;
  title: string;
  type?: string;
  time?: number | null; // minutes
  skills?: string[];
  score?: number | null;
  difficulty?: string;
};

type QuestionsApiResponse = {
  result?: {
    questions?: any[];
  };
};

function safeArray<T>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function formatEnumNice(v?: string) {
  if (!v) return "";
  return v
    .toLowerCase()
    .split("_")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function clampText(s: string, max = 70) {
  const clean = (s || "").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "…";
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
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
  time_limit: string;
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

const LOGO_BLUE = "#1B73E8";

const panel =
  "rounded-sm border border-gray-200/60 bg-white shadow-[0_10px_35px_rgba(14,34,92,0.06)]";

const pill =
  "inline-flex items-center gap-1 px-3 py-1.5 rounded-sm text-[11px] font-semibold tracking-wide border";

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
   API
============================= */

const API_BASE = API_V1_BASE;

const assessmentService = {
  async getOne(token: string, assessmentId: string) {
    const res = await fetch(`${API_BASE}/employer-assessments/${assessmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) return res.json();

    // fallback: load list and find
    const listRes = await fetch(`${API_BASE}/employer-assessments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!listRes.ok) throw new Error("Failed to load assessment");

    const listJson = await listRes.json();
    const list: EmployerAssessment[] = Array.isArray(listJson)
      ? listJson
      : listJson.data || listJson.assessments || listJson.result || [];

    const found = list.find((a) => a.assessment_id === assessmentId);
    if (!found) throw new Error("Assessment not found");

    return found;
  },

  async update(token: string, assessment_id: string, payload: any) {
    const cleanPayload = {
      assessment_id,
      title: payload.title,
      description: payload.description,
      status: payload.status,
      job_id: payload.job_id,

      assessment_type: payload.assessment_type,
      skill_category: payload.skill_category,
      difficulty: payload.difficulty,
      time_limit: payload.time_limit,
      total_questions: payload.total_questions,
      passing_score: payload.passing_score,

      extracted_skills: payload.extracted_skills,
      settings: payload.settings || {},
    };

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
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  },

  async remove(token: string, assessment_id: string) {
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

    return response.json().catch(() => ({}));
  },

  // auto-generate (existing)
  async generateQuestions(token: string, assessmentId: string) {
    const res = await fetch(
      `${API_BASE}/employer-assessments/${assessmentId}/generate-questions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return res.json();
  },

  // load attached questions
  async getQuestions(
    token: string,
    assessmentId: string
  ): Promise<QuestionsApiResponse> {
    const res = await fetch(
      `${API_BASE}/employer-assessments/${assessmentId}/questions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return res.json();
  },

  // manual attach (kept — used by My Questions page after selection)
  async attachManual(token: string, assessmentId: string, questionIds: string[]) {
    const res = await fetch(
      `${API_BASE}/employer-assessments/${assessmentId}/questions/attach`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question_ids: questionIds, mode: "append" }),
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return res.json();
  },

  // detach
  async detach(token: string, assessmentId: string, questionId: string) {
    const res = await fetch(
      `${API_BASE}/employer-assessments/${assessmentId}/questions/${questionId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return res.json();
  },

  // reorder
  async reorder(
    token: string,
    assessmentId: string,
    orderedQuestionIds: string[]
  ) {
    const res = await fetch(
      `${API_BASE}/employer-assessments/${assessmentId}/questions/reorder`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ordered_question_ids: orderedQuestionIds }),
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return res.json();
  },
};

const jobService = {
  async getMyCompanyJobs(token: string): Promise<CompanyJob[]> {
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
   Edit Modal (kept)
============================= */

type ModalMode = "edit";

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

    if (!assessment) {
      setFormData(emptyAssessmentForm);
      setNewSkill("");
      return;
    }

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
  }, [visible, assessment?.assessment_id]);

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
    if (!assessment) return;

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
        question_ids: assessment.question_ids || [],
        creation_method: "MANUAL",
        auto_generated: false,
        settings: assessment.settings || {},
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error("Error submitting assessment:", err);
      alert("Failed to update assessment.");
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
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="relative w-full max-w-2xl overflow-hidden bg-white rounded-sm shadow-2xl"
      >
        <div className="bg-gradient-to-r from-[#1B73E8] to-[#1557B0] p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 bg-white/20 rounded-sm flex items-center justify-center"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Edit className="w-5 h-5" />
              </motion.div>
              <div>
                <h2 className="text-xl">Edit Assessment</h2>
                <p className="text-blue-100 text-sm">
                  Update assessment settings and skills to evaluate
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
          <form
            id="edit-assessment-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Job *
                </label>
                <select
                  value={formData.job_id}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, job_id: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    setFormData((p) => ({ ...p, title: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Frontend Technical Assessment"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assessment Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={formData.assessment_type}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      assessment_type: e.target.value as AssessmentType,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    setFormData((p) => ({
                      ...p,
                      difficulty: e.target.value as DifficultyLevel,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      status: e.target.value as EmployerAssessmentStatus,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Skill Category
                </label>
                <input
                  type="text"
                  value={formData.skill_category}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      skill_category: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Frontend, Backend..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Time Limit (min)
                </label>
                <input
                  type="number"
                  min={5}
                  value={formData.time_limit}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, time_limit: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    setFormData((p) => ({
                      ...p,
                      total_questions: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

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
                    setFormData((p) => ({
                      ...p,
                      passing_score: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Key Skills
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={handleSkillKeyPress}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add skill (React, Node.js...)"
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addSkill}
                    className="px-4 py-3 text-white rounded-sm font-semibold flex items-center gap-2"
                    style={{ background: LOGO_BLUE }}
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </motion.button>
                </div>

                {formData.extracted_skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.extracted_skills.map((skill) => (
                      <div
                        key={skill}
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
                      </div>
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
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-sm font-semibold hover:bg-gray-100"
            >
              Cancel
            </motion.button>

            <motion.button
              type="submit"
              form="edit-assessment-form"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="px-6 py-3 text-white rounded-sm font-semibold flex items-center gap-2 disabled:opacity-50"
              style={{ background: LOGO_BLUE }}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-sm"
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
   ✅ My Questions Picker Modal (Beautiful)
   - NO library
   - Only action is redirect to /questions?attachTo=...&source=my
============================= */

function MyQuestionsAttachModal({
  open,
  onClose,
  onExplore,
  attachedCount,
  plannedCount,
}: {
  open: boolean;
  onClose: () => void;
  onExplore: () => void;
  attachedCount: number;
  plannedCount: number;
}) {
  if (!open) return null;

  const remaining = Math.max(0, plannedCount - attachedCount);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.96, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 10, opacity: 0 }}
        transition={{ type: "spring", damping: 24 }}
        className="relative w-full max-w-xl bg-white rounded-sm shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 text-white bg-gradient-to-r from-[#1B73E8] to-[#1557B0]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-sm bg-white/15 grid place-items-center">
                <User className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="text-xl leading-none">Add questions</div>
                <div className="text-blue-100 text-sm">
                  Choose from <b>Your Question Bank</b> and attach to this assessment.
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-sm hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mini stats */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-sm bg-white/10 p-3">
              <div className="text-xs text-blue-100">Planned</div>
              <div className="text-lg font-semibold">{plannedCount}</div>
            </div>
            <div className="rounded-sm bg-white/10 p-3">
              <div className="text-xs text-blue-100">Attached</div>
              <div className="text-lg font-semibold">{attachedCount}</div>
            </div>
            <div className="rounded-sm bg-white/10 p-3">
              <div className="text-xs text-blue-100">Remaining</div>
              <div className="text-lg font-semibold">{remaining}</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="rounded-sm border border-gray-200 bg-slate-50 p-4">
            <div className="text-[#0D2A5B] font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Recommended flow
            </div>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              <li>• Open <b>My Questions</b></li>
              <li>• Select questions you created (or saved)</li>
              <li>• Click <b>Attach</b> to link them to this assessment</li>
            </ul>
          </div>

          <div className="text-sm text-gray-600">
            Tip: You can search, filter, and bulk attach from the Question Bank.
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-sm border border-gray-200 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={onExplore}
            className="px-4 py-2 rounded-sm text-white inline-flex items-center gap-2"
            style={{ background: LOGO_BLUE }}
          >
            Explore My Questions
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* =============================
   Main Component
============================= */

export default function AssessmentDetails({
  assessmentId,
}: {
  assessmentId: string;
}) {
  const router = useRouter();
  const { token } = useAuth();

  const [assessment, setAssessment] = useState<EmployerAssessment | null>(null);
  const [jobs, setJobs] = useState<CompanyJob[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // questions state
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // ✅ only My Questions modal
  const [showMyQuestionsModal, setShowMyQuestionsModal] = useState(false);

  // drag state (native HTML5 dnd)
  const draggingIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const plannedCount = assessment?.total_questions || 0;
  const attachedCount = assessment?.question_ids?.length || 0;

  const loadOne = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const data = await assessmentService.getOne(token, assessmentId);
      const normalized: EmployerAssessment = {
        ...data,
        extracted_skills: Array.isArray(data.extracted_skills)
          ? data.extracted_skills
          : [],
        question_ids: Array.isArray(data.question_ids) ? data.question_ids : [],
      };
      setAssessment(normalized);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assessment");
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    if (!token) return;
    try {
      const jobsData = await jobService.getMyCompanyJobs(token);
      setJobs(jobsData);
    } catch (e) {
      console.error("Failed to load jobs", e);
    }
  };

  const mapQuestions = (raw: any[]): QuestionRow[] => {
    return raw.map((q: any, idx: number) => ({
      id: q.id ?? q.question_id ?? String(idx),
      title: q.title ?? q.name ?? "Untitled question",
      type: q.type ?? q.category ?? "General",
      time: q.time ?? q.duration ?? q.time_limit ?? null,
      skills: safeArray<string>(q.skillTags ?? q.skills ?? q.tags ?? []),
      score: q.score ?? q.points ?? null,
      difficulty: q.difficulty ?? q.level ?? null,
    }));
  };

  const sortByAssessmentOrder = (rows: QuestionRow[], order: string[]) => {
    const pos = new Map<string, number>();
    order.forEach((id, i) => pos.set(id, i));
    return [...rows].sort((a, b) => {
      const pa = pos.has(a.id) ? pos.get(a.id)! : 999999;
      const pb = pos.has(b.id) ? pos.get(b.id)! : 999999;
      return pa - pb;
    });
  };

  const buildSections = (rows: QuestionRow[]) => {
    const hasSkills = rows.some((q) => (q.skills || []).length > 0);

    if (!hasSkills) {
      return [
        {
          key: assessment?.skill_category || "General",
          label: assessment?.skill_category || "General",
          rows,
          time: null as number | null,
        },
      ];
    }

    // group by first skill tag
    const map = new Map<string, QuestionRow[]>();
    rows.forEach((q) => {
      const key =
        q.skills && q.skills[0]
          ? q.skills[0]
          : assessment?.skill_category || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    });

    return Array.from(map.entries()).map(([key, grouped]) => ({
      key,
      label: key,
      rows: grouped,
      time: null as number | null,
    }));
  };

  const loadQuestions = async () => {
    if (!token || !assessment) return;
    setLoadingQuestions(true);
    setQuestionsError(null);

    try {
      const data = await assessmentService.getQuestions(
        token,
        assessment.assessment_id
      );
      const raw = safeArray<any>(data?.result?.questions);
      let mapped = mapQuestions(raw);

      // ✅ enforce current assessment order
      mapped = sortByAssessmentOrder(mapped, assessment.question_ids || []);
      setQuestions(mapped);

      const sections = buildSections(mapped);
      if (sections.length > 0) {
        setOpenSections((prev) => {
          const firstKey = sections[0].key;
          return Object.keys(prev).length ? prev : { [firstKey]: true };
        });
      }
    } catch (e) {
      console.error(e);
      setQuestionsError("Failed to load questions.");
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    loadOne();
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, assessmentId]);

  useEffect(() => {
    if (!token || !assessment?.assessment_id) return;
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, assessment?.assessment_id]);

  const onDelete = async () => {
    if (!token || !assessment) return;
    if (!confirm(`Delete "${assessment.title}"?`)) return;

    try {
      await assessmentService.remove(token, assessment.assessment_id);
      router.push("/company/dashboard/assessmentManagement");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete assessment");
    }
  };

  const submitEdit = async (payload: any) => {
    if (!token || !assessment) return;
    await assessmentService.update(token, assessment.assessment_id, payload);
    await loadOne();
  };

  const attachQuestions = async () => {
    if (!token || !assessment) return;
    setGenerating(true);
    setQuestionsError(null);

    try {
      await assessmentService.generateQuestions(token, assessment.assessment_id);
      await loadOne();
      await loadQuestions();
    } catch (e) {
      console.error(e);
      setQuestionsError("Failed to attach questions. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const detachQuestion = async (questionId: string) => {
    if (!token || !assessment) return;
    if (!confirm("Remove this question from the assessment?")) return;

    try {
      await assessmentService.detach(token, assessment.assessment_id, questionId);
      await loadOne();
      await loadQuestions();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to detach question");
    }
  };

  const goQuestionDetails = (questionId: string) => {
    router.push(`/company/dashboard/questions/${questionId}`);
  };

  // ✅ mouse-drag reorder
  const reorderLocal = (fromId: string, toId: string) => {
    if (!assessment) return;
    if (fromId === toId) return;

    const current = assessment.question_ids || questions.map((q) => q.id);
    const ids = [...current];

    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from === -1 || to === -1) return;

    ids.splice(from, 1);
    ids.splice(to, 0, fromId);

    setAssessment((prev) => (prev ? { ...prev, question_ids: ids } : prev));

    const qMap = new Map(questions.map((x) => [x.id, x] as const));
    const nextQuestions = ids
      .map((id) => qMap.get(id))
      .filter(Boolean) as QuestionRow[];
    setQuestions(nextQuestions);
  };

  const persistReorder = async (orderedIds: string[]) => {
    if (!token || !assessment) return;
    setReordering(true);
    try {
      await assessmentService.reorder(token, assessment.assessment_id, orderedIds);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reorder");
      await loadOne();
      await loadQuestions();
    } finally {
      setReordering(false);
    }
  };

  const onDragStartRow = (id: string) => (e: React.DragEvent) => {
    draggingIdRef.current = id;
    try {
      e.dataTransfer.setData("text/plain", id);
      e.dataTransfer.effectAllowed = "move";
    } catch {}
  };

  const onDragOverRow = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverId(id);
    try {
      e.dataTransfer.dropEffect = "move";
    } catch {}
  };

  const onDropRow = (id: string) => async (e: React.DragEvent) => {
    e.preventDefault();
    const fromId =
      draggingIdRef.current ||
      (() => {
        try {
          return e.dataTransfer.getData("text/plain");
        } catch {
          return "";
        }
      })();

    draggingIdRef.current = null;
    setDragOverId(null);

    if (!fromId || !assessment) return;

    reorderLocal(fromId, id);

    const base =
      assessment.question_ids && assessment.question_ids.length
        ? [...assessment.question_ids]
        : questions.map((q) => q.id);

    const ids = [...base];
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(id);
    if (from !== -1 && to !== -1) {
      ids.splice(from, 1);
      ids.splice(to, 0, fromId);
      await persistReorder(ids);
      return;
    }

    await persistReorder(uniq(questions.map((q) => q.id)));
  };

  const onDragEnd = () => {
    draggingIdRef.current = null;
    setDragOverId(null);
  };

  // ✅ Add flow: ONLY My Questions
  const openAddQuestions = () => setShowMyQuestionsModal(true);

  const goExploreMyQuestions = () => {
    setShowMyQuestionsModal(false);
    router.push(
      `/company/dashboard/questions?attachTo=${encodeURIComponent(
        assessmentId
      )}&source=my`
    );
  };

  const sections = useMemo(
    () => buildSections(questions),
    [questions, assessment?.skill_category]
  );

  if (!token) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className={`${panel} p-10 text-center max-w-lg`}>
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-sm flex items-center justify-center shadow-lg"
            style={{ background: LOGO_BLUE }}
          >
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl text-[#0D2A5B]">Login required</h2>
          <p className="text-[#334b7a] mt-2">
            Please sign in to view assessment details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${LOGO_BLUE}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #1557B0; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: ${LOGO_BLUE} #f1f5f9; }

        .row-drag-over { outline: 2px solid rgba(27,115,232,0.35); outline-offset: -2px; }
        .grab-handle { cursor: grab; }
        .grab-handle:active { cursor: grabbing; }
      `}</style>

      <AnimatePresence>
        {showEditModal && (
          <AssessmentFormModal
            visible={showEditModal}
            mode="edit"
            assessment={assessment}
            jobs={jobs}
            onClose={() => setShowEditModal(false)}
            onSubmit={submitEdit}
          />
        )}
      </AnimatePresence>

      {/* ✅ Only modal now */}
      <AnimatePresence>
        {assessment && (
          <MyQuestionsAttachModal
            open={showMyQuestionsModal}
            onClose={() => setShowMyQuestionsModal(false)}
            onExplore={goExploreMyQuestions}
            attachedCount={attachedCount}
            plannedCount={plannedCount}
          />
        )}
      </AnimatePresence>

      <div className="py-4">
        <button
          onClick={() => router.push("/company/dashboard/assessmentManagement")}
          className="inline-flex items-center gap-2 text-sm text-[#0D2A5B] hover:text-[#1B73E8]"
        >
          <ChevronLeft className="w-3 h-3" />
          Back to assessments
        </button>
      </div>

      <div className="pb-4 pt-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              className="w-20 h-20 border-4 border-blue-200 rounded-sm"
              style={{ borderTopColor: LOGO_BLUE }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <div className="ml-6">
              <p className="text-gray-900 text-lg">Loading assessment...</p>
              <p className="text-gray-600 text-sm">Fetching assessment details</p>
            </div>
          </div>
        ) : error ? (
          <div className={`${panel} p-8 text-center`}>
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadOne}
              className="text-white px-6 py-2 rounded-lg"
              style={{ background: LOGO_BLUE }}
            >
              Try Again
            </button>
          </div>
        ) : !assessment ? (
          <div className={`${panel} p-8 text-center`}>
            <h3 className="text-xl text-gray-900 mb-2">Assessment not found</h3>
          </div>
        ) : (
          <>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${panel} overflow-hidden`}
            >
              <div className="h-1" />

              <div className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`${pill} ${
                        assessment.status === "ACTIVE"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : assessment.status === "DRAFT"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : assessment.status === "COMPLETED"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {formatEnumNice(assessment.status)}
                    </span>

                    <span className={`${pill} bg-blue-50 text-blue-700 border-blue-200`}>
                      {formatEnumNice(assessment.assessment_type)}
                    </span>

                    <span className={`${pill} bg-slate-50 text-slate-700 border-slate-200`}>
                      {formatEnumNice(assessment.difficulty)}
                    </span>

                    {reordering && (
                      <span className={`${pill} bg-slate-50 text-slate-700 border-slate-200`}>
                        Saving order…
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-4 py-2 rounded-sm border border-gray-200 bg-white hover:bg-gray-50 text-sm flex items-center gap-2"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>

                    <button
                      onClick={() => setShowAnalyticsModal(true)}
                      className="px-4 py-2 rounded-sm text-white text-sm flex items-center gap-2"
                      style={{ background: LOGO_BLUE }}
                    >
                      <BarChart3 className="w-3 h-3" />
                      Analytics
                    </button>

                    <button
                      onClick={onDelete}
                      className="px-4 py-2 rounded-sm border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>

                <h3 className="mt-3 text-xl text-[#0D2A5B]">{assessment.title}</h3>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                  {assessment.job?.title && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      {assessment.job.title}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-500" />
                    {assessment.skill_category || "General"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    {assessment.total_questions} questions · {assessment.time_limit} min · Passing{" "}
                    {assessment.passing_score ?? 70}%
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    Created {new Date(assessment.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Description + Skills */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
              <div className={`lg:col-span-2 ${panel} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-[#0D2A5B]">Description</h4>
                </div>

                <div className="rounded-sm p-4 border border-gray-200 bg-white">
                  <ScrollShadow className="max-h-48 overflow-auto custom-scrollbar">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                      {assessment.description}
                    </p>
                  </ScrollShadow>
                </div>
              </div>

              <div className={`${panel} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-[#0D2A5B]">Skills</h4>
                  <span className="ml-auto px-2 py-1 rounded-sm text-xs bg-emerald-100 text-emerald-700">
                    {(assessment.extracted_skills || []).length}
                  </span>
                </div>

                {!assessment.extracted_skills?.length ? (
                  <div className="rounded-sm p-4 border border-dashed border-gray-300 bg-white text-center">
                    <p className="text-sm text-gray-600">
                      No skills yet. Use Edit to add skills.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {assessment.extracted_skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded-sm text-sm border border-blue-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* QUESTIONS */}
            <div className={`${panel} mt-5 overflow-hidden`}>
              <div className="p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <div className="text-lg text-[#0D2A5B]">Questions</div>
                    <div className="text-sm text-gray-600">
                      Planned: <b>{plannedCount}</b> · Attached now: <b>{attachedCount}</b>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap md:justify-end">
                    <button
                      onClick={openAddQuestions}
                      className="px-4 py-2.5 rounded-sm border border-gray-200 bg-white hover:bg-gray-50 text-sm flex items-center gap-2"
                    >
                      <Plus className="w-3 h-3" />
                      Add questions
                    </button>

                    <button
                      onClick={attachQuestions}
                      disabled={generating}
                      className="px-4 py-2.5 rounded-sm text-white text-sm flex items-center gap-2 disabled:opacity-60"
                      style={{ background: LOGO_BLUE }}
                    >
                      {generating ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-sm"
                        />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      Attach questions
                    </button>

                    <button
                      onClick={loadQuestions}
                      className="px-4 py-2.5 rounded-sm border border-gray-200 bg-white hover:bg-gray-50 text-sm flex items-center gap-2"
                    >
                      <Eye className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>
                </div>

                {questionsError && (
                  <div className="mt-3 rounded-sm border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    {questionsError}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  {loadingQuestions ? (
                    <div className="py-10 text-center text-sm text-gray-600">
                      Loading questions…
                    </div>
                  ) : sections.length === 0 ? (
                    <div className="rounded-sm border border-dashed border-gray-300 bg-white p-6 text-center">
                      <div className="text-sm text-gray-700">No questions attached yet</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Click <b>Add questions</b> to choose from your Question Bank, or{" "}
                        <b>Attach questions</b> to auto-fill.
                      </div>
                    </div>
                  ) : (
                    sections.map((section) => {
                      const isOpen = !!openSections[section.key];
                      const minutesText =
                        section.time !== null ? `${section.time} mins` : "—";

                      return (
                        <div
                          key={section.key}
                          className="rounded-sm border border-gray-200 bg-white overflow-hidden"
                        >
                          {/* Section header */}
                          <button
                            type="button"
                            onClick={() =>
                              setOpenSections((p) => ({
                                ...p,
                                [section.key]: !p[section.key],
                              }))
                            }
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="text-left">
                              <div className="text-[#0D2A5B] font-semibold">
                                {section.label}{" "}
                                <span className="text-gray-400 font-black">
                                  ({section.rows.length})
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">Picks all questions</div>
                            </div>

                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              {minutesText}
                            </div>
                          </button>

                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="border-t border-gray-200"
                              >
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead className="bg-slate-50">
                                      <tr className="text-xs font-black text-gray-500">
                                        <th className="text-left px-4 py-3 w-10"></th>
                                        <th className="text-left px-4 py-3">Question</th>
                                        <th className="text-left px-4 py-3 w-32">Type</th>
                                        <th className="text-left px-4 py-3 w-20">Time</th>
                                        <th className="text-left px-4 py-3">Skills</th>
                                        <th className="text-left px-4 py-3 w-20">Score</th>
                                        <th className="text-right px-4 py-3 w-52">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {section.rows.map((qRow) => {
                                        const isOver = dragOverId === qRow.id;
                                        return (
                                          <tr
                                            key={qRow.id}
                                            className={`hover:bg-slate-50 transition ${
                                              isOver ? "row-drag-over" : ""
                                            }`}
                                            onDragOver={onDragOverRow(qRow.id)}
                                            onDrop={onDropRow(qRow.id)}
                                            onDragEnd={onDragEnd}
                                          >
                                            <td className="px-4 py-3 align-top">
                                              <div
                                                className="inline-flex items-center justify-center rounded-sm border border-gray-200 bg-white w-8 h-8 grab-handle"
                                                title="Drag to reorder"
                                                draggable
                                                onDragStart={onDragStartRow(qRow.id)}
                                              >
                                                <GripVertical className="w-4 h-4 text-gray-400" />
                                              </div>
                                            </td>

                                            <td className="px-4 py-3">
                                              <button
                                                onClick={() => goQuestionDetails(qRow.id)}
                                                className="text-left"
                                              >
                                                <div className="text-[#0D2A5B] font-medium hover:text-blue-700">
                                                  {clampText(qRow.title, 120)}
                                                </div>
                                                {qRow.difficulty ? (
                                                  <div className="text-xs text-gray-500 mt-0.5">
                                                    {String(qRow.difficulty)}
                                                  </div>
                                                ) : null}
                                              </button>
                                            </td>

                                            <td className="px-4 py-3 text-sm text-gray-700">
                                              {qRow.type || "—"}
                                            </td>

                                            <td className="px-4 py-3 text-sm text-gray-700">
                                              {qRow.time ? `${qRow.time}m` : "—"}
                                            </td>

                                            <td className="px-4 py-3">
                                              <div className="flex flex-wrap gap-1.5">
                                                {(qRow.skills || []).slice(0, 4).map((s) => (
                                                  <span
                                                    key={s}
                                                    className="px-2 py-1 rounded-sm text-[11px] font-semibold border border-gray-200 bg-white text-gray-600"
                                                  >
                                                    {s}
                                                  </span>
                                                ))}
                                                {(qRow.skills || []).length > 4 && (
                                                  <span className="px-2 py-1 rounded-sm text-[11px] font-black border border-gray-200 bg-slate-50 text-gray-500">
                                                    +{(qRow.skills || []).length - 4}
                                                  </span>
                                                )}
                                              </div>
                                            </td>

                                            <td className="px-4 py-3 text-sm text-gray-700">
                                              {qRow.score ?? "—"}
                                            </td>

                                            <td className="px-4 py-3">
                                              <div className="flex justify-end gap-2">
                                                <button
                                                  onClick={() => goQuestionDetails(qRow.id)}
                                                  className="px-3 py-2 rounded-sm border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 inline-flex items-center gap-2"
                                                >
                                                  <ExternalLink className="w-4 h-4" />
                                                  Open
                                                </button>

                                                <button
                                                  onClick={() => detachQuestion(qRow.id)}
                                                  className="px-3 py-2 rounded-sm border border-rose-200 bg-rose-50 hover:bg-rose-100 text-sm text-rose-700"
                                                >
                                                  Remove
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showAnalyticsModal && token && assessment && (
                <AssessmentAnalyticsModal
                  token={token}
                  assessment={assessment as any}
                  onClose={() => setShowAnalyticsModal(false)}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
