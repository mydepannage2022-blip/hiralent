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
      className="mt-2 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
    >
      <Brain className="w-4 h-4" />
      <span>AI Analysis</span>
      {hasIssues ? (
        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
          <AlertTriangle className="w-3 h-3" />
          {validationIssues.length}
        </span>
      ) : overallPassed ? (
        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
          <CheckCircle className="w-3 h-3" />
          {passedCount}/{totalChecks}
        </span>
      ) : (
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
          {passedCount}/{totalChecks}
        </span>
      )}
      <ArrowRight className="w-3.5 h-3.5 ml-auto" />
    </button>
  );
}
