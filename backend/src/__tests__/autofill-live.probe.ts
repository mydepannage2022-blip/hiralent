// backend/src/__tests__/autofill-live.probe.ts
//
// Wave 4 / Session 3 — LIVE proof that resume→autofill actually POPULATES fields in the DB.
// This is the carry-forward Wave 3 explicitly did NOT prove (verify-wave3-e2e "SCOPE CAVEAT":
// it only checked the route was mounted+guarded, not that extraction fills fields).
//
// Key-independent by design: we inject a KNOWN extraction (SkillExtraction.raw_response) at
// the Gemini boundary, then drive the real createPreviewSession → applyConfirmedFields and
// assert the DB now holds those exact fields. No live Gemini key needed.
//
// Self-gating: if Postgres is unreachable it prints SKIP and exits 0 (CI-safe). Fail-provable:
// (a) a populated resume MUST yield mappings + written CandidateSkill/CandidateProfile rows;
// (b) CONTROL — an empty-skills extraction MUST NOT produce a "skills" mapping (proves the
//     mapping is data-driven, not unconditionally created).
//
// Run: npx tsx src/__tests__/autofill-live.probe.ts

import prisma from "../lib/prisma";
import { AutofillService } from "../services/candidate/profile/autofill.service";

const svc = new AutofillService();
let failures = 0;
const check = (name: string, cond: boolean) => {
  if (cond) console.log("  ok:", name);
  else { failures++; console.error("  FAIL:", name); }
};

const RAW_POPULATED = JSON.stringify({
  headline: "Senior Backend Engineer",
  summary: "Backend engineer specializing in Node.js and PostgreSQL at scale.",
  skills: [
    { name: "TypeScript", category: "technical", proficiency: "advanced" },
    { name: "PostgreSQL", category: "technical" },
  ],
  education: [{ degree: "BSc Computer Science", institution: "Testville University", year: "2019" }],
  experience: [{ job_title: "Backend Engineer", company: "Acme Corp", duration: "3y" }],
  certifications: [{ name: "AWS Solutions Architect", issuer: "Amazon" }],
  languages: ["English", "French"],
  contact: { email: "seed@example.com", phone: "+10000000009", location: "Remote" },
});
const RAW_EMPTY_SKILLS = JSON.stringify({ headline: "Analyst", skills: [], education: [] });

async function seedCandidate(tag: string) {
  const user = await prisma.user.create({
    data: {
      email: `autofill-probe-${tag}-${Date.now()}@example.com`,
      full_name: "Autofill Probe",
      role: "candidate",
      is_email_verified: true,
    },
  });
  return user.user_id;
}

async function seedDocWithExtraction(candidateId: string, raw: string) {
  const doc = await prisma.candidateDocument.create({
    data: {
      candidate_id: candidateId,
      file_path: "uploads/resumes/application/probe.pdf",
      file_type: "application/pdf",
      file_size: 12345,
      file_name: "probe.pdf",
      upload_status: "completed",
      extraction_status: "completed",
      processed_text: "Senior Backend Engineer. Node.js, PostgreSQL. BSc Computer Science.",
    },
  });
  await prisma.skillExtraction.create({
    data: {
      document_id: doc.document_id,
      candidate_id: candidateId,
      status: "completed",
      ai_provider: "gemini",
      raw_response: raw,
    },
  });
  return doc.document_id;
}

async function cleanup(candidateId: string) {
  // Children cascade off the User FK (onDelete: Cascade), but delete the rows without a
  // cascade path first to keep the throwaway teardown clean and order-independent.
  try { await prisma.autofillFieldMapping.deleteMany({ where: { session: { candidate_id: candidateId } } }); } catch {}
  try { await prisma.resumeAutofillSession.deleteMany({ where: { candidate_id: candidateId } }); } catch {}
  try { await prisma.certification.deleteMany({ where: { candidate_id: candidateId } }); } catch {}
  try { await prisma.candidateProfile.deleteMany({ where: { candidate_id: candidateId } }); } catch {}
  try { await prisma.user.delete({ where: { user_id: candidateId } }); } catch {}
}

async function main() {
  try {
    await prisma.$connect();
    // cheap connectivity probe
    await prisma.user.count();
  } catch (e: any) {
    console.log("SKIP: Postgres not reachable —", (e?.message || "").split("\n")[0]);
    console.log("autofill-live.probe SKIPPED (no DB).");
    process.exit(0);
  }

  let cand = "";
  let candCtl = "";
  try {
    // ---- Case A: populated extraction → real field population ----
    cand = await seedCandidate("a");
    const docId = await seedDocWithExtraction(cand, RAW_POPULATED);

    const preview = await svc.createPreviewSession(cand, docId);
    check("preview succeeded", preview.success === true);
    const mappings = (preview.data?.mappings || []).reduce<Record<string, any>>((acc, m) => {
      acc[m.field_name] = m.extracted_value; return acc;
    }, {});
    check("skills mapping present with 2 skills", Array.isArray(mappings.skills) && mappings.skills.length === 2);
    check("skills mapping carries injected TypeScript", JSON.stringify(mappings.skills || "").includes("TypeScript"));
    check("education mapping present", Array.isArray(mappings.education) && mappings.education.length === 1);
    check("headline mapping present", mappings.headline === "Senior Backend Engineer");

    const sessionId = preview.data!.session_id;
    const apply = await svc.applyConfirmedFields(cand, sessionId);
    check("apply succeeded", apply.success === true);

    const skillRows = await prisma.candidateSkill.findMany({ where: { candidate_id: cand } });
    check("2 CandidateSkill rows written to DB", skillRows.length === 2);
    check("DB has the injected TypeScript skill", skillRows.some((s) => s.skill_name === "TypeScript"));

    const profile = await prisma.candidateProfile.findUnique({ where: { candidate_id: cand } });
    check("CandidateProfile.headline populated", profile?.headline === "Senior Backend Engineer");
    check("CandidateProfile.education populated", !!profile?.education && profile.education.includes("Testville University"));

    const certs = await prisma.certification.findMany({ where: { candidate_id: cand } });
    check("Certification row written from autofill", certs.some((c) => c.name === "AWS Solutions Architect"));

    // ---- Case B (CONTROL): empty-skills extraction → NO skills mapping ----
    candCtl = await seedCandidate("ctl");
    const docCtl = await seedDocWithExtraction(candCtl, RAW_EMPTY_SKILLS);
    const previewCtl = await svc.createPreviewSession(candCtl, docCtl);
    const ctlFields = (previewCtl.data?.mappings || []).map((m) => m.field_name);
    check("CONTROL: empty extraction produces NO 'skills' mapping", !ctlFields.includes("skills"));
    check("CONTROL: headline still mapped (proves harness works)", ctlFields.includes("headline"));
  } finally {
    if (cand) await cleanup(cand);
    if (candCtl) await cleanup(candCtl);
    await prisma.$disconnect();
  }

  if (failures) {
    console.error(`\nautofill-live.probe: ${failures} FAILURE(S)`);
    process.exit(1);
  }
  console.log("\nautofill-live.probe OK — resume extraction populates DB fields end-to-end.");
}

main().catch((e) => { console.error(e); process.exit(1); });
