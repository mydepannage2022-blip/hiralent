"use client";

import { useState } from "react";
import PricingCard, { BillingCycle } from "./PricingCard";

const EmployerPricingSection = () => {
    const [cycle, setCycle] = useState<BillingCycle>("monthly");

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

            {/* Cards — Free & Starter narrower, Standard centered & wider */}
            <div className="md:mx-8 lg:mx-auto flex max-w-5xl flex-col gap-4 md:gap-0 lg:gap-4 md:flex-row md:items-stretch md:justify-center">
                {/* Free (narrower) */}
                <div className="flex w-full max-w-[300px] items-stretch mx-auto">
                    <PricingCard
                        name="Free"
                        description="Ideal for businesses with ongoing hiring needs but on a smaller scale. This plan allows companies to post jobs as needed, without"
                        priceMonthly={0}
                        priceYearly={0}
                        features={[
                            "Post up to 3 job listings at a time",
                            "Access to active job seekers",
                            "Job promotion across other",
                        ]}
                        billingCycle={cycle}
                    />
                </div>

                {/* Standard (wider, centered) */}
                <div className="flex w-full max-w-[300px] lg:max-w-[400px] items-stretch mx-auto">
                    <PricingCard
                        name="Standard"
                        popular
                        description="The best choice for organizations with high-volume hiring needs and complex recruitment strategies. This plan offers comprehensive features to manage."
                        priceMonthly={699}
                        priceYearly={1398}
                        features={[
                            "Unlimited job postings & user accounts",
                            "100 candidate views/month",
                            "ATS integration for seamless hiring",
                            "Detailed analytics & reports",
                            "VIP support & quick setup",
                            "Internal hiring team management",
                            "Enhanced branding & featured jobs",
                        ]}
                        billingCycle={cycle}
                    />
                </div>

                {/* Starter (narrower) */}
                <div className="flex w-full max-w-[300px] items-stretch mx-auto">
                    <PricingCard
                        name="Starter"
                        description="Perfect for businesses with ongoing hiring needs on a smaller scale. Ideal for companies that hire intermittently without committing"
                        priceMonthly={415}
                        priceYearly={830}
                        features={[
                            "3 active job slots, editable",
                            "Broader job promotion across",
                            "1 user, 50 candidate views/month",
                            "Employer branding for visibility",
                            "Free job edits & updates",
                        ]}
                        billingCycle={cycle}
                    />
                </div>
            </div>
        </section>
    );
};

export default EmployerPricingSection;