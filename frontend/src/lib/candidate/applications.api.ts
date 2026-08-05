// frontend/src/lib/candidate/applications.api.ts
import axios from "axios";
import type {
  ApplyToJobPayload,
  ApplyToJobResponse,
  CandidateApplicationsListResponse,
  ApplicationTimelineResponse,
} from "../../types/candidate.applications.types";
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

export async function apiApplyToJob(payload: ApplyToJobPayload): Promise<ApplyToJobResponse> {
  const url = `${BASE_URL}/api/v1/candidate/applications/apply`;
  const { data } = await axios.post(url, payload, { headers: { ...authHeaders() } });
  return data;
}

export async function apiListMyApplications(): Promise<{ ok: boolean } & CandidateApplicationsListResponse> {
  const url = `${BASE_URL}/api/v1/candidate/applications`;
  const { data } = await axios.get(url, { headers: { ...authHeaders() } });

  // backend returns: { ok: true, total, items }
  return data;
}

export async function apiApplicationTimeline(appId: string): Promise<{ ok: boolean } & ApplicationTimelineResponse> {
  const url = `${BASE_URL}/api/v1/candidate/applications/${appId}/timeline`;
  const { data } = await axios.get(url, { headers: { ...authHeaders() } });

  // backend returns: { ok: true, application, timeline }
  return data;
}
