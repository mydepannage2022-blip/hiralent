"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleCheckBig, Loader2, Clock } from "lucide-react";
import { useMySubscription } from "@/src/lib/subscription/subscription.queries";

// The Stripe webhook activates the subscription asynchronously, so it may not be ACTIVE the
// instant Stripe redirects the buyer here. Poll our own backend a few times before deciding
// how to render — we never claim success until the backend confirms activation.
const POLL_MS = 2500;
const MAX_WAIT_MS = POLL_MS * 5;

const SuccessContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams?.get("session_id") || "";

    const [gaveUp, setGaveUp] = useState(false);

    const { data: subscription, refetch } = useMySubscription({
        refetchInterval: (query: any) =>
            query.state.data?.status === "active" || gaveUp ? false : POLL_MS,
    });

    const isActive = subscription?.status === "active";

    // Stop polling after a reasonable window; the timer resets whenever the status changes
    // and short-circuits once the subscription is active.
    useEffect(() => {
        if (isActive) return;
        const timer = setTimeout(() => setGaveUp(true), MAX_WAIT_MS);
        return () => clearTimeout(timer);
    }, [isActive, subscription?.status]);

    const handleContinue = () => {
        router.push("/company/dashboard");
    };

    const handleRetry = () => {
        setGaveUp(false);
        refetch();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                {isActive ? (
                    <>
                        <CircleCheckBig className="mx-auto mb-6 h-20 w-20 text-green-600" />
                        <h1 className="text-3xl font-semibold mb-3 text-gray-900">
                            Payment Successful
                        </h1>
                        <p className="text-gray-600 mb-8">
                            Your subscription has been activated successfully. You can now access all premium features.
                        </p>
                    </>
                ) : gaveUp ? (
                    <>
                        <Clock className="mx-auto mb-6 h-20 w-20 text-amber-500" />
                        <h1 className="text-3xl font-semibold mb-3 text-gray-900">
                            Payment Received
                        </h1>
                        <p className="text-gray-600 mb-6">
                            We&apos;ve received your payment and are activating your subscription. This can take a few
                            moments — refresh to check again, or head to your dashboard.
                        </p>
                        <button
                            onClick={handleRetry}
                            className="w-full mb-3 border border-gray-300 text-gray-800 py-3 px-6 rounded-md text-lg font-medium hover:bg-gray-50 transition"
                        >
                            Refresh status
                        </button>
                    </>
                ) : (
                    <>
                        <Loader2 className="mx-auto mb-6 h-20 w-20 text-gray-400 animate-spin" />
                        <h1 className="text-3xl font-semibold mb-3 text-gray-900">
                            Confirming your subscription…
                        </h1>
                        <p className="text-gray-600 mb-8">
                            Your payment went through. We&apos;re confirming activation with our billing system — this
                            only takes a moment.
                        </p>
                    </>
                )}

                {sessionId && (
                    <p className="text-sm text-gray-500 mb-6">
                        Reference: {sessionId.substring(0, 20)}…
                    </p>
                )}

                <button
                    onClick={handleContinue}
                    className="w-full bg-black text-white py-3 px-6 rounded-md text-lg font-medium hover:bg-gray-800 transition"
                >
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
};

const PaymentSuccessPage = () => {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        }>
            <SuccessContent />
        </Suspense>
    );
};

export default PaymentSuccessPage;
