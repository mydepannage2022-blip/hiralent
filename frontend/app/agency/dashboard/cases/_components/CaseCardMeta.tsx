"use client";

import React from "react";
import type { Case } from "./types";
import { getAssignedAndUpdated } from "./types";

export function VisaCardMeta({ caseItem }: { caseItem: Case }) {
  const { updated } = getAssignedAndUpdated(caseItem.created_at, caseItem.updated_at);
  return (
    <>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">Est. completion</p>
        <p className="text-sm font-medium text-slate-900">
          {caseItem.estimated_completion
            ? new Date(caseItem.estimated_completion).toLocaleDateString()
            : "Not set"}
        </p>
        <p className="text-xs text-slate-600">Assigned {new Date(caseItem.created_at).toLocaleDateString()}</p>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">Estimated cost</p>
        <p className="text-sm font-medium text-slate-900">
          {caseItem.estimated_cost ? `$${caseItem.estimated_cost.toLocaleString()}` : "Not set"}
        </p>
        <p className="text-xs text-slate-600">
          Updated{" "}
          {updated.toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </>
  );
}

export function HousingCardMeta({
  caseItem,
  statusLabel,
}: {
  caseItem: Case;
  statusLabel: string;
}) {
  const { assigned, updated } = getAssignedAndUpdated(caseItem.created_at, caseItem.updated_at);
  return (
    <>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">Assigned</p>
        <p className="text-sm font-medium text-slate-900">{assigned.toLocaleDateString()}</p>
        <p className="text-xs text-slate-600">Status {statusLabel}</p>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">Updated</p>
        <p className="text-sm font-medium text-slate-900">{updated.toLocaleDateString()}</p>
        <p className="text-xs text-slate-600">Priority {caseItem.priority_level}</p>
      </div>
    </>
  );
}

export function IntegrationCardMeta({
  caseItem,
  statusLabel,
}: {
  caseItem: Case;
  statusLabel: string;
}) {
  const { assigned, updated } = getAssignedAndUpdated(caseItem.created_at, caseItem.updated_at);
  return (
    <>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">Assigned</p>
        <p className="text-sm font-medium text-slate-900">{assigned.toLocaleDateString()}</p>
        <p className="text-xs text-slate-600">Status {statusLabel}</p>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">Updated</p>
        <p className="text-sm font-medium text-slate-900">{updated.toLocaleDateString()}</p>
        <p className="text-xs text-slate-600">Priority {caseItem.priority_level}</p>
      </div>
    </>
  );
}

export function GenericCardMeta({
  caseItem,
  statusLabel,
}: {
  caseItem: Case;
  statusLabel: string;
}) {
  const { assigned, updated } = getAssignedAndUpdated(caseItem.created_at, caseItem.updated_at);
  return (
    <>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">Assigned</p>
        <p className="text-sm font-medium text-slate-900">{assigned.toLocaleDateString()}</p>
        <p className="text-xs text-slate-600">Status {statusLabel}</p>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">Updated</p>
        <p className="text-sm font-medium text-slate-900">{updated.toLocaleDateString()}</p>
        <p className="text-xs text-slate-600">Priority {caseItem.priority_level}</p>
      </div>
    </>
  );
}
