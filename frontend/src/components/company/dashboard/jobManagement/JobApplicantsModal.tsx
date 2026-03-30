"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  AlertTriangle,
  X,
  MessageSquare,
  ClipboardCheck,
  ExternalLink,
  Ban,
  CheckCircle2,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { useRouter } from "next/navigation";

type JobApplicant = {
  application_id: string;
  candidate_id: string;

  candidate_name: string;
  candidate_headline?: string | null;
  profile_picture_url?: string | null;

  status?: string;
  score?: number | null;
  applied_at?: string | null;
};

type AssessmentOption = {
  assessment_id: string;
  title: string;
  time_limit?: number | null;
  job_id?: string | null;
};

interface JobApplicantsModalProps {
  open: boolean;
  job: {
    job_id: string;
    title: string;
    applications_count?: number;
  } | null;

  token: string | null;
  onClose: () => void;

  onInviteToAssessment?: (applicant: JobApplicant) => void | Promise<void>;
  onChat?: (applicant: JobApplicant) => void | Promise<void>;
  onReject?: (applicant: JobApplicant) => void | Promise<void>;

  getCandidateProfileHref?: (candidateId: string) => string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

/* ---------------- Helpers ---------------- */

const initials = (name: string) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "C";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
};

const statusChip = (status?: string) => {
  const s = (status || "applied").toLowerCase();

  if (["applied", "received"].includes(s))
    return "bg-blue-50 border-blue-100 text-blue-700";
  if (["screening"].includes(s))
    return "bg-indigo-50 border-indigo-100 text-indigo-700";
  if (["shortlisted"].includes(s))
    return "bg-emerald-50 border-emerald-100 text-emerald-700";
  if (["interviewed"].includes(s))
    return "bg-purple-50 border-purple-100 text-purple-700";
  if (["offered", "hired"].includes(s))
    return "bg-green-50 border-green-100 text-green-700";
  if (["rejected"].includes(s))
    return "bg-rose-50 border-rose-100 text-rose-700";

  return "bg-slate-50 border-slate-200 text-slate-700";
};

function toDateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toExpiresAtIsoFromDateInput(dateStr: string) {
  // date input = YYYY-MM-DD (local). We want ISO end-of-day UTC.
  if (!dateStr || !dateStr.trim()) return null;
  return new Date(`${dateStr}T23:59:59.000Z`).toISOString();
}

/* ---------------- API calls (Company) ---------------- */

async function companyPost(token: string, path: string, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json().catch(() => ({}));
}

/**
 * Reject application
 * POST /company/applications/:applicationId/reject
 */
async function rejectApplication(token: string, applicationId: string) {
  return companyPost(token, `/company/applications/${applicationId}/reject`);
}

/**
 * ✅ Invite to assessment
 * POST /company/applications/:applicationId/invite-assessment
 * backend body expects:
 *  {
 *    assessment_id: "...",
 *    expires_at: "..."
 *  }
 */
async function inviteAssessment(
  token: string,
  applicationId: string,
  assessmentId: string,
  expiresAtIso: string | null
) {
  return companyPost(
    token,
    `/company/applications/${applicationId}/invite-assessment`,
    {
      assessment_id: assessmentId,
      expires_at: expiresAtIso,
    }
  );
}

/**
 * ✅ STRICT: List ONLY assessments related to this job
 * Requires backend:
 *   GET /company/jobs/:jobId/assessments
 *
 * No fallback to /employer-assessments
 */
