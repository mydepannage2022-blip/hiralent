"use client";

import Link from "next/link";
import { Lock, TrendingUp } from "lucide-react";
import type { EntitlementBlock } from "@/src/lib/subscription/entitlementError";
import { formatLimit } from "@/src/lib/subscription/entitlementError";

/**
 * Shown wherever the entitlement layer refuses an action, in place of a raw error.
 *
 * Two cases, deliberately worded differently: a quota that is full is a "you've used all of X"
 * message with the real numbers, while a paid-only feature is a "this needs a plan" message.
 * Telling a customer at their limit that they have "no subscription" would be wrong and
 * confusing — they are paying.
 */

interface Props {
  block: EntitlementBlock;
  /** Optional label for what was blocked, e.g. "job post" or "AI interview". */
  action?: string;
  className?: string;
  compact?: boolean;
}

const BILLING_HREF = "/company/dashboard/billing";

const UpgradePrompt = ({ block, action, className = "", compact = false }: Props) => {
  const isQuota = block.kind === "quota_exhausted";

  const title = isQuota
    ? `You've used all of your ${block.planName ?? "plan"} allowance`
    : "This feature needs an active plan";

  const detail = isQuota
    ? typeof block.currentUsage === "number"
      ? `${block.currentUsage} of ${formatLimit(block.limit)} used${action ? ` — ${action}s are capped on this plan` : ""}.`
      : block.message
    : block.message;

  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 ${compact ? "p-3" : "p-5"} ${className}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-amber-600">
          {isQuota ? <TrendingUp size={compact ? 16 : 20} /> : <Lock size={compact ? 16 : 20} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`font-semibold text-amber-900 ${compact ? "text-sm" : "text-base"}`}>{title}</p>
          <p className={`mt-1 text-amber-800 ${compact ? "text-xs" : "text-sm"}`}>{detail}</p>

          <Link
            href={BILLING_HREF}
            className={`mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-600 font-medium text-white transition hover:bg-amber-700 ${
              compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
            }`}
          >
            {isQuota ? "Upgrade plan" : "View plans"}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
