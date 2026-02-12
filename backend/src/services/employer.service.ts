// backend/src/services/employer.service.ts

import { supabase } from "../config/supabase";
import {
  CompanyProfile,
  PublicCompanyProfile,
  UpdateCompanyInfoPayload,
  UpdateContactPayload,
  UpdateBusinessDetailsPayload,
  UpdateHiringPreferencesPayload,
  UpdateSocialLinksPayload,
  PROFILE_SECTIONS,
} from "../types/employer.types";

// Helper: Calculate profile completeness
export const calculateProfileCompleteness = (profile: Partial<CompanyProfile>): number => {
  let totalScore = 0;

  for (const section of PROFILE_SECTIONS) {
    let filledFields = 0;

    for (const field of section.fields) {
      const value = (profile as any)[field];
      if (value !== null && value !== undefined && value !== "" && 
          !(Array.isArray(value) && value.length === 0)) {
        filledFields++;
      }
    }

    const sectionScore = (filledFields / section.fields.length) * section.weight;
    totalScore += sectionScore;
  }

  return Math.round(totalScore);
};

// Helper: Get company_id from user_id
export const getCompanyIdFromUserId = async (user_id: string): Promise<string> => {
  // First check if user is company admin
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, role, company_id")
    .eq("id", user_id)
    .single();

  if (userError || !userData) {
    throw new Error("User not found");
  }

  // If user has company_id (sub-account/HR), use that
  if (userData.company_id) {
    return userData.company_id;
  }

  // If user is company admin, find their company profile
  const { data: companyProfile, error: profileError } = await supabase
    .from("company_profiles")
    .select("id")
    .eq("user_id", user_id)
    .single();

  if (profileError || !companyProfile) {
    throw new Error("Company profile not found");
  }

  return companyProfile.id;
};

// Get full company profile (for dashboard)
export const getCompanyProfile = async (user_id: string): Promise<CompanyProfile> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const { data, error } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", company_id)
    .single();

  if (error || !data) {
    throw new Error("Company profile not found");
  }

  return data as CompanyProfile;
};

// Update company info section
export const updateCompanyInfo = async (
  user_id: string,
  payload: UpdateCompanyInfoPayload
): Promise<CompanyProfile> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  // If slug is being updated, check availability
  if (payload.slug) {
    const { data: existingSlug } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("slug", payload.slug)
      .neq("id", company_id)
      .single();

    if (existingSlug) {
      throw new Error("This slug is already taken");
    }
  }

  // Get current profile for completeness calculation
  const { data: currentProfile } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", company_id)
    .single();

  const updatedData = { ...currentProfile, ...payload };
  const profile_completeness = calculateProfileCompleteness(updatedData);

  const { data, error } = await supabase
    .from("company_profiles")
    .update({
      ...payload,
      profile_completeness,
      updated_at: new Date().toISOString(),
    })
    .eq("id", company_id)
    .select()
    .single();

  if (error) {
    console.error("Update company info error:", error);
    throw new Error("Failed to update company info");
  }

  return data as CompanyProfile;
};

// Update contact section
export const updateContact = async (
  user_id: string,
  payload: UpdateContactPayload
): Promise<CompanyProfile> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const { data: currentProfile } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", company_id)
    .single();

  const updatedData = { ...currentProfile, ...payload };
  const profile_completeness = calculateProfileCompleteness(updatedData);

  const { data, error } = await supabase
    .from("company_profiles")
    .update({
      ...payload,
      profile_completeness,
      updated_at: new Date().toISOString(),
    })
    .eq("id", company_id)
    .select()
    .single();

  if (error) {
    console.error("Update contact error:", error);
    throw new Error("Failed to update contact details");
  }

  return data as CompanyProfile;
};

