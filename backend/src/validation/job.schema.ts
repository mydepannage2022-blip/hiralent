import { z } from "zod";
export const updateJobSchema = z.object({
  title: z.string().min(5),
  location: z.string(),
  job_description_rich: z.string(), // Will be sanitized
});
