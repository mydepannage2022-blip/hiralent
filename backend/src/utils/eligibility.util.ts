// src/utils/eligibility.ts

export const normalize = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, " ");

export const uniqNormalized = (arr: string[]) => {
  const set = new Set(arr.map(normalize).filter(Boolean));
  return Array.from(set);
};

export const missing = (required: string[], have: string[]) => {
  const H = new Set(have.map(normalize));
  return required.filter((x) => !H.has(normalize(x)));
};

export const safeArray = (v: unknown): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return [];
};

export const buildMissingFieldReasons = (missingFields: string[]) =>
  missingFields.map((f) => `MISSING_FIELD:${f}`);

export const buildMissingSkillReasons = (missingSkills: string[]) =>
  missingSkills.map((s) => `MISSING_SKILL:${s}`);