// Update business details section
export const updateBusinessDetails = async (
  user_id: string,
  payload: UpdateBusinessDetailsPayload
): Promise<CompanyProfile> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const { data: currentProfile } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", company_id)
    .single();

  const updatedData = { ...currentProfile, ...payload };
  const profile_completeness = calculateProfileCompleteness(updatedData);

  const { data, error } = await supabase
    .from("company_profiles")
    .update({
      ...payload,
      profile_completeness,
      updated_at: new Date().toISOString(),
    })
    .eq("id", company_id)
    .select()
    .single();

  if (error) {
    console.error("Update business details error:", error);
    throw new Error("Failed to update business details");
  }

  return data as CompanyProfile;
};

// Update hiring preferences section
export const updateHiringPreferences = async (
  user_id: string,
  payload: UpdateHiringPreferencesPayload
): Promise<CompanyProfile> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const { data: currentProfile } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", company_id)
    .single();

  const updatedData = { ...currentProfile, ...payload };
  const profile_completeness = calculateProfileCompleteness(updatedData);

  const { data, error } = await supabase
    .from("company_profiles")
    .update({
      ...payload,
      profile_completeness,
      updated_at: new Date().toISOString(),
    })
    .eq("id", company_id)
    .select()
    .single();

  if (error) {
    console.error("Update hiring preferences error:", error);
    throw new Error("Failed to update hiring preferences");
  }

  return data as CompanyProfile;
};

// Update social links section
export const updateSocialLinks = async (
  user_id: string,
  payload: UpdateSocialLinksPayload
): Promise<CompanyProfile> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const { data: currentProfile } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", company_id)
    .single();

  const updatedData = { ...currentProfile, ...payload };
  const profile_completeness = calculateProfileCompleteness(updatedData);

  const { data, error } = await supabase
    .from("company_profiles")
    .update({
      ...payload,
      profile_completeness,
      updated_at: new Date().toISOString(),
    })
    .eq("id", company_id)
    .select()
    .single();

  if (error) {
    console.error("Update social links error:", error);
    throw new Error("Failed to update social links");
  }

  return data as CompanyProfile;
};

