"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCompanyProfileSchema = exports.createCompanyProfileSchema = void 0;
// backend/src/validation/company.schema.ts
const zod_1 = require("zod");
// ==================== COMPANY PROFILE VALIDATION SCHEMAS ====================
// Create Company Profile Schema (Step 2 of registration)
exports.createCompanyProfileSchema = zod_1.z.object({
    company_name: zod_1.z
        .string()
        .min(2, 'Company name must be at least 2 characters')
        .max(100, 'Company name must be less than 100 characters')
        .trim(),
    industry: zod_1.z
        .string()
        .min(1, 'Industry is required'),
    company_size: zod_1.z
        .string()
        .min(1, 'Company size is required')
        .refine((val) => [
        '1-10',
        '11-50',
        '51-200',
        '201-500',
        '501-1000',
        '1000+'
    ].includes(val), 'Invalid company size selection'),
    website: zod_1.z
        .string()
        .url('Invalid website URL')
        .optional()
        .or(zod_1.z.literal('')),
    location: zod_1.z
        .string()
        .min(1, 'Location is required')
        .trim(),
    description: zod_1.z
        .string()
        .min(10, 'Company description must be at least 10 characters')
        .max(1000, 'Company description must be less than 1000 characters')
        .trim(),
    // Optional fields
    display_name: zod_1.z
        .string()
        .max(100, 'Display name must be less than 100 characters')
        .trim()
        .optional(),
    founded_year: zod_1.z
        .number()
        .int()
        .min(1800, 'Founded year must be after 1800')
        .max(new Date().getFullYear(), 'Founded year cannot be in the future')
        .optional(),
    contact_number: zod_1.z
        .string()
        .regex(/^[\+]?[0-9\-\(\)\s]+$/, 'Invalid phone number format')
        .min(10, 'Phone number must be at least 10 digits')
        .max(20, 'Phone number must be less than 20 characters')
        .optional(),
    linkedin_profile: zod_1.z
        .string()
        .url('Invalid LinkedIn URL')
        .optional()
        .or(zod_1.z.literal('')),
    twitter_handle: zod_1.z
        .string()
        .max(50, 'Twitter handle must be less than 50 characters')
        .optional(),
    facebook_page: zod_1.z
        .string()
        .url('Invalid Facebook URL')
        .optional()
        .or(zod_1.z.literal('')),
    business_type: zod_1.z
        .string()
        .max(50, 'Business type must be less than 50 characters')
        .optional(),
    employee_count: zod_1.z
        .number()
        .int()
        .min(1, 'Employee count must be at least 1')
        .max(1000000, 'Employee count seems too large')
        .optional(),
    remote_policy: zod_1.z
        .string()
        .refine((val) => ['remote', 'hybrid', 'onsite', 'flexible'].includes(val), 'Invalid remote policy')
        .optional()
});
// Update Company Profile Schema (for later updates)
exports.updateCompanyProfileSchema = zod_1.z.object({
    company_name: zod_1.z
        .string()
        .min(2, 'Company name must be at least 2 characters')
        .max(100, 'Company name must be less than 100 characters')
        .trim()
        .optional(),
    display_name: zod_1.z
        .string()
        .max(100, 'Display name must be less than 100 characters')
        .trim()
        .optional(),
    industry: zod_1.z
        .string()
        .min(1, 'Industry is required')
        .refine((val) => [
        'technology',
        'healthcare',
        'finance',
        'education',
        'retail',
        'manufacturing',
        'consulting',
        'marketing',
        'real-estate',
        'other'
    ].includes(val), 'Invalid industry selection')
        .optional(),
    company_size: zod_1.z
        .string()
        .min(1, 'Company size is required')
        .refine((val) => [
        '1-10',
        '11-50',
        '51-200',
        '201-500',
        '501-1000',
        '1000+'
    ].includes(val), 'Invalid company size selection')
        .optional(),
    website: zod_1.z
        .string()
        .url('Invalid website URL')
        .optional()
        .or(zod_1.z.literal('')),
    headquarters: zod_1.z
        .string()
        .max(100, 'Headquarters must be less than 100 characters')
        .optional(),
    description: zod_1.z
        .string()
        .min(10, 'Company description must be at least 10 characters')
        .max(1000, 'Company description must be less than 1000 characters')
        .trim()
        .optional(),
    founded_year: zod_1.z
        .number()
        .int()
        .min(1800, 'Founded year must be after 1800')
        .max(new Date().getFullYear(), 'Founded year cannot be in the future')
        .optional(),
    contact_number: zod_1.z
        .string()
        .regex(/^[\+]?[0-9\-\(\)\s]+$/, 'Invalid phone number format')
        .min(10, 'Phone number must be at least 10 digits')
        .max(20, 'Phone number must be less than 20 characters')
        .optional(),
    linkedin_profile: zod_1.z
        .string()
        .url('Invalid LinkedIn URL')
        .optional()
        .or(zod_1.z.literal('')),
    twitter_handle: zod_1.z
        .string()
        .max(50, 'Twitter handle must be less than 50 characters')
        .optional(),
    facebook_page: zod_1.z
        .string()
        .url('Invalid Facebook URL')
        .optional()
        .or(zod_1.z.literal('')),
    business_type: zod_1.z
        .string()
        .max(50, 'Business type must be less than 50 characters')
        .optional(),
    employee_count: zod_1.z
        .number()
        .int()
        .min(1, 'Employee count must be at least 1')
        .max(1000000, 'Employee count seems too large')
        .optional(),
    remote_policy: zod_1.z
        .string()
        .refine((val) => ['remote', 'hybrid', 'onsite', 'flexible'].includes(val), 'Invalid remote policy')
        .optional()
});
