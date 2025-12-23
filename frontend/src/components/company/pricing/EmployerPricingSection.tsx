"use client";

import { useState } from "react";
import PricingCard, { BillingCycle } from "./PricingCard";
import { usePlans } from "../../../lib/subscription/subscription.queries";

const EmployerPricingSection = () => {
    const [cycle, setCycle] = useState<BillingCycle>("monthly");
    
    // ✅ Fetch plans from backend
    const { data: plans, isLoading, error } = usePlans();

    // ✅ Loading state
    if (isLoading) {
        return (
            <section className="w-full px-4 mb-20">
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-4xl font-medium mb-2">Tech Hiring Panels for Every Team</h1>
                    <p className="text-sm sm:text-base text-[#757575]">Flexible plans tailored to your hiring needs.</p>
                </div>
                <div className="text-center py-10">
                    <p className="text-lg text-gray-500">Loading plans...</p>
                </div>
            </section>
        );
    }

    // ✅ Error state
    if (error) {
        return (
            <section className="w-full px-4 mb-20">
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-4xl font-medium mb-2">Tech Hiring Panels for Every Team</h1>
                    <p className="text-sm sm:text-base text-[#757575]">Flexible plans tailored to your hiring needs.</p>
                </div>
                <div className="text-center py-10">
                    <p className="text-lg text-red-500">Failed to load plans. Please try again.</p>
                </div>
            </section>
        );
    }

const parseFeatures = (featuresString: string): string[] => {
    try {
        // Check if already parsed
        if (Array.isArray(featuresString)) {
            return featuresString;
        }
        // Try to parse JSON
        const parsed = JSON.parse(featuresString);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to parse features:', error);
        // Fallback: return empty array
        return [];
    }
};
    return (
        <section className="w-full px-4 mb-20">
            <div className="text-center mb-8">
                <h1 className="text-2xl sm:text-4xl font-medium mb-2">Tech Hiring Panels for Every Team</h1>
                <p className="text-sm sm:text-base text-[#757575]">Flexible plans tailored to your hiring needs.</p>
            </div>

            {/* Segmented control */}
            <div className="mb-10 flex justify-center">
                <div className="inline-flex items-center gap-1 rounded-lg border border-[#A5A5A5] bg-white p-1 w-full max-w-[375px]">
                    <button
                        aria-pressed={cycle === "monthly"}
                        onClick={() => setCycle("monthly")}
                        className={`rounded-sm px-5 py-2 text-sm font-medium transition w-full cursor-pointer
              ${cycle === "monthly" ? "bg-[#282828] text-white" : "text-[#282828]"}`}
                    >
                        Monthly
                    </button>
                    <button
                        aria-pressed={cycle === "yearly"}
                        onClick={() => setCycle("yearly")}
                        className={`rounded-sm px-5 py-2 text-sm font-medium transition w-full cursor-pointer
              ${cycle === "yearly" ? "bg-[#282828] text-white" : "text-[#282828]"}`}
                    >
                        Yearly
                    </button>
                </div>
            </div>

            {/* ✅ Dynamic Cards from Backend */}
            <div className="md:mx-8 lg:mx-auto flex max-w-5xl flex-col gap-4 md:gap-0 lg:gap-4 md:flex-row md:items-stretch md:justify-center">
               {plans && plans.length > 0 ? (
    plans.map((plan) => {
        const isPopular = plan.name === "Standard" || plan.name === "Pro";
        const isWide = isPopular;
        const features = parseFeatures(plan.features_included);
        
        return (
            <div 
                key={plan.plan_id} 
                className={`flex w-full ${isWide ? 'max-w-[300px] lg:max-w-[400px]' : 'max-w-[300px]'} items-stretch mx-auto`}
            >
                <PricingCard
                    planId={plan.plan_id}
                    name={plan.name}
                    description={features.length > 0 ? features.slice(0, 2).join('. ') + '.' : 'Premium features for your hiring needs'}
                    priceMonthly={Number(plan.price_monthly_usd)}
                    priceYearly={Number(plan.price_annually_usd)}
                    features={features}
                    billingCycle={cycle}
                    popular={isPopular}
                />
            </div>
        );
    })
) : (
    <p className="text-center text-gray-500">No plans available</p>
)}

            </div>
        </section>
    );
};

export default EmployerPricingSection;
