/**MCQ: ensure option ids exist / format correct

CODING: ensure language exists, code is string, etc. */
import { z } from "zod";

const mcqPayload = z.object({
  selectedOptionIds: z.array(z.string().min(1)).max(50),
});

const codingPayload = z.object({
  language: z.string().min(1).max(32),
  code: z.string().min(1).max(200_000),
  lastRun: z
    .object({
      status: z.string().optional(),
      runtimeMs: z.number().int().nonnegative().optional(),
      memoryKb: z.number().int().nonnegative().optional(),
      stdout: z.string().optional(),
      stderr: z.string().optional(),
    })
    .optional(),
});

export const saveAnswerSchema = z.object({
  payload: z.union([mcqPayload, codingPayload]),
  isFinal: z.boolean().optional(),
  isFlagged: z.boolean().optional(),
});