// Upload logo
export const uploadLogo = async (
  user_id: string,
  file: Express.Multer.File
): Promise<{ logo_url: string }> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  // Delete old logo if exists
  const { data: currentProfile } = await supabase
    .from("company_profiles")
    .select("logo_url")
    .eq("id", company_id)
    .single();

  if (currentProfile?.logo_url) {
    const oldPath = currentProfile.logo_url.split("/").pop();
    if (oldPath) {
      await supabase.storage.from("company-assets").remove([`logos/${oldPath}`]);
    }
  }

  // Upload new logo
  const fileExt = file.originalname.split(".").pop();
  const fileName = `${company_id}-${Date.now()}.${fileExt}`;
  const filePath = `logos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("company-assets")
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (uploadError) {
    console.error("Logo upload error:", uploadError);
    throw new Error("Failed to upload logo");
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("company-assets")
    .getPublicUrl(filePath);

  const logo_url = urlData.publicUrl;

  // Update profile with completeness recalculation
  const { data: fullProfile } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", company_id)
    .single();

  const updatedData = { ...fullProfile, logo_url };
  const profile_completeness = calculateProfileCompleteness(updatedData);

  // Update profile
  await supabase
    .from("company_profiles")
    .update({
      logo_url,
      profile_completeness,
      updated_at: new Date().toISOString(),
    })
    .eq("id", company_id);

  return { logo_url };
};

// Remove logo
export const removeLogo = async (user_id: string): Promise<void> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const { data: currentProfile } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", company_id)
    .single();

  if (currentProfile?.logo_url) {
    const oldPath = currentProfile.logo_url.split("/").pop();
    if (oldPath) {
      await supabase.storage.from("company-assets").remove([`logos/${oldPath}`]);
    }
  }

  const updatedData = { ...currentProfile, logo_url: null };
  const profile_completeness = calculateProfileCompleteness(updatedData);

  await supabase
    .from("company_profiles")
    .update({
      logo_url: null,
      profile_completeness,
      updated_at: new Date().toISOString(),
    })
    .eq("id", company_id);
};

// Upload cover image
export const uploadCover = async (
  user_id: string,
  file: Express.Multer.File
): Promise<{ cover_image_url: string }> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  // Delete old cover if exists
  const { data: currentProfile } = await supabase
    .from("company_profiles")
    .select("cover_image_url")
    .eq("id", company_id)
    .single();

  if (currentProfile?.cover_image_url) {
    const oldPath = currentProfile.cover_image_url.split("/").pop();
    if (oldPath) {
      await supabase.storage.from("company-assets").remove([`covers/${oldPath}`]);
    }
  }

  // Upload new cover
  const fileExt = file.originalname.split(".").pop();
  const fileName = `${company_id}-${Date.now()}.${fileExt}`;
  const filePath = `covers/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("company-assets")
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (uploadError) {
    console.error("Cover upload error:", uploadError);
    throw new Error("Failed to upload cover image");
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("company-assets")
    .getPublicUrl(filePath);

  const cover_image_url = urlData.publicUrl;

  // Update profile
  await supabase
    .from("company_profiles")
    .update({
      cover_image_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", company_id);

  return { cover_image_url };
};

// Remove cover image
export const removeCover = async (user_id: string): Promise<void> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const { data: currentProfile } = await supabase
    .from("company_profiles")
    .select("cover_image_url")
    .eq("id", company_id)
    .single();

  if (currentProfile?.cover_image_url) {
    const oldPath = currentProfile.cover_image_url.split("/").pop();
    if (oldPath) {
      await supabase.storage.from("company-assets").remove([`covers/${oldPath}`]);
    }
  }

  await supabase
    .from("company_profiles")
    .update({
      cover_image_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", company_id);
};

// Check slug availability
export const checkSlugAvailability = async (
  slug: string,
  exclude_company_id?: string
): Promise<{ available: boolean; suggestion?: string }> => {
  let query = supabase
    .from("company_profiles")
    .select("id, slug")
    .eq("slug", slug);

  if (exclude_company_id) {
    query = query.neq("id", exclude_company_id);
  }

  const { data } = await query.single();

  if (!data) {
    return { available: true };
  }

  // Generate suggestion
  const suggestion = `${slug}-${Math.floor(Math.random() * 1000)}`;
  return { available: false, suggestion };
};

// Get public company profile by slug
export const getPublicCompanyProfile = async (
  slug: string
): Promise<PublicCompanyProfile | null> => {
  const { data, error } = await supabase
    .from("company_profiles")
    .select(`
      id,
      company_name,
      slug,
      tagline,
      description,
      logo_url,
      cover_image_url,
      location,
      industry,
      company_size,
      company_type,
      founded_year,
      work_types,
      benefits,
      tech_stack,
      culture_description,
      website,
      linkedin_url,
      twitter_url,
      facebook_url,
      instagram_url,
      youtube_url,
      is_verified
    `)
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data as PublicCompanyProfile;
};

// Get public company jobs
export const getPublicCompanyJobs = async (
  slug: string,
  page: number = 1,
  limit: number = 10
): Promise<{ jobs: any[]; total: number; page: number; totalPages: number }> => {
  // First get company id from slug
  const { data: company } = await supabase
    .from("company_profiles")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!company) {
    return { jobs: [], total: 0, page: 1, totalPages: 0 };
  }

  const offset = (page - 1) * limit;

  // Get total count
  const { count } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company.id)
    .eq("status", "published");

  // Get jobs
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(`
      id,
      title,
      slug,
      location,
      work_type,
      employment_type,
      experience_level,
      salary_min,
      salary_max,
      salary_currency,
      skills,
      created_at
    `)
    .eq("company_id", company.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Get public company jobs error:", error);
    throw new Error("Failed to get company jobs");
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    jobs: jobs || [],
    total,
    page,
    totalPages,
  };
};
