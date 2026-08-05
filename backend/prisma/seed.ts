import { PrismaClient } from '@prisma/client';
import { seedBadges } from './seeds/badges.seed';
import { seedSuperAdmin } from './seeds/superadmin.seed';
import { seedRolePermissions } from './seeds/rolePermissions.seed';
import { seedCandidates } from './seeds/candidates.seed';
import { seedJobs } from './seeds/jobs.seed';

const prisma = new PrismaClient();

// FAIL-CLOSED: demo/sample data is seeded ONLY in an explicit dev/test environment. Any other
// NODE_ENV value (unset, 'staging', 'production', 'prod', …) gets a core-only bootstrap — a
// misconfigured or forgotten NODE_ENV can never inject demo rows into a real database.
const env = process.env.NODE_ENV;
const seedDemoAllowed = env === 'development' || env === 'test';

// Deterministic ids so plans upsert in place (SubscriptionPlan.name is NOT unique, so the
// synthetic plan_id is the idempotency key — no blind deleteMany, prod-safe).
const PLANS = [
  {
    plan_id: 'plan_free',
    name: 'Free',
    price_monthly_usd: 0,
    price_annually_usd: 0,
    job_post_limit: 3,
    ai_interview_limit: 5,
    features_included: '["Post up to 3 job listings","Access to active job seekers","Basic support"]',
    is_publicly_available: true,
    stripe_price_id_monthly: '',
    stripe_price_id_annually: '',
  },
  {
    plan_id: 'plan_standard',
    name: 'Standard',
    price_monthly_usd: 699,
    price_annually_usd: 1398,
    job_post_limit: -1,
    ai_interview_limit: 100,
    features_included: '["Unlimited job postings & user accounts","100 candidate views/month","ATS integration for seamless hiring","Detailed analytics & reports","VIP support & quick setup","Internal hiring team management","Enhanced branding & featured jobs"]',
    is_publicly_available: true,
    stripe_price_id_monthly: '',
    stripe_price_id_annually: '',
  },
  {
    plan_id: 'plan_starter',
    name: 'Starter',
    price_monthly_usd: 415,
    price_annually_usd: 830,
    job_post_limit: 3,
    ai_interview_limit: 50,
    features_included: '["3 active job slots, editable","Broader job promotion","1 user, 50 candidate views/month","Employer branding for visibility","Free job edits & updates"]',
    is_publicly_available: true,
    stripe_price_id_monthly: '',
    stripe_price_id_annually: '',
  },
];

/**
 * Core bootstrap seed — prod-safe & idempotent (upsert-only, zero deleteMany).
 * Always runs, in every environment. This is what makes a fresh DB immediately usable:
 * subscription plans, badges, a loginable superadmin, and the RolePermission RBAC baseline.
 */
async function seedCore() {
  for (const { plan_id, ...rest } of PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { plan_id },
      update: rest,
      create: { plan_id, ...rest },
    });
  }
  console.log(`✅ ${PLANS.length} subscription plans upserted.`);

  await seedBadges(prisma);
  await seedSuperAdmin(prisma);
  await seedRolePermissions(prisma);
}

/**
 * Demo seed — dev/staging only, NEVER in production. Populates sample candidates and jobs
 * for local development. Skipped when NODE_ENV=production so a prod bootstrap stays clean.
 */
async function seedDemo() {
  await seedCandidates();
  await seedJobs();
}

async function main() {
  if (!seedDemoAllowed) {
    console.log(`🏭 NODE_ENV='${env ?? '(unset)'}' → core-only bootstrap (no demo data, no destructive ops).`);
  }

  await seedCore();

  if (seedDemoAllowed) {
    await seedDemo();
  }

  console.log('🌱 Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    // The demo seeds (candidates/jobs) hold their own PrismaClient connections that aren't
    // disconnected on the import path; force a clean exit so `prisma db seed` can't hang on
    // those open handles after printing "Seed complete".
    process.exit(process.exitCode ?? 0);
  });
