"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleCheckBig } from "lucide-react";

const SuccessContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams?.get("session_id") || "";

    useEffect(() => {
        if (sessionId) {
            console.log("Payment session ID:", sessionId);
        }
    }, [sessionId]);

    const handleContinue = () => {
        router.push("/company/dashboard");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                <CircleCheckBig className="mx-auto mb-6 h-20 w-20 text-green-600" />
                
                <h1 className="text-3xl font-semibold mb-3 text-gray-900">
                    Payment Successful
                </h1>
                
                <p className="text-gray-600 mb-8">
                    Your subscription has been activated successfully. You can now access all premium features.
                </p>

                {sessionId && (
                    <p className="text-sm text-gray-500 mb-6">
                        Transaction ID: {sessionId.substring(0, 20)}...
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
