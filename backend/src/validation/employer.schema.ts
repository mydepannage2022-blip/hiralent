// backend/src/validation/employer.schema.ts

import { z } from "zod";

// Slug validation - lowercase, alphanumeric, hyphens only
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// URL validation helper
const urlSchema = z
  .string()
  .url("Invalid URL format")
  .or(z.literal(""))
  .optional()
  .transform((val) => (val === "" ? undefined : val));

// Phone validation - flexible international format
const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;

// Company Info Schema
export const updateCompanyInfoSchema = z.object({
  company_name: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters")
    .optional(),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug must be less than 50 characters")
    .regex(slugRegex, "Slug can only contain lowercase letters, numbers, and hyphens")
    .optional(),
  tagline: z
    .string()
    .max(150, "Tagline must be less than 150 characters")
    .optional()
    .nullable(),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional()
    .nullable(),
});

// Contact Schema
export const updateContactSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .optional()
    .nullable(),
  phone: z
    .string()
    .regex(phoneRegex, "Invalid phone number format")
    .or(z.literal(""))
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  location: z
    .string()
    .max(100, "Location must be less than 100 characters")
    .optional()
    .nullable(),
  address: z
    .string()
    .max(300, "Address must be less than 300 characters")
    .optional()
    .nullable(),
});

// Business Details Schema
export const updateBusinessDetailsSchema = z.object({
  industry: z
    .string()
    .max(50, "Industry must be less than 50 characters")
    .optional()
    .nullable(),
  company_size: z
    .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"])
    .optional()
    .nullable(),
  company_type: z
    .enum(["Private", "Public", "Startup", "Non-Profit", "Government", "Agency", "Consultancy"])
    .optional()
    .nullable(),
  founded_year: z
    .number()
    .int()
    .min(1800, "Founded year must be after 1800")
    .max(new Date().getFullYear(), "Founded year cannot be in the future")
    .optional()
    .nullable(),
  registration_number: z
    .string()
    .max(50, "Registration number must be less than 50 characters")
    .optional()
    .nullable(),
  tax_id: z
    .string()
    .max(50, "Tax ID must be less than 50 characters")
    .optional()
    .nullable(),
});

// Hiring Preferences Schema
export const updateHiringPreferencesSchema = z.object({
  work_types: z
    .array(z.enum(["remote", "hybrid", "onsite"]))
    .optional()
    .nullable(),
  benefits: z
    .array(z.string().max(50))
    .max(20, "Maximum 20 benefits allowed")
    .optional()
    .nullable(),
  tech_stack: z
    .array(z.string().max(30))
    .max(30, "Maximum 30 technologies allowed")
    .optional()
    .nullable(),
  culture_description: z
    .string()
    .max(1000, "Culture description must be less than 1000 characters")
    .optional()
    .nullable(),
});

// Social Links Schema
export const updateSocialLinksSchema = z.object({
  website: urlSchema.nullable(),
  linkedin_url: z
    .string()
    .refine(
      (val) => !val || val === "" || val.includes("linkedin.com"),
      "Must be a valid LinkedIn URL"
    )
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  twitter_url: z
    .string()
    .refine(
      (val) => !val || val === "" || val.includes("twitter.com") || val.includes("x.com"),
      "Must be a valid Twitter/X URL"
    )
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  facebook_url: z
    .string()
    .refine(
      (val) => !val || val === "" || val.includes("facebook.com"),
      "Must be a valid Facebook URL"
    )
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  instagram_url: z
    .string()
    .refine(
      (val) => !val || val === "" || val.includes("instagram.com"),
      "Must be a valid Instagram URL"
    )
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  youtube_url: z
    .string()
    .refine(
      (val) => !val || val === "" || val.includes("youtube.com") || val.includes("youtu.be"),
      "Must be a valid YouTube URL"
    )
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
});

// Slug check schema
export const checkSlugSchema = z.object({
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug must be less than 50 characters")
    .regex(slugRegex, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

// File upload schemas
export const uploadLogoSchema = z.object({
  file: z.any(), // Handled by multer
});

export const uploadCoverSchema = z.object({
  file: z.any(), // Handled by multer
});

// Types from schemas
export type UpdateCompanyInfoInput = z.infer<typeof updateCompanyInfoSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type UpdateBusinessDetailsInput = z.infer<typeof updateBusinessDetailsSchema>;
export type UpdateHiringPreferencesInput = z.infer<typeof updateHiringPreferencesSchema>;
export type UpdateSocialLinksInput = z.infer<typeof updateSocialLinksSchema>;
export type CheckSlugInput = z.infer<typeof checkSlugSchema>;
