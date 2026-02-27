import { api } from "../jobs/jobs.api";
import type {
  CandidateSearchParams,
  CandidateSearchResponse,
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
