"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Tag,
  Clock,
  Layers,
  BarChart3,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";

import type {
  AssessmentTemplateListItemDTO,
  AssessmentType,
  DifficultyLevel,
} from "@/src/types/assessmentManagement.types";

import { AssessmentTemplatesAPI } from "@/src/lib/company/assessmentTemplates.api";
import AttachTemplateToJobModal from "@/src/components/company/dashboard/assessmentManagement/templates/AttachTemplateToJobModal";

type CompanyJob = { job_id: string; title: string; department: string | null };

const LOGO_BLUE = "#1B73E8";

// UI pagination (client-side, after loading ALL)
const UI_PAGE_SIZE = 10;

function formatEnumNice(v?: string) {
  if (!v) return "";
  return v
    .toLowerCase()
    .split("_")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

async function getMyCompanyJobs(token: string): Promise<CompanyJob[]> {
  const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";
  const res = await fetch(`${API_BASE}/jobs/company/my-jobs`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();

  const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return arr.map((j: any) => ({
    job_id: j.job_id,
    title: j.title,
    department: j.department ?? null,
  }));
}

/**
 * ✅ Fetch ALL templates from backend pagination.
 * Expected response: { items, page, limit, total }
 * If backend doesn't support pagination, it will still work with page 1 only.
 */
async function fetchAllTemplates(token: string) {
  const all: AssessmentTemplateListItemDTO[] = [];

  // Try with server-side pagination
  // We call the API multiple times by temporarily extending list() behavior via querystring
  // because your current AssessmentTemplatesAPI.list(token) has no params.
  const API_BASE_RAW =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";
  const API_BASE = API_BASE_RAW.endsWith("/api/v1") ? API_BASE_RAW : `${API_BASE_RAW}/api/v1`;

  const LIMIT = 50; // good tradeoff

  let page = 1;
  let safety = 0;

  while (true) {
    safety++;
    if (safety > 50) break; // safety guard (avoid infinite loop)

    const res = await fetch(
      `${API_BASE}/assessment-templates?page=${page}&limit=${LIMIT}`,
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();

    // supports ApiOk wrapper OR raw pagination
    const result = data?.result ?? data;

    const items = Array.isArray(result?.items) ? result.items : [];
    const total = typeof result?.total === "number" ? result.total : null;
    const serverPage = typeof result?.page === "number" ? result.page : page;
    const serverLimit = typeof result?.limit === "number" ? result.limit : LIMIT;

    all.push(...items);

    // stop conditions
    if (!items.length) break;

    // If total is known, stop when we got everything
    if (typeof total === "number" && all.length >= total) break;

    // If backend doesn't paginate and always returns the same set, we detect it:
    // if items < limit, it is probably last page.
    if (items.length < serverLimit) break;

    page = serverPage + 1;
  }

  return all;
}

export default function TemplatesLibraryPage() {
  const router = useRouter();
  const { token } = useAuth();

  const [templates, setTemplates] = useState<AssessmentTemplateListItemDTO[]>([]);
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | AssessmentType>("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<"ALL" | DifficultyLevel>("ALL");

  // attach modal
  const [attachOpen, setAttachOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<AssessmentTemplateListItemDTO | null>(null);

  // UI pagination state
  const [uiPage, setUiPage] = useState(1);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);

    try {
      const [allTemplates, js] = await Promise.all([
        fetchAllTemplates(token),
        getMyCompanyJobs(token),
      ]);

      setTemplates(Array.isArray(allTemplates) ? allTemplates : []);
      setJobs(js);
      setUiPage(1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load templates");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return templates.filter((t) => {
      const matchesSearch =
        !term ||
        (t.title ?? "").toLowerCase().includes(term) ||
        (t.skill_category ?? "").toLowerCase().includes(term) ||
        (t.extracted_skills ?? []).some((s) => (s || "").toLowerCase().includes(term)) ||
        (t.tags ?? []).some((s) => (s || "").toLowerCase().includes(term));

      const matchesType = typeFilter === "ALL" || t.assessment_type === typeFilter;
      const matchesDiff = difficultyFilter === "ALL" || t.difficulty === difficultyFilter;

      return matchesSearch && matchesType && matchesDiff;
    });
  }, [templates, search, typeFilter, difficultyFilter]);

  // reset page when filters change
  useEffect(() => {
    setUiPage(1);
  }, [search, typeFilter, difficultyFilter]);

  const totalUiPages = Math.max(1, Math.ceil(filtered.length / UI_PAGE_SIZE));
  const uiItems = useMemo(() => {
    const start = (uiPage - 1) * UI_PAGE_SIZE;
    return filtered.slice(start, start + UI_PAGE_SIZE);
  }, [filtered, uiPage]);

  const openAttach = (tpl: AssessmentTemplateListItemDTO) => {
    setSelectedTemplate(tpl);
    setAttachOpen(true);
  };

  const confirmAttach = async (job_id: string) => {
    if (!token || !selectedTemplate) return;

    const resp: any = await AssessmentTemplatesAPI.createFromTemplate(token, {
      template_id: selectedTemplate.template_id,
      job_id,
    });

    const assessment_id =
      resp?.result?.assessment_id ?? resp?.assessment_id ?? resp?.data?.assessment_id;

    if (!assessment_id) throw new Error("Backend did not return assessment_id");

    router.push(`/company/dashboard/assessmentManagement/${assessment_id}`);
  };

  if (!token) {
    return (
      <div className="min-h-screen grid place-items-center text-gray-700">
        Please sign in.
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AttachTemplateToJobModal
        open={attachOpen}
        jobs={jobs}
        templateTitle={selectedTemplate?.title ?? "Template"}
        onClose={() => setAttachOpen(false)}
        onConfirm={confirmAttach}
      />

      <div className="mt-4 rounded-sm border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              className="w-full px-4 py-2.5 pl-10 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
              placeholder="Search templates by title, skills, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="px-4 py-2.5 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 min-w-[180px]"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="ALL">All Types</option>
            <option value="QUICK_CHECK">Quick check</option>
            <option value="COMPREHENSIVE">Comprehensive</option>
            <option value="CERTIFICATION">Certification</option>
            <option value="COMPANY_SPECIFIC">Company-specific</option>
          </select>

          <select
            className="px-4 py-2.5 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 min-w-[180px]"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as any)}
          >
            <option value="ALL">All Difficulty</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
            <option value="EXPERT">Expert</option>
          </select>

          <button
            onClick={() => router.push("/company/dashboard/assessmentManagement")}
            className="px-4 py-2.5 rounded-sm border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-800"
          >
            Back to Assessments
          </button>
        </div>

        {/* ✅ count */}
        <div className="mt-3 text-xs text-gray-500">
          Showing <span className="font-semibold text-gray-700">{filtered.length}</span>{" "}
          template(s) {templates.length ? `(loaded ${templates.length} total)` : ""}
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="py-16 text-center text-gray-600">Loading templates…</div>
        ) : err ? (
          <div className="rounded-sm border border-red-200 bg-red-50 p-6 text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 mt-0.5" />
            <div>
              <div className="font-bold">Failed to load templates</div>
              <div className="text-sm">{err}</div>
              <button
                onClick={load}
                className="mt-3 px-4 py-2 rounded-sm bg-red-600 text-white font-semibold"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {uiItems.map((t, idx) => (
              <motion.div
                key={t.template_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="rounded-sm border border-gray-200 bg-white p-5 hover:shadow-[0_12px_30px_rgba(16,24,40,0.08)] transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[11px] px-3 py-1 rounded-sm border text-blue-700">
                        {formatEnumNice(t.assessment_type)}
                      </span>
                      <span className="text-[11px] px-3 py-1 rounded-sm border text-gray-700">
                        {formatEnumNice(t.difficulty)}
                      </span>
                    </div>

                    <div className="text-[16px] font-bold text-gray-900 truncate" title={t.title}>
                      {t.title}
                    </div>

                    <div className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {t.description}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {t.time_limit} min
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" /> {t.total_questions} questions
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <BarChart3 className="w-3.5 h-3.5" /> Passing: {t.passing_score ?? "—"}%
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" /> {t.skill_category}
                      </span>
                    </div>

                    {(t.extracted_skills?.length ?? 0) > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {t.extracted_skills.slice(0, 8).map((s) => (
                          <span
                            key={s}
                            className="text-[11px] px-2.5 py-1 rounded-sm border bg-gray-50 text-gray-700"
                          >
                            {s}
                          </span>
                        ))}
                        {t.extracted_skills.length > 8 && (
                          <span className="text-[11px] px-2.5 py-1 rounded-sm border bg-white text-gray-500">
                            +{t.extracted_skills.length - 8} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

<div className="shrink-0 flex flex-col justify-center pt-10">
  <button
    onClick={() => openAttach(t)}
    className="px-4 py-2.5 rounded-sm text-white font-semibold"
    style={{ background: LOGO_BLUE }}
    title="Use this template to customize it."
  >
    Use this template
  </button>
</div>

                </div>
              </motion.div>
            ))}

            {filtered.length === 0 && (
              <div className="rounded-sm border border-gray-200 bg-white p-10 text-center text-gray-600">
                No templates found. Try different filters.
              </div>
            )}

            {/* ✅ Pagination UI */}
            {filtered.length > UI_PAGE_SIZE && (
              <div className="flex items-center justify-between rounded-sm border border-gray-200 bg-white px-4 py-3">
                <div className="text-sm text-gray-600">
                  Page <span className="font-semibold text-gray-800">{uiPage}</span> /{" "}
                  <span className="font-semibold text-gray-800">{totalUiPages}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={uiPage <= 1}
                    onClick={() => setUiPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>

                  <button
                    disabled={uiPage >= totalUiPages}
                    onClick={() => setUiPage((p) => Math.min(totalUiPages, p + 1))}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
