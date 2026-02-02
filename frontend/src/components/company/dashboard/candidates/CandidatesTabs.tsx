"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Users, Globe } from "lucide-react";

export default function CandidatesTabs() {
  const pathname = usePathname();
  const router = useRouter();

  const isInternal =
    pathname?.includes("/company/dashboard/candidates/internal") ||
    pathname === "/company/dashboard/candidates";

  const isExternal = pathname?.includes("/company/dashboard/candidates/external");

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-2 flex items-center gap-2">
      <button
        onClick={() => router.push("/company/dashboard/candidates/internal")}
        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
          isInternal ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
        }`}
      >
        <Users className="w-4 h-4" />
        Internal
      </button>

      <button
        onClick={() => router.push("/company/dashboard/candidates/external")}
        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
          isExternal ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
        }`}
      >
        <Globe className="w-4 h-4" />
        External
      </button>
    </div>
  );
}
