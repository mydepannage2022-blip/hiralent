"use client";

import {CircleCheckBig, X } from "lucide-react";

interface PaymentModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    buttonLabel: string;
    onAction: () => void;
    status?: "success" | "failed"; // <- NEW
}

const PaymentModal = ({
    isOpen,
    title,
    message,
    buttonLabel,
    onAction,
    status = "success", // default
}: PaymentModalProps) => {
    if (!isOpen) return null;

    const Icon =
        status === "success" ? (
            <CircleCheckBig className="mx-auto mb-4 h-18 w-18 text-[#009E00]" />
        ) : (
            <X className="mx-auto mb-4 h-18 w-18 text-[#DC0000]" />
        );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            {/* Modal box */}
            <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 sm:px-8 sm:py-6 text-center">
                {/* Icon */}
                {Icon}

                {/* Title */}
                <h2 className="text-lg sm:text-2xl font-semibold mb-2">{title}</h2>

                {/* Message */}
                <p className="text-xs sm:text-base mb-4 sm:mb-6">{message}</p>

                {/* Action button */}
                <button
                    onClick={onAction}
                    className="w-full max-w-[140px] sm:max-w-[160px] rounded-md border border-[#282828] bg-white px-4 py-2 text-base text-[#282828] sm:text-lg font-medium hover:bg-gray-100 cursor-pointer"
                >
                    {buttonLabel}
                </button>
            </div>
        </div>
    );
};

export default PaymentModal;