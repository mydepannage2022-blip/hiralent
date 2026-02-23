"use client";

import { useRouter } from "next/navigation";
import { Brain, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";

interface ValidationSignal {
  signal_type: string;
  passed: boolean;
  score: number;
  details: string;
}

interface ValidationIssue {
  type: string;
  severity: "warning" | "error";
  message: string;
}

interface AIValidationPanelProps {
  caseId: string;
  documentId: string;
  extractedData: Record<string, any> | null | undefined;
  validationSignals: ValidationSignal[] | null | undefined;
  validationIssues: ValidationIssue[] | null | undefined;
  validatedAt: string | null | undefined;
}

export function AIValidationPanel({
  caseId,
  documentId,
  extractedData,
  validationSignals,
  validationIssues,
  validatedAt,
}: AIValidationPanelProps) {
  const router = useRouter();

  const hasData =
    extractedData || validationSignals?.length || validationIssues?.length;

  if (!hasData) {
    return null;
  }

  const passedCount = validationSignals?.filter((s) => s.passed).length || 0;
  const totalChecks = validationSignals?.length || 0;
  const overallPassed = passedCount === totalChecks && totalChecks > 0;
  const hasIssues = validationIssues && validationIssues.length > 0;

  const handleViewDetails = () => {
    router.push(`/agency/dashboard/cases/${caseId}/documents/${documentId}/ai-analysis`);
  };

  return (
    <button
      onClick={handleViewDetails}
      className={`flex items-center gap-2 text-xs font-semibold transition-colors ${hasIssues
          ? "text-red-700 hover:text-red-800"
          : overallPassed
            ? "text-emerald-700 hover:text-emerald-800"
            : "text-slate-600 hover:text-slate-900"
        }`}
    >
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-white ${hasIssues
            ? "border-red-200/70"
            : overallPassed
              ? "border-emerald-200/70"
              : "border-slate-200/70"
          }`}
      >
        <Brain className="w-4 h-4" />
      </span>
      <span className="whitespace-nowrap">AI analysis</span>
      {hasIssues ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200/70 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800">
          <AlertTriangle className="w-3 h-3" />
          {validationIssues.length}
        </span>
      ) : overallPassed ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
          <CheckCircle className="w-3 h-3" />
          {passedCount}/{totalChecks}
        </span>
      ) : (
        <span className="rounded-full border border-slate-200/70 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          {passedCount}/{totalChecks}
        </span>
      )}
      <ArrowRight className="w-3.5 h-3.5 ml-auto" />
    </button>
  );
}
