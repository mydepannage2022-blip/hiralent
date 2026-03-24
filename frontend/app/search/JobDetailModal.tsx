"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, DollarSign, Calendar, Globe, Clock,
  CheckCircle2, AlertCircle, Loader2, Lock, ArrowRight,
  Briefcase, ChevronRight, Sparkles, Building2, UserCircle2,
} from "lucide-react";
import Link from "next/link";
import { useCandidateJobEligibility } from "@/src/lib/candidate/jobs.queries";
import { useMyApplicationsList } from "@/src/lib/candidate/applications.queries";
import ApplyModal from "@/src/components/candidate/dashboard/jobs/ApplyModal";
import type { JobSearchResult } from "@/src/types/search.types";

const JOB_TYPE_LABEL: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  internship: "Internship",
};

const EXP_LABEL: Record<string, string> = {
  entry: "Entry Level",
  mid: "Mid Level",
  senior: "Senior",
  executive: "Executive",
};

function relDate(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* ─────────────────────────────────────────────────────────────
   Not Eligible Panel
───────────────────────────────────────────────────────────── */
function NotEligiblePanel({ reasons }: { reasons: string[] }) {
  const missingSkills = reasons
    .filter(r => r.startsWith("MISSING_SKILL:"))
    .map(r => r.split(":")[1]?.trim())
    .filter(Boolean) as string[];

  const otherReasons = reasons.filter(r => !r.startsWith("MISSING_SKILL:"));

  const profileHref = missingSkills.length > 0
    ? `/candidate/dashboard/candidate-profile?addSkills=${encodeURIComponent(missingSkills.join(","))}`
    : "/candidate/dashboard/candidate-profile";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "11px 14px", borderRadius: 12,
        background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)",
        border: "1px solid #FDE68A",
      }}>
        <AlertCircle size={15} color="#D97706" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
          Complete your profile to apply
        </span>
      </div>

      {/* Missing skills list */}
      {missingSkills.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: "#D97706",
            textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 2px",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <Sparkles size={10} /> Missing skills
          </p>
          {missingSkills.slice(0, 5).map(skill => (
            <div key={skill} style={{
              fontSize: 12, color: "#78350F",
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 10px", borderRadius: 8, background: "#FFFBEB",
              border: "1px solid #FDE68A",
            }}>
              <span style={{ color: "#D97706", flexShrink: 0 }}>•</span>
              {skill}
            </div>
          ))}
        </div>
      )}

      {/* Other reasons */}
      {otherReasons.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
          {otherReasons.map((r, i) => (
            <li key={i} style={{
              fontSize: 12, color: "#78350F",
              display: "flex", alignItems: "flex-start", gap: 6,
              padding: "7px 10px", borderRadius: 8, background: "#FFFBEB",
            }}>
              <span style={{ color: "#D97706", flexShrink: 0, marginTop: 1 }}>•</span>
              {r === "PROFILE_NOT_READY" ? "Complete your profile first" :
               r.startsWith("MISSING_FIELD:") ? `Missing: ${r.split(":")[1]}` : r}
            </li>
          ))}
        </ul>
      )}

      {/* CTA → profile page */}
      <Link href={profileHref} style={{ textDecoration: "none" }}>
        <motion.div
          whileHover={{ scale: 1.02, boxShadow: "0 8px 20px -6px rgba(217,119,6,0.35)" }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            padding: "12px 14px", borderRadius: 12,
            background: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
            color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 12px -4px rgba(217,119,6,0.4)",
            position: "relative", overflow: "hidden",
          }}
        >
          <motion.div
            style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
          />
          <UserCircle2 size={14} />
          Complete your profile
          <ArrowRight size={13} />
        </motion.div>
      </Link>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Apply Panel (right column)
