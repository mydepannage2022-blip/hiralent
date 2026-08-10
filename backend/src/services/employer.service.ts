// backend/src/services/employer.service.ts
import * as fs from "fs";
import * as path from "path";
import prisma from "../lib/prisma";
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
export const calculateProfileCompleteness = (profile: any): number => {
  let totalScore = 0;

  for (const section of PROFILE_SECTIONS) {
    let filledFields = 0;

    for (const field of section.fields) {
      const value = profile[field];
      if (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0)
      ) {
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
  // First check if user exists
  const user = await prisma.user.findUnique({
    where: { user_id },
    select: { 
      user_id: true, 
      role: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is a team member (sub-account/HR) via CompanyTeamMember table
  const teamMembership = await prisma.companyTeamMember.findFirst({
    where: { 
      user_id: user_id,
      is_active: true 
    },
    select: { company_id: true },
  });

  if (teamMembership) {
    return teamMembership.company_id;
  }

  // If user is company_admin, their user_id IS the company_id
  // (CompanyProfile.company_id references User.user_id)
  const companyProfile = await prisma.companyProfile.findUnique({
    where: { company_id: user_id },
    select: { company_id: true },
  });

  if (!companyProfile) {
    throw new Error("Company profile not found");
  }

  return companyProfile.company_id;
};


// Get full company profile (for dashboard)
export const getCompanyProfile = async (user_id: string): Promise<any> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const profile = await prisma.companyProfile.findUnique({
    where: { company_id },
  });

  if (!profile) {
    throw new Error("Company profile not found");
  }

  return profile;
};

// Update company info section
export const updateCompanyInfo = async (
  user_id: string,
  payload: UpdateCompanyInfoPayload
): Promise<any> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const updateData: any = {};
  
  if (payload.company_name !== undefined) {
    updateData.company_name = payload.company_name;
    updateData.display_name = payload.company_name;
  }
  if (payload.slug !== undefined) {
    updateData.slug = payload.slug;
  }
  if (payload.tagline !== undefined) {
    updateData.tagline = payload.tagline;
  }
  if (payload.description !== undefined) {
    updateData.description = payload.description;
  }

  const updatedProfile = await prisma.companyProfile.update({
    where: { company_id },
    data: {
      ...updateData,
      updated_at: new Date(),
    },
  });

  return updatedProfile;
};


// Update contact section
export const updateContact = async (
  user_id: string,
  payload: UpdateContactPayload
): Promise<any> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const updateData: any = {};

  // ADD THIS LINE ⬇️
  if (payload.email !== undefined) {
    updateData.contact_email = payload.email;
  }
  
  if (payload.phone !== undefined) {
    updateData.contact_number = payload.phone;
  }
  if (payload.location !== undefined) {
    updateData.headquarters = payload.location;
  }
  if (payload.address !== undefined) {
    updateData.full_address = payload.address;
  }

  const updatedProfile = await prisma.companyProfile.update({
    where: { company_id },
    data: {
      ...updateData,
      updated_at: new Date(),
    },
  });

  return updatedProfile;
};


// Update business details section
export const updateBusinessDetails = async (
  user_id: string,
  payload: UpdateBusinessDetailsPayload
): Promise<any> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const updateData: any = {};

  if (payload.industry !== undefined) {
    updateData.industry = payload.industry;
  }
  if (payload.company_size !== undefined) {
    updateData.company_size = payload.company_size;
  }
  if (payload.company_type !== undefined) {
    updateData.business_type = payload.company_type;
  }
  if (payload.founded_year !== undefined) {
    updateData.founded_year = payload.founded_year;
  }
  if (payload.registration_number !== undefined) {
    updateData.registration_number = payload.registration_number;
  }
  if (payload.tax_id !== undefined) {
    updateData.tax_id = payload.tax_id;
  }

  const updatedProfile = await prisma.companyProfile.update({
    where: { company_id },
    data: {
      ...updateData,
      updated_at: new Date(),
    },
  });

  return updatedProfile;
};

// Update hiring preferences section
export const updateHiringPreferences = async (
  user_id: string,
  payload: UpdateHiringPreferencesPayload
): Promise<any> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const updateData: any = {};

  if (payload.work_types !== undefined) {
    updateData.remote_policy = payload.work_types?.join(",") || null;
  }
  if (payload.tech_stack !== undefined) {
    updateData.typical_roles = payload.tech_stack;
  }
  // ADD THESE 2 LINES ⬇️
  if (payload.benefits !== undefined) {
    updateData.benefits = payload.benefits;
  }
  if (payload.culture_description !== undefined) {
    updateData.culture_description = payload.culture_description;
  }

  const updatedProfile = await prisma.companyProfile.update({
    where: { company_id },
    data: {
      ...updateData,
      updated_at: new Date(),
    },
  });

  return updatedProfile;
};


