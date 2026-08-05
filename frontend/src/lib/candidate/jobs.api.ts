// frontend/src/lib/candidate/jobs.api.ts
import axios from "axios";
import type {
  CandidateJobsPagedResponse,
  JobDetailsDTO,
  JobListQuery,
  EligibilityResult,
} from "../../types/candidate.jobs.types";
import { API_HOST } from "@/src/lib/config/api";

const BASE_URL = API_HOST;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}


function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeQuery(q: JobListQuery) {
  const params = new URLSearchParams();

  if (q.page) params.set("page", String(q.page));
  if (q.limit) params.set("limit", String(q.limit));

  if (q.level) params.set("level", q.level);
  if (q.search) params.set("search", q.search);

  if (q.eligible !== undefined) params.set("eligible", String(q.eligible));

  if (q.skills?.length) params.set("skills", q.skills.join(","));

  return params.toString();
}

export async function apiCandidateJobsList(query: JobListQuery): Promise<CandidateJobsPagedResponse> {
  const qs = normalizeQuery(query);
  const url = `${BASE_URL}/api/v1/candidate/jobs${qs ? `?${qs}` : ""}`;
  const { data } = await axios.get(url, { headers: { ...authHeaders() } });
  return data;
}

export async function apiCandidateRecommendedJobs(
  query: JobListQuery
): Promise<CandidateJobsPagedResponse> {
  const qs = normalizeQuery(query);
  const url = `${BASE_URL}/api/v1/candidate/jobs/recommended${qs ? `?${qs}` : ""}`;
  const { data } = await axios.get(url, { headers: { ...authHeaders() } });
  return data;
}

export async function apiCandidateJobEligibility(jobId: string): Promise<EligibilityResult> {
  const url = `${BASE_URL}/api/v1/candidate/jobs/${jobId}/eligibility`;
  const { data } = await axios.get(url, { headers: { ...authHeaders() } });
  return data;
}

// Candidate can call this: backend allows non-company users to view ACTIVE jobs
export async function apiJobDetails(jobId: string): Promise<JobDetailsDTO> {
  const url = `${BASE_URL}/api/v1/jobs/${jobId}`;
  const { data } = await axios.get(url, { headers: { ...authHeaders() } });

  // backend shape: { success: true, data: job }
  if (data?.data) return data.data as JobDetailsDTO;
  return data as JobDetailsDTO;
}
