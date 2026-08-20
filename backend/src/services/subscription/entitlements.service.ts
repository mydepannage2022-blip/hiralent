import { JobStatus } from '@prisma/client';
import prisma from '../../lib/prisma';
import { getUserSubscription } from './subscription.service';
import { SubscriptionStatus } from '../../types/subscription.types';

/**
 * What a billing account is actually allowed to do.
 *
 * The single source of truth is the `SubscriptionPlan` row — `job_post_limit`,
 * `ai_interview_limit`, `features_included`. Nothing here hardcodes plan names or numbers; the
 * previous implementation carried a `'FREE' | 'PRO' | 'ENTERPRISE'` map that matched none of the
 * real seeded plans (`Free` / `Starter` / `Standard`), so every lookup silently fell through to
 * a zero limit and a paying customer was entitled to less than a free one.
 *
 * Accounts are companies, resolved by `resolveBillingAccountId` — see billingAccount.ts.
 */

/** Plan id of the seeded free tier. An account with no live subscription is entitled to this. */
const FREE_PLAN_ID = 'plan_free';

/** `-1` in the DB means "no ceiling". */
export const UNLIMITED = -1;

/** Job statuses that occupy a slot. `job_post_limit` is a *concurrent* allowance: closing or
 *  archiving a job hands the slot back, matching the plan copy ("3 active job slots, editable"). */
const SLOT_CONSUMING_STATUSES: JobStatus[] = [JobStatus.DRAFT, JobStatus.ACTIVE, JobStatus.PAUSED];

/** Statuses that entitle an account to its plan. Trialing is live — the same rule S3 applies to
 *  cancel/change-plan — otherwise a trial would be sold and then immediately gated. */
const LIVE_STATUSES: string[] = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING];

export type QuotaKey = 'job_posts' | 'ai_interviews';
export type EntitlementSource = 'subscription' | 'free_fallback' | 'none';

export interface PlanLimits {
  job_posts: number;
  ai_interviews: number;
}

export interface Entitlements {
  account_id: string;
  plan_id: string | null;
  plan_name: string;
  source: EntitlementSource;
  status: string | null;
  limits: PlanLimits;
  /** Window the usage counters are measured over. */
  period_start: Date;
  period_end: Date | null;
  /** Marketing copy from `features_included` — display only, never an access decision. */
  features: string[];
}

export interface UsageCounts {
  job_posts: number;
  ai_interviews: number;
}

export interface QuotaCheck {
  key: QuotaKey;
  allowed: boolean;
  usage: number;
  /** `-1` = unlimited. */
  limit: number;
  plan_name: string;
  source: EntitlementSource;
}

/** `features_included` is a JSON-encoded string array; tolerate anything else without throwing. */
const parseFeatures = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

/** Fallback window when there is no billing period to measure against. */
const ROLLING_WINDOW_DAYS = 30;
const rollingWindowStart = (): Date => new Date(Date.now() - ROLLING_WINDOW_DAYS * 86400_000);

/**
 * Resolve what this account is entitled to right now.
 *
 * `getUserSubscription` already applies S3's lazy expiry, so a lapsed row has been moved to its
 * terminal status before we read it — a subscription that ran out is never treated as live.
 */
export const getEntitlements = async (accountId: string): Promise<Entitlements> => {
  const subscription = await getUserSubscription(accountId);

  const isLive =
    !!subscription &&
    LIVE_STATUSES.includes(subscription.status) &&
    !!subscription.current_period_end &&
    new Date(subscription.current_period_end) > new Date();

  if (isLive && subscription!.plan) {
    const plan = subscription!.plan!;
    return {
      account_id: accountId,
      plan_id: plan.plan_id,
      plan_name: plan.name,
      source: 'subscription',
      status: subscription!.status,
      limits: { job_posts: plan.job_post_limit, ai_interviews: plan.ai_interview_limit },
      period_start: new Date(subscription!.current_period_start),
      period_end: new Date(subscription!.current_period_end),
      features: parseFeatures(plan.features_included),
    };
  }

  // No live subscription — fall back to the seeded free tier so the default tracks whatever an
  // admin has configured, rather than a second set of numbers living in code.
  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { plan_id: FREE_PLAN_ID } });

  if (!freePlan) {
    // Fail closed. A missing free plan is a broken deployment, not a licence to bypass limits.
    return {
      account_id: accountId,
      plan_id: null,
      plan_name: 'none',
      source: 'none',
      status: subscription?.status ?? null,
      limits: { job_posts: 0, ai_interviews: 0 },
      period_start: rollingWindowStart(),
      period_end: null,
      features: [],
    };
  }

  return {
    account_id: accountId,
    plan_id: freePlan.plan_id,
    plan_name: freePlan.name,
    source: 'free_fallback',
    status: subscription?.status ?? null,
    limits: { job_posts: freePlan.job_post_limit, ai_interviews: freePlan.ai_interview_limit },
    period_start: rollingWindowStart(),
    period_end: null,
    features: parseFeatures(freePlan.features_included),
  };
};

