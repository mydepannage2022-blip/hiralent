/**
 * Types used by the Compete Challenge feature.
 *
 * These are simple interfaces to keep request/response shapes consistent
 * across controller <-> service. Adjust/add fields to match your frontend.
 */

export type UUID = string;

export interface CreateCompeteChallengeDTO {
  assessment_id: UUID;
  title: string;
  description?: string;
  candidate_ids: UUID[]; // list of candidate user ids (strings)
  start_time?: string; // ISO string (optional when scheduling)
  end_time?: string;   // ISO string
  time_limit_minutes?: number; // per candidate time limit
}

export interface StartCompeteChallengeDTO {
  // When you call start, you can optionally provide real-time options
  start_time?: string;
  end_time?: string;
  time_limit_minutes?: number;
}

export interface CandidateResultDTO {
  candidate_id: UUID;
  score: number; // normalized 0..100
  time_taken_seconds?: number;
  plagiarism_flag?: boolean;
  details?: Record<string, any>; // optional: question-level scores, traces, etc.
  submission_id?: string; // if produced by Youssra
}

export interface LeaderboardEntry {
  candidate_id: UUID;
  score: number;
  time_taken_seconds?: number;
  plagiarism_flag?: boolean;
  rank?: number;
  details?: Record<string, any>;
}