// Update social links section
export const updateSocialLinks = async (
  user_id: string,
  payload: UpdateSocialLinksPayload
): Promise<any> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const updateData: any = {};

  if (payload.website !== undefined) {
    updateData.website = payload.website;
  }
  if (payload.linkedin_url !== undefined) {
    updateData.linkedin_profile = payload.linkedin_url;
  }
  if (payload.twitter_url !== undefined) {
    updateData.twitter_handle = payload.twitter_url;
  }
  if (payload.facebook_url !== undefined) {
    updateData.facebook_page = payload.facebook_url;
  }
  // ADD THESE 2 LINES ⬇️
  if (payload.instagram_url !== undefined) {
    updateData.instagram_url = payload.instagram_url;
  }
  if (payload.youtube_url !== undefined) {
    updateData.youtube_url = payload.youtube_url;
  }

  const updatedProfile = await prisma.companyProfile.update({
    where: { company_id },
    data: {
      ...updateData,
      updated_at: new Date(),
    },
  });

  return updatedProfile;
};



// Upload logo
export const uploadLogo = async (
  user_id: string,
  file: Express.Multer.File
): Promise<{ logo_url: string }> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const fileExt = file.originalname.split(".").pop();
  const fileName = `${company_id}-${Date.now()}.${fileExt}`;
  const logo_url = `/uploads/logos/${fileName}`;

  // Ensure directory exists
  const uploadDir = path.join(process.cwd(), "uploads", "logos");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Write file to disk
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, file.buffer);

  await prisma.companyProfile.update({
    where: { company_id },
    data: {
      logo_url,
      updated_at: new Date(),
    },
  });

  return { logo_url };
};


// Remove logo
export const removeLogo = async (user_id: string): Promise<void> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  await prisma.companyProfile.update({
    where: { company_id },
    data: {
      logo_url: null,
      updated_at: new Date(),
    },
  });
};

// Upload cover image
export const uploadCover = async (
  user_id: string,
  file: Express.Multer.File
): Promise<{ cover_image_url: string }> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  const fileExt = file.originalname.split(".").pop();
  const fileName = `${company_id}-cover-${Date.now()}.${fileExt}`;
  const cover_image_url = `/uploads/covers/${fileName}`;

  // Ensure directory exists
  const uploadDir = path.join(process.cwd(), "uploads", "covers");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Write file to disk
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, file.buffer);

  await prisma.companyProfile.update({
    where: { company_id },
    data: {
      banner_url: cover_image_url,
      updated_at: new Date(),
    },
  });

  return { cover_image_url };
};


// Remove cover image
export const removeCover = async (user_id: string): Promise<void> => {
  const company_id = await getCompanyIdFromUserId(user_id);

  await prisma.companyProfile.update({
    where: { company_id },
    data: {
      banner_url: null,
      updated_at: new Date(),
    },
  });
};

// Check slug availability
export const checkSlugAvailability = async (
  slug: string,
  exclude_company_id?: string
): Promise<{ available: boolean; suggestion?: string }> => {
  const whereClause: any = {
    company_name: {
      equals: slug,
      mode: "insensitive",
    },
  };

  if (exclude_company_id) {
    whereClause.company_id = { not: exclude_company_id };
  }

  const existing = await prisma.companyProfile.findFirst({
    where: whereClause,
  });

  if (!existing) {
    return { available: true };
  }

  const suggestion = `${slug}-${Math.floor(Math.random() * 1000)}`;
  return { available: false, suggestion };
};

// Get public company profile by slug
export const getPublicCompanyProfile = async (
  slug: string
): Promise<any | null> => {
  const profile = await prisma.companyProfile.findFirst({
    where: {
      OR: [
        { slug: slug },
        { company_id: slug },
        { company_name: { equals: slug, mode: "insensitive" } },
        { display_name: { equals: slug, mode: "insensitive" } },
      ],
    },
    select: {
      company_id: true,
      company_name: true,
      display_name: true,
      description: true,
      logo_url: true,
      banner_url: true,
      headquarters: true,
      industry: true,
      company_size: true,
      business_type: true,
      founded_year: true,
      remote_policy: true,
      typical_roles: true,
      hiring_regions: true,
      website: true,
      linkedin_profile: true,
      twitter_handle: true,
      facebook_page: true,
      verified: true,
    },
  });

  return profile;
};

