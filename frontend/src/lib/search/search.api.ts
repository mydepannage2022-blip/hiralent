import { api } from "../jobs/jobs.api";
import type {
  CandidateSearchParams,
  CandidateSearchResponse,
  JobSearchParams,
  JobSearchResponse,
} from "../../types/search.types";

export const searchCandidatesApi = async (
  params: CandidateSearchParams
): Promise<CandidateSearchResponse> => {
  const urlParams = new URLSearchParams();

  if (params.q?.trim()) urlParams.set("q", params.q.trim());
  if (params.location?.trim()) urlParams.set("location", params.location.trim());
  if (params.page) urlParams.set("page", String(params.page));
  if (params.limit) urlParams.set("limit", String(params.limit));

  const response = await api.get<{
    success: boolean;
    data: CandidateSearchResponse;
  }>(`/search/candidates?${urlParams.toString()}`);

  return response.data.data;
};

export const searchJobsApi = async (
  params: JobSearchParams
): Promise<JobSearchResponse> => {
  const urlParams = new URLSearchParams();

  if (params.q?.trim()) urlParams.set("q", params.q.trim());
  if (params.location?.trim()) urlParams.set("location", params.location.trim());
  if (params.page) urlParams.set("page", String(params.page));
  if (params.limit) urlParams.set("limit", String(params.limit));
  if (params.jobType) urlParams.set("jobType", params.jobType);
  if (params.remote) urlParams.set("remote", "true");

  const response = await api.get<{
    success: boolean;
    data: JobSearchResponse;
  }>(`/search/jobs?${urlParams.toString()}`);

  return response.data.data;
};
