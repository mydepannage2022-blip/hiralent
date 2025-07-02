import { z } from "zod";

export const createUserProfileSchema = z.object({
  full_name: z.string().min(2),
  bio: z.string().optional(),
  job_title: z.string().optional(),
  education: z.string().optional(),
});
