// src/components/company/dashboard/settings/DeleteAccountSection.tsx
"use client";

import React from "react";

const DeleteAccountSection: React.FC = () => {
    return (
        <div className="bg-white rounded-lg p-5 border border-[#EDEDED] w-full box-border">
            <h2 className="text-base sm:text-lg font-semibold text-[#DC0000]">Delete Account</h2>
            <p className="text-sm text-[#757575] mt-2">
                We'd hate to see you go, but you can delete your account anytime. Once deleted, it cannot be recovered.
            </p>
            <button className="mt-4 bg-[#DC0000] text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors">
                Delete Account
            </button>
        </div>
    );
};

export default DeleteAccountSection;