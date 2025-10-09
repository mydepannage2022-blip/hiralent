"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateJobBenefitsSchema = exports.jobBenefitSchema = exports.updateLinksSchema = exports.socialLinkSchema = exports.bulkProfileUpdateSchema = exports.addEducationSchema = exports.updateEducationSchema = exports.educationSchema = exports.addExperienceSchema = exports.updateExperienceSchema = exports.experienceSchema = exports.addSkillSchema = exports.updateSkillsSchema = exports.skillSchema = exports.updateBasicInfoSchema = exports.updateHeadlineSchema = exports.updateSalarySchema = exports.updateLocationSchema = void 0;
const zod_1 = require("zod");
exports.updateLocationSchema = zod_1.z.object({
    location: zod_1.z.string().min(1, 'Location is required').max(100, 'Location must be 100 characters or less').optional(),
    postalCode: zod_1.z.number().min(1, 'Postal code is required').max(99999999, 'Postal code must be 8 digits or less').optional(),
});
exports.updateSalarySchema = zod_1.z.object({
    minimumSalary: zod_1.z.number().min(0, 'Minimum salary must be non-negative').optional(),
    paymentPeriod: zod_1.z.enum(['monthly', 'yearly', 'weekly']).optional(), // 👈 make optional
});
exports.updateHeadlineSchema = zod_1.z.object({
    headline: zod_1.z.string()
        .min(1, "Headline is required")
        .max(120, "Headline cannot exceed 120 characters")
        .trim()
        .refine((val) => val.length > 0, { message: "Headline cannot be empty" })
});
// Basic Info Schema
exports.updateBasicInfoSchema = zod_1.z.object({
    full_name: zod_1.z.string()
        .min(1, "Name is required")
        .max(100, "Name must be 100 characters or less"),
    phone_number: zod_1.z.string()
        .min(10, "Phone number must be at least 10 digits")
        .max(20, "Phone number must be 20 digits or less")
        .regex(/^[+]?[0-9\s\-()]+$/, "Invalid phone number format")
        .optional(),
    location: zod_1.z.string()
        .max(255, "Location must be 255 characters or less")
        .optional(),
    about_me: zod_1.z.string()
        .max(500, "About me must be 500 characters or less")
        .optional()
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
// Single Skill Schema
exports.skillSchema = zod_1.z.object({
    skill_name: zod_1.z.string().min(1, "Skill name is required").max(50),
    skill_category: zod_1.z.enum(['technical', 'soft', 'language', 'certification']),
    proficiency: zod_1.z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    years_experience: zod_1.z.coerce.number().min(0).max(1000).optional(), // 👈 fix: accept string or number
});
// Skills Update Schema
exports.updateSkillsSchema = zod_1.z.object({
    skills: zod_1.z.array(exports.skillSchema)
        .max(1000, "Maximum 100 skills allowed") // 👈 min(1) hata diya, taake empty array bhi chale
});
// Add Single Skill Schema
exports.addSkillSchema = exports.skillSchema;
// Single Experience Schema
// In candidate.schema.ts
exports.experienceSchema = zod_1.z.object({
    job_title: zod_1.z.string().min(1, "Job title is required").max(100),
    company: zod_1.z.string().min(1, "Company name is required").max(100),
    duration: zod_1.z.string().max(50).nullable().optional(),
    years: zod_1.z.coerce.number().min(0).max(50).nullable().optional(),
    description: zod_1.z.string().min(10).max(1000).nullable().optional(),
    currently_working: zod_1.z.coerce.boolean().nullable().optional(),
    start_date: zod_1.z.string().nullable().optional(),
    end_date: zod_1.z.string().nullable().optional(),
});
// Experience Update Schema
exports.updateExperienceSchema = zod_1.z.object({
    experiences: zod_1.z.array(exports.experienceSchema)
        .min(1, "At least one experience is required")
        .max(20, "Maximum 20 experiences allowed")
});
// Add Single Experience Schema
exports.addExperienceSchema = exports.experienceSchema;
// Single Education Schema
exports.educationSchema = zod_1.z.object({
    degree: zod_1.z.string().min(1, "Degree is required").max(100),
    institution: zod_1.z.string().min(1, "Institution is required").max(150),
    year: zod_1.z.string().max(20).nullable().optional(),
    field: zod_1.z.string().max(100).nullable().optional(),
    grade: zod_1.z.string().max(200).nullable().optional(),
    currently_studying: zod_1.z.coerce.boolean().nullable().optional(),
});
// Education Update Schema
exports.updateEducationSchema = zod_1.z.object({
    education: zod_1.z.array(exports.educationSchema)
        .min(1, "At least one education entry is required")
        .max(10, "Maximum 10 education entries allowed")
});
// Add Single Education Schema
exports.addEducationSchema = exports.educationSchema;
// Bulk Profile Update Schema
exports.bulkProfileUpdateSchema = zod_1.z.object({
    basic_info: exports.updateBasicInfoSchema.optional(),
    skills: zod_1.z.array(exports.skillSchema).max(50).optional(),
    experience: zod_1.z.array(exports.experienceSchema).max(20).optional(),
    education: zod_1.z.array(exports.educationSchema).max(10).optional()
}).refine((data) => Object.keys(data).length > 0, { message: "At least one section must be provided" });
// Social Links Schema
exports.socialLinkSchema = zod_1.z.object({
    platform: zod_1.z.enum([
        'github', 'linkedin', 'portfolio', 'twitter',
        'behance', 'dribbble', 'other'
    ]),
    url: zod_1.z.string()
        .url("Invalid URL format")
        .max(255, "URL must be 255 characters or less"),
    display_name: zod_1.z.string()
        .max(50, "Display name must be 50 characters or less")
        .optional()
});
exports.updateLinksSchema = zod_1.z.object({
    links: zod_1.z.array(exports.socialLinkSchema)
        .max(10, "Maximum 10 links allowed")
});
// Job Benefits Schema
exports.jobBenefitSchema = zod_1.z.object({
    benefit_type: zod_1.z.enum([
        'health_insurance', 'dental_insurance', 'vision_insurance',
        'retirement_401k', 'paid_time_off', 'flexible_hours',
        'remote_work', 'professional_development', 'gym_membership',
        'stock_options', 'bonus_structure', 'other'
    ]),
    importance: zod_1.z.enum(['required', 'preferred', 'nice_to_have']),
    notes: zod_1.z.string()
        .max(200, "Notes must be 200 characters or less")
        .optional()
});
exports.updateJobBenefitsSchema = zod_1.z.object({
    job_benefits: zod_1.z.array(exports.jobBenefitSchema)
        .max(20, "Maximum 20 benefits allowed")
});
