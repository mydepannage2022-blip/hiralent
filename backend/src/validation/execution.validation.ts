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

export const PlagiarismReportSchema = z.object({
  staticScore: z.number().min(0).max(1),
  dynamicScore: z.number().min(0).max(1),
  webScore: z.number().min(0).max(1),
  finalScore: z.number().min(0).max(1),
  evidence: z.array(EvidenceItemSchema),
});

export type TestCaseResult = z.infer<typeof TestCaseResultSchema>;
export type RunnerResult = z.infer<typeof RunnerResultSchema>;
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type PlagiarismReport = z.infer<typeof PlagiarismReportSchema>;