async function listAssessmentsForJob(
  token: string,
  jobId: string
): Promise<AssessmentOption[]> {
  const url = `${API_BASE}/jobs/${jobId}/assessments`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) return [];

  const data = await res.json().catch(() => null);

  const raw: any[] =
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.assessments) && data.assessments) ||
    (Array.isArray(data?.results) && data.results) ||
    (Array.isArray(data) && data) ||
    [];

  const mapped: AssessmentOption[] = raw
    .map((a: any) => ({
      assessment_id: String(
        a.assessment_id ?? a.id ?? a.employer_assessment_id ?? ""
      ),
      title: String(a.title ?? a.name ?? "Untitled assessment"),
      time_limit: a.time_limit ?? a.duration_min ?? a.duration ?? null,
      job_id: a.job_id ?? a.jobId ?? a.job?.job_id ?? null,
      status: String(a.status ?? "").toUpperCase(),
    }))
    .filter((x) => x.assessment_id);

  // Extra safety: if backend includes job_id in returned items, filter it
  const withJob = mapped.some((m) => m.job_id);
  return withJob
    ? mapped.filter((m) => String(m.job_id) === String(jobId))
    : mapped;
}

/* ---------------- Component ---------------- */

const JobApplicantsModal: React.FC<JobApplicantsModalProps> = ({
  open,
  job,
  token,
  onClose,
  onInviteToAssessment,
  onChat,
  onReject,
  getCandidateProfileHref,
}) => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState<Record<string, "invite" | "reject" | null>>(
    {}
  );

  const [toast, setToast] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<JobApplicant | null>(null);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [assessLoading, setAssessLoading] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");

  const [expiresAtDate, setExpiresAtDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toDateInputValue(d);
  });

  const countLabel = useMemo(() => {
    const n = (job?.applications_count ?? applicants.length) || 0;
    return `${n} candidate${n === 1 ? "" : "s"} applied`;
  }, [job?.applications_count, applicants.length]);

  const profileHref = (candidateId: string) =>
    getCandidateProfileHref?.(candidateId) ||
    `/company/dashboard/candidates/${candidateId}`;

  const openProfile = (candidateId: string) => {
    router.push(profileHref(candidateId));
  };

  // auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // load applicants
  useEffect(() => {
    if (!open || !job || !token) return;

    const loadApplicants = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/jobs/${job.job_id}/applicants`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const data = await res.json();
        const raw: any[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : [];

        const mapped: JobApplicant[] = raw.map((a: any) => {
          const candidateId = String(
            a.candidate_id ??
              a.candidate?.user_id ??
              a.user_id ??
              a.user?.user_id ??
              a.id ??
              ""
          );

          const fullName = String(
            a.candidate_name ??
              a.candidate?.full_name ??
              a.user?.full_name ??
              a.full_name ??
              `${String(a.first_name ?? "").trim()} ${String(
                a.last_name ?? ""
              ).trim()}`.trim() ??
              "Unnamed candidate"
          );

          const safeName =
            fullName.trim().length > 0 ? fullName : "Unnamed candidate";

          const headline =
            (a.candidate?.candidateProfile?.headline ??
              a.candidateProfile?.headline ??
              a.candidate?.position ??
              a.position ??
              a.headline ??
              null) as string | null;

          const picture =
            (a.candidate?.candidateProfile?.profile_picture_url ??
              a.candidateProfile?.profile_picture_url ??
              a.profile_picture_url ??
              null) as string | null;

          return {
            application_id: String(a.application_id ?? a.id ?? candidateId),
            candidate_id: candidateId,
            candidate_name: safeName,
            candidate_headline: headline,
            profile_picture_url: picture,
            status: a.status ?? a.stage ?? "applied",
            score: a.score ?? a.match_score ?? a.assessment_score ?? null,
            applied_at: a.applied_at ?? a.created_at ?? null,
          };
        });

        setApplicants(mapped);
      } catch (err) {
        console.error("Failed to load applicants:", err);
        setError("Failed to load applicants for this job.");
      } finally {
        setLoading(false);
      }
    };

    loadApplicants();
  }, [open, job?.job_id, token]);

  // open invite modal + load job assessments
  const openInvite = async (app: JobApplicant) => {
    if (!token || !job) return;

    setInviteTarget(app);
    setInviteOpen(true);
    setAssessLoading(true);
    setAssessments([]);
    setSelectedAssessmentId("");

    try {
      const list = await listAssessmentsForJob(token, job.job_id);
      setAssessments(list);
      if (list[0]?.assessment_id) setSelectedAssessmentId(list[0].assessment_id);
    } catch (e) {
      console.error(e);
      setAssessments([]);
    } finally {
      setAssessLoading(false);
    }
  };

  const closeInvite = () => {
    setInviteOpen(false);
    setInviteTarget(null);
  };

  // ACTION: Reject
  const doReject = async (app: JobApplicant) => {
    if (!token) return;

    const ok = window.confirm(
      `Reject ${app.candidate_name}? This will remove the application.`
    );
    if (!ok) return;

    if (onReject) {
      await onReject(app);
      setApplicants((prev) =>
        prev.filter((x) => x.application_id !== app.application_id)
      );
      setToast("Application rejected ✅");
      return;
    }

    setBusy((p) => ({ ...p, [app.application_id]: "reject" }));
    try {
      await rejectApplication(token, app.application_id);
      setApplicants((prev) =>
        prev.filter((x) => x.application_id !== app.application_id)
      );
      setToast("Application rejected ✅");
    } catch (e) {
      console.error(e);
      alert("Failed to reject application. Check backend logs.");
    } finally {
      setBusy((p) => ({ ...p, [app.application_id]: null }));
    }
  };

  // ACTION: Invite (send)
  const doSendInvite = async () => {
    if (!token || !inviteTarget) return;
    if (!selectedAssessmentId) {
      alert("Please select an assessment.");
      return;
    }

    // if parent wants to override sending, keep that option
    if (onInviteToAssessment) {
      await onInviteToAssessment(inviteTarget);
      closeInvite();
      setToast("Invitation sent ✅");
      return;
    }

    const expiresIso = toExpiresAtIsoFromDateInput(expiresAtDate);

    setBusy((p) => ({ ...p, [inviteTarget.application_id]: "invite" }));
    try {
      await inviteAssessment(
        token,
        inviteTarget.application_id,
        selectedAssessmentId,
        expiresIso
      );
      closeInvite();
      setToast("Invitation sent ✅");
    } catch (e) {
      console.error(e);
      alert("Failed to send invitation. Check backend logs + payload fields.");
    } finally {
      setBusy((p) => ({ ...p, [inviteTarget.application_id]: null }));
    }
  };

  if (!open || !job) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[11000] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="fixed top-5 left-1/2 -translate-x-1/2 z-[12000] rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 shadow-lg flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {toast}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ scale: 0.95, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 24, opacity: 0 }}
            transition={{ type: "spring", damping: 22 }}
            className="relative w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-3xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.55)] border border-slate-200/80"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] px-6 py-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 shadow-inner">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold tracking-wide truncate">
                      Applicants for {job.title}
                    </h2>
                    <p className="text-[11px] text-blue-100/90">{countLabel}</p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-white/15 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="bg-slate-50/60 px-5 py-4 max-h-[72vh] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-600 gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent"
                  />
                  Loading applicants...
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ) : applicants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-600">
                  No applicants yet for this job.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-[12px] text-slate-600 px-1">
                    Tip: click a candidate to view the profile (chat, invite to
                    assessment, or reject).
                  </div>

                  {applicants.map((a) => {
                    const isInviting = busy[a.application_id] === "invite";
                    const isRejecting = busy[a.application_id] === "reject";
                    const disabled = isInviting || isRejecting;

                    return (
                      <motion.div
                        key={a.application_id}
                        whileHover={{ y: -2 }}
                        className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                      >
                        <div className="px-4 py-4 flex items-center justify-between gap-3">
                          {/* Left clickable profile area */}
                          <button
                            type="button"
                            onClick={() => openProfile(a.candidate_id)}
                            className="flex items-center gap-3 text-left min-w-0 hover:opacity-95 transition"
                          >
                            {/* Avatar */}
                            {a.profile_picture_url ? (
                              <img
                                src={a.profile_picture_url}
                                alt={a.candidate_name}
                                className="h-12 w-12 rounded-2xl object-cover border border-slate-200 flex-shrink-0"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-blue-700 font-black">
                                  {initials(a.candidate_name)}
                                </span>
                              </div>
                            )}

                            {/* Name + headline */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-slate-900 truncate">
                                  {a.candidate_name}
                                </span>

                                <span
                                  className={`inline-flex items-center rounded-full border text-[11px] px-2 py-0.5 font-semibold ${statusChip(
                                    a.status
                                  )}`}
                                >
                                  {a.status}
                                </span>

                                {a.score != null && (
                                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 text-[11px] px-2 py-0.5 text-slate-700 font-semibold">
                                    Score: {Math.round(a.score)}%
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-600 mt-0.5 truncate">
                                {a.candidate_headline || "No headline provided"}
                              </div>

                              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Click to view profile</span>

                                {a.applied_at ? (
                                  <>
                                    <span className="opacity-40">•</span>
                                    <span>
                                      Applied{" "}
                                      {new Date(
                                        a.applied_at
                                      ).toLocaleDateString()}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </button>

                          {/* Right actions */}
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openInvite(a);
                              }}
                              disabled={disabled}
                              className={`px-3 py-2 rounded-xl text-sm font-semibold border flex items-center gap-2 ${
                                disabled
                                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                  : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                              }`}
                            >
                              {isInviting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ClipboardCheck className="h-4 w-4" />
                              )}
                              Invite
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onChat?.(a);
                              }}
                              disabled={!onChat || disabled}
                              className={`px-3 py-2 rounded-xl text-sm font-semibold border flex items-center gap-2 ${
                                !onChat || disabled
                                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                  : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <MessageSquare className="h-4 w-4" />
                              Chat
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                doReject(a);
                              }}
                              disabled={disabled}
                              className={`px-3 py-2 rounded-xl text-sm font-semibold border flex items-center gap-2 ${
                                disabled
                                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              }`}
                            >
                              {isRejecting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                              Reject
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* Invite Modal */}
          <AnimatePresence>
            {inviteOpen && (
              <motion.div
                className="fixed inset-0 z-[12000] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                  onClick={closeInvite}
                />
                <motion.div
                  initial={{ scale: 0.96, y: 20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.96, y: 20, opacity: 0 }}
                  transition={{ type: "spring", damping: 22 }}
                  className="relative w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-[0_24px_80px_rgba(15,23,42,0.45)] overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-[#1B73E8] to-[#1557B0] px-6 py-4 text-white">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">
                          Invite to assessment
                        </div>
                        <div className="text-[12px] text-blue-100/90 truncate">
                          {inviteTarget?.candidate_name} • {job.title}
                        </div>
                      </div>
                      <button
                        onClick={closeInvite}
                        className="rounded-full p-2 hover:bg-white/15 transition-colors"
                        aria-label="Close invite modal"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {assessLoading ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading assessments…
                      </div>
                    ) : assessments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                        No assessments linked to this job.
                        <div className="text-xs text-slate-500 mt-1">
                          Link an assessment to this job, then retry.
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Choose assessment (job-related only)
                          </label>
                          <select
                            value={selectedAssessmentId}
                            onChange={(e) =>
                              setSelectedAssessmentId(e.target.value)
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {assessments.map((a) => (
                              <option
                                key={a.assessment_id}
                                value={a.assessment_id}
                              >
                                {a.title}
                                {a.time_limit ? ` • ${a.time_limit} min` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Expire at
                          </label>
                          <div className="relative">
                            <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              type="date"
                              value={expiresAtDate}
                              onChange={(e) => setExpiresAtDate(e.target.value)}
                              className="w-full pl-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Candidate can accept before this date.
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            onClick={closeInvite}
                            className="px-4 py-2 rounded-2xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={doSendInvite}
                            disabled={
                              !selectedAssessmentId ||
                              busy[inviteTarget?.application_id || ""] ===
                                "invite"
                            }
                            className="px-4 py-2 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {busy[inviteTarget?.application_id || ""] ===
                            "invite" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ClipboardCheck className="h-4 w-4" />
                            )}
                            Send invite
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JobApplicantsModal;
