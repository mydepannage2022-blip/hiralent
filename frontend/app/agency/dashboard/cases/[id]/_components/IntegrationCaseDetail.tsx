"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/src/components/agency/ui/button";
import type { Case } from "./types";

export default function IntegrationCaseDetail({ caseData }: { caseData: Case }) {
  const router = useRouter();

  return (
    <div className="w-full">
      <div className="mb-6">
        <Button
          onClick={() => router.push("/agency/dashboard/cases")}
          variant="outline"
          size="sm"
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cases
        </Button>

        <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 rounded-xl">
              <FileText className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Case ID
              </p>
              <h1 className="text-lg font-bold text-slate-900 mb-1">
                {caseData.case_number}
              </h1>
              <p className="text-sm text-slate-600">Integration Case</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center py-20">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Integration UI Coming Soon
        </h2>
        <p className="text-slate-600">
          This interface will help you manage integration services
        </p>
      </div>
    </div>
  );
}
