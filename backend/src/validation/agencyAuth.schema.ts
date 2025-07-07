// src/validation/agencyAuth.schema.ts

import { z } from 'zod';

export const createAgencySchema = z.object({
  name: z.string()
    .min(3, "Agency name must be at least 3 characters")
    .max(100, "Agency name must not exceed 100 characters")
    .trim(),
  website: z.string()
    .url("Please provide a valid URL")
    .optional()
    .or(z.literal('')),
  billing_contact_email: z.string()
    .email("Please provide a valid email address")
    .trim()
    .toLowerCase(),
});

export const inviteRecruiterSchema = z.object({
  full_name: z.string()
    .min(2, "Full name must be at least 2 characters")
    .max(50, "Full name must not exceed 50 characters")
    .trim(),
  email: z.string()
    .email("Please provide a valid email address")
    .trim()
    .toLowerCase(),
  position: z.string()
    .min(2, "Position must be at least 2 characters")
    .max(50, "Position must not exceed 50 characters")
    .trim()
    .optional()
    .or(z.literal('')),
});

export const adminProfileSchema = z.object({
  phone_number: z.string()
    .min(7, "Phone number must be at least 7 digits")
    .max(20, "Phone number must not exceed 20 characters")
    .regex(/^[+]?[(]?[\d\s\-\(\)]+$/, "Please provide a valid phone number")
    .trim(),
  position: z.string()
    .min(2, "Position must be at least 2 characters")
    .max(50, "Position must not exceed 50 characters")
    .trim()
    .optional()
    .or(z.literal('')),
  linkedin_url: z.string()
    .url("Please provide a valid LinkedIn URL")
    .optional()
    .or(z.literal('')),
  company_role: z.string()
    .min(2, "Company role must be at least 2 characters")
    .max(100, "Company role must not exceed 100 characters")
    .trim()
    .optional()
    .or(z.literal('')),
  branding_notes: z.string()
    .max(500, "Branding notes must not exceed 500 characters")
    .trim()
    .optional()
    .or(z.literal('')),
});

export const approveAgencySchema = z.object({
  approval_notes: z.string()
    .max(500, "Approval notes must not exceed 500 characters")
    .trim()
    .optional()
    .or(z.literal('')),
});