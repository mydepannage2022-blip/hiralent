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