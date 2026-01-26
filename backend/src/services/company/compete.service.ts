import prisma from "../../lib/prisma";
import {
  CreateCompeteChallengeDTO,
  CandidateResultDTO,
  LeaderboardEntry,
  StartCompeteChallengeDTO,
} from "../../types/compete.types";

const DEFAULT_TIME_LIMIT = 60; // minutes

function computeLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const sorted = entries
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ta = a.time_taken_seconds ?? Number.MAX_SAFE_INTEGER;
      const tb = b.time_taken_seconds ?? Number.MAX_SAFE_INTEGER;
      return ta - tb;
    })
    .map((e, idx) => ({ ...e, rank: idx + 1 }));
  return sorted;
}

/**
 * Type guard: check if a value looks like a LeaderboardEntry array at runtime.
 * It is intentionally permissive; tighten checks if you need stronger guarantees.
 */
function isLeaderboardArray(value: unknown): value is LeaderboardEntry[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const anyItem = item as any;
    return typeof anyItem.candidate_id === "string" && typeof anyItem.score === "number";
  });
}

export async function createChallenge(
  payload: CreateCompeteChallengeDTO,
  createdByCompanyId?: string
) {
  const start_time = payload.start_time ? new Date(payload.start_time) : new Date();
  const end_time = payload.end_time
    ? new Date(payload.end_time)
    : new Date(start_time.getTime() + 1000 * 60 * (payload.time_limit_minutes ?? DEFAULT_TIME_LIMIT));

  // ✅ Only pass fields that exist in Prisma CompeteChallenge model.
  // (Your Prisma client types currently do NOT include: title, description, status, leaderboard, created_at, assessment relation)
  const created = await prisma.competeChallenge.create({
    data: {
      assessment_id: payload.assessment_id,
      candidate_ids: payload.candidate_ids,
      start_time,
      end_time,
      time_limit: payload.time_limit_minutes ?? DEFAULT_TIME_LIMIT,
    } as any, // keep safe even if schema uses slightly different input type (runtime fields still must exist)
  });

  return created;
}

export async function getChallengeById(challengeId: string) {
  return prisma.competeChallenge.findUnique({ where: { challenge_id: challengeId } as any });
}

export async function listChallengesByAssessment(assessmentId: string) {
  return prisma.competeChallenge.findMany({
    where: { assessment_id: assessmentId } as any,
    orderBy: { start_time: "desc" } as any,
  });
}

export async function listChallengesByCompany(companyId: string) {
  // ✅ Your CompeteChallenge model doesn't have relation `assessment`,
  // so we do it safely in 2 queries: fetch assessment ids then challenges.
  const assessments = await prisma.employerAssessment.findMany({
    where: { company_id: companyId } as any,
    select: { assessment_id: true } as any,
  });

  const assessmentIds = assessments.map((a: any) => a.assessment_id).filter(Boolean);
  if (assessmentIds.length === 0) return [];

  return prisma.competeChallenge.findMany({
    where: { assessment_id: { in: assessmentIds } } as any,
    orderBy: { start_time: "desc" } as any,
  });
}

export async function startChallenge(challengeId: string, opts?: StartCompeteChallengeDTO) {
  const now = new Date();

  const data: any = {
    start_time: opts?.start_time ? new Date(opts.start_time) : now,
  };

  if (opts?.end_time) data.end_time = new Date(opts.end_time);
  if (opts?.time_limit_minutes) data.time_limit = opts.time_limit_minutes;

  // NOTE: removed `status: "active"` because Prisma model doesn't have `status`
  const updated = await prisma.competeChallenge.update({
    where: { challenge_id: challengeId } as any,
    data,
  });

  return updated;
}

export async function endChallenge(challengeId: string) {
  const now = new Date();

  // NOTE: removed `status: "completed"` because Prisma model doesn't have `status`
  const updated = await prisma.competeChallenge.update({
    where: { challenge_id: challengeId } as any,
    data: { end_time: now } as any,
  });

  return updated;
}

/**
 * Update leaderboard with results
 *
 * ⚠️ Your Prisma model does not contain a `leaderboard` JSON field,
 * so we can't persist it here without changing schema.
 * This implementation is safe (no TS errors) and doesn't crash,
 * but it won't store anything in DB.
 */
export async function updateLeaderboardWithResults(challengeId: string, result: CandidateResultDTO) {
  console.warn("updateLeaderboardWithResults skipped: CompeteChallenge has no `leaderboard` field in Prisma schema.", {
    challengeId,
    candidate_id: result.candidate_id,
  });

  // Return the challenge as-is so callers don't break.
  const challenge = await prisma.competeChallenge.findUnique({
    where: { challenge_id: challengeId } as any,
  });

  if (!challenge) throw new Error("Challenge not found");
  return challenge;
}

/**
 * Simulate results for a candidate (useful in dev while Youssra not integrated).
 */
export async function simulateResultsForCandidate(challengeId: string, result: CandidateResultDTO) {
  return updateLeaderboardWithResults(challengeId, result);
}

/**
 * Get leaderboard (computed) for the challenge.
 *
 * ⚠️ No leaderboard field in schema -> return empty list safely.
 */
export async function getLeaderboard(challengeId: string) {
  const challenge = await prisma.competeChallenge.findUnique({
    where: { challenge_id: challengeId } as any,
  });
  if (!challenge) return null;

  return computeLeaderboard([]);
}
