// backend/prisma/seeds/staging-demo.seed.ts
//
// Staging demo fixture — Wave 8-lite / W-7.
// See hiralent-master-plan/waves/wave-8-lite-staging.md and runbooks/staging-demo-accounts.md
//
//   Seed:   ALLOW_DEMO_SEED=1 DEMO_USER_PASSWORD='…' npx tsx prisma/seeds/staging-demo.seed.ts
//   Clean:  ALLOW_DEMO_SEED=1 npx tsx prisma/seeds/staging-demo.seed.ts --clean
//   (compiled: node dist/prisma/seeds/staging-demo.seed.js)
//
// ── Why this is a SEPARATE file, never wired into `prisma db seed` ───────────────────────────
// `prisma/seed.ts` is fail-closed: outside development/test it runs a core-only bootstrap and
// deliberately withholds the demo candidates/jobs. That is correct, and staging runs as
// NODE_ENV=production — so NODE_ENV cannot be the switch that enables demo data here. If this
// file were added to the default seed chain, the release step (which runs on every deploy) would
// inject fake companies and applications into whatever database it was pointed at.
//
// Two independent gates instead:
//   1. ALLOW_DEMO_SEED=1 must be set explicitly.
//   2. DEMO_USER_PASSWORD must be provided — there is NO default. A leaked/copied
//      ALLOW_DEMO_SEED alone therefore cannot create accounts with known credentials. Same
//      fail-closed reasoning as seeds/superadmin.seed.ts.
//
// ── Contents: exactly one of each ────────────────────────────────────────────────────────────
// 1 agency org + 1 agency admin · 1 company · 1 candidate · 1 job · 1 application.
// Every user-visible name carries a `[DEMO]` prefix and every email sits in one obvious
// namespace, so nobody ever has to guess whether a row is real. Deliberately small: the client
// needs to SEE a populated product, not a fake business — each extra row is one more thing that
// has to stay consistent with real behaviour.
//
// Idempotent: deterministic ids + upsert throughout, so re-running never creates a second copy.

