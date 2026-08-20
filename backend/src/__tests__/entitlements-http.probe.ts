// backend/src/__tests__/entitlements-http.probe.ts
//
// Wave 5 / Session 4 — the gates as an HTTP client actually meets them.
//
// entitlements.probe.ts proves the *rules*; this proves they are MOUNTED. A correct
// entitlements service that no route calls is exactly the state this session found the codebase
// in (two subscription middlewares existed, neither was wired to anything), so "the middleware
// is on the route" is the property worth testing over the wire.
//
// Covers:
//   POST /api/v1/jobs                                   → 201 under quota, 403 over it
//   GET  /api/v1/company/jobs/:id/candidates-ranking     → 403 on an expired subscription
//   GET  /api/v1/subscription/usage                      → 403 unsubscribed, 200 subscribed
//   all of the above                                     → 401 with no token (guard teeth)
//
// Fail-provable: drop `requireQuota('job_posts')` from routes/job.routes.ts → the over-limit
// POST returns 201 and this probe goes RED.
//
// Run: FORCE_INMEMORY=1 npx tsx src/__tests__/entitlements-http.probe.ts
process.env.FORCE_INMEMORY = process.env.FORCE_INMEMORY || '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

import type { Server } from 'node:http';
import prisma from '../lib/prisma';
import app from '../app';
import { generateTokenWithSession } from '../utils/jwt.util';
import { createSession } from '../services/auth/session.service';
import { sha256Hex } from '../utils/tokenHash';
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

const PORT = 5096;
const BASE = `http://127.0.0.1:${PORT}/api/v1`;
const SUFFIX = Date.now().toString(36);
const companyId = `http-co-${SUFFIX}`;

let server: Server | null = null;
let token = '';

/**
 * Non-company callers. An entitlement gate must not become an accidental authorisation change:
 * platform staff have no plan to charge and must pass, an agency admin is billed by a different
 * product (Wave 5 S5) and must not be refused on company-billing grounds, and a candidate must
 * still be kept out of paid company features.
 */
const OTHER_ACTORS = [
  { id: `http-staff-${SUFFIX}`, role: 'superadmin', label: 'superadmin' },
  { id: `http-agency-${SUFFIX}`, role: 'agency_admin', label: 'agency admin' },
  { id: `http-cand-${SUFFIX}`, role: 'candidate', label: 'candidate' },
];

const cleanup = async () => {
  const jobs = await prisma.companyJob.findMany({ where: { company_id: companyId }, select: { job_id: true } });
  const jobIds = jobs.map((j) => j.job_id);
  if (jobIds.length) {
    await prisma.aIInterviewResult.deleteMany({ where: { job_id: { in: jobIds } } });
    await prisma.jobApplication.deleteMany({ where: { job_id: { in: jobIds } } });
  }
  await prisma.companyJob.deleteMany({ where: { company_id: companyId } });
  await prisma.userSubscription.deleteMany({ where: { user_id: companyId } });
  await prisma.userSession.deleteMany({ where: { user_id: { in: [companyId, ...OTHER_ACTORS.map((a) => a.id)] } } }).catch(() => {});
  await prisma.companyProfile.deleteMany({ where: { company_id: companyId } });
  await prisma.user.deleteMany({ where: { user_id: { in: [companyId, ...OTHER_ACTORS.map((a) => a.id)] } } });
};

/** A real session token, minted the way login would — bypasses the MFA wall. */
const mintToken = async (
  userId: string = companyId,
  role: string = 'company_admin',
  claimCompanyId: string | undefined = companyId
): Promise<string> => {
  const sessionId = await createSession({
    userId,
    jwtToken: 'placeholder',
    userAgent: 'probe',
    ipAddress: '127.0.0.1',
  } as any);

  const jwt = generateTokenWithSession(userId, role, sessionId, undefined, undefined, claimCompanyId);

  // The session stores a hash of the token it was issued for; keep them in step.
  await prisma.userSession.update({
    where: { session_id: sessionId },
    data: { jwt_token_hash: sha256Hex(jwt) },
  });

  return jwt;
};

const post = async (path: string, body: unknown, auth = true) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

const get = async (path: string, auth = true, asToken?: string) =>
  fetch(`${BASE}${path}`, {
    headers: auth ? { Authorization: `Bearer ${asToken ?? token}` } : {},
  });

