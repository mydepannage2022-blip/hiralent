"use client";

import { CreditCard, Clock } from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";
import SmartLink from "../../../layout/SmartLink";
import { useMySubscription } from "@/src/lib/subscription/subscription.queries";

const COLORS = ["#EDEDED", "#515151"]; // used (light), left (dark)
const DAY_MS = 1000 * 60 * 60 * 24;

const STATUS_LABEL: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Past due",
    canceled: "Canceled",
    expired: "Expired",
};

const DashboardSubscription = () => {
    const { data: subscription, isLoading } = useMySubscription();

    const periodEnd = subscription?.current_period_end
        ? new Date(subscription.current_period_end)
        : null;
    const periodStart = subscription?.current_period_start
        ? new Date(subscription.current_period_start)
        : null;

    const now = Date.now();
    const daysLeft = periodEnd
        ? Math.max(0, Math.ceil((periodEnd.getTime() - now) / DAY_MS))
        : 0;
    const totalDays =
        periodEnd && periodStart
            ? Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / DAY_MS))
            : 30;
    const usedDays = Math.max(0, Math.min(totalDays, totalDays - daysLeft));

    // The ring reflects how much of the current billing period remains (real), not the old
    // hardcoded post-usage. Feature-usage metering lands with entitlements (Wave 5 S4).
    const data = [
        { name: "Used", value: usedDays },
        { name: "Left", value: Math.max(daysLeft, subscription ? 0.0001 : 1) },
    ];

    const joinedOn = subscription?.created_at
        ? new Date(subscription.created_at).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
          })
        : null;

    const statusLabel = subscription ? STATUS_LABEL[subscription.status] ?? subscription.status : null;

    return (
        <div className="bg-white rounded-xl p-5 pb-4">
            {/* Top Content */}
            <div className="flex justify-between items-center">
                {/* Left Side */}
                <div>
                    {joinedOn ? (
                        <p className="text-[#353535]">
                            Started on <span className="text-[#515151]">{joinedOn}</span>
                        </p>
                    ) : (
                        <p className="text-[#353535]">Subscription</p>
                    )}
                    <h3 className="text-xl font-semibold text-[#222222]">
                        {isLoading ? "…" : subscription?.plan?.name ?? "No plan"}
                    </h3>
                    <p className="text-lg text-[#A5A5A5] mb-2 font-semibold capitalize">
                        {subscription ? subscription.billing_cycle : "—"}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-[#353535] mb-1">
                        <CreditCard className="w-4 h-4" />
                        <span>
                            {subscription
                                ? subscription.cancel_at_period_end
                                    ? "Cancels at period end"
                                    : statusLabel
                                : "Not subscribed"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#353535]">
                        <Clock className="w-4 h-4" />
                        <span>{subscription ? `${daysLeft} days left` : "—"}</span>
                    </div>
                </div>

                {/* Right Side: Progress Ring */}
                <div className="relative w-28 h-28 flex-shrink-0">
                    <PieChart width={112} height={112}>
                        <Pie
                            data={data}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={52}
                            startAngle={90}
                            endAngle={-270}
                            cornerRadius={10}
                            paddingAngle={1}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>

                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-sm font-semibold text-[#222222]">
                            {subscription ? daysLeft : "—"}
                        </span>
                        <span className="text-xs text-[#515151]">Days left</span>
                    </div>
                </div>
            </div>

            {/* Button */}
            <SmartLink
                href="/company/dashboard/billing"
                className="mt-3 2xl:mt-9 w-full border border-[#282828] py-2 rounded-lg font-medium text-[#282828] hover:bg-gray-50 flex items-center justify-center"
            >
                Manage Subscription
            </SmartLink>
        </div>
    );
};

export default DashboardSubscription;