import { PrismaClient, JobStatus, JobApplicationStatus, AgencyStatus, AgencyType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Deterministic ids — the idempotency keys. Prefixed so they are obvious in the database too.
const IDS = {
  agencyOrg: 'demo-agency-org',
  agencyAdmin: 'demo-agency-admin',
  company: 'demo-company',
  candidate: 'demo-candidate',
  job: 'demo-job',
  application: 'demo-application',
} as const;

const EMAILS = {
  agencyAdmin: 'demo.agency@hiralent.com',
  company: 'demo.company@hiralent.com',
  candidate: 'demo.candidate@hiralent.com',
} as const;

const LABEL = '[DEMO]';

function requireGates(): { password: string } | null {
  if (process.env.ALLOW_DEMO_SEED !== '1') {
    console.error(
      '❌ [staging-demo] refusing to run: ALLOW_DEMO_SEED=1 is not set.\n' +
        '   This fixture writes fake companies, jobs and applications. It is opt-in by design so it\n' +
        '   can never fire as a side effect of a deploy.'
    );
    process.exit(1);
  }
  if (process.argv.includes('--clean')) return null;

  const password = (process.env.DEMO_USER_PASSWORD || '').trim();
  if (!password) {
    console.error(
      '❌ [staging-demo] refusing to run: DEMO_USER_PASSWORD is not set.\n' +
        '   There is deliberately no default — a known password would make these accounts a way in\n' +
        '   to any environment where ALLOW_DEMO_SEED was left enabled.'
    );
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('❌ [staging-demo] DEMO_USER_PASSWORD must be at least 10 characters.');
    process.exit(1);
  }
  return { password };
}

/**
 * Remove the fixture. Deletes in FK order; everything else cascades from the users
 * (CompanyProfile / CandidateProfile / AgencyAdminProfile are all onDelete: Cascade, and
 * CompanyJob cascades from its company user).
 */
async function clean(): Promise<void> {
  await prisma.jobApplication.deleteMany({ where: { application_id: IDS.application } });
  await prisma.companyJob.deleteMany({ where: { job_id: IDS.job } });
  await prisma.user.deleteMany({
    where: { user_id: { in: [IDS.candidate, IDS.company, IDS.agencyAdmin] } },
  });
  await prisma.agency.deleteMany({ where: { agency_id: IDS.agencyOrg } });
  console.log('🧹 [staging-demo] fixture removed.');
}

async function seed(password: string): Promise<void> {
  const password_hash = bcrypt.hashSync(password, 10);

  // ── 1. Agency organisation ──────────────────────────────────────────────────────────────
  // APPROVED so the agency dashboard is usable; a PENDING agency sits behind a review gate.
  await prisma.agency.upsert({
    where: { agency_id: IDS.agencyOrg },
    update: {},
    create: {
      agency_id: IDS.agencyOrg,
      name: `${LABEL} Global Relocation Partners`,
      email: EMAILS.agencyAdmin,
      type: AgencyType.RELOCATION,
      status: AgencyStatus.APPROVED,
      approved_at: new Date(),
      service_description: 'Demo agency account — visa and relocation support. Not a real company.',
      operating_countries: ['FR', 'DE', 'AE'],
      languages_supported: ['English', 'French'],
      service_categories: ['visa', 'relocation', 'housing'],
    },
  });

  // ── 2. Agency admin ─────────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { user_id: IDS.agencyAdmin },
    update: { password_hash, agency_id: IDS.agencyOrg },
    create: {
      user_id: IDS.agencyAdmin,
      email: EMAILS.agencyAdmin,
      password_hash,
      full_name: `${LABEL} Agency Admin`,
      role: 'agency_admin',
      is_email_verified: true,
      agency_id: IDS.agencyOrg,
    },
  });
  await prisma.agencyAdminProfile.upsert({
    where: { admin_id: IDS.agencyAdmin },
    update: {},
    create: {
      admin_id: IDS.agencyAdmin,
      position: 'Relocation Lead',
      specialization: ['visa', 'relocation'],
      languages: ['English', 'French'],
      years_experience: 6,
    },
  });

  // ── 3. Company ──────────────────────────────────────────────────────────────────────────
  // CompanyProfile.company_id IS the user's user_id (no default on the @id) — the whole
  // billing/entitlement layer assumes that identity, so never diverge them.
  await prisma.user.upsert({
    where: { user_id: IDS.company },
    update: { password_hash },
    create: {
      user_id: IDS.company,
      email: EMAILS.company,
      password_hash,
      full_name: `${LABEL} Company Admin`,
      role: 'company_admin',
      is_email_verified: true,
      company_role: 'Head of Talent',
    },
  });
  await prisma.companyProfile.upsert({
    where: { company_id: IDS.company },
    update: {},
    create: {
      company_id: IDS.company,
      company_name: `${LABEL} Northwind Technologies`,
      display_name: `${LABEL} Northwind Technologies`,
      slug: 'demo-northwind-technologies',
      tagline: 'Demo employer account — not a real company.',
      industry: 'Technology',
      company_size: 'medium',
      headquarters: 'Paris, France',
      description:
        'Demo company used to showcase the Hiralent employer experience on staging. All data here is fictional.',
      // verified so it appears on the public Discover page (built in Wave 4 S6), which is one of
      // the screens the walkthrough shows.
      verified: true,
      verification_status: 'verified',
      verification_date: new Date(),
      remote_policy: 'hybrid',
      typical_roles: ['Frontend Engineer', 'Backend Engineer'],
      hiring_regions: ['EU'],
    },
  });

  // ── 4. Candidate ────────────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { user_id: IDS.candidate },
    update: { password_hash },
    create: {
      user_id: IDS.candidate,
      email: EMAILS.candidate,
      password_hash,
      full_name: `${LABEL} Candidate`,
      role: 'candidate',
      is_email_verified: true,
    },
  });
  await prisma.candidateProfile.upsert({
    where: { candidate_id: IDS.candidate },
    update: {},
    create: {
      candidate_id: IDS.candidate,
      headline: `${LABEL} Frontend Engineer`,
      about_me: 'Demo candidate account used for the staging walkthrough. This is not a real person.',
      city: 'Lyon',
      location: 'Lyon, France',
      skills: ['React', 'TypeScript', 'Next.js', 'CSS'],
      education: 'BSc Computer Science',
      experience: '4 years',
      languages: 'English, French',
    },
  });

  // ── 5. Job ──────────────────────────────────────────────────────────────────────────────
  // ACTIVE so it is publicly listed and applyable. One job keeps the company well inside the
  // free plan's 3-slot allowance, so the quota gates behave normally rather than being tripped.
  await prisma.companyJob.upsert({
    where: { job_id: IDS.job },
    update: {},
    create: {
      job_id: IDS.job,
      company_id: IDS.company,
      title: `${LABEL} Senior Frontend Engineer`,
      location: 'Paris, France (Hybrid)',
      description:
        'Demo job posting for the staging walkthrough. Build and ship the customer-facing web app in React and TypeScript. This role is fictional.',
      salary_range: '55,000 – 75,000 EUR',
      required_skills: ['React', 'TypeScript', 'Next.js'],
      status: JobStatus.ACTIVE,
      job_type: 'full_time',
      experience_level: 'senior',
      remote_option: 'hybrid',
      department: 'Engineering',
    },
  });

  // ── 6. Application ──────────────────────────────────────────────────────────────────────
  // Puts the candidate into the company's pipeline so the applicants screen is not empty.
  await prisma.jobApplication.upsert({
    where: { application_id: IDS.application },
    update: {},
    create: {
      application_id: IDS.application,
      candidate_id: IDS.candidate,
      job_id: IDS.job,
      status: JobApplicationStatus.APPLIED,
      cover_letter: 'Demo application submitted by the staging fixture.',
      current_location: 'Lyon, France',
      willing_to_relocate: true,
    },
  });

  console.log('\n🌱 [staging-demo] fixture ready — one of each, all labelled ' + LABEL + ':');
  console.log(`   agency org : ${LABEL} Global Relocation Partners  (${IDS.agencyOrg}, APPROVED)`);
  console.log(`   agency     : ${EMAILS.agencyAdmin}`);
  console.log(`   company    : ${EMAILS.company}   → ${LABEL} Northwind Technologies (verified)`);
  console.log(`   candidate  : ${EMAILS.candidate}`);
  console.log(`   job        : ${LABEL} Senior Frontend Engineer (ACTIVE)`);
  console.log(`   application: candidate → job (APPLIED)`);
  console.log('\n   Password: the DEMO_USER_PASSWORD you supplied (not printed).');
  console.log('   The company has NO subscription — it is on the free plan, which is the honest default.\n');
}

async function main(): Promise<void> {
  const gates = requireGates();

  if (process.argv.includes('--clean')) {
    await clean();
    return;
  }

  // No pre-clean: every write below is an upsert on a deterministic id, so a re-run updates in
  // place rather than duplicating. (If a future edit CHANGES one of the ids in IDS, run --clean
  // first — the old row would otherwise be orphaned under its previous id.)
  await seed(gates!.password);
}

main()
  .catch((e) => {
    console.error('[staging-demo] failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  });
