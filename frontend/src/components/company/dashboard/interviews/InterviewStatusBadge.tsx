"use client";
import { AIInterviewStatus, AIQualification } from '@/src/types/interview.types';

interface StatusConfig {
  bg: string;
  text: string;
  label: string;
}

const statusConfig: Record<AIInterviewStatus, StatusConfig> = {
  [AIInterviewStatus.PENDING]: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    label: 'Pending',
  },
  [AIInterviewStatus.IN_PROGRESS]: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'In Progress',
  },
  [AIInterviewStatus.COMPLETED]: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'Completed',
  },
  [AIInterviewStatus.FAILED]: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: 'Failed',
  },
  [AIInterviewStatus.EXPIRED]: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    label: 'Expired',
  },
  [AIInterviewStatus.CANCELLED]: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: 'Cancelled',
  },
};

const qualificationConfig: Record<AIQualification, StatusConfig> = {
  [AIQualification.QUALIFIED]: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    label: 'Qualified',
  },
  [AIQualification.NOT_QUALIFIED]: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: 'Not Qualified',
  },
  [AIQualification.PENDING_REVIEW]: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    label: 'Pending Review',
  },
};

interface InterviewStatusBadgeProps {
  status: AIInterviewStatus;
  className?: string;
}

export function InterviewStatusBadge({ status, className = '' }: InterviewStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig[AIInterviewStatus.PENDING];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
    </span>
  );
}

interface QualificationBadgeProps {
  qualification: AIQualification;
  className?: string;
}

export function QualificationBadge({ qualification, className = '' }: QualificationBadgeProps) {
  const config = qualificationConfig[qualification] || qualificationConfig[AIQualification.PENDING_REVIEW];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
    </span>
  );
}

interface ScoreBadgeProps {
  score: number;
  className?: string;
}

export function ScoreBadge({ score, className = '' }: ScoreBadgeProps) {
  let config: StatusConfig;

  if (score >= 80) {
    config = { bg: 'bg-emerald-100', text: 'text-emerald-700', label: `${score}%` };
  } else if (score >= 60) {
    config = { bg: 'bg-amber-100', text: 'text-amber-700', label: `${score}%` };
  } else {
    config = { bg: 'bg-red-100', text: 'text-red-700', label: `${score}%` };
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
    </span>
  );
}
