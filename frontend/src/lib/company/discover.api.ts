// frontend/src/lib/company/discover.api.ts
//
// Public "discover companies" directory API. Backs /company/discover.
// Endpoint: GET /api/v1/employer/public/companies (no auth required).

import { API_V1_BASE } from "@/src/lib/config/api";

export interface DiscoverCompany {
  // The internal company_id/PK is intentionally not returned by the public list API
  // (Wave 4 review, F3). Navigate by `slug` (or company_name).
  company_name: string | null;
  display_name: string | null;
  slug: string | null;
  tagline: string | null;
  industry: string | null;
  company_size: string | null;
  headquarters: string | null;
  logo_url: string | null;
  banner_url: string | null;
  verified: boolean;
  rating: number | null;
  active_jobs_count: number;
}

export interface DiscoverPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DiscoverFilters {
  search?: string;
  location?: string;
  page?: number;
  limit?: number;
}

export interface DiscoverCompaniesResult {
  companies: DiscoverCompany[];
  pagination: DiscoverPagination;
}

const EMPTY: DiscoverCompaniesResult = {
  companies: [],
  pagination: { total: 0, page: 1, limit: 12, totalPages: 1 },
};

export async function getDiscoverCompanies(
  filters: DiscoverFilters = {}
): Promise<DiscoverCompaniesResult> {
  const qs = new URLSearchParams();
  if (filters.search) qs.set("search", filters.search);
  if (filters.location) qs.set("location", filters.location);
  if (filters.page) qs.set("page", String(filters.page));
  if (filters.limit) qs.set("limit", String(filters.limit));

  const query = qs.toString();
  const res = await fetch(
    `${API_V1_BASE}/employer/public/companies${query ? `?${query}` : ""}`,
    { method: "GET", headers: { Accept: "application/json" } }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  const json = await res.json();
  // Envelope: { success, data: { companies, pagination } }
  return (json?.data as DiscoverCompaniesResult) ?? EMPTY;
}