/**
 * Current consumption for the account.
 *
 * job_posts  — concurrent: how many slots are occupied right now.
 * ai_interviews — consumed: how many were created inside the current window. On a live plan the
 * window is the billing period (so it resets on renewal); with no subscription it is a rolling
 * 30 days, because there is no period to anchor to.
 */
export const getUsage = async (accountId: string, entitlements?: Entitlements): Promise<UsageCounts> => {
  const ent = entitlements ?? (await getEntitlements(accountId));

  // Both counts happen in the database. This runs on every job create and every interview
  // assignment, so loading the company's jobs into memory to count them would put a full
  // per-company table read on the hot path — and then feed every job id back as an `IN (...)`
  // list, which degrades badly for exactly the large customers who pay the most.
  const [jobPosts, aiInterviews] = await Promise.all([
    prisma.companyJob.count({
      where: { company_id: accountId, status: { in: SLOT_CONSUMING_STATUSES } },
    }),
    // AIInterviewResult has no relation to CompanyJob (only a loose `job_id`), so the company's
    // jobs are matched with a subquery rather than a materialised id list.
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "AIInterviewResult" air
      WHERE air.created_at >= ${ent.period_start}
        AND air.job_id IN (SELECT cj.job_id FROM "CompanyJob" cj WHERE cj.company_id = ${accountId})
    `,
  ]);

  return { job_posts: jobPosts, ai_interviews: Number(aiInterviews[0]?.count ?? 0) };
};

/** Would one more of `key` be allowed right now? */
export const checkQuota = async (accountId: string, key: QuotaKey): Promise<QuotaCheck> => {
  const ent = await getEntitlements(accountId);
  const usage = await getUsage(accountId, ent);

  const limit = ent.limits[key];
  const used = usage[key];

  return {
    key,
    allowed: limit === UNLIMITED || used < limit,
    usage: used,
    limit,
    plan_name: ent.plan_name,
    source: ent.source,
  };
};

/** Everything the billing UI needs in one call. */
export const getEntitlementSummary = async (accountId: string) => {
  const entitlements = await getEntitlements(accountId);
  const usage = await getUsage(accountId, entitlements);

  return {
    plan: {
      plan_id: entitlements.plan_id,
      name: entitlements.plan_name,
      features: entitlements.features,
    },
    source: entitlements.source,
    status: entitlements.status,
    limits: entitlements.limits,
    usage,
    period: { start: entitlements.period_start, end: entitlements.period_end },
  };
};

/**
 * Plan ranking, derived from the catalogue instead of a hardcoded name list.
 *
 * `requirePlan` used to compare against `['FREE','PRO','ENTERPRISE']`; none of the real plans are
 * named that, so `indexOf` returned -1 for everyone and the highest-paying customer was refused.
 * Price ascending is the ordering the catalogue already implies (Free 0 → Starter 415 →
 * Standard 699); ties fall back to creation order so the result is always deterministic.
 */
const RANK_CACHE_MS = 60_000;
let rankCache: { at: number; ranks: Map<string, number> } | null = null;

export const getPlanRanks = async (): Promise<Map<string, number>> => {
  if (rankCache && Date.now() - rankCache.at < RANK_CACHE_MS) return rankCache.ranks;

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: [{ price_monthly_usd: 'asc' }, { created_at: 'asc' }],
    select: { name: true },
  });

  const ranks = new Map<string, number>();
  plans.forEach((p, i) => {
    // Duplicate names keep their cheapest rank — the generous reading, so a rename can never
    // lock a paying customer out.
    if (!ranks.has(p.name)) ranks.set(p.name, i);
  });

  rankCache = { at: Date.now(), ranks };
  return ranks;
};

/** Test seam — plan rows change inside probes far faster than the cache TTL. */
export const __clearPlanRankCache = (): void => {
  rankCache = null;
};
