"use client";

import type {
  ExternalCandidateDetailsDTO,
  ExternalCandidateListItemDTO,
} from "@/src/types/company.candidates.external.types";

import type {
  InternalCandidateListItemDTO,
  InternalCandidateFullProfileDTO,
} from "@/src/types/company.candidates.internal.types";
import { API_HOST } from "@/src/lib/config/api";

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

export type CompanyJobOption = {
  job_id: string;
  title: string;
};

function readTokenFromStorage(key: string): string {
  const v =
    (typeof window !== "undefined" && localStorage.getItem(key)) ||
    (typeof window !== "undefined" && sessionStorage.getItem(key)) ||
    "";

  if (!v) return "";

  if (v.startsWith("{") || v.startsWith('"')) {
    try {
      const parsed = JSON.parse(v);
      if (typeof parsed === "string") return parsed;
      if (parsed?.token && typeof parsed.token === "string") return parsed.token;
      if (parsed?.accessToken && typeof parsed.accessToken === "string")
        return parsed.accessToken;
    } catch {
      // keep raw
    }
  }

  return v;
}

function getCompanyToken() {
  if (typeof window === "undefined") return "";

  return (
    readTokenFromStorage("authToken") ||
    readTokenFromStorage("token") ||
    readTokenFromStorage("accessToken") ||
    readTokenFromStorage("access_token") ||
    readTokenFromStorage("jwt") ||
    ""
  );
}

async function apiGet<T>(path: string): Promise<T> {
  const token = getCompanyToken();
  const base = API_HOST;

  const res = await fetch(`${base}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    const error: any = new Error(txt || `HTTP ${res.status}`);
    // Keep the parsed body: candidate ranking is a paid feature, and a 403 from the
    // subscription gate carries the code the UI needs to offer an upgrade instead of an error.
    error.status = res.status;
    try {
      error.data = JSON.parse(txt);
    } catch {
      error.data = null;
    }
    throw error;
  }

  return res.json();
}

/** -----------------------------
 *  EXTERNAL (SCRAPED)
 * ------------------------------*/
export async function listExternalCandidates(params: {
  q?: string;
  source?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<ExternalCandidateListItemDTO>> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.source) qs.set("source", params.source);
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 20));

  const raw = await apiGet<any>(
    `/api/v1/company/candidates/external?${qs.toString()}`
  );

  const items: any[] = Array.isArray(raw)
    ? raw
    : raw.items ?? raw.data?.items ?? raw.data ?? [];

  return {
    items: items.map((r: any) => ({
      source_id: r.sourced_candidate_id,
      source: r.source,
      full_name: r.full_name,
      headline: r.headline,
      location: r.location,
      city: r.city,
      skills: r.skills ?? [],
      profile_url: r.source_profile_url ?? null,
      status: r.status ?? null,
      fit_score: r.fit_score ?? null,
    })),
    page: raw.page ?? raw.data?.page ?? 1,
    limit: raw.limit ?? raw.data?.limit ?? 20,
    total: raw.total ?? raw.data?.total ?? items.length ?? 0,
  };
}

export async function listExternalSources(): Promise<{ sources: string[] }> {
  return apiGet<{ sources: string[] }>(
    `/api/v1/company/candidates/external/sources`
  );
}

export async function getExternalCandidateDetails(
  sourceId: string
): Promise<ExternalCandidateDetailsDTO> {
  const r = await apiGet<any>(`/api/v1/company/candidates/external/${sourceId}`);

  return {
    source_id: r.sourced_candidate_id,
    source: r.source,
    full_name: r.full_name,
    headline: r.headline,
    about_me: r.about_me,
    location: r.location,
    city: r.city,
    skills: r.skills ?? [],
    links: r.links ?? null,
    email: r.email ?? null,
    phone: r.phone ?? null,
    linkedin_url: r.linkedin_url ?? null,
    source_profile_url: r.source_profile_url ?? null,
    status: r.status ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/** -----------------------------
 *  JOBS (dropdown)
 * ------------------------------*/
export async function listCompanyJobsActive(): Promise<CompanyJobOption[]> {
  const raw = await apiGet<any>(`/api/v1/jobs/company/my-jobs`);

  const items: any[] = Array.isArray(raw)
    ? raw
    : raw.items ?? raw.data?.items ?? raw.data ?? [];

  return items
    .filter((j) => String(j.status ?? "").toUpperCase() === "ACTIVE")
    .map((j) => ({
      job_id: String(j.job_id ?? j.id),
      title: String(j.title ?? j.job_title ?? "Untitled"),
    }));
}

/** -----------------------------
 *  INTERNAL RANKING (by job)
 *  GET /api/v1/company/jobs/:jobId/candidates-ranking?pool=internal
 * ------------------------------*/
export async function getInternalRankingForJob(params: {
  jobId: string;
  search?: string;
  minScore?: number;
}): Promise<{ items: InternalCandidateListItemDTO[] }> {
  const qs = new URLSearchParams();
  qs.set("pool", "internal");

  if (params.search) qs.set("search", params.search);

  if (typeof params.minScore === "number" && params.minScore > 0) {
    qs.set("minScore", String(params.minScore));
    qs.set("min_score", String(params.minScore));
  }

  const raw = await apiGet<any>(
    `/api/v1/company/jobs/${params.jobId}/candidates-ranking?${qs.toString()}`
  );

  const list: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : raw?.data?.items ?? raw?.items ?? [];

  return {
    items: list.map((c: any) => ({
      candidate_id: c.candidate_id ?? c.user_id ?? c.id,
      full_name: c.full_name ?? c.name ?? null,
      headline: c.headline ?? null,
      location: c.location ?? null,
      city: c.city ?? null,
      experience_level: c.experience_level ?? null,
      skills: c.skills ?? [],
      applied_count: c.applied_count ?? c.appliedCount ?? null,
      profile_picture_url: c.profile_picture_url ?? null,
      fit_score: c.fit_score ?? c.match_score ?? null,
    })),
  };
}

/** -----------------------------
 *  INTERNAL DETAILS (FULL PROFILE)
 *  ✅ This MUST point to your new endpoint:
 *  GET /api/v1/company/candidates/internal/:candidateId
 * ------------------------------*/
export async function getInternalCandidateDetails(
  candidateId: string
): Promise<InternalCandidateFullProfileDTO> {
  return apiGet<InternalCandidateFullProfileDTO>(
    `/api/v1/company/candidates/internal/${candidateId}`
  );
}
