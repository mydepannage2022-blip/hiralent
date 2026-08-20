import { extractApiError } from "@/src/lib/api/errorMessage";

/**
 * Recognise the 403s the entitlement layer raises, so the UI can offer an upgrade instead of
 * showing a raw error.
 *
 * The backend returns two distinct shapes:
 *  - `PLAN_UPGRADE_REQUIRED` — a metered quota is exhausted (job slots, AI interviews). Carries
 *    `current_usage` / `limit` / `plan_name`.
 *  - `NO_SUBSCRIPTION` / `INACTIVE_SUBSCRIPTION` / `EXPIRED_SUBSCRIPTION` — the feature is
 *    paid-only and this account has no live plan.
 *
 * Anything else is a genuine failure and must keep surfacing as one — swallowing real errors
 * into an upgrade prompt would hide outages behind a sales pitch.
 */

export type EntitlementKind = "quota_exhausted" | "not_subscribed";

export interface EntitlementBlock {
  kind: EntitlementKind;
  code: string;
  message: string;
  planName?: string;
  currentUsage?: number;
  /** `null` when the plan is unlimited; `undefined` when the server did not say. */
  limit?: number | null;
  feature?: string;
}

const QUOTA_CODE = "PLAN_UPGRADE_REQUIRED";
const NO_PLAN_CODES = ["NO_SUBSCRIPTION", "INACTIVE_SUBSCRIPTION", "EXPIRED_SUBSCRIPTION"];

/** Read the JSON body off either an axios error or a thrown fetch-style error. */
const bodyOf = (err: any): any =>
  err?.response?.data ?? err?.data ?? (typeof err === "object" && err !== null ? err : {});

export const parseEntitlementError = (err: unknown): EntitlementBlock | null => {
  const body = bodyOf(err);
  const code = body?.code ?? body?.error?.code;
  if (!code) return null;

  if (code === QUOTA_CODE) {
    return {
      kind: "quota_exhausted",
      code,
      message: extractApiError(err, "You have reached your plan limit."),
      planName: body?.plan_name,
      currentUsage: body?.current_usage,
      limit: body?.limit,
      feature: body?.feature,
    };
  }

  if (NO_PLAN_CODES.includes(code)) {
    return {
      kind: "not_subscribed",
      code,
      message: extractApiError(err, "This feature requires an active subscription."),
      planName: body?.plan_name,
    };
  }

  return null;
};

export const isEntitlementError = (err: unknown): boolean => parseEntitlementError(err) !== null;

/** `-1` (or a null limit from the API) means the plan has no ceiling. */
export const formatLimit = (limit: number | null | undefined): string =>
  limit === -1 || limit === null || limit === undefined ? "∞" : String(limit);
