import { z } from 'zod';
import { UpdateLocationInput, UpdateSalaryInput } from '../types/candidate.types';

export const updateLocationSchema: z.ZodSchema<UpdateLocationInput> = z.object({
  location: z.string().min(1, 'Location is required').max(100, 'Location must be 100 characters or less').optional(),
  postalCode: z.number().min(1, 'Postal code is required').max(20, 'Postal code must be 20 characters or less').optional(),
}).strict();

export const updateSalarySchema: z.ZodSchema<UpdateSalaryInput> = z.object({
  minimumSalary: z.number().min(0, 'Minimum salary must be non-negative').optional(),
}).strict();