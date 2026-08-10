// backend/src/__tests__/discover-companies.probe.ts
//
// Wave 4 / Session 6 — Company dead-ends (Phase 4.1): LIVE proof of the public
// "discover companies" endpoint that backs /company/discover (previously hardcoded).
//
// Self-gating: SKIP + exit 0 if Postgres is unreachable.
//
// Fail-provable, non-vacuous:
//   (A) SECURITY — CompanyProfile carries PII (contact_email, contact_number, tax_id,
//       registration_number, full_address). The public payload must NOT contain any of
//       it. Add a field to the service select → this leaks → probe RED.
//   (B) SEARCH TEETH — searching a token that matches only company Alpha returns Alpha
//       and NOT Beta. Break the where-filter → Beta appears → probe RED.
//   (C) SHAPE — real rows (not hardcoded BMW/Belle), accurate ACTIVE job counts,
//       pagination + limit-cap honored, and non-company users never surface.
//
// Run: FORCE_INMEMORY=1 npx tsx src/__tests__/discover-companies.probe.ts

import prisma from "../lib/prisma";
import { listPublicCompanies } from "../services/employer.service";

let failures = 0;
const check = (name: string, cond: boolean) => {
  if (cond) console.log("  ok:", name);
  else { failures++; console.error("  FAIL:", name); }
};

const TAG = `discover-${Date.now()}`;
// The internal company_id (PK) is deliberately DISTINCT from the public slug/name so the
// "no PK in payload" teeth are real: the PK string appears in NO exposed field, so if it
// shows up in the JSON it can only be a genuine leak (Wave 4 review, F3).
const ids = {
  alpha: `pk-${TAG}-alpha`,
  beta: `pk-${TAG}-beta`,
  candidate: `${TAG}-cand`,
  job: `${TAG}-job`,
};

// PII seeded into Alpha's profile — must never appear in the public payload.
const PII = {
  contact_email: `secret.${TAG}@internal.example`,
  contact_number: "+1-555-0100-SECRET",
  tax_id: `TAX-${TAG}`,
  registration_number: `REG-${TAG}`,
  full_address: `13 Secret Street ${TAG}`,
};
const CANDIDATE_EMAIL = `${TAG}-cand@e.com`;
const CANDIDATE_NAME = `${TAG} CandidatePerson`;

