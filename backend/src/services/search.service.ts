import prisma from '../lib/prisma';


export interface CandidateSearchResult {
  candidate_id: string;
  /** null for unauthenticated (guest) responses */
  full_name: string | null;
  headline: string | null;
  city: string | null;
  location: string | null;
  profile_picture_url: string | null;
  /** Guests receive at most 5 skills; authenticated users receive all */
  skills: string[];
  match_score: number;
  /** Guests receive at most 120 chars; authenticated users receive full text */
  about_me: string | null;
}

export interface CandidateSearchResponse {
  results: CandidateSearchResult[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SearchParams {
  q?: string;
  location?: string;
  page?: number;
  limit?: number;
  /** When false (guest), field-level privacy is applied to results */
  isAuthenticated?: boolean;
}

// Raw row type returned by PostgreSQL
interface RawSearchRow {
  candidate_id: string;
  full_name: string;
  headline: string | null;
  city: string | null;
  location: string | null;
  profile_picture_url: string | null;
  skills: string[] | null;
  about_me: string | null;
  match_score: number | bigint;
}

interface RawCountRow {
  total: bigint;
}

/**
 * Builds the shared WHERE clause conditions for keyword matching.
 * Returns a SQL fragment using $1 as the keyword parameter.
 *
 * Searched fields:
 *   - headline (CandidateProfile)
 *   - about_me (CandidateProfile)
 *   - skills (CandidateProfile, text array)
 *   - projects (CandidateProfile JSON — searched as text)
 *   - experience (CandidateProfile JSON — searched as text)
 *   - education (CandidateProfile JSON — searched as text)
 *   - certifications (Certification table — joined via EXISTS on name/issuer; single source of truth)
 */
const KEYWORD_WHERE = `
  (
    $1 = ''
    OR EXISTS (
      SELECT 1 FROM unnest(cp.skills) AS sk
      WHERE lower(sk) LIKE lower('%' || $1 || '%')
    )
    OR lower(coalesce(cp.headline, ''))       LIKE lower('%' || $1 || '%')
    OR lower(coalesce(cp.about_me, ''))       LIKE lower('%' || $1 || '%')
    OR lower(coalesce(cp.projects::TEXT, ''))      LIKE lower('%' || $1 || '%')
    OR lower(coalesce(cp.experience::TEXT, ''))    LIKE lower('%' || $1 || '%')
    OR lower(coalesce(cp.education::TEXT, ''))     LIKE lower('%' || $1 || '%')
    OR EXISTS (
      SELECT 1 FROM "Certification" c
      WHERE c.candidate_id = cp.candidate_id
        AND (lower(c.name) LIKE lower('%' || $1 || '%') OR lower(c.issuer) LIKE lower('%' || $1 || '%'))
    )
  )
`;

/**
 * Scoring breakdown (max 100 points):
 *   50 — skills match
 *   20 — headline match
 *   15 — projects + experience + education + certifications match (combined)
 *   10 — about_me match
 *    5 — location boost (city or location field)
 *
 * When q is empty, candidates are sorted by profile completeness instead.
 */
const SCORE_EXPR = `
  (
    -- Skills: 50 points
    CASE WHEN $1 != '' AND EXISTS (
      SELECT 1 FROM unnest(cp.skills) AS sk
      WHERE lower(sk) LIKE lower('%' || $1 || '%')
    ) THEN 50 ELSE 0 END

    +

    -- Headline: 20 points
    CASE WHEN $1 != '' AND lower(coalesce(cp.headline, '')) LIKE lower('%' || $1 || '%')
    THEN 20 ELSE 0 END

    +

    -- Projects + Experience + Education + Certifications: 15 points (combined)
    CASE WHEN $1 != '' AND (
      lower(coalesce(cp.projects::TEXT, ''))       LIKE lower('%' || $1 || '%')
      OR lower(coalesce(cp.experience::TEXT, ''))  LIKE lower('%' || $1 || '%')
      OR lower(coalesce(cp.education::TEXT, ''))   LIKE lower('%' || $1 || '%')
      OR EXISTS (
        SELECT 1 FROM "Certification" c
        WHERE c.candidate_id = cp.candidate_id
          AND (lower(c.name) LIKE lower('%' || $1 || '%') OR lower(c.issuer) LIKE lower('%' || $1 || '%'))
      )
    ) THEN 15 ELSE 0 END

    +

    -- About me: 10 points
    CASE WHEN $1 != '' AND lower(coalesce(cp.about_me, '')) LIKE lower('%' || $1 || '%')
    THEN 10 ELSE 0 END

    +

    -- Location boost: 5 points (always active when location is provided, regardless of q)
    CASE WHEN $2 != '' AND (
      lower(coalesce(cp.city, ''))     LIKE lower('%' || $2 || '%')
      OR lower(coalesce(cp.location, '')) LIKE lower('%' || $2 || '%')
    ) THEN 5 ELSE 0 END
  )::int
`;

/**
 * Profile completeness score for empty-query sorting (max 100):
 *   20 — has headline
 *   20 — has about_me
 *   20 — has skills
 *   20 — has projects
 *   20 — has experience
 */
const COMPLETENESS_EXPR = `
  (
    CASE WHEN cp.headline  IS NOT NULL AND cp.headline  != ''    THEN 20 ELSE 0 END
    + CASE WHEN cp.about_me IS NOT NULL AND cp.about_me != ''    THEN 20 ELSE 0 END
    + CASE WHEN cp.skills   IS NOT NULL AND array_length(cp.skills, 1) > 0 THEN 20 ELSE 0 END
    + CASE WHEN cp.projects IS NOT NULL
           AND cp.projects::TEXT NOT IN ('null', '[]', '') THEN 20 ELSE 0 END
    + CASE WHEN cp.experience IS NOT NULL
           AND cp.experience::TEXT NOT IN ('null', '[]', '') THEN 20 ELSE 0 END
  )::int
`;

export const searchCandidates = async (
  params: SearchParams
): Promise<CandidateSearchResponse> => {
  const page            = Math.max(1, params.page  ?? 1);
  const limit           = Math.min(20, Math.max(1, params.limit ?? 12));
  const isAuthenticated = params.isAuthenticated ?? false;
  const skip  = (page - 1) * limit;
  const q        = params.q?.trim()        ?? "";
  const location = params.location?.trim() ?? "";

  // ── Count query ──────────────────────────────────────────────────────────
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM   "CandidateProfile" cp
    WHERE  cp.headline IS NOT NULL
      AND  cp.headline != ''
      AND  ${KEYWORD_WHERE}
  `;

  const countRows = await prisma.$queryRawUnsafe<RawCountRow[]>(
    countSql,
    q  // $1 — location is a ranking boost only, not a filter, so not used in count
  );

  // PostgreSQL COUNT returns bigint — coerce to number
  const total = Number(countRows[0]?.total ?? 0);

  if (total === 0) {
    return { results: [], total: 0, page, totalPages: 0 };
  }

  // ── Main search query ────────────────────────────────────────────────────
  const searchSql = `
    WITH scored AS (
      SELECT
        cp.candidate_id,
        u.full_name,
        cp.headline,
        cp.city,
        cp.location,
        cp.profile_picture_url,
        cp.skills,
        cp.about_me,
        ${SCORE_EXPR}        AS keyword_score,
        ${COMPLETENESS_EXPR} AS completeness_score
      FROM   "CandidateProfile" cp
      INNER JOIN "User" u ON u.user_id = cp.candidate_id
      WHERE  cp.headline IS NOT NULL
        AND  cp.headline != ''
        AND  ${KEYWORD_WHERE}
    )
    SELECT
      candidate_id,
      full_name,
      headline,
      city,
      location,
      profile_picture_url,
      skills,
      about_me,
      CASE WHEN $1 = ''
        THEN completeness_score
        ELSE keyword_score
      END AS match_score
    FROM scored
    ORDER BY
      CASE WHEN $1 = ''
        THEN completeness_score
        ELSE keyword_score
      END DESC,
      -- Tie-break: completeness (profiles with more data rank higher among equals)
      completeness_score DESC
    LIMIT  $3
    OFFSET $4
  `;

  const rows = await prisma.$queryRawUnsafe<RawSearchRow[]>(
    searchSql,
    q,        // $1
    location, // $2
    limit,    // $3
    skip      // $4
  );

  const GUEST_SKILLS_LIMIT  = 5;
  const GUEST_ABOUT_LIMIT   = 120;

  const results: CandidateSearchResult[] = rows.map((row) => {
    const allSkills = Array.isArray(row.skills) ? row.skills : [];

    if (isAuthenticated) {
      // Full data for signed-in users
      return {
        candidate_id:        row.candidate_id,
        full_name:           row.full_name,
        headline:            row.headline            ?? null,
        city:                row.city                ?? null,
        location:            row.location            ?? null,
        profile_picture_url: row.profile_picture_url ?? null,
        skills:              allSkills,
        about_me:            row.about_me            ?? null,
        match_score:         Number(row.match_score  ?? 0),
      };
    }

    // Guest — limited preview fields only
    const aboutRaw = row.about_me ?? null;
    return {
      candidate_id:        row.candidate_id,
      full_name:           null,                                        // hidden from guests
      headline:            row.headline            ?? null,
      city:                row.city                ?? null,
      location:            row.location            ?? null,
      profile_picture_url: row.profile_picture_url ?? null,
      skills:              allSkills.slice(0, GUEST_SKILLS_LIMIT),     // top 5 only
      about_me:            aboutRaw                                     // truncated in-place
                             ? aboutRaw.slice(0, GUEST_ABOUT_LIMIT)
                             : null,
      match_score:         Number(row.match_score  ?? 0),
    };
  });

  const totalPages = Math.ceil(total / limit);

  return { results, total, page, totalPages };
};

/* ═══════════════════════════════════════════════════════
   JOB SEARCH
═══════════════════════════════════════════════════════ */

export interface JobSearchResult {
  job_id: string;
  title: string;
  location: string;
  description: string;
  salary_range: string | null;
  required_skills: string[];
  job_type: string | null;
  experience_level: string | null;
  remote_option: string | null;
  department: string | null;
  created_at: string;
  company_name: string | null;
  logo_url: string | null;
}

export interface JobSearchResponse {
  results: JobSearchResult[];
  total: number;
  page: number;
  totalPages: number;
}

export interface JobSearchParams extends SearchParams {
  /** e.g. "full_time" | "part_time" | "contract" | "internship" */
  jobType?: string;
  /** when true, only fully_remote jobs */
  remote?: boolean;
}

interface RawJobRow {
  job_id: string;
  title: string;
  location: string;
  description: string;
  salary_range: string | null;
  required_skills: string[] | null;
  job_type: string | null;
  experience_level: string | null;
  remote_option: string | null;
  department: string | null;
  created_at: Date;
  company_name: string | null;
  logo_url: string | null;
}

interface RawJobCountRow {
  total: bigint;
}

export const searchJobs = async (
  params: JobSearchParams
): Promise<JobSearchResponse> => {
  const page     = Math.max(1, params.page  ?? 1);
  const limit    = Math.min(20, Math.max(1, params.limit ?? 12));
  const skip     = (page - 1) * limit;
  const q        = params.q?.trim()        ?? "";
  const location = params.location?.trim() ?? "";
  const jobType  = params.jobType?.trim()  ?? "";
  const remote   = params.remote           ?? false;

  const keywordWhere = `
    (
      $1 = ''
      OR lower(j.title)                          LIKE lower('%' || $1 || '%')
      OR lower(j.description)                    LIKE lower('%' || $1 || '%')
      OR lower(coalesce(j.department, ''))        LIKE lower('%' || $1 || '%')
      OR lower(coalesce(j.job_type, ''))          LIKE lower('%' || $1 || '%')
      OR lower(coalesce(j.experience_level, ''))  LIKE lower('%' || $1 || '%')
      OR EXISTS (
        SELECT 1 FROM unnest(j.required_skills) AS sk
        WHERE lower(sk) LIKE lower('%' || $1 || '%')
      )
    )
  `;

  // Parameters: $1=q  $2=location  $3=jobType  $4=remote
  // Count/search use these same 4; search appends $5=limit $6=skip
  const locationWhere = `($2 = '' OR lower(j.location) LIKE lower('%' || $2 || '%'))`;
  const jobTypeWhere  = `($3 = '' OR lower(j.job_type) = lower($3))`;
  const remoteWhere   = `($4 = false OR j.remote_option = 'fully_remote')`;

  const baseWhere = `
    j.status = 'ACTIVE'
    AND ${keywordWhere}
    AND ${locationWhere}
    AND ${jobTypeWhere}
    AND ${remoteWhere}
  `;

  const countSql = `
    SELECT COUNT(*)::bigint AS total
    FROM   "CompanyJob" j
    WHERE  ${baseWhere}
  `;

  const countRows = await prisma.$queryRawUnsafe<RawJobCountRow[]>(
    countSql, q, location, jobType, remote
  );
  const total = Number(countRows[0]?.total ?? 0);

  if (total === 0) {
    return { results: [], total: 0, page, totalPages: 0 };
  }

  const searchSql = `
    SELECT
      j.job_id,
      j.title,
      j.location,
      j.description,
      j.salary_range,
      j.required_skills,
      j.job_type,
      j.experience_level,
      j.remote_option,
      j.department,
      j.created_at,
      cp.company_name,
      cp.logo_url
    FROM   "CompanyJob" j
    INNER JOIN "CompanyProfile" cp ON cp.company_id = j.company_id
    WHERE  ${baseWhere}
    ORDER BY j.created_at DESC
    LIMIT  $5
    OFFSET $6
  `;

  const rows = await prisma.$queryRawUnsafe<RawJobRow[]>(
    searchSql, q, location, jobType, remote, limit, skip
  );

  const results: JobSearchResult[] = rows.map((row) => ({
    job_id:           row.job_id,
    title:            row.title,
    location:         row.location,
    description:      row.description,
    salary_range:     row.salary_range     ?? null,
    required_skills:  Array.isArray(row.required_skills) ? row.required_skills : [],
    job_type:         row.job_type         ?? null,
    experience_level: row.experience_level ?? null,
    remote_option:    row.remote_option    ?? null,
    department:       row.department       ?? null,
    created_at:       row.created_at.toISOString(),
    company_name:     row.company_name     ?? null,
    logo_url:         row.logo_url         ?? null,
  }));

  return { results, total, page, totalPages: Math.ceil(total / limit) };
};
