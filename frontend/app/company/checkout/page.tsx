"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CheckoutPricingCard from "@/src/components/company/checkout/CheckoutPricingCard";
import type { BillingCycle } from "@/src/components/company/pricing/PricingCard";
import { ArrowLeft, Lock } from "lucide-react";
import { useCreateCheckout } from "@/src/lib/subscription/subscription.queries";

const CheckoutContent = () => {
    const searchParams = useSearchParams();
    const router = useRouter();

    const planId = searchParams?.get("plan_id") || "";
    const planName = searchParams?.get("plan_name") || "Standard";
    const billingCycle = (searchParams?.get("billing_cycle") || "monthly") as BillingCycle;
    const planPrice = Number(searchParams?.get("price")) || 699;

    const { mutate: createCheckout, isPending } = useCreateCheckout();

    // Card details are collected on Stripe's hosted checkout — we never touch them.
    // This just creates the session server-side and redirects (see useCreateCheckout).
    const handleContinue = () => {
        if (!planId) {
            alert("Plan ID is missing. Please select a plan from the pricing page.");
            return;
        }

        createCheckout({
            plan_id: planId,
            billing_cycle: billingCycle === "monthly" ? "monthly" : "yearly",
            payment_gateway: "stripe",
            success_url: `${window.location.origin}/payment/success`,
            cancel_url: `${window.location.origin}/payment/cancel`,
        });
    };

    const handleBack = () => {
        router.push("/company/pricing");
    };

    return (
        <div className="mt-30 md:mt-35 mb-20">
            <div className="max-w-4xl lg:max-w-5xl xl:max-w-7xl mx-auto mb-6 hidden md:block">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-xl text-blue-600 hover:underline font-medium cursor-pointer"
                >
                    <ArrowLeft className="h-5 w-5" />
                    Back
                </button>
            </div>

            <div className="text-center mb-12">
                <h1 className="text-2xl sm:text-4xl font-medium mb-2">Checkout</h1>
                <p className="text-sm sm:text-base text-[#757575]">
                    Complete your subscription to {planName}
                </p>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:p-0 flex flex-col lg:flex-row gap-24 lg:items-start items-center">
                <div className="flex-1 w-full">
                    <h2 className="text-center lg:text-left text-xl font-semibold mb-6">
                        Payment
                    </h2>

                    <div className="rounded-lg border border-[#CBCBCB] p-6">
                        <div className="flex items-start gap-3">
                            <Lock className="h-6 w-6 shrink-0 text-[#282828] mt-0.5" />
                            <div>
                                <p className="font-medium text-[#282828]">
                                    Secure checkout with Stripe
                                </p>
                                <p className="text-sm text-[#757575] mt-1">
                                    You&apos;ll be redirected to Stripe&apos;s secure payment page to enter
                                    your card details. Hiralent never sees or stores your card information.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleContinue}
                            disabled={isPending}
                            className="mt-6 w-full bg-[#282828] text-white py-3 rounded-md text-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3a3a3a] transition"
                        >
                            {isPending ? "Redirecting…" : `Continue to Stripe · Pay $${planPrice}`}
                        </button>
                    </div>
                </div>

                <div className="w-full max-w-sm mx-auto lg:mx-0 self-start">
                    <CheckoutPricingCard
                        name={planName}
                        description="The best choice for organizations with high-volume hiring needs and complex recruitment strategies. This plan offers comprehensive features to manage."
                        priceMonthly={planPrice}
                        priceYearly={planPrice}
                        features={[
                            "Unlimited job postings & user accounts",
                            "100 candidate views/month",
                            "ATS integration for seamless hiring",
                            "Detailed analytics & reports",
                            "VIP support & quick setup",
                            "Internal hiring team management",
                            "Enhanced branding & featured jobs",
                        ]}
                        billingCycle={billingCycle}
                        popular
                    />
                </div>
            </div>
        </div>
    );
};

const Page = () => {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading checkout...</p>
                </div>
            </div>
        }>
            <CheckoutContent />
        </Suspense>
    );
};

export default Page;
