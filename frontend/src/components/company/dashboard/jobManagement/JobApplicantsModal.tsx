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

                  {applicants.map((a) => (
                    <motion.div
                      key={a.application_id}
                      whileHover={{ y: -2 }}
                      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                    >
                      {/* ✅ ONE ROW: left profile / right actions */}
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
                                    {new Date(a.applied_at).toLocaleDateString()}
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
                              onInviteToAssessment?.(a);
                            }}
                            disabled={!onInviteToAssessment}
                            className={`px-3 py-2 rounded-xl text-sm font-semibold border flex items-center gap-2 ${
                              onInviteToAssessment
                                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            }`}
                          >
                            <ClipboardCheck className="h-4 w-4" />
                            Invite
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onChat?.(a);
                            }}
                            disabled={!onChat}
                            className={`px-3 py-2 rounded-xl text-sm font-semibold border flex items-center gap-2 ${
                              onChat
                                ? "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            }`}
                          >
                            <MessageSquare className="h-4 w-4" />
                            Chat
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReject?.(a);
                            }}
                            disabled={!onReject}
                            className={`px-3 py-2 rounded-xl text-sm font-semibold border flex items-center gap-2 ${
                              onReject
                                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            }`}
                          >
                            <Ban className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JobApplicantsModal;
