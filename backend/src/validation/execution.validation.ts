import { z } from 'zod';

export const TestCaseResultSchema = z.object({
  testCaseId: z.string().optional(),
  passed: z.boolean(),
  output: z.string().nullable(),
  expected: z.string().nullable().optional(),
  durationMs: z.number().nullable().optional(),
  stderr: z.string().nullable().optional(),
});

export const RunnerResultSchema = z.object({
  submissionId: z.string(),
  results: z.array(TestCaseResultSchema),
  totalPassed: z.number().int(),
  totalTests: z.number().int(),
  runtimeMs: z.number().nullable().optional(),
  memoryKb: z.number().nullable().optional(),
  stdout: z.string().nullable().optional(),
  stderr: z.string().nullable().optional(),
  exitCode: z.number().nullable().optional(),
});

export const EvidenceItemSchema = z.object({
  source: z.string(),
  similarity: z.number().min(0).max(1),
  snippet: z.string(),
  url: z.string().url().nullable().optional(),
});

// R-34 (Wave 4 S2): plagiarism detection is de-scoped. Scores are NULLABLE and a
// `status` distinguishes a real result ('computed') from an un-run check
// ('not_computed'). A null score must never be read as 0 / "clean".
export const PlagiarismReportSchema = z.object({
  status: z.enum(['computed', 'not_computed']).optional(),
  reason: z.string().optional(),
  staticScore: z.number().min(0).max(1).nullable(),
  dynamicScore: z.number().min(0).max(1).nullable(),
  webScore: z.number().min(0).max(1).nullable(),
  finalScore: z.number().min(0).max(1).nullable(),
  evidence: z.array(EvidenceItemSchema),
});

export type TestCaseResult = z.infer<typeof TestCaseResultSchema>;
export type RunnerResult = z.infer<typeof RunnerResultSchema>;
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type PlagiarismReport = z.infer<typeof PlagiarismReportSchema>;
