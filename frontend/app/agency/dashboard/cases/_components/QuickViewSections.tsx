"use client";

import React from "react";
import { FileText, ExternalLink } from "lucide-react";
import { Button } from "@/src/components/agency/ui/button";
import type { AgencyType, Case, Document, UpdateEditedCase } from "./types";

function VisaQuickViewIntro({
  selectedCase,
  onOpenCase,
}: {
  selectedCase: Case;
  onOpenCase: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileText className="h-4 w-4 text-blue-600" />
          Documents
          <span className="text-slate-500">({selectedCase.documents?.length || 0})</span>
        </h4>
        <Button
          onClick={onOpenCase}
          variant="outline"
          size="md"
          className="hover:border-blue-200/70 hover:bg-blue-50"
        >
          <ExternalLink className="h-4 w-4" />
          Review documents
        </Button>
      </div>

      <div className="mt-4">
        {selectedCase.documents && selectedCase.documents.length > 0 ? (
          <div className="space-y-2">
            {selectedCase.documents.slice(0, 3).map((doc: Document) => (
              <div
                key={doc.document_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{doc.file_name}</p>
                  <p className="text-xs text-slate-500">{doc.document_type.replace(/_/g, " ")}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                    doc.status === "approved"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : doc.status === "rejected"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : doc.status === "needs_revision"
                      ? "border-orange-200 bg-orange-50 text-orange-700"
                      : "border-yellow-200 bg-yellow-50 text-yellow-700"
                  }`}
                >
                  {doc.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
            {selectedCase.documents.length > 3 && (
              <p className="pt-2 text-center text-xs text-slate-500">
                +{selectedCase.documents.length - 3} more documents
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <FileText className="mx-auto mb-2 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-600">No documents uploaded yet</p>
            <p className="mt-1 text-xs text-slate-400">Waiting for candidate to upload documents</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RelocationQuickViewIntro({
  selectedCase,
  onOpenCase,
}: {
  selectedCase: Case;
  onOpenCase: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-900">Housing summary</h4>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-slate-500">Housing type</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{selectedCase.housing_type || "Not set"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Address</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{selectedCase.housing_address || "Not set"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Lease</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {selectedCase.lease_start_date ? new Date(selectedCase.lease_start_date).toLocaleDateString() : "Not set"}
            {selectedCase.lease_end_date ? ` → ${new Date(selectedCase.lease_end_date).toLocaleDateString()}` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Arrival</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {selectedCase.arrival_date ? new Date(selectedCase.arrival_date).toLocaleDateString() : "Not set"}
            {selectedCase.flight_number ? ` • ${selectedCase.flight_number}` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Utilities</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            Water: {selectedCase.utility_water || "pending"} • Electric: {selectedCase.utility_electricity || "pending"} • Internet: {selectedCase.utility_internet || "pending"}
          </p>
        </div>
        <div className="flex items-start justify-end md:justify-start">
          <Button
            onClick={onOpenCase}
            variant="outline"
            size="md"
            className="hover:border-blue-200/70 hover:bg-blue-50"
          >
            <ExternalLink className="h-4 w-4" />
            Open case
          </Button>
        </div>
      </div>
    </div>
  );
}

function VisaQuickViewAfterLocation({
  editedCase,
  updateEditedCase,
}: {
  editedCase: Case;
  updateEditedCase: UpdateEditedCase;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-900">Financial</h4>
        <div className="mt-4">
          <label className="mb-2 block text-xs font-medium text-slate-500">Estimated cost ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={editedCase.estimated_cost || ""}
            onChange={(e) =>
              updateEditedCase({
                estimated_cost: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-900">Timeline</h4>
        <div className="mt-4">
          <label className="mb-2 block text-xs font-medium text-slate-500">Estimated completion</label>
          <input
            type="date"
            value={
              editedCase.estimated_completion
                ? new Date(editedCase.estimated_completion).toISOString().split("T")[0]
                : ""
            }
            onChange={(e) => updateEditedCase({ estimated_completion: e.target.value })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>
    </div>
  );
}

export function AgencyQuickViewIntroSections({
  agencyType,
  selectedCase,
  onOpenCase,
}: {
  agencyType: AgencyType | null;
  selectedCase: Case;
  onOpenCase: () => void;
}) {
  if (agencyType === "VISA") return <VisaQuickViewIntro selectedCase={selectedCase} onOpenCase={onOpenCase} />;
  if (agencyType === "RELOCATION") {
    return <RelocationQuickViewIntro selectedCase={selectedCase} onOpenCase={onOpenCase} />;
  }
  return null;
}

export function AgencyQuickViewAfterLocationSections({
  agencyType,
  editedCase,
  updateEditedCase,
}: {
  agencyType: AgencyType | null;
  editedCase: Case;
  updateEditedCase: UpdateEditedCase;
}) {
  if (agencyType === "VISA") return <VisaQuickViewAfterLocation editedCase={editedCase} updateEditedCase={updateEditedCase} />;
  return null;
}
