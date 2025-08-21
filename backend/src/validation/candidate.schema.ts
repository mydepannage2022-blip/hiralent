import { z } from 'zod';
import { UpdateLocationInput, UpdateSalaryInput } from '../types/candidate.types';

export const updateLocationSchema: z.ZodSchema<UpdateLocationInput> = z.object({
  location: z.string().min(1, 'Location is required').max(100, 'Location must be 100 characters or less').optional(),
  postalCode: z.number().min(1, 'Postal code is required').max(99999999, 'Postal code must be 8 digits or less').optional(),
}).strict();



export const updateSalarySchema: z.ZodSchema<UpdateSalaryInput> = z.object({
  minimumSalary: z.number().min(0, 'Minimum salary must be non-negative').optional(),
  paymentPeriod: z.enum(['monthly', 'yearly', 'weekly']).optional(), // 👈 make optional
}).strict();

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
    .max(100, "Name must be 100 characters or less")
    .optional(),
  phone_number: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number must be 20 digits or less")
    .regex(/^[+]?[0-9\s\-()]+$/, "Invalid phone number format")
    .optional(),
  email: z.string()
    .email("Invalid email format")
    .max(255, "Email must be 255 characters or less")
    .optional()
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

// Single Skill Schema
export const skillSchema = z.object({
  skill_name: z.string()
    .min(1, "Skill name is required")
    .max(50, "Skill name must be 50 characters or less"),
  skill_category: z.enum(['technical', 'soft', 'language', 'certification'], {
    required_error: "Skill category is required"
  }),
  proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert'], {
    required_error: "Proficiency level is required"
  }),
  years_experience: z.number()
    .min(0, "Years of experience must be non-negative")
    .max(50, "Years of experience must be 50 or less")
    .optional()
}).strict();

// Skills Update Schema
export const updateSkillsSchema = z.object({
  skills: z.array(skillSchema)
    .min(1, "At least one skill is required")
    .max(50, "Maximum 50 skills allowed")
}).strict();

// Add Single Skill Schema
export const addSkillSchema = skillSchema;

// Single Experience Schema
export const experienceSchema = z.object({
  job_title: z.string()
    .min(1, "Job title is required")
    .max(100, "Job title must be 100 characters or less"),
  company: z.string()
    .min(1, "Company name is required")
    .max(100, "Company name must be 100 characters or less"),
  duration: z.string()
    .min(1, "Duration is required")
    .max(50, "Duration must be 50 characters or less"),
  years: z.number()
    .min(0, "Years must be non-negative")
    .max(50, "Years must be 50 or less"),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be 1000 characters or less"),
  currently_working: z.boolean().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional()
}).strict();

// Experience Update Schema
export const updateExperienceSchema = z.object({
  experiences: z.array(experienceSchema)
    .min(1, "At least one experience is required")
    .max(20, "Maximum 20 experiences allowed")
}).strict();

// Add Single Experience Schema
export const addExperienceSchema = experienceSchema;

// Single Education Schema
export const educationSchema = z.object({
  degree: z.string()
    .min(1, "Degree is required")
    .max(100, "Degree must be 100 characters or less"),
  institution: z.string()
    .min(1, "Institution name is required")
    .max(150, "Institution name must be 150 characters or less"),
  year: z.string()
    .min(1, "Year is required")
    .max(20, "Year must be 20 characters or less"),
  field: z.string()
    .min(1, "Field of study is required")
    .max(100, "Field must be 100 characters or less"),
  grade: z.string()
    .max(20, "Grade must be 20 characters or less")
    .optional(),
  currently_studying: z.boolean().optional()
}).strict();

// Education Update Schema
export const updateEducationSchema = z.object({
  education: z.array(educationSchema)
    .min(1, "At least one education entry is required")
    .max(10, "Maximum 10 education entries allowed")
}).strict();

// Add Single Education Schema
export const addEducationSchema = educationSchema;

// Bulk Profile Update Schema
export const bulkProfileUpdateSchema = z.object({
  basic_info: updateBasicInfoSchema.optional(),
  skills: z.array(skillSchema).max(50).optional(),
  experience: z.array(experienceSchema).max(20).optional(),
  education: z.array(educationSchema).max(10).optional()
}).strict().refine(
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
}).strict();

export const updateLinksSchema = z.object({
  links: z.array(socialLinkSchema)
    .max(10, "Maximum 10 links allowed")
}).strict();

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
}).strict();

export const updateJobBenefitsSchema = z.object({
  job_benefits: z.array(jobBenefitSchema)
    .max(20, "Maximum 20 benefits allowed")
}).strict();