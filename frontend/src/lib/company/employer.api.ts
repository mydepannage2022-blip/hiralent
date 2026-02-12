// frontend/src/lib/company/employer.api.ts

"use client";

import type {
  CompanyProfile,
  CompanyProfileResponse,
  UpdateCompanyInfoPayload,
  UpdateContactPayload,
  UpdateBusinessPayload,
  UpdateHiringPayload,
  UpdateSocialLinksPayload,
  ProfileCompletenessResponse,
  PublicCompanyProfileResponse,
} from "@/src/types/employer.types";

// ==================== HELPERS ====================

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("authToken") || "";
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return res.json();
}

async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "GET" });
}

async function apiPatch<T>(path: string, body: any): Promise<T> {
  return apiRequest<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

async function apiRequestFormData<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ==================== COMPANY PROFILE ====================

/**
 * Get current company's full profile (authenticated)
 */
export async function getCompanyProfile(): Promise<CompanyProfileResponse> {
  return apiGet<CompanyProfileResponse>("/api/v1/company/profile");
}

/**
 * Get profile completeness score
 */
export async function getProfileCompleteness(): Promise<ProfileCompletenessResponse> {
  return apiGet<ProfileCompletenessResponse>("/api/v1/company/profile/completeness");
}

/**
 * Update company info section
 */
export async function updateCompanyInfo(
  data: UpdateCompanyInfoPayload
): Promise<CompanyProfileResponse> {
  return apiPatch<CompanyProfileResponse>("/api/v1/company/profile/info", data);
}

/**
 * Update contact section
 */
export async function updateContact(
  data: UpdateContactPayload
): Promise<CompanyProfileResponse> {
  return apiPatch<CompanyProfileResponse>("/api/v1/company/profile/contact", data);
}

/**
 * Update business details section
 */
export async function updateBusinessDetails(
  data: UpdateBusinessPayload
): Promise<CompanyProfileResponse> {
  return apiPatch<CompanyProfileResponse>("/api/v1/company/profile/business", data);
}

/**
 * Update hiring preferences section
 */
export async function updateHiringPreferences(
  data: UpdateHiringPayload
): Promise<CompanyProfileResponse> {
  return apiPatch<CompanyProfileResponse>("/api/v1/company/profile/hiring", data);
}

/**
 * Update social links section
 */
export async function updateSocialLinks(
  data: UpdateSocialLinksPayload
): Promise<CompanyProfileResponse> {
  return apiPatch<CompanyProfileResponse>("/api/v1/company/profile/social", data);
}

/**
 * Upload company logo
 */
export async function uploadCompanyLogo(
  file: File
): Promise<CompanyProfileResponse> {
  const formData = new FormData();
  formData.append("logo", file);
  return apiRequestFormData<CompanyProfileResponse>(
    "/api/v1/company/profile/logo",
    formData
  );
}

/**
 * Upload company cover image
 */
export async function uploadCompanyCover(
  file: File
): Promise<CompanyProfileResponse> {
  const formData = new FormData();
  formData.append("cover", file);
  return apiRequestFormData<CompanyProfileResponse>(
    "/api/v1/company/profile/cover",
    formData
  );
}

/**
 * Remove company logo
 */
export async function removeCompanyLogo(): Promise<CompanyProfileResponse> {
  return apiRequest<CompanyProfileResponse>("/api/v1/company/profile/logo", {
    method: "DELETE",
  });
}

/**
 * Remove company cover
 */
export async function removeCompanyCover(): Promise<CompanyProfileResponse> {
  return apiRequest<CompanyProfileResponse>("/api/v1/company/profile/cover", {
    method: "DELETE",
  });
}

// ==================== PUBLIC PROFILE ====================

/**
 * Get public company profile by slug (no auth required)
 */
export async function getPublicCompanyProfile(
  slug: string
): Promise<PublicCompanyProfileResponse> {
  const res = await fetch(`${BASE}/api/v1/companies/${slug}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Get public company jobs
 */
export async function getPublicCompanyJobs(
  slug: string,
  params?: { page?: number; limit?: number }
): Promise<any> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));

  const query = qs.toString();
  const path = `/api/v1/companies/${slug}/jobs${query ? `?${query}` : ""}`;

  const res = await fetch(`${BASE}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return res.json();
}
