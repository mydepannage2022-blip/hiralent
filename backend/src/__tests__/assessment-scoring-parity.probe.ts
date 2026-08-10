// backend/src/__tests__/assessment-scoring-parity.probe.ts
//
// Wave 4 / Session 5 — Consolidation B (R-37): LIVE proof that the canonical scorer
// (AssessmentScoringService.computeAndStore → the shared assessment-scoring-core) is
// DETERMINISTIC and really persists — the "score twice → identical single-core result"
// gate from the session brief.
//
// Self-gating: if Postgres is unreachable it prints SKIP and exits 0 (CI-safe).
//
// Fail-provable, non-vacuous:
//   (a) seed a SUBMITTED session (1 MCQ correct + 1 coding@50%, points 1 & 2) → computeAndStore
//       TWICE → identical total_score + identical result_summary.questions breakdown (determinism);
//   (b) CONTROL — flip the MCQ answer to WRONG and recompute → the score MUST change (drops),
//       proving the scorer is data-driven, not returning a constant.
//   Expected: correct → weighted (100*1 + 50*2)/3 = 66.7 → 67; wrong → (0*1 + 50*2)/3 = 33.3 → 33.
//
// Run: npx tsx src/__tests__/assessment-scoring-parity.probe.ts

import prisma from "../lib/prisma";
import { AssessmentScoringService } from "../services/company/internal/assessmentScoring.service";

let failures = 0;
const check = (name: string, cond: boolean) => {
  if (cond) console.log("  ok:", name);
  else { failures++; console.error("  FAIL:", name); }
};

const TAG = `scoreparity-${Date.now()}`;
const ids = {
  company: `${TAG}-company`,
  candidate: `${TAG}-candidate`,
  job: `${TAG}-job`,
  assessment: `${TAG}-assessment`,
  qMcq: `${TAG}-q-mcq`,
  qCoding: `${TAG}-q-coding`,
  session: `${TAG}-session`,
};

