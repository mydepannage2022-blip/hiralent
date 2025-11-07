import { z } from 'zod';
import { UpdateLocationInput, UpdateSalaryInput } from '../types/candidate.types';

export const updateLocationSchema: z.ZodSchema<UpdateLocationInput> = z.object({
  location: z.string().min(1, 'Location is required').max(100, 'Location must be 100 characters or less').optional(),
  postalCode: z.number().min(1, 'Postal code is required').max(99999999, 'Postal code must be 8 digits or less').optional(),
});



export const updateSalarySchema: z.ZodSchema<UpdateSalaryInput> = z.object({
  minimumSalary: z.number().min(0, 'Minimum salary must be non-negative').optional(),
  paymentPeriod: z.enum(['monthly', 'yearly', 'weekly']).optional(), // 👈 make optional
});

export const updateHeadlineSchema = z.object({
  headline: z.string()
    .min(1, "Headline is required")
    .max(120, "Headline cannot exceed 120 characters")
    .trim()
    .refine(
      (val) => val.length > 0, 
      { message: "Headline cannot be empty" }
    )
});



// Basic Info Schema
export const updateBasicInfoSchema = z.object({
  full_name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"), 
  phone_number: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number must be 20 digits or less")
    .regex(/^[+]?[0-9\s\-()]+$/, "Invalid phone number format")
    .optional(),
  location: z.string()                                 
    .max(255, "Location must be 255 characters or less")
    .optional(),
  about_me: z.string()
    .max(500, "About me must be 500 characters or less")
    .optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

// Single Skill Schema
export const skillSchema = z.object({
  skill_name: z.string().min(1, "Skill name is required").max(50),
  skill_category: z.enum(['technical', 'soft', 'language', 'certification']),
  proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  years_experience: z.coerce.number().min(0).max(1000).optional(), // 👈 fix: accept string or number
});


// Skills Update Schema
export const updateSkillsSchema = z.object({
  skills: z.array(skillSchema)
    .max(1000, "Maximum 100 skills allowed") // 👈 min(1) hata diya, taake empty array bhi chale
});

// Add Single Skill Schema
export const addSkillSchema = skillSchema;

// Single Experience Schema
// In candidate.schema.ts
export const experienceSchema = z.object({
  job_title: z.string().min(1, "Job title is required").max(100),
  company: z.string().min(1, "Company name is required").max(100),

  duration: z.string().max(50).nullable().optional(),
  years: z.coerce.number().min(0).max(50).nullable().optional(),
  description: z.string().min(10).max(1000).nullable().optional(),
  currently_working: z.coerce.boolean().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
});
// Experience Update Schema
export const updateExperienceSchema = z.object({
  experiences: z.array(experienceSchema)
    .min(1, "At least one experience is required")
    .max(20, "Maximum 20 experiences allowed")
});

// Add Single Experience Schema
export const addExperienceSchema = experienceSchema;

// Single Education Schema
export const educationSchema = z.object({
  degree: z.string().min(1, "Degree is required").max(100),
  institution: z.string().min(1, "Institution is required").max(150),

  year: z.string().max(20).nullable().optional(),
  field: z.string().max(100).nullable().optional(),
  grade: z.string().max(200).nullable().optional(),
  currently_studying: z.coerce.boolean().nullable().optional(),
});

// Education Update Schema
export const updateEducationSchema = z.object({
  education: z.array(educationSchema)
    .min(1, "At least one education entry is required")
    .max(10, "Maximum 10 education entries allowed")
});

// Add Single Education Schema
export const addEducationSchema = educationSchema;

// Bulk Profile Update Schema
export const bulkProfileUpdateSchema = z.object({
  basic_info: updateBasicInfoSchema.optional(),
  skills: z.array(skillSchema).max(50).optional(),
  experience: z.array(experienceSchema).max(20).optional(),
  education: z.array(educationSchema).max(10).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one section must be provided" }
);

// Social Links Schema
export const socialLinkSchema = z.object({
  platform: z.enum([
    'github', 'linkedin', 'portfolio', 'twitter', 
    'behance', 'dribbble', 'other'
  ]),
  url: z.string()
    .url("Invalid URL format")
    .max(255, "URL must be 255 characters or less"),
  display_name: z.string()
    .max(50, "Display name must be 50 characters or less")
    .optional()
});

export const updateLinksSchema = z.object({
  links: z.array(socialLinkSchema)
    .max(10, "Maximum 10 links allowed")
});

// Job Benefits Schema
export const jobBenefitSchema = z.object({
  benefit_type: z.enum([
    'health_insurance', 'dental_insurance', 'vision_insurance',
    'retirement_401k', 'paid_time_off', 'flexible_hours',
    'remote_work', 'professional_development', 'gym_membership',
    'stock_options', 'bonus_structure', 'other'
  ]),
  importance: z.enum(['required', 'preferred', 'nice_to_have']),
  notes: z.string()
    .max(200, "Notes must be 200 characters or less")
    .optional()
});

export const updateJobBenefitsSchema = z.object({
  job_benefits: z.array(jobBenefitSchema)
    .max(20, "Maximum 20 benefits allowed")
});
