// Types for runner execution results and plagiarism reports

export interface TestCaseResult {
  testCaseId?: string;
  passed: boolean;
  output: string | null;
  expected?: string | null;
  durationMs?: number | null;
  stderr?: string | null;
}

export interface RunnerResult {
  submissionId: string;
  results: TestCaseResult[];
  totalPassed: number;
  totalTests: number;
  runtimeMs?: number | null;
  memoryKb?: number | null;
  stdout?: string | null;
  stderr?: string | null;
  exitCode?: number | null;
}

export interface EvidenceItem {
  source: string; // e.g., 'web', 'repo', 'candidate_history'
  similarity: number; // 0..1
  snippet: string;
  url?: string | null;
}

export interface PlagiarismReport {
  staticScore: number; // 0..1
  dynamicScore: number; // 0..1
  webScore: number; // 0..1
  finalScore: number; // weighted
  evidence: EvidenceItem[];
}
