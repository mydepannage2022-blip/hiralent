// backend/src/validation/company.schema.ts
import { z } from 'zod';

// ==================== COMPANY PROFILE VALIDATION SCHEMAS ====================

// Create Company Profile Schema (Step 2 of registration)
export const createCompanyProfileSchema = z.object({
  company_name: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters')
    .trim(),

  industry: z
    .string()
    .min(1, 'Industry is required'),

  company_size: z
    .string()
    .min(1, 'Company size is required')
    .refine(
      (val) => [
        '1-10',
        '11-50', 
        '51-200',
        '201-500',
        '501-1000',
        '1000+'
      ].includes(val),
      'Invalid company size selection'
    ),

  website: z
    .string()
    .url('Invalid website URL')
    .optional()
    .or(z.literal('')),

  location: z
    .string()
    .min(1, 'Location is required')
    .trim(),

  description: z
    .string()
    .min(10, 'Company description must be at least 10 characters')
    .max(1000, 'Company description must be less than 1000 characters')
    .trim(),

// NEW FIELDS
  registration_number: z
    .string()
    .min(3, 'Registration number (RC) is required')
    .trim(),
    
  full_address: z
    .string()
    .min(10, 'Full address is required')
    .trim(),

  // Optional fields
  display_name: z
    .string()
    .max(100, 'Display name must be less than 100 characters')
    .trim()
    .optional(),

  founded_year: z
    .number()
    .int()
    .min(1800, 'Founded year must be after 1800')
    .max(new Date().getFullYear(), 'Founded year cannot be in the future')
    .optional(),

  contact_number: z
    .string()
    .regex(/^[\+]?[0-9\-\(\)\s]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .optional(),

  linkedin_profile: z
    .string()
    .url('Invalid LinkedIn URL')
    .optional()
    .or(z.literal('')),

  twitter_handle: z
    .string()
    .max(50, 'Twitter handle must be less than 50 characters')
    .optional(),

  facebook_page: z
    .string()
    .url('Invalid Facebook URL')
    .optional()
    .or(z.literal('')),

  business_type: z
    .string()
    .max(50, 'Business type must be less than 50 characters')
    .optional(),

  employee_count: z
    .number()
    .int()
    .min(1, 'Employee count must be at least 1')
    .max(1000000, 'Employee count seems too large')
    .optional(),

  remote_policy: z
    .string()
    .refine(
      (val) => ['remote', 'hybrid', 'onsite', 'flexible'].includes(val),
      'Invalid remote policy'
    )
    .optional()
});

// Update Company Profile Schema (for later updates)
export const updateCompanyProfileSchema = z.object({
  company_name: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters')
    .trim()
    .optional(),

  display_name: z
    .string()
    .max(100, 'Display name must be less than 100 characters')
    .trim()
    .optional(),

  industry: z
    .string()
    .min(1, 'Industry is required')
    .refine(
      (val) => [
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
      ].includes(val),
      'Invalid industry selection'
    )
    .optional(),

  company_size: z
    .string()
    .min(1, 'Company size is required')
    .refine(
      (val) => [
        '1-10',
        '11-50', 
        '51-200',
        '201-500',
        '501-1000',
        '1000+'
      ].includes(val),
      'Invalid company size selection'
    )
    .optional(),

  website: z
    .string()
    .url('Invalid website URL')
    .optional()
    .or(z.literal('')),

  headquarters: z
    .string()
    .max(100, 'Headquarters must be less than 100 characters')
    .optional(),

  description: z
    .string()
    .min(10, 'Company description must be at least 10 characters')
    .max(1000, 'Company description must be less than 1000 characters')
    .trim()
    .optional(),

  founded_year: z
    .number()
    .int()
    .min(1800, 'Founded year must be after 1800')
    .max(new Date().getFullYear(), 'Founded year cannot be in the future')
    .optional(),

  contact_number: z
    .string()
    .regex(/^[\+]?[0-9\-\(\)\s]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .optional(),

  linkedin_profile: z
    .string()
    .url('Invalid LinkedIn URL')
    .optional()
    .or(z.literal('')),

  twitter_handle: z
    .string()
    .max(50, 'Twitter handle must be less than 50 characters')
    .optional(),

  facebook_page: z
    .string()
    .url('Invalid Facebook URL')
    .optional()
    .or(z.literal('')),

  business_type: z
    .string()
    .max(50, 'Business type must be less than 50 characters')
    .optional(),
  // NEW FIELDS
  registration_number: z
    .string()
    .min(3, 'Registration number (RC) is required')
    .trim(),
    
  full_address: z
    .string()
    .min(10, 'Full address is required')
    .trim(),

  employee_count: z
    .number()
    .int()
    .min(1, 'Employee count must be at least 1')
    .max(1000000, 'Employee count seems too large')
    .optional(),

  remote_policy: z
    .string()
    .refine(
      (val) => ['remote', 'hybrid', 'onsite', 'flexible'].includes(val),
      'Invalid remote policy'
    )
    .optional()
});

// Type exports for TypeScript
export type CreateCompanyProfileInput = z.infer<typeof createCompanyProfileSchema>;
export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;