const postAs = async (path: string, body: unknown, asToken: string) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${asToken}` },
    body: JSON.stringify(body),
  });

const jobBody = (n: number) => ({
  title: `HTTP probe job ${n}`,
  location: 'Remote',
  description: 'Created by the entitlements HTTP probe.',
  status: 'ACTIVE',
});

const setSubscription = async (planId: string, status: SubscriptionStatus, start: Date, end: Date) => {
  await prisma.userSubscription.deleteMany({ where: { user_id: companyId } });
  await prisma.userSubscription.create({
    data: {
      user_id: companyId,
      plan_id: planId,
      payment_gateway: 'stripe',
      gateway_subscription_id: `sub_http_${SUFFIX}`,
      status,
      billing_cycle: BillingCycle.MONTHLY,
      current_period_start: start,
      current_period_end: end,
    },
  });
};

const main = async () => {
  await cleanup();

  const free = await prisma.subscriptionPlan.findUnique({ where: { plan_id: 'plan_free' } });
  if (!free) throw new Error('seed plan plan_free missing — run prisma db seed');

  await prisma.user.create({
    data: {
      user_id: companyId,
      email: `httpco-${SUFFIX}@probe.test`,
      full_name: 'HTTP Probe Co',
      role: 'company_admin',
      is_email_verified: true,
    },
  });
  await prisma.companyProfile.create({ data: { company_id: companyId, company_name: 'HTTP Probe Co' } });

  server = app.listen(PORT);
  await new Promise((r) => setTimeout(r, 400));
  token = await mintToken();

  // === Guard teeth: without a token nothing is reachable ===================================
  const unauthJob = await post('/jobs', jobBody(0), false);
  check('POST /jobs without a token is 401', unauthJob.status === 401, `got ${unauthJob.status}`);

  const unauthUsage = await get('/subscription/usage', false);
  check('GET /subscription/usage without a token is 401', unauthUsage.status === 401, `got ${unauthUsage.status}`);

  // === No subscription → free allowance, enforced over the wire ============================
  const created: number[] = [];
  for (let i = 1; i <= free.job_post_limit; i++) {
    const res = await post('/jobs', jobBody(i), true);
    created.push(res.status);
  }
  check(
    `the first ${free.job_post_limit} job posts are accepted`,
    created.every((s) => s === 201),
    `statuses: ${created.join(', ')}`
  );

  const overLimit = await post('/jobs', jobBody(99), true);
  const overBody: any = await overLimit.json().catch(() => ({}));

  check('the job past the plan limit is refused with 403', overLimit.status === 403, `got ${overLimit.status}`);
  check(
    'the refusal carries PLAN_UPGRADE_REQUIRED',
    overBody?.code === 'PLAN_UPGRADE_REQUIRED',
    `body: ${JSON.stringify(overBody)}`
  );
  check(
    'the refusal reports the real usage and limit',
    overBody?.current_usage === free.job_post_limit && overBody?.limit === free.job_post_limit,
    `usage=${overBody?.current_usage} limit=${overBody?.limit}`
  );

  const jobCount = await prisma.companyJob.count({ where: { company_id: companyId } });
  check('the refused job was not written', jobCount === free.job_post_limit, `${jobCount} jobs exist`);

  // Closing one hands the slot back — over HTTP, not just in the service.
  const first = await prisma.companyJob.findFirst({ where: { company_id: companyId } });
  await prisma.companyJob.update({ where: { job_id: first!.job_id }, data: { status: 'CLOSED' } });

  const afterClose = await post('/jobs', jobBody(100), true);
  check('closing a job frees the slot for a new post', afterClose.status === 201, `got ${afterClose.status}`);

  // === Premium gate: paid-only endpoints ==================================================
  const usageUnsubscribed = await get('/subscription/usage', true);
  const usageUnsubBody: any = await usageUnsubscribed.json().catch(() => ({}));
  check(
    'GET /subscription/usage is 403 without a live subscription',
    usageUnsubscribed.status === 403 && usageUnsubBody?.code === 'NO_SUBSCRIPTION',
    `status=${usageUnsubscribed.status} body=${JSON.stringify(usageUnsubBody)}`
  );

  const anyJob = await prisma.companyJob.findFirst({ where: { company_id: companyId } });

  const now = new Date();
  await setSubscription(
    'plan_standard',
    SubscriptionStatus.ACTIVE,
    new Date(now.getTime() - 60 * 86400_000),
    new Date(now.getTime() - 30 * 86400_000) // period already over
  );

  const rankingExpired = await get(`/company/jobs/${anyJob!.job_id}/candidates-ranking`, true);
  const rankingBody: any = await rankingExpired.json().catch(() => ({}));
  check(
    'candidate ranking is 403 on a lapsed subscription',
    rankingExpired.status === 403,
    `status=${rankingExpired.status} body=${JSON.stringify(rankingBody)}`
  );
  check(
    'the lapsed subscription was moved off "active" by the lazy expiry, not left as-is',
    ['INACTIVE_SUBSCRIPTION', 'EXPIRED_SUBSCRIPTION'].includes(rankingBody?.code),
    `code=${rankingBody?.code}`
  );

  // === A live subscription opens the same doors ============================================
  await setSubscription(
    'plan_standard',
    SubscriptionStatus.ACTIVE,
    new Date(now.getTime() - 5 * 86400_000),
    new Date(now.getTime() + 25 * 86400_000)
  );

  const usageOk = await get('/subscription/usage', true);
  const usageBody: any = await usageOk.json().catch(() => ({}));
  check('GET /subscription/usage is 200 on a live subscription', usageOk.status === 200, `got ${usageOk.status}`);
  check(
    'usage payload reports the paid plan and its real limits',
    usageBody?.data?.source === 'subscription' && usageBody?.data?.limits?.job_posts === -1,
    JSON.stringify(usageBody?.data ?? usageBody)
  );

  const unlimited = await post('/jobs', jobBody(200), true);
  check(
    'an unlimited plan is no longer blocked by the free limit',
    unlimited.status === 201,
    `got ${unlimited.status}`
  );

  // === Role matrix: the gates must not silently change who may reach a route ================
  await prisma.user.createMany({
    data: OTHER_ACTORS.map((a) => ({
      user_id: a.id,
      email: `${a.id}@probe.test`,
      full_name: a.label,
      role: a.role,
      is_email_verified: true,
    })),
  });

  const staffToken = await mintToken(OTHER_ACTORS[0].id, 'superadmin', undefined);
  const agencyToken = await mintToken(OTHER_ACTORS[1].id, 'agency_admin', undefined);
  const candidateToken = await mintToken(OTHER_ACTORS[2].id, 'candidate', undefined);

  const anyJobForRoles = await prisma.companyJob.findFirst({ where: { company_id: companyId } });

  // Every refusal the billing layer can emit. Asserting "not one of these" is what makes the
  // staff/agency checks below non-vacuous: an earlier version only excluded NO_BILLING_ACCOUNT,
  // so a refusal under a *different* billing code slipped through and the check stayed green
  // even with the bypass removed.
  const BILLING_REFUSALS = [
    'NO_BILLING_ACCOUNT',
    'NOT_A_BILLING_ACCOUNT',
    'NO_SUBSCRIPTION',
    'INACTIVE_SUBSCRIPTION',
    'EXPIRED_SUBSCRIPTION',
    'PLAN_UPGRADE_REQUIRED',
  ];
  const refusedByBilling = (body: any) => BILLING_REFUSALS.includes(body?.code);

  // Platform staff have no company and no plan; refusing them on billing grounds would lock
  // support out of every gated screen.
  const staffRanking = await get(`/company/jobs/${anyJobForRoles!.job_id}/candidates-ranking`, true, staffToken);
  const staffBody: any = await staffRanking.json().catch(() => ({}));
  check(
    'platform staff are not refused by the subscription gate',
    !refusedByBilling(staffBody),
    `status=${staffRanking.status} code=${staffBody?.code} — staff have no plan to charge; refusing them locks support out`
  );

  // The quota gate must not police roles it was never meant to meter.
  const agencyAssign = await postAs('/interviews/assign', {}, agencyToken);
  const agencyBody: any = await agencyAssign.json().catch(() => ({}));
  check(
    'an agency admin is not blocked from /interviews/assign by company billing',
    !refusedByBilling(agencyBody),
    `status=${agencyAssign.status} body=${JSON.stringify(agencyBody)}`
  );

  // ...but a candidate must still be kept out of a paid company feature.
  const candidateRanking = await get(`/company/jobs/${anyJobForRoles!.job_id}/candidates-ranking`, true, candidateToken);
  const candidateBody: any = await candidateRanking.json().catch(() => ({}));
  check(
    'a candidate is still refused a paid company feature, as an authorisation answer (403)',
    candidateRanking.status === 403 && candidateBody?.code === 'NOT_A_BILLING_ACCOUNT',
    `status=${candidateRanking.status} body=${JSON.stringify(candidateBody)}`
  );

  // The candidate-facing interview endpoint must not demand a company allowance.
  const candidateCreate = await postAs('/interviews', { applicationId: 'nonexistent' }, candidateToken);
  const candidateCreateBody: any = await candidateCreate.json().catch(() => ({}));
  check(
    'a candidate reaching POST /interviews is not refused for having no billing account',
    !refusedByBilling(candidateCreateBody),
    `status=${candidateCreate.status} body=${JSON.stringify(candidateCreateBody)}`
  );
};

main()
  .catch((e) => {
    failed++;
    console.error('PROBE ERROR:', e);
  })
  .finally(async () => {
    if (server) await new Promise<void>((r) => server!.close(() => r()));
    await cleanup().catch(() => {});
    await prisma.$disconnect();
    console.log(failed === 0 ? '\nPASS — entitlement gates are mounted and enforced over HTTP' : `\nFAIL — ${failed} check(s)`);
    process.exit(failed === 0 ? 0 : 1);
  });
