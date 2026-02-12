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

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000";

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

async function apiPost<T>(path: string, body?: any): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}

async function apiRequestFormData<T>(
  path: string,
  formData: FormData,
  method: "POST" | "PATCH" = "POST"
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE}${path}`, {
    method,
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
  return apiGet<CompanyProfileResponse>("/employer/profile");
}

/**
 * Get profile completeness score
 */
export async function getProfileCompleteness(): Promise<ProfileCompletenessResponse> {
  // For now, calculate on frontend or add backend endpoint
  const profileRes = await getCompanyProfile();
  const profile = profileRes.profile;
  
  // Calculate sections completion
  const sections: Record<string, boolean> = {
    basic_info: !!(profile?.company_name && profile?.description),
    contact: !!(profile?.contact_number || profile?.headquarters),
    business: !!(profile?.industry && profile?.company_size),
    hiring: !!(profile?.remote_policy || (profile?.typical_roles && profile?.typical_roles.length > 0)),
    social: !!(profile?.website || profile?.linkedin_profile),
    logo: !!profile?.logo_url,
  };
  
  const completeness = calculateCompleteness(profile);
  
  return {
    success: true,
    completeness,
    score: completeness,
    sections,
  };
}

// Helper to calculate completeness
function calculateCompleteness(profile: any): number {
  const sections = [
    { fields: ["company_name", "display_name", "description", "logo_url"], weight: 25 },
    { fields: ["contact_number", "headquarters", "full_address"], weight: 20 },
    { fields: ["industry", "company_size", "business_type", "founded_year"], weight: 20 },
    { fields: ["remote_policy", "typical_roles"], weight: 20 },
    { fields: ["website", "linkedin_profile"], weight: 15 },
  ];

  let totalScore = 0;
  for (const section of sections) {
    let filled = 0;
    for (const field of section.fields) {
      const value = profile?.[field];
      if (value !== null && value !== undefined && value !== "" && 
          !(Array.isArray(value) && value.length === 0)) {
        filled++;
      }
    }
    totalScore += (filled / section.fields.length) * section.weight;
  }
  return Math.round(totalScore);
}

/**
 * Update company info section
 */
export async function updateCompanyInfo(
  data: UpdateCompanyInfoPayload
): Promise<CompanyProfileResponse> {
  return apiPatch<CompanyProfileResponse>("/employer/profile/company-info", data);
}

/**
 * Update contact section
 */
export async function updateContact(
  data: UpdateContactPayload
): Promise<CompanyProfileResponse> {
  return apiPatch<CompanyProfileResponse>("/employer/profile/contact", data);
}

/**
 * Update business details section
 */
export async function updateBusinessDetails(
  data: UpdateBusinessPayload
): Promise<CompanyProfileResponse> {
  return apiPatch<CompanyProfileResponse>("/employer/profile/business-details", data);
}

/**
 * Update hiring preferences section
 */
export async function updateHiringPreferences(
  data: UpdateHiringPayload
): Promise<CompanyProfileResponse> {
  return apiPatch<CompanyProfileResponse>("/employer/profile/hiring-preferences", data);
}

/**
 * Update social links section
 */
export async function updateSocialLinks(
  data: UpdateSocialLinksPayload
): Promise<CompanyProfileResponse> {
  return apiPatch<CompanyProfileResponse>("/employer/profile/social-links", data);
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
    "/employer/profile/logo",
    formData,
    "POST"
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
    "/employer/profile/cover",
    formData,
    "POST"
  );
}

/**
 * Remove company logo
 */
export async function removeCompanyLogo(): Promise<CompanyProfileResponse> {
  return apiDelete<CompanyProfileResponse>("/employer/profile/logo");
}

/**
 * Remove company cover
 */
export async function removeCompanyCover(): Promise<CompanyProfileResponse> {
  return apiDelete<CompanyProfileResponse>("/employer/profile/cover");
}

// ==================== PUBLIC PROFILE ====================

/**
 * Get public company profile by slug (no auth required)
 */
export async function getPublicCompanyProfile(
  slug: string
): Promise<PublicCompanyProfileResponse> {
  const res = await fetch(`${BASE}/employer/public/${slug}`, {
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
  const path = `/employer/public/${slug}/jobs${query ? `?${query}` : ""}`;

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

/**
 * Check slug availability
 */
export async function checkSlugAvailability(
  slug: string
): Promise<{ available: boolean; suggestion?: string }> {
  return apiGet<{ available: boolean; suggestion?: string }>(
    `/employer/check-slug/${slug}`
  );
}
