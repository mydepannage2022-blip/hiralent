"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

export type BillingCycle = "monthly" | "yearly";

export interface PricingCardProps {
    name: string;
    description: string;
    priceMonthly: number;
    priceYearly: number;
    features: string[];
    billingCycle: BillingCycle;
    popular?: boolean;
    onClick?: () => void;
    className?: string;
    planId?: string; // ✅ NEW - Plan ID from backend
}

const PricingCard = ({
    name,
    description,
    priceMonthly,
    priceYearly,
    features,
    billingCycle,
    popular,
    onClick,
    className,
    planId,
}: PricingCardProps) => {
    const router = useRouter();
    const price = billingCycle === "monthly" ? priceMonthly : priceYearly;
    const formatted = new Intl.NumberFormat("en-US").format(price);

    // ✅ Handle Get Started click
    const handleGetStarted = () => {
        if (onClick) {
            onClick();
        } else if (planId) {
            // Navigate to checkout with plan details
            const params = new URLSearchParams({
                plan_id: planId,
                plan_name: name,
                billing_cycle: billingCycle,
                price: price.toString(),
            });
            router.push(`/company/checkout?${params.toString()}`);
        } else {
            // Fallback: navigate without plan_id
            const params = new URLSearchParams({
                plan_name: name,
                billing_cycle: billingCycle,
                price: price.toString(),
            });
            router.push(`/company/checkout?${params.toString()}`);
        }
    };

    return (
        <div
            className={`relative flex h-full flex-col rounded-xl bg-white pt-8 pb-4 px-6 border
      ${popular ? "border-[#282828]" : "border-[#CBCBCB]"} ${className}`}
        >
            {popular && (
                <span className="absolute top-0 right-6 rounded-bl-sm rounded-br-sm bg-[#282828] px-3 py-1 text-sm text-white">
                    Most popular
                </span>
            )}

            <h3 className="mb-2 text-3xl font-semibold">{name}</h3>
            <p className="mb-8 text-xs text-[#757575] leading-relaxed">{description}</p>

            {/* ✅ Price updates with billing cycle */}
            <div className="mb-6 text-4xl font-semibold tracking-tight flex items-center gap-1">
                <div className="flex items-center gap-1">
                    <span className="text-lg text-[#757575] font-medium">$</span>
                    {formatted}
                </div>
                <span className="align-middle text-base font-medium text-[#757575]">
                    {billingCycle === "monthly" ? "/ per month" : "/ per year"}
                </span>
            </div>

            <hr />

            {/* 👇 flex-1 ensures this section grows and pushes button down */}
            <ul className="my-6 flex-1 space-y-4 text-sm text-[#222222] font-medium">
                {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <Check aria-hidden className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#757575]" />
                        <span>{f}</span>
                    </li>
                ))}
            </ul>

            {/* 👇 mt-auto pushes button to bottom */}
            <button
                onClick={handleGetStarted}
                className={`mt-auto w-full rounded-md border px-4 py-2 text-lg transition font-medium cursor-pointer
          ${popular
                        ? "border-[#282828] bg-[#282828] text-white hover:bg-white hover:text-[#282828]"
                        : "border-[#282828] text-[#282828] hover:bg-[#282828] hover:text-white"
                    }`}
            >
                Get Started
            </button>
        </div>
    );
};

export default PricingCard;