───────────────────────────────────────────────────────────── */
function ApplyPanel({
  job,
  isAuthenticated,
  isCandidate,
  eligQ,
  isAlreadyApplied,
  onApplyClick,
}: {
  job: JobSearchResult;
  isAuthenticated: boolean;
  isCandidate: boolean;
  eligQ: any;
  isAlreadyApplied: boolean;
  onApplyClick: () => void;
}) {
  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Lock icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "linear-gradient(135deg, #EFF6FF, #F5F3FF)",
          border: "1px solid #BFDBFE",
          display: "grid", placeItems: "center",
          margin: "4px auto 0",
        }}>
          <Lock size={22} color="#2563EB" />
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            Sign in to apply
          </p>
          <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, margin: 0 }}>
            Create a free account to apply, track your applications, and get personalised matches.
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#F1F5F9" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link
            href={`/auth/login?callbackUrl=${encodeURIComponent(`/search?tab=jobs`)}`}
            style={{ textDecoration: "none" }}
          >
            <motion.div
              whileHover={{ scale: 1.02, boxShadow: "0 12px 28px -8px rgba(37,99,235,0.4)" }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px", borderRadius: 12,
                background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: "pointer", position: "relative", overflow: "hidden",
                boxShadow: "0 4px 14px -4px rgba(37,99,235,0.4)",
              }}
            >
              <motion.div
                style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
              />
              <Sparkles size={13} />
              Sign in to apply
              <ArrowRight size={13} />
            </motion.div>
          </Link>

          <Link href="/auth/signup" style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                padding: "11px", borderRadius: 12,
                border: "1px solid #E2E8F0",
                color: "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#BFDBFE"; e.currentTarget.style.color = "#2563EB"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#64748B"; }}
            >
              Create free account
              <ChevronRight size={13} />
            </div>
          </Link>
        </div>

        <p style={{ textAlign: "center", fontSize: 10, color: "#94A3B8", margin: 0 }}>
          Free forever · No credit card
        </p>
      </div>
    );
  }

  if (!isCandidate) {
    return (
      <div style={{
        padding: "16px", borderRadius: 14,
        background: "#F8FAFC", border: "1px solid #E2E8F0",
        textAlign: "center",
      }}>
        <Building2 size={22} color="#94A3B8" style={{ margin: "0 auto 10px" }} />
        <p style={{ fontSize: 13, color: "#64748B", margin: 0, lineHeight: 1.5 }}>
          Only candidate accounts can apply to jobs.
        </p>
      </div>
    );
  }

  if (eligQ.isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "20px 0" }}>
        <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} color="#2563EB" />
        <span style={{ fontSize: 13, color: "#64748B" }}>Checking eligibility…</span>
      </div>
    );
  }

  if (isAlreadyApplied) {
    return (
      <div style={{
        padding: "16px", borderRadius: 14,
        background: "#ECFDF5", border: "1px solid #A7F3D0",
        display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#059669", margin: "0 0 2px" }}>
            Application submitted
          </p>
          <p style={{ fontSize: 12, color: "#065F46", margin: 0 }}>
            You already applied to this position.
          </p>
        </div>
      </div>
    );
  }

  if (eligQ.data?.eligible) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Eligibility badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 14px", borderRadius: 12,
          background: "#ECFDF5", border: "1px solid #A7F3D0",
        }}>
          <CheckCircle2 size={16} color="#059669" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#065F46" }}>
            You meet the requirements
          </span>
        </div>

        {/* Apply button */}
        <motion.button
          onClick={onApplyClick}
          whileHover={{ scale: 1.02, boxShadow: "0 12px 28px -8px rgba(37,99,235,0.45)" }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: "100%", padding: "14px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
            color: "#fff", fontSize: 14, fontWeight: 700,
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            position: "relative", overflow: "hidden",
          }}
        >
          <motion.div
            style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.2 }}
          />
          <Sparkles size={14} />
          Apply Now
          <ArrowRight size={14} />
        </motion.button>
      </div>
    );
  }

  /* Not eligible */
  return <NotEligiblePanel reasons={eligQ.data?.reasons ?? []} />;
}

