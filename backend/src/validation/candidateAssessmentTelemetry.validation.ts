/**event type validation + metadata size limits */
import { z } from "zod";

export const telemetryEventSchema = z.object({
  type: z.string().min(2).max(64),
  ts: z.string().datetime().optional(),
  question_id: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const telemetryBatchSchema = z.object({
  events: z.array(telemetryEventSchema).min(1).max(200),
});
