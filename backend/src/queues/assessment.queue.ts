type OutboxJob = { sessionId: string };
type InsightJob = { sessionId: string };

const outboxQueue: OutboxJob[] = [];
const insightQueue: InsightJob[] = [];

export function enqueueAssessmentOutboxInMemory(job: OutboxJob) {
  outboxQueue.push(job);
}

export function enqueueAssessmentInsightInMemory(job: InsightJob) {
  insightQueue.push(job);
}

export function nextAssessmentOutboxJob(): OutboxJob | null {
  return outboxQueue.shift() ?? null;
}

export function nextAssessmentInsightJob(): InsightJob | null {
  return insightQueue.shift() ?? null;
}
