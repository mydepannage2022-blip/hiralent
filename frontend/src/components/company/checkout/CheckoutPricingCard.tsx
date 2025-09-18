"use client";

import { Check } from "lucide-react";
import type { BillingCycle } from "../pricing/PricingCard"; // ✅ type-only import

export interface CheckoutPricingCardProps {
    name: string;
    description: string;
    priceMonthly: number;
    priceYearly: number;
    features: string[];
    billingCycle: BillingCycle;
    popular?: boolean;
    className?: string;
}

const CheckoutPricingCard = ({
    name,
    description,
    priceMonthly,
    priceYearly,
    features,
    billingCycle,
    popular,
    className,
}: CheckoutPricingCardProps) => {
    const price = billingCycle === "monthly" ? priceMonthly : priceYearly;
    const formatted = new Intl.NumberFormat("en-US").format(price);

    return (
        <div
            className={`relative flex flex-col rounded-xl bg-white pt-6 px-6 border
    ${popular ? "border-[#282828]" : "border-[#CBCBCB]"} ${className}`}
        >
            {popular && (
                <span className="absolute top-0 right-6 rounded-bl-sm rounded-br-sm bg-[#282828] px-3 py-1 text-sm text-white">
                    Most popular
                </span>
            )}

            <h3 className="mb-2 text-3xl font-semibold">{name}</h3>
            <p className="mb-6 text-xs text-[#757575] leading-relaxed">{description}</p>

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

            <ul className="my-6 flex-1 space-y-3 text-sm text-[#222222] font-medium">
                {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <Check aria-hidden className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#757575]" />
                        <span>{f}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CheckoutPricingCard;