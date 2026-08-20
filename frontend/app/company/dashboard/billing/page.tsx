"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    CalendarClock,
    CheckCircle2,
    CreditCard,
    Loader2,
    XCircle,
    Briefcase,
    Bot,
} from "lucide-react";
import {
    useMySubscription,
    usePlans,
    useCancelSubscription,
    useChangePlan,
    useUsage,
} from "@/src/lib/subscription/subscription.queries";
import { formatLimit } from "@/src/lib/subscription/entitlementError";

type Status = "active" | "canceled" | "expired" | "past_due" | "trialing";

const STATUS_STYLES: Record<Status, string> = {
    active: "bg-green-100 text-green-700",
    trialing: "bg-blue-100 text-blue-700",
    past_due: "bg-red-100 text-red-700",
    canceled: "bg-gray-200 text-gray-700",
    expired: "bg-gray-200 text-gray-700",
};

const formatDate = (value?: string) =>
    value
        ? new Date(value).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : "—";

/**
 * One quota bar. An unlimited plan (`limit === -1`) shows the count without a bar — a progress
 * bar against infinity is meaningless, and drawing one at 0% would read as "unused".
 */
const UsageMeter = ({
    icon,
    label,
    used,
    limit,
}: {
    icon: React.ReactNode;
    label: string;
    used: number;
    limit: number;
}) => {
    const unlimited = limit === -1;
    const pct = unlimited || limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
    const atLimit = !unlimited && used >= limit;

    return (
        <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
                {icon}
                <span>{label}</span>
            </div>

            <p className="mt-2 text-2xl font-semibold text-gray-900">
                {used}
                <span className="text-base font-normal text-gray-500"> / {formatLimit(limit)}</span>
            </p>

            {!unlimited && (
                <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100">
                    <div
                        className={`h-1.5 rounded-full transition-all ${atLimit ? "bg-red-500" : "bg-black"}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            )}

            {atLimit && (
                <p className="mt-2 text-xs font-medium text-red-600">
                    Limit reached — upgrade to add more.
                </p>
            )}
        </div>
    );
};

const BillingPage = () => {
    const router = useRouter();
    const { data: subscription, isLoading } = useMySubscription();
    const { data: plans } = usePlans();
    // 403s when there is no live plan — that is an answer, not a failure, so it is rendered
    // as "no usage to show" rather than surfaced as an error.
    const { data: usage } = useUsage();

    const cancelMutation = useCancelSubscription();
    const changePlanMutation = useChangePlan();

    const [showCancelModal, setShowCancelModal] = useState(false);

    const status = (subscription?.status as Status) ?? "active";
    const billingCycle = subscription?.billing_cycle ?? "monthly";

    // Plans the user can switch to: publicly available, excluding the plan they are already on.
    const switchablePlans = useMemo(
        () =>
            (plans ?? []).filter(
                (p) => p.is_publicly_available && p.plan_id !== subscription?.plan_id
            ),
        [plans, subscription?.plan_id]
    );

    const priceFor = (monthly: number, annually: number) =>
        billingCycle === "yearly" ? annually : monthly;

    const handleCancel = (cancelImmediately: boolean) => {
        if (!subscription) return;
        cancelMutation.mutate(
            {
                subscription_id: subscription.subscription_id,
                cancel_immediately: cancelImmediately,
            },
            { onSettled: () => setShowCancelModal(false) }
        );
    };

    const handleSwitch = (planId: string) => {
        changePlanMutation.mutate({ plan_id: planId, billing_cycle: billingCycle });
    };

    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="w-full max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
                <CreditCard className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">No active subscription</h1>
                <p className="text-gray-600 mb-6">
                    You don&apos;t have a subscription yet. Choose a plan to unlock premium features.
                </p>
                <button
                    onClick={() => router.push("/company/pricing")}
                    className="bg-black text-white py-3 px-6 rounded-md font-medium hover:bg-gray-800 transition"
                >
                    View plans
                </button>
            </div>
        );
    }

    // A trial is a live subscription: it can be cancelled and switched just like an active one
    // (the backend allows both), so treat the two the same everywhere on this page.
    const isLive = status === "active" || status === "trialing";
    const scheduledToCancel = subscription.cancel_at_period_end && isLive;

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-5">
            <h1 className="text-2xl font-semibold text-gray-900">Billing &amp; Subscription</h1>

            {/* Past-due banner */}
            {status === "past_due" && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-800">Payment failed</p>
                        <p className="text-sm text-red-700">
                            Your last payment didn&apos;t go through. Please update your billing details to
                            keep your subscription active.
                        </p>
                    </div>
                </div>
            )}

            {/* Canceled / expired banner */}
            {(status === "canceled" || status === "expired") && (
                <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <XCircle className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-medium text-gray-800">
                            Your subscription is {status === "expired" ? "expired" : "canceled"}
                        </p>
                        <p className="text-sm text-gray-600">
                            Reactivate any time to regain access to premium features.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/company/pricing")}
                        className="shrink-0 bg-black text-white text-sm py-2 px-4 rounded-md font-medium hover:bg-gray-800 transition"
                    >
                        Reactivate
                    </button>
                </div>
            )}

            {/* Scheduled-cancellation note */}
            {scheduledToCancel && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <CalendarClock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                        Your subscription is set to cancel on{" "}
                        <span className="font-medium">{formatDate(subscription.current_period_end)}</span>.
                        You&apos;ll keep access until then.
                    </p>
                </div>
            )}

            {/* Current plan card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Current plan</p>
                        <h2 className="text-2xl font-semibold text-gray-900">
                            {subscription.plan?.name ?? "—"}
                        </h2>
                        <p className="text-gray-500 capitalize">{billingCycle}</p>
                    </div>
                    <span
                        className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${
                            STATUS_STYLES[status] ?? "bg-gray-200 text-gray-700"
                        }`}
                    >
                        {status.replace("_", " ")}
                    </span>
                </div>

                {subscription.plan && (
                    <p className="mt-4 text-xl font-semibold text-gray-900">
                        ${priceFor(Number(subscription.plan.price_monthly_usd), Number(subscription.plan.price_annually_usd))}
                        <span className="text-sm font-normal text-gray-500">
                            {" "}
                            / {billingCycle === "yearly" ? "year" : "month"}
                        </span>
                    </p>
                )}

                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <CalendarClock className="h-4 w-4" />
                    <span>
                        {scheduledToCancel ? "Access ends" : "Renews"} on{" "}
                        {formatDate(subscription.current_period_end)}
                    </span>
                </div>

                {/* Cancel action (only for a live subscription not already scheduled to end) */}
                {isLive && !scheduledToCancel && (
                    <button
                        onClick={() => setShowCancelModal(true)}
                        className="mt-6 border border-gray-300 text-gray-800 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 transition"
                    >
                        Cancel subscription
                    </button>
                )}
            </div>

            {/* Plan usage */}
            {usage && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Plan usage</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        {usage.period.end
                            ? `Resets on ${formatDate(usage.period.end)}.`
                            : "Job slots free up when you close or archive a job."}
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <UsageMeter
                            icon={<Briefcase className="h-4 w-4" />}
                            label="Active job posts"
                            used={usage.usage.job_posts}
                            limit={usage.limits.job_posts}
                        />
                        <UsageMeter
                            icon={<Bot className="h-4 w-4" />}
                            label="AI interviews"
                            used={usage.usage.ai_interviews}
                            limit={usage.limits.ai_interviews}
                        />
                    </div>
                </div>
            )}

            {/* Upgrade / downgrade */}
            {isLive && switchablePlans.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Change plan</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Switch plans any time — you&apos;ll be charged a prorated amount for the change.
                    </p>
                    <div className="flex flex-col gap-3">
                        {switchablePlans.map((plan) => (
                            <div
                                key={plan.plan_id}
                                className="flex items-center justify-between border border-gray-200 rounded-lg p-4"
                            >
                                <div>
                                    <p className="font-medium text-gray-900">{plan.name}</p>
                                    <p className="text-sm text-gray-500">
                                        ${priceFor(Number(plan.price_monthly_usd), Number(plan.price_annually_usd))} /{" "}
                                        {billingCycle === "yearly" ? "year" : "month"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleSwitch(plan.plan_id)}
                                    disabled={changePlanMutation.isPending}
                                    className="bg-black text-white text-sm py-2 px-4 rounded-md font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                                >
                                    {changePlanMutation.isPending && (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                    Switch to this plan
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cancel modal */}
            {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel subscription</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            How would you like to cancel? You can keep access until the end of your billing
                            period, or cancel right away.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleCancel(false)}
                                disabled={cancelMutation.isPending}
                                className="w-full flex items-start gap-3 border border-gray-300 rounded-lg p-4 text-left hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                <CheckCircle2 className="h-5 w-5 text-gray-700 shrink-0 mt-0.5" />
                                <span>
                                    <span className="block font-medium text-gray-900">
                                        Cancel at period end
                                    </span>
                                    <span className="block text-sm text-gray-500">
                                        Keep access until {formatDate(subscription.current_period_end)}.
                                    </span>
                                </span>
                            </button>

                            <button
                                onClick={() => handleCancel(true)}
                                disabled={cancelMutation.isPending}
                                className="w-full flex items-start gap-3 border border-red-200 rounded-lg p-4 text-left hover:bg-red-50 transition disabled:opacity-50"
                            >
                                <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                <span>
                                    <span className="block font-medium text-red-700">Cancel immediately</span>
                                    <span className="block text-sm text-gray-500">
                                        Lose access to premium features right away.
                                    </span>
                                </span>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowCancelModal(false)}
                            disabled={cancelMutation.isPending}
                            className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 py-2"
                        >
                            Keep my subscription
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingPage;
