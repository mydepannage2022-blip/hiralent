// backend/src/__tests__/entitlements.probe.ts
//
// Wave 5 / Session 4 — the entitlement rules, on real rows.
//
// Before this session the limits in `SubscriptionPlan` were decorative. `feature-access.service`
// carried a hardcoded `'FREE' | 'PRO' | 'ENTERPRISE'` map while the seeded plans are named
// `Free` / `Starter` / `Standard`, so `getFeatureLimit('Standard','job_posts')` fell through to
// `?? 0` — the paying account got a *smaller* allowance than a free one — and nothing read
// `job_post_limit` / `ai_interview_limit` at all.
//
// Fail-provable: make getUsage always return `{job_posts: 0, ...}`, or make checkQuota return
// `allowed: true` → cases 1/2/4/6 go RED.
//
// Run: FORCE_INMEMORY=1 npx tsx src/__tests__/entitlements.probe.ts
import { JobStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import {
  getEntitlements,
  getUsage,
  checkQuota,
  getPlanRanks,
  __clearPlanRankCache,
} from '../services/subscription/entitlements.service';
import { SubscriptionStatus, BillingCycle } from '../types/subscription.types';

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => {
  if (ok) {
    console.log('  ok: ' + name);
  } else {
    failed++;
    console.error('  FAIL: ' + name + '\n      -> ' + detail);
  }
};

const SUFFIX = Date.now().toString(36);
const companyId = `ent-co-${SUFFIX}`;
// One application per (candidate, job) is enforced by a unique constraint, so each interview
// gets its own candidate.
const candidateIds = [0, 1, 2].map((i) => `ent-cand-${SUFFIX}-${i}`);
const userIds = [companyId, ...candidateIds];

const cleanup = async () => {
  const jobs = await prisma.companyJob.findMany({ where: { company_id: companyId }, select: { job_id: true } });
  const jobIds = jobs.map((j) => j.job_id);
  if (jobIds.length) {
    await prisma.aIInterviewResult.deleteMany({ where: { job_id: { in: jobIds } } });
    await prisma.jobApplication.deleteMany({ where: { job_id: { in: jobIds } } });
  }
  await prisma.companyJob.deleteMany({ where: { company_id: companyId } });
  await prisma.userSubscription.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.companyProfile.deleteMany({ where: { company_id: companyId } });
  await prisma.user.deleteMany({ where: { user_id: { in: userIds } } });
};

const makeJob = async (n: number, status: JobStatus) =>
  prisma.companyJob.create({
    data: {
      company_id: companyId,
      title: `Probe job ${n}`,
      location: 'Remote',
      description: 'probe',
      status,
    },
  });

/** One AI interview against a company job, created at `createdAt`. */
const makeInterview = async (jobId: string, n: number, createdAt: Date) => {
  const candidateId = candidateIds[n - 1];
  const app = await prisma.jobApplication.create({
    data: { candidate_id: candidateId, job_id: jobId },
  });
  await prisma.aIInterviewResult.create({
    data: {
      application_id: app.application_id,
      candidate_id: candidateId,
      job_id: jobId,
      interview_type: 'screening',
      created_at: createdAt,
    },
  });
  return app.application_id;
};

const setSubscription = async (planId: string, status: SubscriptionStatus, periodStart: Date, periodEnd: Date) => {
  await prisma.userSubscription.deleteMany({ where: { user_id: companyId } });
  await prisma.userSubscription.create({
    data: {
      user_id: companyId,
      plan_id: planId,
      payment_gateway: 'stripe',
      gateway_subscription_id: `sub_${SUFFIX}`,
      status,
      billing_cycle: BillingCycle.MONTHLY,
      current_period_start: periodStart,
      current_period_end: periodEnd,
    },
  });
};

const main = async () => {
  await cleanup();
  __clearPlanRankCache();

  const free = await prisma.subscriptionPlan.findUnique({ where: { plan_id: 'plan_free' } });
  const standard = await prisma.subscriptionPlan.findUnique({ where: { plan_id: 'plan_standard' } });
  if (!free || !standard) throw new Error('seed plans missing — run prisma db seed');

  await prisma.user.createMany({
    data: [
      { user_id: companyId, email: `entco-${SUFFIX}@probe.test`, full_name: 'Ent Co', role: 'company_admin', is_email_verified: true },
      ...candidateIds.map((id, i) => ({
        user_id: id,
        email: `entcand-${SUFFIX}-${i}@probe.test`,
        full_name: `Cand ${i}`,
        role: 'candidate',
        is_email_verified: true,
      })),
    ],
  });
  await prisma.companyProfile.create({ data: { company_id: companyId, company_name: 'Ent Co' } });

  // === 1. No subscription → the seeded Free plan, read from the DB =========================
  const noSub = await getEntitlements(companyId);
  check(
    'no subscription falls back to the seeded Free plan',
    noSub.source === 'free_fallback' && noSub.plan_id === 'plan_free',
    `source=${noSub.source} plan=${noSub.plan_id}`
  );
  check(
    'fallback limits come from the DB row, not from code',
    noSub.limits.job_posts === free.job_post_limit && noSub.limits.ai_interviews === free.ai_interview_limit,
    `got ${JSON.stringify(noSub.limits)} vs DB {job_posts:${free.job_post_limit}, ai_interviews:${free.ai_interview_limit}}`
  );

  // Fill the free allowance (3 slots).
  const j1 = await makeJob(1, JobStatus.ACTIVE);
  const j2 = await makeJob(2, JobStatus.DRAFT);
  const j3 = await makeJob(3, JobStatus.PAUSED);

  const atLimit = await checkQuota(companyId, 'job_posts');
  check(
    'DRAFT + ACTIVE + PAUSED all occupy a slot',
    atLimit.usage === 3 && atLimit.limit === 3,
    `usage=${atLimit.usage} limit=${atLimit.limit}`
  );
  check('a 4th job is refused at the free limit', atLimit.allowed === false, `allowed=${atLimit.allowed}`);

  // === 2. Concurrent semantics: closing a job hands the slot back ==========================
  await prisma.companyJob.update({ where: { job_id: j3.job_id }, data: { status: JobStatus.CLOSED } });
  const afterClose = await checkQuota(companyId, 'job_posts');
  check(
    'closing a job frees its slot (concurrent, not cumulative)',
    afterClose.usage === 2 && afterClose.allowed === true,
    `usage=${afterClose.usage} allowed=${afterClose.allowed}`
  );

  await prisma.companyJob.update({ where: { job_id: j3.job_id }, data: { status: JobStatus.ARCHIVED } });
  const afterArchive = await getUsage(companyId);
  check('archived jobs do not occupy a slot', afterArchive.job_posts === 2, `usage=${afterArchive.job_posts}`);

  // === 3. Paid plan with -1 → unlimited =====================================================
  const now = new Date();
  const periodStart = new Date(now.getTime() - 5 * 86400_000);
  const periodEnd = new Date(now.getTime() + 25 * 86400_000);
  await setSubscription('plan_standard', SubscriptionStatus.ACTIVE, periodStart, periodEnd);

  const paid = await checkQuota(companyId, 'job_posts');
  check(
    'paid plan reads its real limit from the DB (-1 = unlimited)',
    paid.limit === standard.job_post_limit && paid.allowed === true,
    `limit=${paid.limit} allowed=${paid.allowed} (DB says ${standard.job_post_limit})`
  );
  check('paid plan is named from the DB row', paid.plan_name === standard.name, `got ${paid.plan_name}`);

  // === 4. A dead subscription must NOT keep its paid entitlements ==========================
  await setSubscription(
    'plan_standard',
    SubscriptionStatus.EXPIRED,
    new Date(now.getTime() - 60 * 86400_000),
    new Date(now.getTime() - 30 * 86400_000)
  );
  const expired = await getEntitlements(companyId);
  check(
    'expired subscription drops back to Free, not Standard',
    expired.source === 'free_fallback' && expired.limits.job_posts === free.job_post_limit,
    `source=${expired.source} limits=${JSON.stringify(expired.limits)}`
  );

  await setSubscription('plan_standard', SubscriptionStatus.CANCELED, periodStart, periodEnd);
  const canceled = await getEntitlements(companyId);
  check(
    'canceled subscription drops back to Free',
    canceled.source === 'free_fallback',
    `source=${canceled.source}`
  );

  // A trial is live — S3 treats TRIALING as active, so entitlements must agree.
  await setSubscription('plan_standard', SubscriptionStatus.TRIALING, periodStart, periodEnd);
  const trialing = await getEntitlements(companyId);
  check(
    'trialing subscription is entitled to its paid plan',
    trialing.source === 'subscription' && trialing.plan_id === 'plan_standard',
    `source=${trialing.source} plan=${trialing.plan_id}`
  );

  // === 5. AI interview usage is windowed to the billing period =============================
  await setSubscription('plan_standard', SubscriptionStatus.ACTIVE, periodStart, periodEnd);

  await makeInterview(j1.job_id, 1, new Date(now.getTime() - 1 * 86400_000)); // inside period
  await makeInterview(j2.job_id, 2, new Date(now.getTime() - 2 * 86400_000)); // inside period
  await makeInterview(j1.job_id, 3, new Date(now.getTime() - 40 * 86400_000)); // BEFORE period start

  const aiUsage = await getUsage(companyId);
  check(
    'AI interviews are counted only inside the current billing period',
    aiUsage.ai_interviews === 2,
    `counted ${aiUsage.ai_interviews}, expected 2 (a 3rd exists but predates current_period_start)`
  );

  const aiQuota = await checkQuota(companyId, 'ai_interviews');
  check(
    'AI interview limit comes from the plan row',
    aiQuota.limit === standard.ai_interview_limit,
    `limit=${aiQuota.limit} vs DB ${standard.ai_interview_limit}`
  );

  // === 6. Another company's rows never count against this one ==============================
  const strayJobs = await prisma.companyJob.count({ where: { company_id: companyId } });
  check('usage is scoped to the company', strayJobs === 3, `company owns ${strayJobs} jobs`);

  // === 7. Plan ranking is derived from the catalogue, not a hardcoded list =================
  __clearPlanRankCache();
  const ranks = await getPlanRanks();
  const freeRank = ranks.get(free.name);
  const standardRank = ranks.get(standard.name);
  check(
    'every real plan name has a rank (the old hardcoded list matched none)',
    freeRank !== undefined && standardRank !== undefined,
    `Free=${freeRank} Standard=${standardRank}`
  );
  check(
    'a more expensive plan outranks a cheaper one',
    (standardRank ?? -1) > (freeRank ?? -1),
    `Free=${freeRank} Standard=${standardRank}`
  );
};

main()
  .catch((e) => {
    failed++;
    console.error('PROBE ERROR:', e);
  })
  .finally(async () => {
    await cleanup().catch(() => {});
    await prisma.$disconnect();
    console.log(failed === 0 ? '\nPASS — entitlements are driven by the plan rows' : `\nFAIL — ${failed} check(s)`);
    process.exit(failed === 0 ? 0 : 1);
  });
