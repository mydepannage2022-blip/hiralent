"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import CheckoutPricingCard from "@/src/components/company/checkout/CheckoutPricingCard";
import type { BillingCycle } from "@/src/components/company/pricing/PricingCard";
import { ArrowLeft } from "lucide-react";
import PaymentModal from "@/src/components/company/checkout/PaymentModal";
import { useCreateCheckout } from "@/src/lib/subscription/subscription.queries";


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

interface InputProps {
    label: string;
    placeholder: string;
    type?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const LabeledInput = ({ label, placeholder, type = "text", value, onChange }: InputProps) => (
    <div className="relative">
        <label className="absolute -top-2 left-3 bg-white px-1 text-sm font-medium text-black">
            {label}
        </label>
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full rounded-md border border-[#A5A5A5] px-4 py-4 text-sm focus:ring-2 focus:ring-black focus:outline-none"
        />
    </div>
);

const CheckoutContent = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const planId = searchParams?.get("plan_id") || "";
    const planName = searchParams?.get("plan_name") || "Standard";
    const billingCycle = (searchParams?.get("billing_cycle") || "monthly") as BillingCycle;
    const planPrice = Number(searchParams?.get("price")) || 699;

    const [cycle] = useState<BillingCycle>(billingCycle);
    const [method, setMethod] = useState<"stripe" | "paypal" | "manual">("stripe");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalStatus, setModalStatus] = useState<"success" | "failed">("success");

    const [cardholderName, setCardholderName] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [cvv, setCvv] = useState("");
    const [postalCode, setPostalCode] = useState("");

    const { mutate: createCheckout, isPending } = useCreateCheckout();

    const getPaymentGateway = (): "stripe" | "paypal" | "manual" => {
        if (method === "stripe") return "stripe";
        if (method === "paypal") return "paypal";
        return "manual";
    };

    const handlePayment = (e: React.FormEvent) => {
        e.preventDefault();

        if (!planId) {
            alert("Plan ID is missing. Please select a plan from the pricing page.");
            return;
        }

        createCheckout({
            plan_id: planId,
            billing_cycle: cycle === "monthly" ? "monthly" : "yearly",
            payment_gateway: getPaymentGateway(),
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
                <div className="flex-1">
                    <h2 className="text-center lg:text-left text-xl font-semibold mb-6">
                        Payment Details
                    </h2>

                    <div className="flex flex-wrap gap-4 mb-6 justify-center lg:justify-between">
                        <PaymentButton
                            icon={<Image src="/images/google.png" alt="Stripe" width={24} height={24} />}
                            label="Stripe"
                            active={method === "stripe"}
                            onClick={() => setMethod("stripe")}
                        />
                        <PaymentButton
                            icon={<Image src="/images/paypal.png" alt="Paypal" width={24} height={24} />}
                            label="Paypal"
                            active={method === "paypal"}
                            onClick={() => setMethod("paypal")}
                        />
                    </div>

                    <div className="flex items-center gap-3 sm:gap-6 my-8">
                        <span className="flex-1 h-px bg-[#757575]" />
                        <span className="whitespace-nowrap text-sm text-[#757575]">
                            Or Pay Another Way
                        </span>
                        <span className="flex-1 h-px bg-[#757575]" />
                    </div>

                    <form className="space-y-6" onSubmit={handlePayment}>
                        <LabeledInput 
                            label="Cardholder name" 
                            placeholder="Enter cardholder name"
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value)}
                        />
                        <LabeledInput 
                            label="Card number" 
                            placeholder="0000 0000 0000 0000"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                        />

                        <div className="flex gap-4 sm:gap-8">
                            <div className="w-2/4">
                                <LabeledInput 
                                    label="Expiration date" 
                                    placeholder="MM / YYYY"
                                    value={expiryDate}
                                    onChange={(e) => setExpiryDate(e.target.value)}
                                />
                            </div>
                            <div className="w-2/4">
                                <LabeledInput 
                                    label="Security code" 
                                    placeholder="000"
                                    value={cvv}
                                    onChange={(e) => setCvv(e.target.value)}
                                />
                            </div>
                        </div>

                        <LabeledInput 
                            label="Postal code" 
                            placeholder="Postal or ZIP code"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                        />

                        <button
                            type="submit"
                            disabled={isPending}
                            className="mt-2 w-full bg-[#282828] text-white py-3 rounded-md text-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3a3a3a] transition"
                        >
                            {isPending ? "Processing..." : `Pay $${planPrice}`}
                        </button>
                    </form>
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
                        billingCycle={cycle}
                        popular
                    />
                </div>
            </div>

            <PaymentModal
                isOpen={isModalOpen && modalStatus === "success"}
                status="success"
                title="Your payment is confirmed"
                message="Your transaction has successfully been completed."
                buttonLabel="Get Started"
                onAction={() => {
                    setIsModalOpen(false);
                    router.push("/company/dashboard");
                }}
            />

            <PaymentModal
                isOpen={isModalOpen && modalStatus === "failed"}
                status="failed"
                title="Your payment failed"
                message="Your transaction could not be processed."
                buttonLabel="Close"
                onAction={() => setIsModalOpen(false)}
            />
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
