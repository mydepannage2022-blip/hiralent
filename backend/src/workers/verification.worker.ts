import { PrismaClient, VerificationDecision } from "@prisma/client";
import { nextJob } from "../queues/verification.queue";
import { setTimeout as wait } from "node:timers/promises";

const prisma = new PrismaClient();

async function processOne(job: { runId: string; subject: "COMPANY"|"AGENCY"; subjectId: string }) {
  // Simulate external checks, write a couple signals, then finalize
  const signals = [
    { key: "GOV_REGISTRY_LOOKUP", passed: true, score: 0.1, explanation: "Found registered entity" },
    { key: "SANCTIONS_SCREEN", passed: true, score: 0.0, explanation: "No hits" }
  ];

  await prisma.verificationSignal.createMany({
    data: signals.map(s => ({
      run_id: job.runId,
      signal_type: s.key,
      passed: s.passed,
      score: s.score,
      explanation: s.explanation,
      raw_payload: {}
    }))
  });

  // Simple risk: max score of failing signals (here all pass -> low)
  const risk = Math.max(...signals.map(s => s.score ?? 0));
  const decision: VerificationDecision = risk < 0.2 ? "APPROVE" : "MANUAL_REVIEW";
  const reasons = risk < 0.2 ? ["POSITIVE_MATCH_STRONG"] : ["NEEDS_MANUAL_REVIEW"];

  await prisma.verificationRun.update({
    where: { run_id: job.runId },
    data: { status: "RUNNING" }
  });

  // pretend we call vendors…
  await wait(500);

  // Reflect to parent via finalize
  const run = await prisma.verificationRun.findUniqueOrThrow({ where: { run_id: job.runId } });
  if (run.subject_type === "COMPANY") {
    await prisma.companyVerification.updateMany({
      where: { latest_run_id: job.runId },
      data: {
        status: decision === "APPROVE" ? "AUTO_APPROVED" : "IN_REVIEW",
        risk_score: risk,
        reason_codes: reasons,
        verification_date: decision === "APPROVE" ? new Date() : undefined
      }
    });
  } else {
    await prisma.agencyVerification.updateMany({
      where: { latest_run_id: job.runId },
      data: {
        status: decision === "APPROVE" ? "AUTO_APPROVED" : "IN_REVIEW",
        risk_score: risk,
        reason_codes: reasons,
        verification_date: decision === "APPROVE" ? new Date() : undefined
      }
    });
  }

  await prisma.verificationRun.update({
    where: { run_id: job.runId },
    data: { status: "COMPLETED", ended_at: new Date(), decision, risk_score: risk, reason_codes: reasons }
  });
}

async function main() {
  // tiny poller
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = nextJob();
    if (job) {
      try {
        await processOne(job);
      } catch (e) {
        console.error("Worker error", e);
      }
    } else {
      await wait(250); // idle
    }
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
