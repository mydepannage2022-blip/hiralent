"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Award, X, Check, Plus, Trash2 } from "lucide-react";
import { useUpdateCertifications } from "@/src/lib/profile/profile.queries";
import { useProfile } from "@/src/context/ProfileContext";

interface Certification {
  id?: string;
  name: string;
  issuer: string;
  issue_date?: string;
  credential_id?: string;
  credential_url?: string;
}

function parseCertifications(value: any): Certification[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as Certification[];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as Certification[]) : [];
    } catch (e) {
      console.error("Failed to parse certifications JSON:", e);
      return [];
    }
  }

  // If backend sends an object (rare), still fallback safely
  return [];
}

const CertificationsSection = () => {
  const { profileData, refetch } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  // ✅ Normalize DB value to array always
  const parsedCertifications = useMemo(() => {
    return parseCertifications((profileData as any)?.certifications);
  }, [(profileData as any)?.certifications]);

  const [certifications, setCertifications] = useState<Certification[]>(parsedCertifications);

  // ✅ Sync with profile changes (autofill/apply/refetch)
  useEffect(() => {
    if (!isEditing) setCertifications(parsedCertifications);
  }, [parsedCertifications, isEditing]);

  const { mutate: updateCertifications, isPending } = useUpdateCertifications();

  const handleEdit = () => {
    setIsEditing(true);
    setCertifications(parsedCertifications);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCertifications(parsedCertifications);
  };

  const handleSave = () => {
    updateCertifications(
      { certifications }, // send array; backend can stringify
      {
        onSuccess: () => {
          setIsEditing(false);
          refetch?.();
        },
      }
    );
  };

  const handleAddCertification = () => {
    setCertifications((prev) => [
      ...prev,
      {
        name: "",
        issuer: "",
        issue_date: "",
        credential_id: "",
        credential_url: "",
      },
    ]);
  };

  const handleRemoveCertification = (index: number) => {
    setCertifications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCertificationChange = (index: number, field: keyof Certification, value: string) => {
    setCertifications((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const hasCertifications = Array.isArray(certifications) && certifications.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Award className="w-3 h-3 lg:w-4 lg:h-4 text-yellow-600" />
          </div>
          <h3 className="text-xs lg:text-lg font-semibold text-gray-900">Certifications</h3>
        </div>

        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-3 h-3 lg:w-4 lg:h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3 lg:w-4 lg:h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3 lg:w-4 lg:h-4" />
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {!isEditing ? (
        <div>
          {hasCertifications ? (
            <div className="space-y-4">
              {certifications.map((cert, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <h4 className="text-xs lg:text-sm font-semibold text-gray-900 mb-1">
                    {cert.name || "Untitled certification"}
                  </h4>
                  <p className="text-xs lg:text-sm text-gray-600 mb-2">{cert.issuer || ""}</p>

                  {cert.issue_date ? (
                    <p className="text-xs text-gray-500">
                      Issued: {new Date(cert.issue_date).toLocaleDateString()}
                    </p>
                  ) : null}

                  {cert.credential_id ? (
                    <p className="text-xs text-gray-500">Credential ID: {cert.credential_id}</p>
                  ) : null}

                  {cert.credential_url ? (
                    <a
                      href={cert.credential_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      View Credential
                    </a>
                  ) : null}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
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
          <AnimatePresence>
            {certifications.map((cert, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <h4 className="text-xs lg:text-sm font-semibold text-gray-700">
                    Certification {index + 1}
                  </h4>
                  <button
                    onClick={() => handleRemoveCertification(index)}
                    className="text-red-600 hover:text-red-700 p-1"
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
                      onChange={(e) => handleCertificationChange(index, "name", e.target.value)}
                      className="w-full px-3 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                      onChange={(e) => handleCertificationChange(index, "issuer", e.target.value)}
                      className="w-full px-3 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="e.g., Amazon Web Services"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Issue Date
                      </label>
                      <input
                        type="date"
                        value={cert.issue_date || ""}
                        onChange={(e) => handleCertificationChange(index, "issue_date", e.target.value)}
                        className="w-full px-3 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Credential ID
                      </label>
                      <input
                        type="text"
                        value={cert.credential_id || ""}
                        onChange={(e) => handleCertificationChange(index, "credential_id", e.target.value)}
                        className="w-full px-3 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Credential URL
                    </label>
                    <input
                      type="url"
                      value={cert.credential_url || ""}
                      onChange={(e) => handleCertificationChange(index, "credential_url", e.target.value)}
                      className="w-full px-3 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <button
            onClick={handleAddCertification}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-xs lg:text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Certification
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default CertificationsSection;