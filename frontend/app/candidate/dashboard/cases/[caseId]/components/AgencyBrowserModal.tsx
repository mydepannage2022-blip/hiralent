"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, AlertCircle, Building2 } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import toast from "react-hot-toast";
import AgencyCard from "./AgencyCard";
import { API_V1_BASE } from "@/src/lib/config/api";

interface Agency {
  agency_id: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  website?: string;
  operating_countries: string[];
  rating?: number;
}

interface AgencyBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  destinationCountry: string;
  onSuccess: () => void;
  agencyType: "RELOCATION" | "INTEGRATION";
}

export default function AgencyBrowserModal({
  isOpen,
  onClose,
  caseId,
  destinationCountry,
  onSuccess,
  agencyType,
}: AgencyBrowserModalProps) {
  const { token } = useAuth();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAgencies();
    }
  }, [isOpen]);

  const fetchAgencies = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_V1_BASE}/candidates/agencies/browse?type=${agencyType}&country=${destinationCountry}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch agencies");
      }

      const data = await response.json();
      setAgencies(data.data || []);
    } catch (err) {
      console.error("Fetch agencies error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to load agencies"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAgency = async (agencyId: string) => {
    try {
      setSelecting(true);

      const endpoint =
        agencyType === "RELOCATION"
          ? `/candidates/cases/${caseId}/assign-agency`
          : `/candidates/cases/${caseId}/assign-integration-agency`;

      const response = await fetch(
        `${API_V1_BASE}${endpoint}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ agencyId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to assign agency");
      }

      const data = await response.json();

      const successMessage =
        agencyType === "RELOCATION"
          ? "Housing agency assigned successfully!"
          : "Integration agency assigned successfully!";

      toast.success(data.message || successMessage);
      onSuccess(); // Refresh the case data
      onClose(); // Close the modal
    } catch (err) {
      console.error("Assign agency error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to assign agency"
      );
    } finally {
      setSelecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="sticky top-0 bg-linear-to-r from-blue-600 to-blue-500 text-white p-6 flex items-center justify-between">
            <div>
              Choose {agencyType === "RELOCATION" ? "Housing" : "Integration"}{" "}
              Agency
              <p className="text-blue-100 text-sm">
                {agencyType === "RELOCATION"
                  ? `Select an agency to help you find accommodation in ${destinationCountry}`
                  : `Select an agency to help with post-arrival services in ${destinationCountry}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              disabled={selecting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-slate-600">Loading agencies...</p>
                </div>
              </div>
            ) : agencies.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">No agencies found</p>
                  <p className="text-sm text-slate-500">
                    No {agencyType.toLowerCase()} agencies are available in{" "}
                    {destinationCountry} at the moment.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-slate-600">
                    Found <strong>{agencies.length}</strong> approved{" "}
                    {agencyType.toLowerCase()}{" "}
                    {agencies.length === 1 ? "agency" : "agencies"} in{" "}
                    {destinationCountry}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agencies.map((agency) => (
                    <AgencyCard
                      key={agency.agency_id}
                      agency={agency}
                      onSelect={handleSelectAgency}
                      isSelecting={selecting}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