/* ─────────────────────────────────────────────────────────────
   Main Modal
───────────────────────────────────────────────────────────── */
export default function JobDetailModal({
  job,
  onClose,
  isAuthenticated,
  userRole,
}: {
  job: JobSearchResult;
  onClose: () => void;
  isAuthenticated: boolean;
  userRole?: string | null;
}) {
  const isCandidate = isAuthenticated && userRole === "candidate";
  const [applyOpen, setApplyOpen] = useState(false);
  const [applied, setApplied] = useState(false);

  const eligQ = useCandidateJobEligibility(job.job_id, { enabled: isCandidate });
  const myAppsQ = useMyApplicationsList(isCandidate);

  const isAlreadyApplied = useMemo(() => {
    if (applied) return true;
    return (myAppsQ.data?.items ?? []).some(
      (a: any) => a.job?.job_id === job.job_id
    );
  }, [myAppsQ.data, job.job_id, applied]);

  const initial = (job.company_name ?? "C")[0].toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "rgba(15,23,42,0.65)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      {/* Centering wrapper */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 41,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        pointerEvents: "none",
      }}>
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: "spring", stiffness: 360, damping: 36 }}
        style={{
          width: "100%",
          maxWidth: 860,
          maxHeight: "88vh",
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 40px 80px -20px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, background: "linear-gradient(90deg, #2563EB 0%, #7C3AED 60%, #0EA5E9 100%)", flexShrink: 0 }} />

        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid #E2E8F0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
          background: "#FAFBFC",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Company logo */}
            <div style={{
              width: 46, height: 46, borderRadius: 12, flexShrink: 0,
              overflow: "hidden", border: "1px solid #E2E8F0",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#EFF6FF", fontSize: 18, fontWeight: 700, color: "#2563EB",
            }}>
              {job.logo_url
                ? <img src={job.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                : initial
              }
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#2563EB", margin: "0 0 2px" }}>
                {job.company_name ?? "Company"}
              </p>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                {job.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 10, border: "1px solid #E2E8F0",
              display: "grid", placeItems: "center", cursor: "pointer",
              background: "transparent", flexShrink: 0, transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#F1F5F9"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <X size={16} color="#64748B" />
          </button>
        </div>

        {/* Body — two columns */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

          {/* ── Left: job details (scrollable) ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", minWidth: 0 }}>

            {/* Meta badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#475569", background: "#F1F5F9", borderRadius: 6, padding: "4px 10px" }}>
                <MapPin size={11} /> {job.location}
              </span>
              {job.job_type && (
                <span style={{ fontSize: 12, fontWeight: 600, background: "#EFF6FF", color: "#2563EB", borderRadius: 6, padding: "4px 10px" }}>
                  {JOB_TYPE_LABEL[job.job_type] ?? job.job_type}
                </span>
              )}
              {job.experience_level && (
                <span style={{ fontSize: 12, background: "#F1F5F9", color: "#475569", borderRadius: 6, padding: "4px 10px" }}>
                  {EXP_LABEL[job.experience_level] ?? job.experience_level}
                </span>
              )}
              {job.remote_option === "fully_remote" && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, background: "#ECFDF5", color: "#059669", borderRadius: 6, padding: "4px 10px" }}>
                  <Globe size={11} /> Remote
                </span>
              )}
              {job.department && (
                <span style={{ fontSize: 12, background: "#FAF5FF", color: "#7C3AED", borderRadius: 6, padding: "4px 10px" }}>
                  {job.department}
                </span>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#94A3B8", background: "#F8FAFC", borderRadius: 6, padding: "4px 10px" }}>
                <Clock size={11} /> {relDate(job.created_at)}
              </span>
            </div>

            {/* Salary */}
            {job.salary_range && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#F0FDF4", border: "1px solid #BBF7D0",
                borderRadius: 10, padding: "10px 14px", marginBottom: 18,
              }}>
                <DollarSign size={15} color="#059669" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#059669" }}>
                  {job.salary_range}
                </span>
              </div>
            )}

            {/* Skills */}
            {job.required_skills.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  Required Skills
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {job.required_skills.map((sk) => (
                    <span key={sk} style={{
                      fontSize: 12, padding: "4px 10px", borderRadius: 6,
                      background: "#F1F5F9", color: "#334155", border: "1px solid #E2E8F0",
                    }}>
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                  About the Role
                </p>
                <div
                  style={{ fontSize: 14, color: "#475569", lineHeight: 1.8, whiteSpace: "pre-wrap" }}
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              </div>
            )}
          </div>

          {/* ── Right: apply panel (fixed width, sticky) ── */}
          <div style={{
            width: 264, flexShrink: 0,
            borderLeft: "1px solid #E2E8F0",
            background: "#FAFBFC",
            padding: "20px 18px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}>
            {/* Job quick-stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { Icon: Briefcase, label: "Type", value: job.job_type ? (JOB_TYPE_LABEL[job.job_type] ?? job.job_type) : "—" },
                { Icon: MapPin,    label: "Location", value: job.location ?? "—" },
                { Icon: Calendar,  label: "Posted", value: relDate(job.created_at) },
              ].map(({ Icon, label, value }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "#F1F5F9", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon size={13} color="#64748B" />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#334155", margin: 0 }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "#E2E8F0" }} />

            {/* Apply section */}
            <ApplyPanel
              job={job}
              isAuthenticated={isAuthenticated}
              isCandidate={isCandidate}
              eligQ={eligQ}
              isAlreadyApplied={isAlreadyApplied}
              onApplyClick={() => setApplyOpen(true)}
            />
          </div>
        </div>
      </motion.div>
      </div>{/* end centering wrapper */}

      {/* Apply modal — opens on top at z-50 */}
      {isCandidate && applyOpen && (
        <ApplyModal
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          jobId={job.job_id}
          jobTitle={job.title}
          eligibility={eligQ.data}
          onApplied={() => { setApplied(true); setApplyOpen(false); }}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
