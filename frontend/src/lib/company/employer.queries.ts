// frontend/src/lib/company/employer.queries.ts

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCompanyProfile,
  getProfileCompleteness,
  updateCompanyInfo,
  updateContact,
  updateBusinessDetails,
  updateHiringPreferences,
  updateSocialLinks,
  uploadCompanyLogo,
  uploadCompanyCover,
  removeCompanyLogo,
  removeCompanyCover,
  getPublicCompanyProfile,
  getPublicCompanyJobs,
} from "./employer.api";
import type {
  UpdateCompanyInfoPayload,
  UpdateContactPayload,
  UpdateBusinessPayload,
  UpdateHiringPayload,
  UpdateSocialLinksPayload,
} from "@/src/types/employer.types";

// ==================== QUERY KEYS ====================

export const employerKeys = {
  all: ["employer"] as const,
  profile: () => [...employerKeys.all, "profile"] as const,
  completeness: () => [...employerKeys.all, "completeness"] as const,
  public: (slug: string) => [...employerKeys.all, "public", slug] as const,
  publicJobs: (slug: string) => [...employerKeys.all, "public", slug, "jobs"] as const,
};

// ==================== QUERIES ====================

/**
 * Get current company profile (authenticated)
 */
export function useCompanyProfile() {
  return useQuery({
    queryKey: employerKeys.profile(),
    queryFn: getCompanyProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get profile completeness score
 */
export function useProfileCompleteness() {
  return useQuery({
    queryKey: employerKeys.completeness(),
    queryFn: getProfileCompleteness,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get public company profile by slug
 */
export function usePublicCompanyProfile(slug: string) {
  return useQuery({
    queryKey: employerKeys.public(slug),
    queryFn: () => getPublicCompanyProfile(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get public company jobs
 */
export function usePublicCompanyJobs(
  slug: string,
  params?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: [...employerKeys.publicJobs(slug), params],
    queryFn: () => getPublicCompanyJobs(slug, params),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== MUTATIONS ====================

/**
 * Update company info section
 */
export function useUpdateCompanyInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCompanyInfoPayload) => updateCompanyInfo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.profile() });
      queryClient.invalidateQueries({ queryKey: employerKeys.completeness() });
    },
  });
}

/**
 * Update contact section
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateContactPayload) => updateContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.profile() });
      queryClient.invalidateQueries({ queryKey: employerKeys.completeness() });
    },
  });
}

/**
 * Update business details section
 */
export function useUpdateBusinessDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateBusinessPayload) => updateBusinessDetails(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.profile() });
      queryClient.invalidateQueries({ queryKey: employerKeys.completeness() });
    },
  });
}

/**
 * Update hiring preferences section
 */
export function useUpdateHiringPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateHiringPayload) => updateHiringPreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.profile() });
      queryClient.invalidateQueries({ queryKey: employerKeys.completeness() });
    },
  });
}

/**
 * Update social links section
 */
export function useUpdateSocialLinks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSocialLinksPayload) => updateSocialLinks(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.profile() });
      queryClient.invalidateQueries({ queryKey: employerKeys.completeness() });
    },
  });
}

/**
 * Upload company logo
 */
export function useUploadCompanyLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadCompanyLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.profile() });
      queryClient.invalidateQueries({ queryKey: employerKeys.completeness() });
    },
  });
}

/**
 * Upload company cover image
 */
export function useUploadCompanyCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadCompanyCover(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.profile() });
      queryClient.invalidateQueries({ queryKey: employerKeys.completeness() });
    },
  });
}

/**
 * Remove company logo
 */
export function useRemoveCompanyLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => removeCompanyLogo(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.profile() });
      queryClient.invalidateQueries({ queryKey: employerKeys.completeness() });
    },
  });
}

/**
 * Remove company cover
 */
export function useRemoveCompanyCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => removeCompanyCover(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.profile() });
      queryClient.invalidateQueries({ queryKey: employerKeys.completeness() });
    },
  });
}
