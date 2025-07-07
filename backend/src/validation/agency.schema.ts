// src/validation/agency.schema.ts

import { z } from 'zod';

export const updateAgencySchema = z.object({
  name: z.string()
    .min(3, "Agency name must be at least 3 characters")
    .max(100, "Agency name must not exceed 100 characters")
    .trim()
    .optional(),
  billing_contact_email: z.string()
    .email("Please provide a valid email address")
    .trim()
    .toLowerCase()
    .optional(),
  logo_url: z.string()
    .url("Please provide a valid URL for logo")
    .optional()
    .or(z.literal('')),
});

export const teamQuerySchema = z.object({
  page: z.string()
    .regex(/^\d+$/, "Page must be a positive number")
    .transform(Number)
    .refine(val => val > 0, "Page must be greater than 0")
    .optional()
    .default("1"),
  limit: z.string()
    .regex(/^\d+$/, "Limit must be a positive number")
    .transform(Number)
    .refine(val => val > 0 && val <= 100, "Limit must be between 1 and 100")
    .optional()
    .default("10"),
  status: z.enum(['active', 'inactive', 'pending', 'all'])
    .optional()
    .default('all'),
});