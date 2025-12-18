"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

const PaymentCancelPage = () => {
    const router = useRouter();

    const handleRetry = () => {
        router.push("/company/pricing");
    };

    const handleGoBack = () => {
        router.back();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                <X className="mx-auto mb-6 h-20 w-20 text-red-600" />
                
                <h1 className="text-3xl font-semibold mb-3 text-gray-900">
                    Payment Cancelled
                </h1>
                
                <p className="text-gray-600 mb-8">
                    Your payment was cancelled. No charges have been made to your account.
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleRetry}
                        className="w-full bg-black text-white py-3 px-6 rounded-md text-lg font-medium hover:bg-gray-800 transition"
                    >
                        Try Again
                    </button>
                    
                    <button
                        onClick={handleGoBack}
                        className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-md text-lg font-medium hover:bg-gray-50 transition"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentCancelPage;
