import { z } from "zod";

export const submitApplicationSchema = z.object({
  job_id: z.string().uuid(),
  cover_letter: z.string().optional(),
});

export const updateStatusSchema = z.object({
  previousStatus: z.string(),
  newStatus: z.string(),
});
