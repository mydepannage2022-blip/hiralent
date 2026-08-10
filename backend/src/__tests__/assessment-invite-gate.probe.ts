// backend/src/__tests__/assessment-invite-gate.probe.ts
//
// Wave 4 / Session 5 — Consolidation B (R-37): LIVE proof of the employer→candidate link.
// A template/direct assessment starts as DRAFT; it must be ACTIVATED before it can be
// invited (fix in companyHiringFlow.inviteToAssessment) and before a candidate can start
// a session (existing guard in candidateAssessmentSession.startSession).
//
// Self-gating: SKIP + exit 0 if Postgres is unreachable.
//
// Fail-provable, non-vacuous:
//   (A) FIX — inviting a DRAFT assessment throws ASSESSMENT_NOT_ACTIVE (no dead-end invite);
//   (B) LINK — once ACTIVE: invite succeeds, candidate accepts, startSession creates a live
//       session. Same operation differs only by status → the guard has real teeth.
//
// Run: npx tsx src/__tests__/assessment-invite-gate.probe.ts

import prisma from "../lib/prisma";
import { CompanyHiringFlowService } from "../services/company/companyHiringFlow.service";
import { CandidateAssessmentSessionService } from "../services/candidate/candidateAssessmentSession.service";

let failures = 0;
const check = (name: string, cond: boolean) => {
  if (cond) console.log("  ok:", name);
  else { failures++; console.error("  FAIL:", name); }
};

const TAG = `invitegate-${Date.now()}`;
const ids = {
  company: `${TAG}-co`, candidate: `${TAG}-cand`, job: `${TAG}-job`,
  application: `${TAG}-app`, test: `${TAG}-test`, assessment: `${TAG}-assess`,
};

async function main() {
  try {
    await prisma.$connect();
    await prisma.employerAssessment.count();
  } catch (e: any) {
    console.log("SKIP: Postgres not reachable —", (e?.message || "").split("\n")[0]);
    console.log("assessment-invite-gate.probe SKIPPED (no DB).");
    process.exit(0);
  }

  const svc = new CompanyHiringFlowService(prisma);
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  try {
    await prisma.user.create({ data: { user_id: ids.company, email: `${ids.company}@e.com`, password_hash: "x", full_name: "Co", role: "company", is_email_verified: true } });
    await prisma.user.create({ data: { user_id: ids.candidate, email: `${ids.candidate}@e.com`, password_hash: "x", full_name: "Cand", role: "candidate", is_email_verified: true } });
    await prisma.companyJob.create({ data: { job_id: ids.job, company_id: ids.company, title: "Job", location: "Remote", description: "d", required_skills: ["ts"], screening_questions: [] } });
    await prisma.jobApplication.create({ data: { application_id: ids.application, candidate_id: ids.candidate, job_id: ids.job } });
    await prisma.jobSimpleTest.create({ data: { test_id: ids.test, job_id: ids.job, company_id: ids.company, title: "Warm-up" } });
    await prisma.employerAssessment.create({
      data: {
        assessment_id: ids.assessment, company_id: ids.company, job_id: ids.job,
        title: "A", description: "d", status: "DRAFT",
        assessment_type: "COMPREHENSIVE", skill_category: "programming", difficulty: "INTERMEDIATE",
        creation_method: "TEMPLATE",
      },
    });

    // ---- (A) FIX: inviting a DRAFT assessment must be blocked ----
    let threw = "";
    try {
      await svc.inviteToAssessment({ companyId: ids.company, applicationId: ids.application, assessmentId: ids.assessment, expiresAt });
    } catch (e: any) { threw = e?.message || ""; }
    check("invite on DRAFT throws ASSESSMENT_NOT_ACTIVE (no dead-end invite)", threw === "ASSESSMENT_NOT_ACTIVE");
    const noInvite = await prisma.candidateAssessmentInvite.count({ where: { assessment_id: ids.assessment } });
    check("no invite row was created for the DRAFT assessment", noInvite === 0);

    // ---- (B) LINK: activate → invite succeeds → accept → startSession creates a session ----
    await prisma.employerAssessment.update({ where: { assessment_id: ids.assessment }, data: { status: "ACTIVE" } });
    await svc.inviteToAssessment({ companyId: ids.company, applicationId: ids.application, assessmentId: ids.assessment, expiresAt });
    const inv = await prisma.candidateAssessmentInvite.findFirst({ where: { assessment_id: ids.assessment, candidate_id: ids.candidate }, select: { invite_id: true, status: true } });
    check("invite created once ACTIVE (PENDING)", !!inv && inv.status === "PENDING");

    await prisma.candidateAssessmentInvite.update({ where: { invite_id: inv!.invite_id }, data: { status: "ACCEPTED", accepted_at: new Date() } });
    const session: any = await CandidateAssessmentSessionService.startSession(ids.candidate, ids.assessment);
    check("startSession succeeds for ACTIVE + ACCEPTED invite", !!session?.session_id);

    const dbSession = await prisma.candidateAssessmentSession.findFirst({ where: { assessment_id: ids.assessment, candidate_id: ids.candidate }, select: { status: true } });
    check("session persisted as IN_PROGRESS", dbSession?.status === "IN_PROGRESS");
  } finally {
    await prisma.candidateAssessmentSession.deleteMany({ where: { assessment_id: ids.assessment } }).catch(() => {});
    await prisma.candidateAssessmentInvite.deleteMany({ where: { assessment_id: ids.assessment } }).catch(() => {});
    await prisma.employerAssessment.deleteMany({ where: { assessment_id: ids.assessment } }).catch(() => {});
    await prisma.candidateJobSimpleTestInvite.deleteMany({ where: { application_id: ids.application } }).catch(() => {});
    await prisma.jobSimpleTest.deleteMany({ where: { test_id: ids.test } }).catch(() => {});
    await prisma.jobApplication.deleteMany({ where: { application_id: ids.application } }).catch(() => {});
    await prisma.companyJob.deleteMany({ where: { job_id: ids.job } }).catch(() => {});
    await prisma.user.deleteMany({ where: { user_id: { in: [ids.company, ids.candidate] } } }).catch(() => {});
    await prisma.$disconnect();
  }

  if (failures) { console.error(`\nassessment-invite-gate.probe: ${failures} FAILURE(S)`); process.exit(1); }
  console.log("\nassessment-invite-gate.probe OK — DRAFT invites are blocked; ACTIVE assessments invite + start cleanly.");
}

main().catch((e) => { console.error(e); process.exit(1); });