async function main() {
  try {
    await prisma.$connect();
    await prisma.candidateAssessmentSession.count(); // connectivity probe
  } catch (e: any) {
    console.log("SKIP: Postgres not reachable —", (e?.message || "").split("\n")[0]);
    console.log("assessment-scoring-parity.probe SKIPPED (no DB).");
    process.exit(0);
  }

  try {
    // ---- seed the graph ----
    await prisma.user.create({
      data: { user_id: ids.company, email: `${ids.company}@example.com`, password_hash: "x", full_name: "Probe Co", role: "company", is_email_verified: true },
    });
    await prisma.user.create({
      data: { user_id: ids.candidate, email: `${ids.candidate}@example.com`, password_hash: "x", full_name: "Probe Cand", role: "candidate", is_email_verified: true },
    });
    await prisma.companyJob.create({
      data: { job_id: ids.job, company_id: ids.company, title: "Probe Job", location: "Remote", description: "d", required_skills: ["ts"], screening_questions: [] },
    });
    await prisma.employerAssessment.create({
      data: {
        assessment_id: ids.assessment, company_id: ids.company, job_id: ids.job,
        title: "Probe Assessment", description: "d", status: "ACTIVE",
        assessment_type: "COMPREHENSIVE", skill_category: "programming", difficulty: "INTERMEDIATE",
        passing_score: 70, creation_method: "MANUAL",
      },
    });

    const baseQ = { description: "d", problemStatement: "p", difficulty: "easy", skillTags: ["ts"], canonicalSolution: "", testCases: {} as any, status: "approved" };
    await prisma.question.create({
      data: { id: ids.qMcq, title: "MCQ", type: "mcq", options: { options: [{ id: "A", isCorrect: true }, { id: "B" }] } as any, correctAnswer: "A", ...baseQ },
    });
    await prisma.question.create({
      data: { id: ids.qCoding, title: "Coding", type: "coding", ...baseQ },
    });

    await prisma.assessmentQuestion.create({ data: { assessment_id: ids.assessment, question_id: ids.qMcq, order: 1, points: 1 } });
    await prisma.assessmentQuestion.create({ data: { assessment_id: ids.assessment, question_id: ids.qCoding, order: 2, points: 2 } });

    const submittedAt = new Date();
    await prisma.candidateAssessmentSession.create({
      data: {
        session_id: ids.session, assessment_id: ids.assessment, candidate_id: ids.candidate,
        status: "SUBMITTED", submitted_at: submittedAt,
      },
    });

    // MCQ answer = CORRECT (["A"])
    await prisma.candidateAssessmentAnswer.create({
      data: { session_id: ids.session, question_id: ids.qMcq, state: "FINAL", answer: { selectedOptionIds: ["A"] } as any },
    });
    // Coding submission = 50% (runner 1/2), belongs to this session via evidence.session_id
    await prisma.codeSubmission.create({
      data: {
        assessment_id: ids.assessment, candidate_id: ids.candidate, question_id: ids.qCoding,
        language: "python", code: "print(1)", status: "COMPLETED", score: 50,
        result: { score: 50, runner: { passed: 1, total: 2 } } as any,
        evidence: { session_id: ids.session } as any,
        created_at: new Date(submittedAt.getTime() - 1000),
      },
    });

    // ---- (a) compute TWICE → identical ----
    const r1 = await AssessmentScoringService.computeAndStore(ids.session);
    const s1 = await prisma.candidateAssessmentSession.findUnique({ where: { session_id: ids.session }, select: { total_score: true, passed: true, result_summary: true } });
    const r2 = await AssessmentScoringService.computeAndStore(ids.session);
    const s2 = await prisma.candidateAssessmentSession.findUnique({ where: { session_id: ids.session }, select: { total_score: true, passed: true, result_summary: true } });

    check("computeAndStore ok both runs", !!(r1 as any)?.ok && !!(r2 as any)?.ok);
    check("total_score == 67 (weighted 100*1 + 50*2 / 3)", s1?.total_score === 67);
    check("passed == false (67 < 70)", s1?.passed === false);
    check("determinism: total_score identical across runs", s1?.total_score === s2?.total_score);
    const q1 = JSON.stringify((s1?.result_summary as any)?.questions ?? null);
    const q2 = JSON.stringify((s2?.result_summary as any)?.questions ?? null);
    check("determinism: breakdown identical across runs", q1 === q2 && q1 !== "null");

    // ---- (b) CONTROL: flip MCQ to WRONG → score must change ----
    await prisma.candidateAssessmentAnswer.update({
      where: { session_id_question_id: { session_id: ids.session, question_id: ids.qMcq } },
      data: { answer: { selectedOptionIds: ["B"] } as any },
    });
    await AssessmentScoringService.computeAndStore(ids.session);
    const s3 = await prisma.candidateAssessmentSession.findUnique({ where: { session_id: ids.session }, select: { total_score: true } });
    check("CONTROL: wrong MCQ changes score to 33 (data-driven, not constant)", s3?.total_score === 33);
    check("CONTROL: score actually differs from the correct-answer run", s3?.total_score !== s1?.total_score);
  } finally {
    // FK-safe teardown (children → parents)
    await prisma.codeSubmission.deleteMany({ where: { assessment_id: ids.assessment } }).catch(() => {});
    await prisma.candidateAssessmentAnswer.deleteMany({ where: { session_id: ids.session } }).catch(() => {});
    await prisma.candidateAssessmentSession.deleteMany({ where: { session_id: ids.session } }).catch(() => {});
    await prisma.assessmentQuestion.deleteMany({ where: { assessment_id: ids.assessment } }).catch(() => {});
    await prisma.employerAssessment.deleteMany({ where: { assessment_id: ids.assessment } }).catch(() => {});
    await prisma.question.deleteMany({ where: { id: { in: [ids.qMcq, ids.qCoding] } } }).catch(() => {});
    await prisma.companyJob.deleteMany({ where: { job_id: ids.job } }).catch(() => {});
    await prisma.user.deleteMany({ where: { user_id: { in: [ids.company, ids.candidate] } } }).catch(() => {});
    await prisma.$disconnect();
  }

  if (failures) {
    console.error(`\nassessment-scoring-parity.probe: ${failures} FAILURE(S)`);
    process.exit(1);
  }
  console.log("\nassessment-scoring-parity.probe OK — scoring is deterministic (single core) and data-driven.");
}

main().catch((e) => { console.error(e); process.exit(1); });
