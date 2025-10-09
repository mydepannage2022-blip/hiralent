// backend/src/services/verification/helpers/signals.ts
import type { PrismaClient } from "@prisma/client";

export async function saveSignal(
  prisma: PrismaClient,
  runId: string,
  s: { type:string; passed:boolean; score?:number; explanation?:string; raw_payload?:any }
) {
  return prisma.verificationSignal.create({
    data: {
      run_id: runId,
      signal_type: s.type,
      passed: s.passed,
      score: s.score ?? null,
      explanation: s.explanation ?? null,
      raw_payload: s.raw_payload ?? null
    }
  });
}

export async function finalizeRunDecision(prisma: PrismaClient, runId: string) {
  const sigs = await prisma.verificationSignal.findMany({ where: { run_id: runId } });

  // weight by importance
  const weights: Record<string, number> = {
    pdf_metadata_check: 0.25,
    doc_content_consistency: 0.25,
    registry_lookup: 0.35,
    fraud_heuristics: 0.15
  };
  let scoreSum = 0, wSum = 0;
  for (const s of sigs) {
    const w = weights[s.signal_type] ?? 0.05;
    const sc = (s.score ?? (s.passed ? 1 : 0));
    scoreSum += sc * w;
    wSum += w;
  }
  const agg = wSum ? scoreSum / wSum : 0.5;
  const risk = 1 - agg;

  let decision: "AUTO_APPROVED" | "AUTO_REJECTED" | "IN_REVIEW" = "IN_REVIEW";
  if (agg >= 0.8) decision = "AUTO_APPROVED";
  else if (agg <= 0.4) decision = "AUTO_REJECTED";

  await prisma.verificationRun.update({
    where: { run_id: runId },
    data: { risk_score: risk, decision: decision === "AUTO_APPROVED" ? "APPROVE" : decision === "AUTO_REJECTED" ? "REJECT" : "MANUAL_REVIEW", ended_at: new Date() }
  });

  return { decision, risk_score: risk };
}
