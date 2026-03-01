"use client";
import React from "react";
import { Mail } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";

function SettingsAccount() {
  const { user } = useAuth();

  return (
    <div className="border border-gray-200 p-5 rounded-xl mb-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Mail size={18} className="text-[#005DDC]" />
          </div>
          <span className="font-semibold text-gray-800">Account</span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-600">Email Address</span>
          <span className="text-gray-900 font-medium mt-0.5">
            {user?.email || "No email found"}
          </span>
        </div>
        <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium">
          Verified
        </span>
      </div>
    </div>
  );
}

export default SettingsAccount;
