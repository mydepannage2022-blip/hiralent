"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Award, X, Check, Plus, Trash2, Search, ExternalLink } from "lucide-react";
import { useUpdateCertifications } from "@/src/lib/profile/profile.queries";
import { useProfile } from "@/src/context/ProfileContext";

/**
 * ✅ Backend bulk endpoint expects:
 * PUT /profile/certifications
 * body: { certifications: [{ certification_id?, name, issuer, issue_date?, expiry_date?, credential_id?, credential_url? }] }
 *
 * ✅ Prisma model: issue_date is required (DateTime)
 * So we ensure issue_date is always sent (fallback to today) before saving.
 */

interface Certification {
  certification_id?: string;
  name: string;
  issuer: string;
  issue_date?: string | null;   // "YYYY-MM-DD"
  expiry_date?: string | null;  // "YYYY-MM-DD"
  credential_id?: string | null;
  credential_url?: string | null;
}

function toISODateInput(d: Date) {
  // YYYY-MM-DD for <input type="date" />
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeOne(raw: any): Certification | null {
  if (!raw) return null;

  // supports both { id } and { certification_id } shapes
  const certification_id = raw.certification_id ?? raw.id ?? undefined;

  const name = String(raw.name ?? "").trim();
  const issuer = String(raw.issuer ?? "").trim();

  // support backend JSON stored with {id, name, issuer...}
  const issue_date =
    raw.issue_date === null || raw.issue_date === undefined ? "" : String(raw.issue_date);
  const expiry_date =
    raw.expiry_date === null || raw.expiry_date === undefined ? "" : String(raw.expiry_date);

  const credential_id =
    raw.credential_id === null || raw.credential_id === undefined ? "" : String(raw.credential_id);

  const credential_url =
    raw.credential_url === null || raw.credential_url === undefined ? "" : String(raw.credential_url);

  return {
    certification_id,
    name,
    issuer,
    issue_date,
    expiry_date,
    credential_id,
    credential_url,
  };
}

function parseCertifications(value: any): Certification[] {
  if (!value) return [];

  const arr = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.error("Failed to parse certifications JSON:", e);
            return [];
          }
        })()
      : [];

  return arr
    .map(normalizeOne)
    .filter(Boolean) as Certification[];
}

function formatIssueDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function isValidUrlMaybe(v?: string | null) {
  const s = (v ?? "").trim();
  if (!s) return true; // empty is fine
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

function cleanString(v: any) {
  const s = String(v ?? "").trim();
  return s;
}

function cleanOptional(v: any) {
  const s = cleanString(v);
  return s ? s : null;
}

function safeDateOrToday(v?: string | null) {
  const s = cleanString(v);
  if (!s) return toISODateInput(new Date());
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return toISODateInput(new Date());
  return s;
}

const CertificationsSection = () => {
  const { profileData, refetch } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  // Search (view + edit)
  const [query, setQuery] = useState("");

  // Normalize DB value to array always
  const parsedCertifications = useMemo(() => {
    return parseCertifications((profileData as any)?.certifications);
  }, [(profileData as any)?.certifications]);

  const [certifications, setCertifications] = useState<Certification[]>(parsedCertifications);

  // Sync with profile changes (autofill/apply/refetch)
  useEffect(() => {
    if (!isEditing) setCertifications(parsedCertifications);
  }, [parsedCertifications, isEditing]);

  const { mutate: updateCertifications, isPending } = useUpdateCertifications();

  const handleEdit = () => {
    setIsEditing(true);
    setQuery("");
    setCertifications(parsedCertifications);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setQuery("");
    setCertifications(parsedCertifications);
  };

  const handleAddCertification = () => {
    setCertifications((prev) => [
      ...prev,
      {
        // certification_id undefined => create on backend
        name: "",
        issuer: "",
        issue_date: toISODateInput(new Date()), // ✅ important (issue_date required in Prisma)
        expiry_date: "",
        credential_id: "",
        credential_url: "",
      },
    ]);
  };

  const handleRemoveCertification = (index: number) => {
    setCertifications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCertificationChange = (
    index: number,
    field: keyof Certification,
    value: string
  ) => {
    setCertifications((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const hasCertifications = Array.isArray(certifications) && certifications.length > 0;

  // Filtered list for both view + edit
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return certifications;

    return certifications.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const issuer = (c.issuer || "").toLowerCase();
      const id = (c.credential_id || "").toLowerCase();
      return name.includes(q) || issuer.includes(q) || id.includes(q);
    });
  }, [certifications, query]);

  // ✅ Quick validations while editing
  const validation = useMemo(() => {
    if (!isEditing) return { canSave: true, errors: [] as string[] };

    const errors: string[] = [];

    // require name+issuer for any row that is "present"
    certifications.forEach((c, idx) => {
      const hasSomething =
        cleanString(c.name) ||
        cleanString(c.issuer) ||
        cleanString(c.credential_id) ||
        cleanString(c.credential_url);

      if (!hasSomething) return;

      if (!cleanString(c.name)) errors.push(`Certification ${idx + 1}: name is required`);
      if (!cleanString(c.issuer)) errors.push(`Certification ${idx + 1}: issuer is required`);
      if (!isValidUrlMaybe(c.credential_url))
        errors.push(`Certification ${idx + 1}: credential URL is invalid`);
    });

    return { canSave: errors.length === 0, errors };
  }, [isEditing, certifications]);

  const handleSave = () => {
    // Build payload exactly as backend expects (bulk)
    const payloadCerts = certifications
      .map((c) => ({
        certification_id: c.certification_id, // keep if exists
        name: cleanString(c.name),
        issuer: cleanString(c.issuer),
        issue_date: safeDateOrToday(c.issue_date),        // ✅ ensure not empty
        expiry_date: cleanOptional(c.expiry_date),
        credential_id: cleanOptional(c.credential_id),
        credential_url: cleanOptional(c.credential_url),
      }))
      // Optional: drop fully empty rows
      .filter((c) => c.name || c.issuer || c.credential_id || c.credential_url);

    updateCertifications(
      { certifications: payloadCerts },
      {
        onSuccess: () => {
          setIsEditing(false);
          setQuery("");
          refetch?.();
        },
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden"
    >
      {/* subtle top accent */}
      <div className="h-1 w-full bg-gradient-to-r from-yellow-400/60 via-amber-400/50 to-slate-200" />

      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center border border-yellow-200 shrink-0">
              <Award className="w-4 h-4 text-yellow-700" />
            </div>

            <div className="min-w-0">
              <h3 className="text-sm lg:text-lg font-semibold text-gray-900">Certifications</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Keep your credentials tidy and easy to scan.
              </p>
            </div>
          </div>

          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending || !validation.canSave}
                className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                title={!validation.canSave ? validation.errors[0] : ""}
              >
                <Check className="w-4 h-4" />
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* Search + Count */}
        {hasCertifications && (
          <div className="mt-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, issuer, or credential ID..."
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <span className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full border bg-gray-50 text-gray-700 tabular-nums">
              {filtered.length}/{certifications.length}
            </span>
          </div>
        )}

        {/* Inline validation errors (only edit) */}
        {isEditing && validation.errors.length > 0 && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700">Fix these before saving:</p>
            <ul className="mt-1 space-y-1 text-xs text-red-700 list-disc pl-5">
              {validation.errors.slice(0, 4).map((e) => (
                <li key={e}>{e}</li>
              ))}
              {validation.errors.length > 4 ? (
                <li>+ {validation.errors.length - 4} more</li>
              ) : null}
            </ul>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        {!isEditing ? (
          <div>
            {hasCertifications ? (
              filtered.length ? (
                <div className="max-h-[520px] overflow-y-auto pr-2 cert-scrollbar space-y-3">
                  {filtered.map((cert, index) => (
                    <motion.div
                      key={`${cert.certification_id ?? "new"}-${index}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white hover:border-yellow-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4
                            className="text-sm font-semibold text-gray-900 leading-snug break-words"
                            title={cert.name}
                          >
                            {cert.name || "Untitled certification"}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">{cert.issuer || ""}</p>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                            {cert.issue_date ? (
                              <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200">
                                Issued:{" "}
                                <span className="tabular-nums">
                                  {formatIssueDate(cert.issue_date)}
                                </span>
                              </span>
                            ) : null}

                            {cert.expiry_date ? (
                              <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200">
                                Expires:{" "}
                                <span className="tabular-nums">
                                  {formatIssueDate(cert.expiry_date)}
                                </span>
                              </span>
                            ) : null}

                            {cert.credential_id ? (
                              <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200">
                                ID: <span className="font-medium">{cert.credential_id}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {cert.credential_url ? (
                          <a
                            href={cert.credential_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                            title="View credential"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View
                          </a>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-700 font-medium">No results</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try a different keyword (name / issuer / credential ID).
                  </p>
                  <button
                    onClick={() => setQuery("")}
                    className="mt-3 text-blue-600 text-xs font-medium hover:text-blue-700"
                  >
                    Clear search
                  </button>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-xs lg:text-sm">Add your certifications</p>
                <button
                  onClick={handleEdit}
                  className="mt-3 text-blue-600 text-xs lg:text-sm font-medium hover:text-blue-700"
                >
                  Add certification
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="max-h-[520px] overflow-y-auto pr-2 cert-scrollbar space-y-3">
              <AnimatePresence>
                {filtered.map((cert, filteredIndex) => {
                  // map back to real index
                  const realIndex = certifications.findIndex((c) => c === cert);

                  return (
                    <motion.div
                      key={`edit-${cert.certification_id ?? "new"}-${realIndex}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-gray-700">
                            Certification {realIndex + 1}
                          </h4>
                          <p className="text-xs text-gray-500">Fill at least name + issuer.</p>
                        </div>

                        <button
                          onClick={() => handleRemoveCertification(realIndex)}
                          className="text-red-600 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Certification Name *
                          </label>
                          <input
                            type="text"
                            value={cert.name}
                            onChange={(e) =>
                              handleCertificationChange(realIndex, "name", e.target.value)
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="e.g., AWS Certified Solutions Architect"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Issuing Organization *
                          </label>
                          <input
                            type="text"
                            value={cert.issuer}
                            onChange={(e) =>
                              handleCertificationChange(realIndex, "issuer", e.target.value)
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="e.g., Amazon Web Services"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Issue Date *
                            </label>
                            <input
                              type="date"
                              value={cert.issue_date ? String(cert.issue_date) : ""}
                              onChange={(e) =>
                                handleCertificationChange(realIndex, "issue_date", e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                            <p className="mt-1 text-[11px] text-gray-500">
                              Required by backend (we auto-fill if empty).
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Expiry Date
                            </label>
                            <input
                              type="date"
                              value={cert.expiry_date ? String(cert.expiry_date) : ""}
                              onChange={(e) =>
                                handleCertificationChange(realIndex, "expiry_date", e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Credential ID
                            </label>
                            <input
                              type="text"
                              value={cert.credential_id || ""}
                              onChange={(e) =>
                                handleCertificationChange(realIndex, "credential_id", e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              placeholder="Optional"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Credential URL
                            </label>
                            <input
                              type="url"
                              value={cert.credential_url || ""}
                              onChange={(e) =>
                                handleCertificationChange(realIndex, "credential_url", e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              placeholder="https://..."
                            />
                            {!isValidUrlMaybe(cert.credential_url) ? (
                              <p className="mt-1 text-[11px] text-red-600">Invalid URL</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <button
              onClick={handleAddCertification}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-700 hover:border-blue-500 hover:text-blue-700 transition-colors flex items-center justify-center gap-2 bg-white"
            >
              <Plus className="w-4 h-4" />
              Add Certification
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .cert-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .cert-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 999px;
        }
        .cert-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }
        .cert-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </motion.div>
  );
};

export default CertificationsSection;
