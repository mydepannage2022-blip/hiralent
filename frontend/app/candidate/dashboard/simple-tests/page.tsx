"use client";

import React, { useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  FlaskConical,
  Sparkles,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import {
  useSimpleTestInvites,
  useStartSimpleTestAttempt,
  useSimpleTestAttempt,
} from "@/src/lib/simpleTest/simpleTest.queries";

import type { UiSimpleTestInvite } from "@/src/lib/simpleTest/simpleTest.api";
import SimpleTestInviteCard from "@/src/components/candidate/dashboard/simple-tests/SimpleTestInviteCard";

/* ─────────────────────────── helpers ─────────────────────────── */

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />
);

function pickAttemptId(out: any): string {
  return (
    String(out?.attempt_id || "") ||
    String(out?.data?.attempt_id || "") ||
    String(out?.attemptId || "") ||
    String(out?.data?.attemptId || "") ||
    ""
  );
}

/* ────────────────────────── FadeUp helper ─────────────────────── */

interface FadeUpProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const FadeUp: React.FC<FadeUpProps> = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: "easeOut", delay }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ──────────── Wrapper that hides description + meta lines ──────── */

/**
 * We can't pass custom props to SimpleTestInviteCard (it would cause a TS error),
 * so instead we overlay the card with a <style> tag that targets the two lines
 * we want to hide inside `.hide-card-meta`:
 *
 *   1. "Quick Platform Check"  → any <p> or text node that isn't the title / icons
 *   2. "Unlimited attempts • Candidate-only score"  → the green footer line
 *
 * Adjust the CSS selectors below if your card uses different element types.
 */
const CleanCard: React.FC<{
  invite: UiSimpleTestInvite;
  loading: boolean;
  onStart: () => void;
  index: number;
}> = ({ invite, loading, onStart, index }) => (
  <motion.div
    key={invite.inviteId}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.22, delay: index * 0.04 }}
    className="hide-card-meta"
  >
    <SimpleTestInviteCard
      invite={invite}
      loading={loading}
      onStart={onStart}
    />
  </motion.div>
);

/* ─────────────────────────── main ─────────────────────────── */

export default function SimpleTestsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <SimpleTestsInner />
    </Suspense>
  );
}

function SimpleTestsInner() {
  const router = useRouter();

  const spRaw = useSearchParams();
  const sp = useMemo(() => spRaw ?? new URLSearchParams(), [spRaw]);

  const invitesQ = useSimpleTestInvites();
  const startAttemptM = useStartSimpleTestAttempt();
  const invites: UiSimpleTestInvite[] = invitesQ.data ?? [];

  const submitted = sp.get("submitted") === "1";
  const submittedAttemptId = (sp.get("attemptId") || "").trim();

  const attemptQ = useSimpleTestAttempt(submittedAttemptId);
  const submittedScore = attemptQ.data?.score;

  async function onStart(inviteId: string) {
    const out = await startAttemptM.mutateAsync({ inviteId });
    const attemptId = pickAttemptId(out);
    if (attemptId) router.push(`/simple-test/attempt/${attemptId}`);
  }

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/*
        ── Global style to strip the two unwanted lines from SimpleTestInviteCard.
           We scope everything under `.hide-card-meta` so it never bleeds elsewhere.

           HOW TO FIND THE RIGHT SELECTORS:
           Open DevTools → inspect the card → right-click the "Quick Platform Check"
           text node and copy its selector, then replace the placeholder below.

           The selectors below are the most common patterns used in these cards:
             • [data-description]  — if the component uses a data attribute
             • .card-description   — if it uses a named class
             • p.text-gray-500     — plain <p> with Tailwind grey colour
             • a.text-emerald-600, p.text-emerald-600  — the green meta line
      */}
      <style>{`
        .hide-card-meta [data-description],
        .hide-card-meta .card-description,
        .hide-card-meta p.text-gray-500:not(:first-child),
        .hide-card-meta span.text-gray-500,
        .hide-card-meta [data-meta],
        .hide-card-meta .card-meta,
        .hide-card-meta a.text-emerald-600,
        .hide-card-meta p.text-emerald-600,
        .hide-card-meta span.text-emerald-600,
        .hide-card-meta div.text-emerald-600 {
          display: none !important;
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Top bar ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-between"
        >
          <button
            type="button"
            onClick={() => router.push("/candidate/dashboard/skills-assessment")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assessments
          </button>


        </motion.div>

        {/* ── Submitted banner ── */}
        {submitted && (
          <FadeUp delay={0.03}>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
                <div className="text-sm font-semibold text-emerald-900">Test Submitted</div>
                <div className="ml-auto text-sm text-emerald-900">
                  {!submittedAttemptId ? (
                    <span className="text-emerald-800/90">Score coming soon</span>
                  ) : attemptQ.isLoading ? (
                    <span className="inline-flex items-center gap-2 text-emerald-800/90">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading score…
                    </span>
                  ) : attemptQ.isError ? (
                    <span className="text-rose-700">Error loading score</span>
                  ) : typeof submittedScore === "number" ? (
                    <span>
                      Score:{" "}
                      <span className="font-semibold">{Math.round(submittedScore)}%</span>
                    </span>
                  ) : (
                    <span className="text-emerald-800/90">Score coming soon</span>
                  )}
                </div>
              </div>
            </div>
          </FadeUp>
        )}

        {/* ── Hero banner ── */}
        <FadeUp delay={0.05}>
          <div
            className="relative overflow-hidden rounded-2xl shadow-sm"
            style={{
              background: "linear-gradient(135deg, #34D399 0%, #22C55E 45%, #16A34A 100%)",
            }}
          >
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/14 pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/12 pointer-events-none" />

            <div className="relative p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/18 border border-white/30 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-white font-bold text-[15px] leading-snug">
                    Practice mode — no pressure
                  </div>
                  <div className="text-emerald-50/90 text-sm mt-1">
                    Optional · unlimited attempts · only visible to you · doesn't affect real assessments
                  </div>
                </div>
              </div>

              {!invitesQ.isLoading && (
                <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/22 text-white border border-white/35">
                  <FlaskConical className="w-3.5 h-3.5" />
                  {invites.length} test{invites.length !== 1 ? "s" : ""} available
                </span>
              )}
            </div>
          </div>
        </FadeUp>

        {/* ── Available Tests ── */}
        <FadeUp delay={0.1}>
          <div className="space-y-2.5">

            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Available Tests
                </h2>
              </div>
              {!invitesQ.isLoading && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {invites.length} available
                </span>
              )}
            </div>

            {/* Loading skeletons */}
            {invitesQ.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                      <Skeleton className="h-9 w-20 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>

            ) : invites.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="text-gray-900 font-semibold">No warm-up tests right now</div>
                <div className="text-sm text-gray-500 mt-1">They'll appear here when available.</div>
              </div>

            ) : (
              <div className="space-y-3">
                {invites.map((inv, idx) => (
                  <CleanCard
                    key={inv.inviteId}
                    invite={inv}
                    loading={startAttemptM.isPending}
                    onStart={() => onStart(inv.inviteId)}
                    index={idx}
                  />
                ))}
              </div>
            )}

          </div>
        </FadeUp>

      </div>
    </div>
  );
}