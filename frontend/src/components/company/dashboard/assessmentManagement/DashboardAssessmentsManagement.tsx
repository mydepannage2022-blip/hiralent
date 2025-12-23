"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Calendar,
  Building,
  Users,
  Sparkles,
  Shield,
  AlertTriangle,
  FileText,
  Tag,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  CheckCircle2,
  ClipboardList,
  Wand2,
  Layers,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../context/AuthContext";

// ✅ NEW wizard modal (same style as job creation)
import CreateAssessmentWizardModal from "./CreateAssessmentWizardModal";

/* =============================
   Types
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

  candidate_count?: number;
  completed_count?: number;
  to_evaluate_count?: number;

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
   Helpers & Styles
============================= */

const LOGO_BLUE = "#1B73E8";

const panel =
  "rounded-2xl border border-gray-200 bg-white shadow-[0_10px_30px_rgba(16,24,40,0.06)]";

const softInput =
  "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400";

const softSelect =
  "px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900";

function formatEnumNice(v?: string) {
  if (!v) return "";
  return v
    .toLowerCase()
    .split("_")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function getCompletedToEvaluateCounts(a: EmployerAssessment) {
  const completed =
    a.completed_count ??
    a.enhanced_data?.stats?.completed ??
    a.settings?.stats?.completed ??
    0;

  const toEvaluate =
    a.to_evaluate_count ??
    a.enhanced_data?.stats?.toEvaluate ??
    a.settings?.stats?.toEvaluate ??
    0;

  return {
    completed: Number(completed) || 0,
    toEvaluate: Number(toEvaluate) || 0,
  };
}

function typeChipStyle(t: AssessmentType) {
  switch (t) {
    case "QUICK_CHECK":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "COMPREHENSIVE":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "CERTIFICATION":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "COMPANY_SPECIFIC":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

function difficultyChipStyle(d: DifficultyLevel) {
  switch (d) {
    case "BEGINNER":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "INTERMEDIATE":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "ADVANCED":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "EXPERT":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

function generatedChipStyle(m: AssessmentCreationMethod) {
  switch (m) {
    case "JOB_DESCRIPTION_PARSE":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "CHATBOT_GUIDED":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "MANUAL":
      return "border-gray-200 bg-gray-50 text-gray-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

const chipBase =
  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border";

function truncateWithEllipsis(text: string, maxChars: number) {
  const clean = (text || "").trim();
  if (clean.length <= maxChars) return { short: clean, isTruncated: false };
  return { short: clean.slice(0, maxChars).trimEnd() + "…", isTruncated: true };
}

/* =============================
   Pagination
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
   API Service
============================= */

const assessmentService = {
  async list(token: string) {
    const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";
    const response = await fetch(`${API_BASE}/employer-assessments`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async create(token: string, payload: any) {
    const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";
    const response = await fetch(`${API_BASE}/employer-assessments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
};

const jobService = {
  async getMyCompanyJobs(token: string): Promise<CompanyJob[]> {
    const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";
    const response = await fetch(`${API_BASE}/jobs/company/my-jobs`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error(await response.text());

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

type SortOrder = "LATEST" | "OLDEST";

const AssessmentsManagement: React.FC = () => {
  const router = useRouter();
  const { token } = useAuth();

  const [assessments, setAssessments] = useState<EmployerAssessment[]>([]);
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");
  const [generatedByFilter, setGeneratedByFilter] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<SortOrder>("LATEST");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  // ✅ new wizard modal state
  const [wizardOpen, setWizardOpen] = useState(false);

  // ✅ description “see more”
  const [expandedDescIds, setExpandedDescIds] = useState<Record<string, boolean>>({});

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

      let list: EmployerAssessment[] = [];
      if (Array.isArray(assessRaw)) list = assessRaw;
      else if (Array.isArray(assessRaw.data)) list = assessRaw.data;
      else if (Array.isArray(assessRaw.assessments)) list = assessRaw.assessments;
      else if (assessRaw.success && Array.isArray(assessRaw.result)) list = assessRaw.result;
      else if (assessRaw.success === false) throw new Error(assessRaw.message || "Failed to load assessments");
      else throw new Error("Unexpected assessments response shape");

      const normalizedList: EmployerAssessment[] = list.map((a: any) => ({
        ...a,
        extracted_skills: Array.isArray(a.extracted_skills) ? a.extracted_skills : [],
        question_ids: Array.isArray(a.question_ids) ? a.question_ids : [],
      }));

      setAssessments(normalizedList);
      setJobs(jobsData);
    } catch (err) {
      console.error("Error loading assessments:", err);
      setError(err instanceof Error ? err.message : "An error occurred while loading assessments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadAll();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const submitAssessment = async (payload: any) => {
    if (!token) return;
    try {
      await assessmentService.create(token, payload);
      await loadAll();
      setWizardOpen(false);
    } catch (err) {
      console.error(err);
      setError("Failed to create assessment");
    }
  };

  const filteredAssessments = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    const filtered = assessments.filter((a) => {
      const matchesSearch =
        !term ||
        a.title.toLowerCase().includes(term) ||
        (a.job?.title?.toLowerCase() ?? "").includes(term) ||
        (a.skill_category?.toLowerCase() ?? "").includes(term) ||
        (a.extracted_skills || []).some((s) => (s || "").toLowerCase().includes(term));

      const matchesType = typeFilter === "ALL" || a.assessment_type === typeFilter;
      const matchesDifficulty = difficultyFilter === "ALL" || a.difficulty === difficultyFilter;
      const matchesGenerated = generatedByFilter === "ALL" || a.creation_method === (generatedByFilter as any);

      return matchesSearch && matchesType && matchesDifficulty && matchesGenerated;
    });

    return [...filtered].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortOrder === "LATEST" ? db - da : da - db;
    });
  }, [assessments, searchTerm, typeFilter, difficultyFilter, generatedByFilter, sortOrder]);

  const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage);
  const paginatedAssessments = filteredAssessments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, difficultyFilter, generatedByFilter, sortOrder]);

  const stats = useMemo(
    () => ({
      total: assessments.length,
      active: assessments.filter((a) => a.status === "ACTIVE").length,
      draft: assessments.filter((a) => a.status === "DRAFT").length,
      candidates: assessments.reduce((acc, a) => acc + (a.candidate_count || 0), 0),
    }),
    [assessments]
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-600 flex items-center justify-center shadow-sm">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Login required</h2>
          <p className="text-gray-600 mt-2">Please sign in to manage your assessments.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ✅ wizard modal */}
      <CreateAssessmentWizardModal
        open={wizardOpen}
        jobs={jobs}
        onClose={() => setWizardOpen(false)}
        onSubmit={submitAssessment}
      />

      <div className="w-full px-4 sm:px-6 py-6">
        {/* Analytics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-[#1B73E8]" },
            { label: "Active", value: stats.active, color: "text-emerald-600" },
            { label: "Draft", value: stats.draft, color: "text-amber-600" },
            { label: "Candidates", value: stats.candidates, color: "text-indigo-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 font-semibold">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters toolbar */}
        <div className={`${panel} p-4 mt-4`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by title, skills, or description…"
                className={softInput + " pl-10"}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="min-w-[180px]">
              <select className={softSelect + " w-full"} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="ALL">All Types</option>
                <option value="QUICK_CHECK">Quick check</option>
                <option value="COMPREHENSIVE">Comprehensive</option>
                <option value="CERTIFICATION">Certification</option>
                <option value="COMPANY_SPECIFIC">Company-specific</option>
              </select>
            </div>

            <div className="min-w-[180px]">
              <select
                className={softSelect + " w-full"}
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                <option value="ALL">All Difficulty</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>

            <div className="min-w-[220px]">
              <select
                className={softSelect + " w-full"}
                value={generatedByFilter}
                onChange={(e) => setGeneratedByFilter(e.target.value)}
              >
                <option value="ALL">Generated: All</option>
                <option value="MANUAL">Manual</option>
                <option value="JOB_DESCRIPTION_PARSE">From Job Description</option>
                <option value="CHATBOT_GUIDED">Chatbot Guided</option>
              </select>
            </div>

            <div className="min-w-[160px]">
              <select className={softSelect + " w-full"} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)}>
                <option value="LATEST">Latest</option>
                <option value="OLDEST">Oldest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-5">
          {loading ? (
            <motion.div className="flex items-center justify-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                <p className="text-gray-900 font-bold text-lg">Loading assessments…</p>
                <p className="text-gray-500 text-sm">Fetching your assessment library</p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={`${panel} p-8 text-center`}>
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Assessments</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button onClick={loadAll} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold">
                Retry
              </button>
            </motion.div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedAssessments.map((assessment, idx) => {
                  const { completed, toEvaluate } = getCompletedToEvaluateCounts(assessment);

                  const descExpanded = !!expandedDescIds[assessment.assessment_id];
                  const { short, isTruncated } = truncateWithEllipsis(assessment.description || "", 170);

                  return (
                    <motion.div
                      key={assessment.assessment_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      whileHover={{ y: -2 }}
                      onClick={() => router.push(`/company/dashboard/assessmentManagement/${assessment.assessment_id}`)}
                      className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 cursor-pointer hover:border-blue-200 hover:shadow-[0_12px_30px_rgba(16,24,40,0.08)] transition-all"
                    >
                      {/* ✅ accent using your logo blue */}
<div
  className="absolute inset-x-0 top-0 h-1"
  style={{ backgroundColor: "#1B73E8" }}
/>

                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className={`${chipBase} ${typeChipStyle(assessment.assessment_type)}`}>
                              <Layers className="w-3.5 h-3.5" />
                              {formatEnumNice(assessment.assessment_type)}
                            </span>

                            <span className={`${chipBase} ${difficultyChipStyle(assessment.difficulty)}`}>
                              {formatEnumNice(assessment.difficulty)}
                            </span>

                            <span className={`${chipBase} ${generatedChipStyle(assessment.creation_method)}`}>
                              {assessment.creation_method !== "MANUAL" ? <Wand2 className="w-3.5 h-3.5" /> : null}
                              {formatEnumNice(assessment.creation_method)}
                            </span>

                            <span className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {new Date(assessment.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="text-[16px] md:text-[17px] font-extrabold text-gray-900 leading-snug truncate" title={assessment.title}>
                            {assessment.title}
                          </h3>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                            {assessment.job?.title && (
                              <div className="flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                <span className="truncate">{assessment.job.title}</span>
                              </div>
                            )}
                            {assessment.skill_category && (
                              <div className="flex items-center gap-1">
                                <Tag className="w-4 h-4" />
                                <span className="truncate">{assessment.skill_category}</span>
                              </div>
                            )}
                          </div>

                          {/* ✅ description with see more */}
                          <div className="mt-2 text-sm text-gray-600">
                            <span>{descExpanded ? assessment.description : short}</span>
                            {isTruncated && (
                              <button
                                className="ml-2 text-[12px] font-bold"
                                style={{ color: LOGO_BLUE }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setExpandedDescIds((p) => ({
                                    ...p,
                                    [assessment.assessment_id]: !p[assessment.assessment_id],
                                  }));
                                }}
                              >
                                {descExpanded ? "See less" : "See more"}
                              </button>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                            <span className="font-medium text-gray-700">
                              {assessment.total_questions} Q · {assessment.time_limit} min
                            </span>

                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {assessment.candidate_count ? `${assessment.candidate_count} candidates` : "No candidates yet"}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex gap-2 lg:flex-col lg:items-end">
                          <div className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center gap-2 min-w-[150px]">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            <div className="leading-tight">
                              <div className="text-[10px] font-bold text-emerald-700/80">Completed</div>
                              <div className="text-[15px] font-black text-gray-900">{completed}</div>
                            </div>
                          </div>

                          <div className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 flex items-center gap-2 min-w-[150px]">
                            <ClipboardList className="w-4 h-4 text-amber-700" />
                            <div className="leading-tight">
                              <div className="text-[10px] font-bold text-amber-700/80">To Evaluate</div>
                              <div className="text-[15px] font-black text-gray-900">{toEvaluate}</div>
                            </div>
                          </div>

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
                totalItems={filteredAssessments.length}
                itemsPerPage={itemsPerPage}
              />

              {filteredAssessments.length === 0 && !loading && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={`${panel} p-14 text-center mt-5`}>
                  <div className="w-20 h-20 rounded-3xl border flex items-center justify-center mx-auto mb-4" style={{ background: "#EAF2FE", borderColor: "#CFE2FF" }}>
                    <FileText className="w-9 h-9" style={{ color: LOGO_BLUE }} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">No assessments found</h3>
                  <p className="text-gray-600 mb-5">Try adjusting filters or create your first assessment.</p>
                  <button
                    onClick={() => setWizardOpen(true)}
                    className="text-white px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 shadow-sm"
                    style={{ background: LOGO_BLUE }}
                  >
                    <Plus size={20} />
                    Create Assessment
                  </button>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* ✅ ONLY New Assessment button (bottom) */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setWizardOpen(true)}
          className="fixed bottom-6 right-6 text-white px-5 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 text-sm font-semibold"
          style={{ background: LOGO_BLUE, boxShadow: "0 20px 50px rgba(27,115,232,0.25)" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Plus className="w-4 h-4" />
          New Assessment
        </motion.button>
      </div>
    </div>
  );
};

export default AssessmentsManagement;
