/**create session schema (assessment_id, duration optional)

submit schema

timer constraints */
import { z } from "zod";

export const createSessionSchema = z.object({
  assessment_id: z.string().min(10),
});

export const navigationSchema = z.object({
  current_index: z.number().int().min(0).max(9999),
});

export const submitSessionSchema = z.object({
  reason: z.enum(["USER_SUBMIT", "AUTO_SUBMIT", "TIME_EXPIRED"]).optional(),
});
