"use client";

import { CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";

interface AIConfidenceBadgeProps {
  score: number | null | undefined;
  status: string | null | undefined;
}

export function AIConfidenceBadge({ score, status }: AIConfidenceBadgeProps) {
  // Not yet validated
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
        <Clock className="w-3 h-3 mr-1" />
        AI Pending
      </span>
    );
  }

  const percentage = Math.round(score * 100);

  // High confidence (≥85%)
  if (percentage >= 85) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        AI: {percentage}%
      </span>
    );
  }

  // Medium confidence (60-84%)
  if (percentage >= 60) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
        <AlertTriangle className="w-3 h-3 mr-1" />
        AI: {percentage}%
      </span>
    );
  }

  // Low confidence (<60%)
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
      <XCircle className="w-3 h-3 mr-1" />
      AI: {percentage}%
    </span>
  );
}
