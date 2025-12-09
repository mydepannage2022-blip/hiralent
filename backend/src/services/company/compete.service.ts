import { Prisma } from "@prisma/client";
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
    // Minimal checks: object with candidate_id and score
    if (typeof item !== "object" || item === null) return false;
    const anyItem = item as any;
    return typeof anyItem.candidate_id === "string" && typeof anyItem.score === "number";
  });
}

export async function createChallenge(payload: CreateCompeteChallengeDTO, createdByCompanyId?: string) {
  const start_time = payload.start_time ? new Date(payload.start_time) : new Date();
  const end_time = payload.end_time
    ? new Date(payload.end_time)
    : new Date(start_time.getTime() + 1000 * 60 * (payload.time_limit_minutes ?? DEFAULT_TIME_LIMIT));

  const created = await prisma.competeChallenge.create({
    data: {
      assessment_id: payload.assessment_id,
      title: payload.title,
      description: payload.description ?? null,
      candidate_ids: payload.candidate_ids,
      status: "scheduled",
      start_time,
      end_time,
      time_limit: payload.time_limit_minutes ?? DEFAULT_TIME_LIMIT,
      leaderboard: null,
    },
  });

  return created;
}

export async function getChallengeById(challengeId: string) {
  return prisma.competeChallenge.findUnique({ where: { challenge_id: challengeId } });
}

export async function listChallengesByAssessment(assessmentId: string) {
  return prisma.competeChallenge.findMany({
    where: { assessment_id: assessmentId },
    orderBy: { created_at: "desc" },
  });
}

export async function listChallengesByCompany(companyId: string) {
  return prisma.competeChallenge.findMany({
    where: {
      assessment: {
        company_id: companyId,
      },
    },
    include: {
      assessment: true,
    },
    orderBy: { created_at: "desc" },
  });
}

export async function startChallenge(challengeId: string, opts?: StartCompeteChallengeDTO) {
  const now = new Date();
  const data: any = {
    status: "active",
    start_time: opts?.start_time ? new Date(opts.start_time) : now,
  };

  if (opts?.end_time) data.end_time = new Date(opts.end_time);
  if (opts?.time_limit_minutes) data.time_limit = opts.time_limit_minutes;

  const updated = await prisma.competeChallenge.update({
    where: { challenge_id: challengeId },
    data,
  });

  // TODO: call Wafaa to request per-candidate question variants and persist mapping

  return updated;
}

export async function endChallenge(challengeId: string) {
  const now = new Date();
  const updated = await prisma.competeChallenge.update({
    where: { challenge_id: challengeId },
    data: { status: "completed", end_time: now },
  });

  // Optionally trigger post-processing: compute final leaderboard, notify employer, persist reports

  return updated;
}

/**
 * Update leaderboard with results (called by webhook that Youssra would hit)
 */
export async function updateLeaderboardWithResults(challengeId: string, result: CandidateResultDTO) {
  return prisma.$transaction(async (tx) => {
    const challenge = await tx.competeChallenge.findUnique({ where: { challenge_id: challengeId } });
    if (!challenge) throw new Error("Challenge not found");

    // Prisma returns JsonValue | null for JSON columns.
    const rawLeaderboard = challenge.leaderboard as Prisma.JsonValue | null;

    // Safely convert to LeaderboardEntry[] (runtime check)
    let current: LeaderboardEntry[] = [];
    if (rawLeaderboard !== null && rawLeaderboard !== undefined) {
      // rawLeaderboard might be an array-like JsonArray; ensure it's the shape we expect
      if (isLeaderboardArray(rawLeaderboard)) {
        current = rawLeaderboard;
      } else {
        // If the stored JSON is unexpected, log a warning and fallback to empty array
        console.warn("CompeteChallenge leaderboard has unexpected shape, resetting to []", {
          challengeId,
          rawLeaderboard,
        });
        current = [];
      }
    }

    // Remove previous entry for candidate if exists, then insert/update
    const filtered = current.filter((e) => e.candidate_id !== result.candidate_id);

    const entry: LeaderboardEntry = {
      candidate_id: result.candidate_id,
      score: result.score,
      time_taken_seconds: result.time_taken_seconds,
      plagiarism_flag: result.plagiarism_flag ?? false,
      details: result.details ?? {},
    };

    filtered.push(entry);

    const computed = computeLeaderboard(filtered);

    // When writing back to Prisma, cast to Prisma.JsonValue (the input type expected).
    const updated = await tx.competeChallenge.update({
      where: { challenge_id: challengeId },
      data: {
        // Prisma expects Json input; computed is a plain JS array -> cast explicitly.
        leaderboard: computed as unknown as Prisma.JsonValue,
      },
    });

    return updated;
  });
}

/**
 * Simulate results for a candidate (useful in dev while Youssra not integrated).
 */
export async function simulateResultsForCandidate(challengeId: string, result: CandidateResultDTO) {
  return updateLeaderboardWithResults(challengeId, result);
}

/**
 * Get leaderboard (computed) for the challenge.
 */
export async function getLeaderboard(challengeId: string) {
  const challenge = await prisma.competeChallenge.findUnique({ where: { challenge_id: challengeId } });
  if (!challenge) return null;

  const raw = challenge.leaderboard as Prisma.JsonValue | null;
  if (raw === null || raw === undefined) return [];

  if (isLeaderboardArray(raw)) {
    return computeLeaderboard(raw);
  }

  // Unexpected shape: try to recover if raw is a stringified JSON
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (isLeaderboardArray(parsed)) return computeLeaderboard(parsed);
    } catch (err) {
      /* ignore parse error */
    }
  }

  // Fallback: return empty array
  console.warn("getLeaderboard: unexpected leaderboard format", { challengeId, raw });
  return [];
}