async function main() {
  try {
    await prisma.$connect();
    await prisma.companyProfile.count();
  } catch (e: any) {
    console.log("SKIP: Postgres not reachable —", (e?.message || "").split("\n")[0]);
    console.log("discover-companies.probe SKIPPED (no DB).");
    process.exit(0);
  }

  try {
    // Two company users with profiles + one candidate user (no profile).
    await prisma.user.create({ data: { user_id: ids.alpha, email: `${ids.alpha}@e.com`, password_hash: "x", full_name: "Alpha Owner", role: "company", is_email_verified: true } });
    await prisma.user.create({ data: { user_id: ids.beta, email: `${ids.beta}@e.com`, password_hash: "x", full_name: "Beta Owner", role: "company", is_email_verified: true } });
    await prisma.user.create({ data: { user_id: ids.candidate, email: CANDIDATE_EMAIL, password_hash: "x", full_name: CANDIDATE_NAME, role: "candidate", is_email_verified: true } });

    await prisma.companyProfile.create({
      data: {
        company_id: ids.alpha,
        company_name: `${TAG} Alpha Corp`,
        display_name: `${TAG} Alpha`,
        slug: `${TAG}-alpha`,
        industry: "Technology",
        headquarters: "Berlin",
        company_size: "medium",
        logo_url: "/uploads/logos/alpha.png",
        verified: true,
        rating: 4.5,
        ...PII,
      },
    });
    await prisma.companyProfile.create({
      data: {
        company_id: ids.beta,
        company_name: `${TAG} Beta LLC`,
        display_name: `${TAG} Beta`,
        slug: `${TAG}-beta`,
        industry: "Finance",
        headquarters: "Paris",
        company_size: "small",
        verified: false,
        rating: 3.9,
      },
    });

    // One ACTIVE job for Alpha, none for Beta → proves accurate live counts.
    await prisma.companyJob.create({ data: { job_id: ids.job, company_id: ids.alpha, title: "Engineer", location: "Berlin", description: "d", required_skills: ["ts"], screening_questions: [], status: "ACTIVE" } });

    // Public navigation key is the slug, NOT the internal PK (Wave 4 review, F3).
    const alphaSlug = `${TAG}-alpha`;
    const betaSlug = `${TAG}-beta`;

    // ---- (C) SHAPE: both seeded companies surface via search on the shared tag ----
    const both = await listPublicCompanies({ search: TAG, limit: 50 });
    const bySlug = new Map(both.companies.map((c) => [c.slug, c]));
    check("Alpha returned", bySlug.has(alphaSlug));
    check("Beta returned", bySlug.has(betaSlug));
    check("real data, not hardcoded (Alpha name carries the run tag)", bySlug.get(alphaSlug)?.company_name === `${TAG} Alpha Corp`);
    check("Alpha active_jobs_count = 1 (accurate live count)", bySlug.get(alphaSlug)?.active_jobs_count === 1);
    check("Beta active_jobs_count = 0", bySlug.get(betaSlug)?.active_jobs_count === 0);
    check("real rating preserved (Alpha 4.5)", bySlug.get(alphaSlug)?.rating === 4.5);

    // ---- (A) SECURITY: no PII, and no candidate identity, in the public payload ----
    const json = JSON.stringify(both.companies);
    check("payload has NO contact_email", !json.includes(PII.contact_email));
    check("payload has NO contact_number", !json.includes(PII.contact_number));
    check("payload has NO tax_id", !json.includes(PII.tax_id));
    check("payload has NO registration_number", !json.includes(PII.registration_number));
    check("payload has NO full_address", !json.includes(PII.full_address));
    check("candidate (non-company) never surfaces — no candidate email", !json.includes(CANDIDATE_EMAIL));
    check("candidate (non-company) never surfaces — no candidate name", !json.includes(CANDIDATE_NAME));
    // F3 teeth: the internal company_id / User PK must NOT leak in the public list. Reverting
    // the DTO change (re-adding company_id) makes these two fail.
    check("payload has NO internal company_id PK (Alpha)", !json.includes(ids.alpha));
    check("payload has NO internal company_id PK (Beta)", !json.includes(ids.beta));

    // ---- (B) SEARCH TEETH: token matching only Alpha returns Alpha, not Beta ----
    const alphaOnly = await listPublicCompanies({ search: `${TAG} Alpha`, limit: 50 });
    const alphaSlugs = new Set(alphaOnly.companies.map((c) => c.slug));
    check("search 'Alpha' returns Alpha", alphaSlugs.has(alphaSlug));
    check("search 'Alpha' excludes Beta (filter has teeth)", !alphaSlugs.has(betaSlug));

    // ---- Pagination + limit-cap ----
    const paged = await listPublicCompanies({ search: TAG, page: 1, limit: 1 });
    check("limit=1 returns exactly 1 row", paged.companies.length === 1);
    check("pagination.total counts all matches (>= 2)", paged.pagination.total >= 2);
    check("pagination.totalPages reflects the cap (>= 2)", paged.pagination.totalPages >= 2);

    const capped = await listPublicCompanies({ search: TAG, limit: 9999 });
    check("limit is capped at 50", capped.pagination.limit === 50);
  } finally {
    await prisma.companyJob.deleteMany({ where: { job_id: ids.job } }).catch(() => {});
    await prisma.companyProfile.deleteMany({ where: { company_id: { in: [ids.alpha, ids.beta] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { user_id: { in: [ids.alpha, ids.beta, ids.candidate] } } }).catch(() => {});
    await prisma.$disconnect();
  }

  if (failures) { console.error(`\ndiscover-companies.probe: ${failures} FAILURE(S)`); process.exit(1); }
  console.log("\ndiscover-companies.probe OK — real companies, accurate counts, no PII leak, search + pagination have teeth.");
}

main().catch((e) => { console.error(e); process.exit(1); });
