import { Roles } from '../../types/job.types';

/**
 * The billing account a request acts on.
 *
 * `UserSubscription` is keyed by `user_id`, but everything the subscription actually *pays for*
 * is owned by the **company**: `CompanyJob.company_id`, the team's AI interviews, the seat count.
 * For a `company_admin` the two coincide — `tokenIssue.service.resolveCompanyId` returns
 * `companyProfile.company_id ?? user_id`, and `CompanyProfile.company_id` *is* the owner's
 * `user_id`. For a `company_member`/`recruiter` they do NOT: those users have their own
 * `user_id` and belong to a company via `CompanyTeamMember`.
 *
 * Keying billing off `req.user.user_id` therefore let a team member buy a subscription that
 * landed on their personal id — invisible to the company, and useless for every quota check,
 * which counts the company's jobs. Every subscription read/write and every entitlement check
 * resolves the account through here instead, so one company has exactly one subscription.
 *
 * Fail-closed: anything that is not a company-scoped role (candidate, agency, platform admin)
 * gets `null` rather than a guessed id. Callers reject rather than silently billing/quota-ing
 * the wrong account.
 */

const COMPANY_ROLES: readonly string[] = [
  Roles.COMPANY_ADMIN,
  Roles.COMPANY_MEMBER,
  Roles.RECRUITER,
  // Legacy role string still present on older rows/tokens; resolveCompanyId treats it the
  // same as company_admin.
  'company',
];

/**
 * Platform staff. They are operators, not customers: they have no company, no plan and no
 * allowance, so an entitlement gate must let them past rather than refuse them. Their right to
 * be on an endpoint is decided by that endpoint's own authorisation (e.g. `requireCompanyMember`
 * already admits them to any company), never by billing.
 */
const PLATFORM_STAFF_ROLES: readonly string[] = [Roles.ADMIN, Roles.SUPERADMIN, 'super_admin'];

export interface BillingActor {
  user_id?: string;
  role?: string;
  company_id?: string;
}

export const isPlatformStaff = (actor?: BillingActor | null): boolean =>
  !!actor?.role && PLATFORM_STAFF_ROLES.includes(actor.role);

/**
 * Is this caller supposed to have a billing account at all?
 *
 * The distinction matters for fail-closed behaviour: a company user whose token carries no
 * `company_id` must be refused (a stale token must not become a way to spend an allowance we
 * cannot attribute), whereas a candidate or an agency admin simply is not metered by
 * `UserSubscription` and must not be refused on billing grounds.
 */
export const isCompanyScopedActor = (actor?: BillingActor | null): boolean =>
  !!actor?.role && COMPANY_ROLES.includes(actor.role);

/**
 * Resolve the company that owns billing for this actor, or `null` when the caller has no
 * company scope. `company_id` is a JWT claim set at token issue time — a token minted before
 * the claim existed for this role resolves to `null` (fail-closed 4xx) rather than falling
 * back to `user_id`, which is exactly the mix-up this helper exists to prevent.
 */
export const resolveBillingAccountId = (actor?: BillingActor | null): string | null => {
  if (!actor?.role || !COMPANY_ROLES.includes(actor.role)) return null;
  return actor.company_id ?? null;
};

/** Human-readable reason for a `null` resolution, used in 4xx bodies. */
export const billingAccountError = (actor?: BillingActor | null): string => {
  if (!actor?.role) return 'Unauthorized';
  if (!COMPANY_ROLES.includes(actor.role)) {
    return 'Billing is only available to company accounts';
  }
  return 'Missing company_id in auth token — sign out and sign in again';
};
