"use client";

import { useState } from "react";
import Image from "next/image";
import CheckoutPricingCard from "../../../src/components/company/checkout/CheckoutPricingCard";
import type { BillingCycle } from "../../../src/components/company/pricing/PricingCard";
import { ArrowLeft } from "lucide-react";
import PaymentModal from "../../../src/components/company/checkout/PaymentModal";

// --- Payment tab button ---
interface PaymentButtonProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
}

const PaymentButton = ({ icon, label, active, onClick }: PaymentButtonProps) => (
    <button
        onClick={onClick}
        className={`flex justify-center items-center gap-2 rounded-md px-2 py-3 text-lg font-medium border transition max-w-[85px] lg:max-w-[160px] w-full cursor-pointer
      ${active ? "border-black" : "border-[#CBCBCB] hover:bg-gray-50"}`}
    >
        {icon}
        <span className="hidden lg:inline">{label}</span>
    </button>
);

// --- Input with fixed label on border ---
interface InputProps {
    label: string;
    placeholder: string;
    type?: string;
}
const LabeledInput = ({ label, placeholder, type = "text" }: InputProps) => (
    <div className="relative">
        <label className="absolute -top-2 left-3 bg-white px-1 text-sm font-medium text-black">
            {label}
        </label>
        <input
            type={type}
            placeholder={placeholder}
            className="w-full rounded-md border border-[#A5A5A5] px-4 py-4 text-sm focus:ring-2 focus:ring-black focus:outline-none"
        />
    </div>
);

const Page = () => {
    const [cycle] = useState<BillingCycle>("monthly");
    const [method, setMethod] = useState("Google Pay");
    const [isModalOpen, setIsModalOpen] = useState(true); // ✅ Open by default

    // you can keep this for later use, or even remove it now
    const handlePayment = (e: React.FormEvent) => {
        e.preventDefault();
        setIsModalOpen(true);
    };

    return (
        <div className="mt-30 md:mt-35 mb-20">
            {/* Back button */}
            <div className="max-w-4xl lg:max-w-5xl xl:max-w-7xl mx-auto mb-6 hidden md:block">
                <button className="flex items-center gap-2 text-xl text-blue-600 hover:underline font-medium cursor-pointer">
                    <ArrowLeft className="h-5 w-5" />
                    Back
                </button>
            </div>

            {/* Shared header */}
            <div className="text-center mb-12">
                <h1 className="text-2xl sm:text-4xl font-medium mb-2">Checkout</h1>
                <p className="text-sm sm:text-base text-[#757575]">
                    The last job offers Upload
                </p>
            </div>

            {/* MAIN FLEX LAYOUT */}
            <div className="max-w-5xl mx-auto px-4 sm:p-0 flex flex-col lg:flex-row gap-24 lg:items-start items-center">
                {/* LEFT: Payment form */}
                <div className="flex-1">
                    <h2 className="text-center lg:text-left text-xl font-semibold mb-6">
                        Payment Details
                    </h2>

                    {/* Payment method tabs */}
                    <div className="flex flex-wrap gap-4 mb-6 justify-center lg:justify-between">
                        <PaymentButton
                            icon={<Image src="/images/google.png" alt="Google Pay" width={24} height={24} />}
                            label="Google Pay"
                            active={method === "Google Pay"}
                            onClick={() => setMethod("Google Pay")}
                        />
                        <PaymentButton
                            icon={<Image src="/images/apple.png" alt="Apple Pay" width={24} height={24} />}
                            label="Apple Pay"
                            active={method === "Apple Pay"}
                            onClick={() => setMethod("Apple Pay")}
                        />
                        <PaymentButton
                            icon={<Image src="/images/paypal.png" alt="Paypal" width={24} height={24} />}
                            label="Paypal"
                            active={method === "Paypal"}
                            onClick={() => setMethod("Paypal")}
                        />
                    </div>

                    <div className="flex items-center gap-3 sm:gap-6 my-8">
                        <span className="flex-1 h-px bg-[#757575]" />
                        <span className="whitespace-nowrap text-sm text-[#757575]">
                            Or Pay Another Way
                        </span>
                        <span className="flex-1 h-px bg-[#757575]" />
                    </div>

                    {/* Card form */}
                    {/* <form className="space-y-6" onSubmit={handlePayment}> */}
                    <form className="space-y-6">
                        <LabeledInput label="Cardholder name" placeholder="Enter cardholder name" />
                        <LabeledInput label="Card number" placeholder="0000 0000 0000 0000" />

                        <div className="flex gap-4 sm:gap-8">
                            <div className="w-2/4">
                                <LabeledInput label="Expiration date" placeholder="MM / YYYY" />
                            </div>
                            <div className="w-2/4">
                                <LabeledInput label="Security code" placeholder="000" />
                            </div>
                        </div>

                        <LabeledInput label="Postal code" placeholder="Postal or ZIP code" />

                        <button
                            type="submit"
                            className="mt-2 w-full bg-[#282828] text-white py-3 rounded-md text-xl cursor-pointer"
                        >
                            Pay $699
                        </button>
                    </form>
                </div>

                {/* RIGHT: Pricing summary */}
                <div className="w-full max-w-sm mx-auto lg:mx-0 self-start">
                    <CheckoutPricingCard
                        name="Standard"
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
                        popular
                    />
                </div>
            </div>

            {/* Success Modal */}
            {/* <PaymentModal
                isOpen={isModalOpen}
                status="success"
                title="Your payment is confirmed"
                message="Your transaction has successfully been completed."
                buttonLabel="Get Started"
                onAction={() => setIsModalOpen(false)}
            /> */}

            {/* Failed Modal */}
            {/* <PaymentModal
                isOpen={isModalOpen}
                status="failed"
                title="Your payment failed"
                message="Your transaction could not be processed."
                buttonLabel="Close"
                onAction={() => setIsModalOpen(false)}
            /> */}
        </div>
    );
};

export default Page;