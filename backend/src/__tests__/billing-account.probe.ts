// backend/src/__tests__/billing-account.probe.ts
//
// Wave 5 / Session 4 — Phase 0 proof. Everything else in this session (quotas, usage counting,
// receipts, reconciliation) assumes one company == one billing account. This probe proves that
// assumption on real rows before any of it is built.
//
// The bug it pins: `subscription.controller` resolved the buyer as `req.user.user_id`, so a
// company_member's checkout wrote a UserSubscription on the *member's own* id. The company —
// whose jobs and interviews the plan is supposed to cover — kept nothing.
//
// Fail-provable: make resolveBillingAccountId return `actor.user_id` instead of
// `actor.company_id` → cases 2/3/4 go RED (member resolves to himself, company sees no plan).
//
// Run: FORCE_INMEMORY=1 npx tsx src/__tests__/billing-account.probe.ts
import prisma from '../lib/prisma';
import { resolveBillingAccountId, billingAccountError } from '../services/subscription/billingAccount';
import { resolveCompanyId } from '../services/auth/tokenIssue.service';
import { getUserSubscription } from '../services/subscription/subscription.service';
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
const ownerId = `probe-owner-${SUFFIX}`;
const memberId = `probe-member-${SUFFIX}`;
const recruiterId = `probe-recruiter-${SUFFIX}`;

const cleanup = async () => {
  await prisma.userSubscription.deleteMany({ where: { user_id: { in: [ownerId, memberId, recruiterId] } } });
  await prisma.companyTeamMember.deleteMany({ where: { company_id: ownerId } });
  await prisma.companyProfile.deleteMany({ where: { company_id: ownerId } });
  await prisma.user.deleteMany({ where: { user_id: { in: [ownerId, memberId, recruiterId] } } });
};

const main = async () => {
  await cleanup();

  // One company: an owner (company_admin) plus a member and a recruiter on its team.
  await prisma.user.createMany({
    data: [
      { user_id: ownerId, email: `owner-${SUFFIX}@probe.test`, full_name: 'Owner', role: 'company_admin', is_email_verified: true },
      { user_id: memberId, email: `member-${SUFFIX}@probe.test`, full_name: 'Member', role: 'company_member', is_email_verified: true },
      { user_id: recruiterId, email: `rec-${SUFFIX}@probe.test`, full_name: 'Rec', role: 'recruiter', is_email_verified: true },
    ],
  });
  await prisma.companyProfile.create({ data: { company_id: ownerId, company_name: 'Probe Co' } });
  await prisma.companyTeamMember.createMany({
    data: [
      { company_id: ownerId, user_id: memberId, role: 'hr_manager', is_active: true },
      { company_id: ownerId, user_id: recruiterId, role: 'recruiter', is_active: true },
    ],
  });

  // --- 1. token claim: every company role resolves to the SAME company id -------------------
  const ownerClaim = await resolveCompanyId({ user_id: ownerId, role: 'company_admin', companyProfile: { company_id: ownerId } });
  const memberClaim = await resolveCompanyId({ user_id: memberId, role: 'company_member' });
  const recruiterClaim = await resolveCompanyId({ user_id: recruiterId, role: 'recruiter' });

  check('company_admin token claim = company id', ownerClaim === ownerId, `got ${ownerClaim}`);
  check('company_member token claim = company id', memberClaim === ownerId, `got ${memberClaim} (expected ${ownerId})`);
  check(
    'recruiter token claim = company id (was undefined before this session)',
    recruiterClaim === ownerId,
    `got ${recruiterClaim} (expected ${ownerId})`
  );

  // --- 2. billing subject: all three actors bill the SAME account ---------------------------
  const asOwner = resolveBillingAccountId({ user_id: ownerId, role: 'company_admin', company_id: ownerClaim });
  const asMember = resolveBillingAccountId({ user_id: memberId, role: 'company_member', company_id: memberClaim });
  const asRecruiter = resolveBillingAccountId({ user_id: recruiterId, role: 'recruiter', company_id: recruiterClaim });

  check('owner bills the company', asOwner === ownerId, `got ${asOwner}`);
  check(
    'member bills the COMPANY, not himself',
    asMember === ownerId && asMember !== memberId,
    `got ${asMember} (member's own id is ${memberId})`
  );
  check('recruiter bills the company', asRecruiter === ownerId, `got ${asRecruiter}`);

  // --- 3. fail-closed for non-company actors -----------------------------------------------
  check('candidate has no billing account', resolveBillingAccountId({ user_id: 'x', role: 'candidate' }) === null, 'expected null');
  check('agency has no billing account', resolveBillingAccountId({ user_id: 'x', role: 'agency_admin' }) === null, 'expected null');
  check(
    'company role WITHOUT the claim fails closed (does not fall back to user_id)',
    resolveBillingAccountId({ user_id: memberId, role: 'company_member' }) === null,
    'expected null — falling back to user_id is the exact bug this prevents'
  );
  check(
    'missing-claim error names the real cause',
    /company_id/.test(billingAccountError({ user_id: memberId, role: 'company_member' })),
    billingAccountError({ user_id: memberId, role: 'company_member' })
  );

  // --- 4. end state: a member's purchase is visible to the company --------------------------
  const plan = await prisma.subscriptionPlan.findFirst({ where: { plan_id: 'plan_standard' } });
  if (!plan) throw new Error('seed plan plan_standard missing — run prisma db seed');

  const now = new Date();
  await prisma.userSubscription.create({
    data: {
      user_id: asMember!, // what the controller now passes for a member-initiated checkout
      plan_id: plan.plan_id,
      payment_gateway: 'stripe',
      gateway_subscription_id: 'sub_probe',
      status: SubscriptionStatus.ACTIVE,
      billing_cycle: BillingCycle.MONTHLY,
      current_period_start: now,
      current_period_end: new Date(now.getTime() + 30 * 86400_000),
    },
  });

  const seenByCompany = await getUserSubscription(ownerId);
  const seenByMemberOwnId = await getUserSubscription(memberId);

  check(
    'member-initiated purchase IS visible to the company',
    seenByCompany?.plan_id === plan.plan_id,
    `company sees ${seenByCompany?.plan_id ?? 'nothing'}`
  );
  check(
    'nothing stranded on the member\'s personal id',
    seenByMemberOwnId === null,
    'a subscription landed on the member\'s own user_id — the pre-session bug'
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
    console.log(failed === 0 ? '\nPASS — billing subject is the company' : `\nFAIL — ${failed} check(s)`);
    process.exit(failed === 0 ? 0 : 1);
  });