// Get public companies for the discovery / browse directory (no auth).
// SECURITY: CompanyProfile carries PII (contact_email, contact_number, tax_id,
// registration_number, full_address). This is a PUBLIC endpoint, so we select
// ONLY safe, public-facing fields — never spread the whole record.
export interface PublicCompanyListItem {
  // NOTE: the internal company_id (= the company User's primary key / ownership key) is
  // intentionally NOT exposed on this public, unauthenticated list. Navigation uses `slug`
  // (falling back to company_name), both of which the public resolver accepts. Exposing the
  // PK let anyone bulk-harvest the exact id used as the ownership key elsewhere (Wave 4 review).
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

export const listPublicCompanies = async (params: {
  search?: string;
  location?: string;
  page?: number;
  limit?: number;
}): Promise<{
  companies: PublicCompanyListItem[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}> => {
  const DEFAULT_LIMIT = 12;
  const MAX_LIMIT = 50; // pagination cap (Wave 2 S5)

  const page = Math.max(1, Math.floor(params.page || 1));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(params.limit || DEFAULT_LIMIT))
  );
  const skip = (page - 1) * limit;

  const search = (params.search || "").trim();
  const location = (params.location || "").trim();

  // Only profiles with a public-facing name are discoverable.
  const where: any = { company_name: { not: null } };
  const and: any[] = [];

  if (search) {
    and.push({
      OR: [
        { company_name: { contains: search, mode: "insensitive" } },
        { display_name: { contains: search, mode: "insensitive" } },
        { industry: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (location) {
    and.push({ headquarters: { contains: location, mode: "insensitive" } });
  }
  if (and.length) where.AND = and;

  const [total, rows] = await Promise.all([
    prisma.companyProfile.count({ where }),
    prisma.companyProfile.findMany({
      where,
      // SAFE FIELDS ONLY — do not add contact/tax/address/User PII here.
      select: {
        company_id: true,
        company_name: true,
        display_name: true,
        slug: true,
        tagline: true,
        industry: true,
        company_size: true,
        headquarters: true,
        logo_url: true,
        banner_url: true,
        verified: true,
        rating: true,
      },
      orderBy: [{ verified: "desc" }, { company_name: "asc" }],
      skip,
      take: limit,
    }),
  ]);

  // Accurate ACTIVE job counts for just this page (one extra query, no N+1).
  const companyIds = rows.map((r) => r.company_id);
  const jobCounts = companyIds.length
    ? await prisma.companyJob.groupBy({
        by: ["company_id"],
        where: { company_id: { in: companyIds }, status: "ACTIVE" },
        _count: { _all: true },
      })
    : [];
  const countMap = new Map<string, number>();
  for (const g of jobCounts) countMap.set(g.company_id, g._count._all);

  const companies: PublicCompanyListItem[] = rows.map((r) => ({
    company_name: r.company_name,
    display_name: r.display_name,
    slug: r.slug,
    tagline: r.tagline,
    industry: r.industry,
    company_size: r.company_size,
    headquarters: r.headquarters,
    logo_url: r.logo_url,
    banner_url: r.banner_url,
    verified: r.verified,
    rating: r.rating,
    active_jobs_count: countMap.get(r.company_id) || 0,
  }));

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { companies, pagination: { total, page, limit, totalPages } };
};

// Get public company jobs
export const getPublicCompanyJobs = async (
  slug: string,
  page: number = 1,
  limit: number = 10
): Promise<{ jobs: any[]; total: number; page: number; totalPages: number }> => {
  const company = await prisma.companyProfile.findFirst({
    where: {
      OR: [
        { slug: slug },
        { company_id: slug },
        { company_name: { equals: slug, mode: "insensitive" } },
        { display_name: { equals: slug, mode: "insensitive" } },
      ],
    },
    select: { company_id: true },
  });

  if (!company) {
    return { jobs: [], total: 0, page: 1, totalPages: 0 };
  }

  const offset = (page - 1) * limit;

  const total = await prisma.companyJob.count({
    where: {
      company_id: company.company_id,
      status: "ACTIVE",
    },
  });

  const jobs = await prisma.companyJob.findMany({
    where: {
      company_id: company.company_id,
      status: "ACTIVE",
    },
    select: {
      job_id: true,
      title: true,
      location: true,
      remote_option: true,
      job_type: true,
      experience_level: true,
      salary_range: true,
      required_skills: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
    skip: offset,
    take: limit,
  });

  const totalPages = Math.ceil(total / limit);

  return {
    jobs,
    total,
    page,
    totalPages,
  };
};
