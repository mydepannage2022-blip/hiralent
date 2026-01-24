// utils/scoring-algorithms.ts

import { ScoreBreakdown, ScoringWeights, ScoreCalculationContext } from '../types/profile.types';

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  skills: 0.4,
  experience: 0.3,
  education: 0.2,
  completeness: 0.1,
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Very simple scoring v1:
 * - skills_score: based on number of skills + verified skills
 * - experience_score: based on total years
 * - education_score: based on education_level string (basic heuristic)
 * - completeness_score: pass-through (0-100)
 */
export function computeCandidateScore(
  ctx: ScoreCalculationContext,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ScoreBreakdown {
  // -------------------- Skills (0..100) --------------------
  // base: up to 60 pts for count (>= 6 skills => 60)
  const skillsCountScore = clamp((ctx.skills_count / 6) * 60, 0, 60);

  // verified bonus: up to 40 pts (>= 4 verified => 40)
  const verifiedScore = clamp((ctx.validated_skills_count / 4) * 40, 0, 40);

  const skills_score = clamp(skillsCountScore + verifiedScore);

  // -------------------- Experience (0..100) --------------------
  // 0 years => 0, 5 years => 100
  const experience_score = clamp((ctx.experience_years / 5) * 100);

  // -------------------- Education (0..100) --------------------
  // simple mapping by keyword
  const level = (ctx.education_level || '').toLowerCase();
  let education_score = 40; // default baseline
  if (level.includes('phd') || level.includes('doctor')) education_score = 100;
  else if (level.includes('master') || level.includes('msc')) education_score = 85;
  else if (level.includes('bachelor') || level.includes('licence') || level.includes('eng')) education_score = 70;
  else if (level.includes('high') || level.includes('secondary')) education_score = 50;

  education_score = clamp(education_score);

  // -------------------- Completeness (0..100) --------------------
  const completeness_score = clamp(ctx.completeness_score);

  // -------------------- Weighted total --------------------
  const total_score =
    skills_score * weights.skills +
    experience_score * weights.experience +
    education_score * weights.education +
    completeness_score * weights.completeness;

  return {
    total_score: Math.round(total_score),
    skills_score: Math.round(skills_score),
    experience_score: Math.round(experience_score),
    education_score: Math.round(education_score),
    completeness_score: Math.round(completeness_score),
  };
}