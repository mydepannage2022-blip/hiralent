"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  FileText,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Building2,
  X,
  Upload,
  Mail,
  Phone,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { REQUIRED_DOCUMENT_TYPES } from "@/src/constants/documentTypes";

interface Candidate {
  user_id: string;
  email: string;
  full_name: string;
  phone_number?: string;
}

interface Document {
  is_active: boolean;
  document_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: string;
  notes?: string;
  review_feedback?: string;
  created_at: string;
}

interface Case {
  case_id: string;
  case_number: string;
  service_type: string;
  priority_level: string;
  status: string;
  origin_country: string;
  destination_country: string;
  destination_city?: string;
  estimated_completion?: string;
  estimated_cost?: number;
  notes?: string;
  created_at: string;
  candidate: Candidate;
  documents: Document[];
  embassy_submission?: EmbassySubmission;
  agency?: {
    agency_id: string;
    name: string;
    type: "VISA" | "RELOCATION" | "INTEGRATION";
  };
  viewing_agency_type?: "VISA" | "RELOCATION" | "INTEGRATION" | null;
  housing_type?: string;
  housing_address?: string;
  monthly_rent_mad?: number;
  agency_fee_amount?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  housing_contract_url?: string;
  utility_water?: string;
  utility_electricity?: string;
  utility_internet?: string;
  arrival_date?: string;
  flight_number?: string;
  airport_pickup_required?: boolean;
  arrival_notes?: string;
}

interface EmbassySubmission {
  submission_id: string;
  embassy_name: string;
  embassy_location: string;
  submission_date: string;
  tracking_number?: string;
  expected_response?: string;
  receipt_url?: string;
  status: string;
  interview_date?: string;
  interview_location?: string;
  interview_notes?: string;
  decision_date?: string;
  decision_notes?: string;
}

export default function AgencyCaseDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [reviewAction, setReviewAction] = useState<
    "approved" | "rejected" | "needs_revision"
  >("approved");
  const [reviewNotes, setReviewNotes] = useState("");

  const [showEmbassyModal, setShowEmbassyModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  // Housing form state
  const [housingData, setHousingData] = useState({
    housing_type: "",
    housing_address: "",
    monthly_rent_mad: "",
    agency_fee_amount: "",
    lease_start_date: "",
    lease_end_date: "",
    housing_notes: "",
  });

  // Utility state
  const [utilityStatus, setUtilityStatus] = useState({
    utility_water: "pending",
    utility_electricity: "pending",
    utility_internet: "pending",
  });

  // Arrival state
  const [arrivalData, setArrivalData] = useState({
    arrival_date: "",
    flight_number: "",
    airport_pickup_required: false,
    arrival_notes: "",
  });

  const [savingHousing, setSavingHousing] = useState(false);
  const [savingUtilities, setSavingUtilities] = useState(false);
  const [savingArrival, setSavingArrival] = useState(false);

  const fetchCase = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases/${caseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch case");
      }

      const data = await response.json();
      setCaseData(data.data);
    } catch (err) {
      console.error("Fetch case error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to load case details"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId && token) {
      fetchCase();
    }
  }, [caseId, token]);

  // Populate form data when caseData loads
  useEffect(() => {
    if (caseData) {
      setHousingData({
        housing_type: caseData.housing_type || "",
        housing_address: caseData.housing_address || "",
        monthly_rent_mad: caseData.monthly_rent_mad?.toString() || "",
        agency_fee_amount: caseData.agency_fee_amount?.toString() || "",
        lease_start_date: caseData.lease_start_date
          ? new Date(caseData.lease_start_date).toISOString().split("T")[0]
          : "",
        lease_end_date: caseData.lease_end_date
          ? new Date(caseData.lease_end_date).toISOString().split("T")[0]
          : "",
        housing_notes: caseData.notes || "",
      });
      console.log("🔍 Utilities from backend:", {
      utility_water: caseData.utility_water,
      utility_electricity: caseData.utility_electricity,
      utility_internet: caseData.utility_internet,
    });
      setUtilityStatus({
        utility_water: caseData.utility_water || "pending",
        utility_electricity: caseData.utility_electricity || "pending",
        utility_internet: caseData.utility_internet || "pending",
      });

      setArrivalData({
        arrival_date: caseData.arrival_date
          ? new Date(caseData.arrival_date).toISOString().split("T")[0]
          : "",
        flight_number: caseData.flight_number || "",
        airport_pickup_required: caseData.airport_pickup_required || false,
        arrival_notes: caseData.arrival_notes || "",
      });
    }
  }, [caseData]);

  const handleReviewDocument = async () => {
    if (!selectedDocument) return;

    try {
      setReviewing(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases/${caseId}/documents/${selectedDocument.document_id}/review`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: reviewAction,
            notes: reviewNotes || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to review document");
      }

      toast.success(`Document ${reviewAction}!`);
      setShowReviewModal(false);
      setSelectedDocument(null);
      setReviewNotes("");
      fetchCase();
    } catch (err) {
      console.error("Review error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to review document"
      );
    } finally {
      setReviewing(false);
    }
  };

  const openReviewModal = (doc: Document, action: typeof reviewAction) => {
    setSelectedDocument(doc);
    setReviewAction(action);
    setReviewNotes("");
    setShowReviewModal(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
      case "needs_revision":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "inactive":
        return "bg-gray-100 text-gray-600 border-gray-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      case "needs_revision":
        return <AlertTriangle className="w-4 h-4" />;
      case "inactive":
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Handle housing form submission
  const handleSaveHousing = async () => {
    try {
      setSavingHousing(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases/${caseId}/housing`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            housing_type: housingData.housing_type || null,
            housing_address: housingData.housing_address || null,
            monthly_rent_mad: housingData.monthly_rent_mad
              ? parseFloat(housingData.monthly_rent_mad)
              : null,
            agency_fee_amount: housingData.agency_fee_amount
              ? parseFloat(housingData.agency_fee_amount)
              : null,
            lease_start_date: housingData.lease_start_date || null,
            lease_end_date: housingData.lease_end_date || null,
            housing_notes: housingData.housing_notes || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save housing details");
      }

      toast.success("Housing details saved successfully!");
      fetchCase(); // Refresh case data
    } catch (err) {
      console.error("Save housing error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save housing details"
      );
    } finally {
      setSavingHousing(false);
    }
  };

  // Handle utility status change
  const handleUtilityChange = async (utility: string, status: string) => {
    try {
      setSavingUtilities(true);

      const updatedUtilities = {
        ...utilityStatus,
        [utility]: status,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases/${caseId}/utilities`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedUtilities),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update utility status");
      }

      const responseData = await response.json();
      console.log("✅ Backend response:", responseData);

      setUtilityStatus(updatedUtilities);
      toast.success("Utility status updated!");
      
    } catch (err) {
      console.error("Update utility error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update utility status"
      );
    } finally {
      setSavingUtilities(false);
    }
  };

  // Handle arrival details submission
  const handleSaveArrival = async () => {
    try {
      setSavingArrival(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases/${caseId}/arrival`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            arrival_date: arrivalData.arrival_date || null,
            flight_number: arrivalData.flight_number || null,
            airport_pickup_required: arrivalData.airport_pickup_required,
            arrival_notes: arrivalData.arrival_notes || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save arrival details");
      }

      toast.success("Arrival details saved successfully!");
      fetchCase();
    } catch (err) {
      console.error("Save arrival error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save arrival details"
      );
    } finally {
      setSavingArrival(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading case details...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Case not found</p>
          <button
            onClick={() => router.push("/agency/dashboard/cases")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  // Conditional UI based on which agency is viewing
  const viewingAgencyType = caseData.viewing_agency_type;

  // RELOCATION Agency UI
  if (viewingAgencyType === "RELOCATION") {
    // ============================================
    // DYNAMIC CALCULATIONS FOR RELOCATION SIDEBAR
    // ============================================

    // Calculate progress steps for RELOCATION cases
    const calculateRelocationProgress = () => {
      if (!caseData || viewingAgencyType !== "RELOCATION")
        return { steps: [], percentage: 0 };

      const steps = [
        {
          id: 1,
          name: "Visa Approved",
          description: "Candidate ready for relocation",
          completed: caseData.embassy_submission?.status === "approved",
          icon: CheckCircle,
          color: "green",
        },
        {
          id: 2,
          name: "Agency Assigned",
          description: "You've been selected",
          completed: true, // Always true if viewing this page
          icon: CheckCircle,
          color: "green",
        },
        {
          id: 3,
          name: "Housing Secured",
          description: "Accommodation arranged",
          completed: !!(
            caseData.housing_type &&
            caseData.housing_address &&
            caseData.monthly_rent_mad &&
            caseData.lease_start_date
          ),
          icon: caseData.housing_type ? CheckCircle : Clock,
          color: caseData.housing_type ? "green" : "yellow",
        },
        {
          id: 4,
          name: "Utilities Setup",
          description: "Essential services connected",
          completed:
            caseData.utility_water === "completed" &&
            caseData.utility_electricity === "completed" &&
            caseData.utility_internet === "completed",
          icon:
            caseData.utility_water === "completed" &&
            caseData.utility_electricity === "completed" &&
            caseData.utility_internet === "completed"
              ? CheckCircle
              : caseData.utility_water === "in_progress" ||
                caseData.utility_electricity === "in_progress" ||
                caseData.utility_internet === "in_progress"
              ? Clock
              : Clock,
          color:
            caseData.utility_water === "completed" &&
            caseData.utility_electricity === "completed" &&
            caseData.utility_internet === "completed"
              ? "green"
              : caseData.utility_water === "in_progress" ||
                caseData.utility_electricity === "in_progress" ||
                caseData.utility_internet === "in_progress"
              ? "yellow"
              : "gray",
        },
        {
          id: 5,
          name: "Ready for Arrival",
          description: "All preparations complete",
          completed: !!(caseData.arrival_date && caseData.flight_number),
          icon: caseData.arrival_date ? CheckCircle : Clock,
          color: caseData.arrival_date ? "green" : "gray",
        },
      ];

      const completedSteps = steps.filter((step) => step.completed).length;
      const percentage = Math.round((completedSteps / steps.length) * 100);

      return { steps, percentage, completedSteps, totalSteps: steps.length };
    };

    // Check if ready to mark as "Ready for Arrival"
    const isReadyForArrival = () => {
      if (!caseData || viewingAgencyType !== "RELOCATION") return false;

      return !!(
        // Housing is complete
        (
          caseData.housing_type &&
          caseData.housing_address &&
          caseData.monthly_rent_mad &&
          caseData.lease_start_date &&
          // All utilities are completed
          caseData.utility_water === "completed" &&
          caseData.utility_electricity === "completed" &&
          caseData.utility_internet === "completed" &&
          // Arrival details are set
          caseData.arrival_date &&
          caseData.flight_number
        )
      );
    };

    const relocationProgress = calculateRelocationProgress();
    const canMarkReady = isReadyForArrival();
    return (
      <div className="w-full">
        <div className="mb-6">
          <button
            onClick={() => router.push("/agency/dashboard/cases")}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cases
          </button>

          <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                  {caseData.case_number}
                </h1>
                <p className="text-slate-600">Housing & Relocation Case</p>
                <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  {caseData.status.replace("_", " ")}
                </span>
              </div>
              <button
                onClick={fetchCase}
                className="p-3 bg-white hover:bg-green-50 rounded-xl transition-colors border border-slate-200 hover:border-green-300 shadow-sm"
              >
                <RefreshCw className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Candidate Information */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4">
                Candidate Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Name</p>
                    <p className="text-sm font-medium text-slate-700">
                      {caseData.candidate.full_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="text-sm font-medium text-slate-700">
                      {caseData.candidate.email}
                    </p>
                  </div>
                </div>
                {caseData.candidate.phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Phone</p>
                      <p className="text-sm font-medium text-slate-700">
                        {caseData.candidate.phone_number}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Destination</p>
                    <p className="text-sm font-medium text-slate-700">
                      {caseData.destination_country}
                      {caseData.destination_city
                        ? `, ${caseData.destination_city}`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Housing Details Form */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">
                  Housing Details
                </h2>
                <button
                  onClick={handleSaveHousing}
                  disabled={savingHousing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingHousing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>

              <div className="space-y-4">
                {/* Housing Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Housing Type *
                  </label>
                  <select
                    value={housingData.housing_type}
                    onChange={(e) =>
                      setHousingData({
                        ...housingData,
                        housing_type: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select housing type</option>
                    <option value="temporary">Temporary (Hotel/Airbnb)</option>
                    <option value="1_year_lease">1-Year Lease</option>
                    <option value="permanent">Permanent</option>
                  </select>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={housingData.housing_address}
                    onChange={(e) =>
                      setHousingData({
                        ...housingData,
                        housing_address: e.target.value,
                      })
                    }
                    placeholder="e.g., 123 Main St, Apartment 4B"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Rent & Agency Fee */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Monthly Rent (MAD) *
                    </label>
                    <input
                      type="number"
                      value={housingData.monthly_rent_mad}
                      onChange={(e) =>
                        setHousingData({
                          ...housingData,
                          monthly_rent_mad: e.target.value,
                        })
                      }
                      placeholder="e.g., 5000"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Agency Fee (MAD)
                    </label>
                    <input
                      type="number"
                      value={housingData.agency_fee_amount}
                      onChange={(e) =>
                        setHousingData({
                          ...housingData,
                          agency_fee_amount: e.target.value,
                        })
                      }
                      placeholder="e.g., 1500"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Lease Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Lease Start Date *
                    </label>
                    <input
                      type="date"
                      value={housingData.lease_start_date}
                      onChange={(e) =>
                        setHousingData({
                          ...housingData,
                          lease_start_date: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Lease End Date
                    </label>
                    <input
                      type="date"
                      value={housingData.lease_end_date}
                      onChange={(e) =>
                        setHousingData({
                          ...housingData,
                          lease_end_date: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Contract Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Lease Contract (PDF)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF up to 10MB
                    </p>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    rows={3}
                    value={housingData.housing_notes}
                    onChange={(e) =>
                      setHousingData({
                        ...housingData,
                        housing_notes: e.target.value,
                      })
                    }
                    placeholder="Any special notes about the housing arrangement..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Utility Setup Tracker */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4">
                Utility Setup
              </h2>

              <div className="space-y-3">
                {/* Water */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-slate-600">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.5 3A2.5 2.5 0 003 5.5v9A2.5 2.5 0 005.5 17h9a2.5 2.5 0 002.5-2.5v-9A2.5 2.5 0 0014.5 3h-9zm0 2a.5.5 0 00-.5.5v9a.5.5 0 00.5.5h9a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5h-9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="font-medium text-slate-700">Water</span>
                  </div>
                  <select
                    value={utilityStatus.utility_water}
                    onChange={(e) =>
                      handleUtilityChange("utility_water", e.target.value)
                    }
                    disabled={savingUtilities}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:opacity-50"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Electricity */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-slate-600">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="font-medium text-slate-700">
                      Electricity
                    </span>
                  </div>
                  <select
                    value={utilityStatus.utility_electricity}
                    onChange={(e) =>
                      handleUtilityChange("utility_electricity", e.target.value)
                    }
                    disabled={savingUtilities}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:opacity-50"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Internet */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-slate-600">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="font-medium text-slate-700">Internet</span>
                  </div>
                  <select
                    value={utilityStatus.utility_internet}
                    onChange={(e) =>
                      handleUtilityChange("utility_internet", e.target.value)
                    }
                    disabled={savingUtilities}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:opacity-50"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
            {/* Travel & Arrival */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">
                  Travel & Arrival
                </h2>
                <button
                  onClick={handleSaveArrival}
                  disabled={savingArrival}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingArrival ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Arrival Details"
                  )}
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Expected Arrival Date
                    </label>
                    <input
                      type="date"
                      value={arrivalData.arrival_date}
                      onChange={(e) =>
                        setArrivalData({
                          ...arrivalData,
                          arrival_date: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Flight Number
                    </label>
                    <input
                      type="text"
                      value={arrivalData.flight_number}
                      onChange={(e) =>
                        setArrivalData({
                          ...arrivalData,
                          flight_number: e.target.value,
                        })
                      }
                      placeholder="e.g., AT123"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Airport Pickup Required?
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pickup"
                        checked={arrivalData.airport_pickup_required === true}
                        onChange={() =>
                          setArrivalData({
                            ...arrivalData,
                            airport_pickup_required: true,
                          })
                        }
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-sm text-slate-700">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pickup"
                        checked={arrivalData.airport_pickup_required === false}
                        onChange={() =>
                          setArrivalData({
                            ...arrivalData,
                            airport_pickup_required: false,
                          })
                        }
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-sm text-slate-700">No</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Arrival Notes
                  </label>
                  <textarea
                    rows={2}
                    value={arrivalData.arrival_notes}
                    onChange={(e) =>
                      setArrivalData({
                        ...arrivalData,
                        arrival_notes: e.target.value,
                      })
                    }
                    placeholder="Any special arrangements or notes..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Right Side */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                {canMarkReady ? (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases/${caseId}/ready-for-arrival`,
                          {
                            method: "PUT",
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Content-Type": "application/json",
                            },
                          }
                        );

                        if (!response.ok) {
                          throw new Error("Failed to mark as ready");
                        }

                        toast.success("Case marked as Ready for Arrival!");
                        fetchCase();
                      } catch (err) {
                        toast.error("Failed to update status");
                      }
                    }}
                    className="w-full px-4 py-3 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all text-sm font-medium shadow-md hover:shadow-lg"
                  >
                    Mark Ready for Arrival
                  </button>
                ) : (
                  <div className="w-full px-4 py-3 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium text-center cursor-not-allowed">
                    Complete all steps to mark ready
                  </div>
                )}
                <button className="w-full px-4 py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                  Generate Housing Report
                </button>
              </div>
            </div>

            {/* Progress Tracker */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                Progress Tracker
              </h3>
              <div className="space-y-4">
                {relocationProgress.steps.map((step) => {
                  const IconComponent = step.icon;
                  const iconColorClass =
                    step.color === "green"
                      ? "text-green-600"
                      : step.color === "yellow"
                      ? "text-yellow-600"
                      : "text-slate-400";
                  const textColorClass = step.completed
                    ? "text-slate-700"
                    : "text-slate-400";

                  return (
                    <div key={step.id} className="flex items-start gap-3">
                      <IconComponent
                        className={`w-5 h-5 ${iconColorClass} mt-0.5 shrink-0`}
                      />
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${textColorClass}`}>
                          {step.name}
                        </p>
                        <p
                          className={`text-xs ${
                            step.completed ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Completion Percentage */}
            <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
              <h3 className="text-lg font-bold text-slate-800 mb-3">
                Completion
              </h3>
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Overall Progress</span>
                  <span className="font-bold text-green-700">
                    {relocationProgress.percentage}%
                  </span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${relocationProgress.percentage}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-3">
                {relocationProgress.completedSteps} of{" "}
                {relocationProgress.totalSteps} steps completed
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // INTEGRATION Agency UI
  if (viewingAgencyType === "INTEGRATION") {
    return (
      <div className="w-full">
        <div className="mb-6">
          <button
            onClick={() => router.push("/agency/dashboard/cases")}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cases
          </button>

          <div className="bg-linear-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              {caseData.case_number}
            </h1>
            <p className="text-slate-600">Integration Case</p>
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

  // Get only active documents
  const activeDocuments = caseData.documents.filter(
    (d) => d.is_active === true
  );

  // Count pending documents
  const pendingDocuments = activeDocuments.filter(
    (d) => d.status === "pending"
  ).length;

  // Count approved documents
  const approvedDocuments = activeDocuments.filter(
    (d) => d.status === "approved"
  ).length;

  // Get unique document types from active documents (for total count)
  const uniqueDocumentTypes = new Set(
    activeDocuments.map((d) => d.document_type)
  );
  const totalDocuments = uniqueDocumentTypes.size;

  // Get approved document types
  const approvedDocumentTypes = new Set(
    activeDocuments
      .filter((d) => d.status === "approved")
      .map((d) => d.document_type)
  );

  // Check if all required types are approved
  const allRequiredTypesApproved = REQUIRED_DOCUMENT_TYPES.every((type) =>
    approvedDocumentTypes.has(type)
  );

  // Optional: Get missing required types for debugging/display
  const missingRequiredTypes = REQUIRED_DOCUMENT_TYPES.filter(
    (type) => !approvedDocumentTypes.has(type)
  );

  return (
    <div className="w-full">
      <div className="mb-6">
        <button
          onClick={() => router.push("/agency/dashboard/cases")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cases
        </button>

        <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                {caseData.case_number}
              </h1>
              <p className="text-slate-600">
                {caseData.service_type.replace("_", " ")}
              </p>
            </div>
            <button
              onClick={fetchCase}
              className="p-3 bg-white hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 hover:border-blue-300 shadow-sm"
            >
              <RefreshCw className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-700">Total Documents</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalDocuments}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-slate-700">Pending Review</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-600">
            {pendingDocuments}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-slate-700">Approved</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {approvedDocuments}
          </p>
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Uploaded Documents
            </h2>

            {caseData.documents.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-1">No documents uploaded yet</p>
                <p className="text-sm text-slate-500">
                  Waiting for candidate to upload documents
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {caseData.documents.map((doc) => (
                  <div
                    key={doc.document_id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {doc.file_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">
                            {doc.document_type.replace("_", " ")}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">
                            {formatFileSize(doc.file_size)}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">
                            {formatDate(doc.created_at)}
                          </span>
                        </div>
                        {doc.notes && (
                          <p className="text-xs text-slate-500 mt-1 italic">
                            Note: {doc.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${
                          !doc.is_active
                            ? getStatusColor("inactive")
                            : getStatusColor(doc.status)
                        }`}
                      >
                        {!doc.is_active ? (
                          <>
                            {getStatusIcon("inactive")}
                            inactive
                          </>
                        ) : (
                          <>
                            {getStatusIcon(doc.status)}
                            {doc.status.replace("_", " ")}
                          </>
                        )}
                      </span>

                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                        title="View/Download"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </a>

                      {doc.status === "pending" && doc.is_active && (
                        <>
                          <button
                            onClick={() => openReviewModal(doc, "approved")}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <ThumbsUp className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={() =>
                              openReviewModal(doc, "needs_revision")
                            }
                            className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                            title="Request Revision"
                          >
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                          </button>
                          <button
                            onClick={() => openReviewModal(doc, "rejected")}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <ThumbsDown className="w-4 h-4 text-red-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {pendingDocuments > 0 && (
          <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200 mt-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  Action Required
                </h3>
                <p className="text-sm text-slate-600">
                  {pendingDocuments} document{pendingDocuments > 1 ? "s" : ""}{" "}
                  waiting for your review
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Embassy Submission Section */}
        {caseData.embassy_submission ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">
                Embassy Submission
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(
                  caseData.embassy_submission.status
                )}`}
              >
                {getStatusIcon(caseData.embassy_submission.status)}
                {caseData.embassy_submission.status.replace("_", " ")}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 mb-1">Embassy</p>
                  <p className="text-sm font-medium text-slate-700">
                    {caseData.embassy_submission.embassy_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {caseData.embassy_submission.embassy_location}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 mb-1">Submission Date</p>
                  <p className="text-sm font-medium text-slate-700">
                    {formatDate(caseData.embassy_submission.submission_date)}
                  </p>
                </div>
              </div>

              {caseData.embassy_submission.tracking_number && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                      Tracking Number
                    </p>
                    <p className="text-sm font-medium text-slate-700">
                      {caseData.embassy_submission.tracking_number}
                    </p>
                  </div>
                </div>
              )}

              {caseData.embassy_submission.expected_response && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                      Expected Response
                    </p>
                    <p className="text-sm font-medium text-slate-700">
                      {formatDate(
                        caseData.embassy_submission.expected_response
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Interview Details */}
            {caseData.embassy_submission.interview_date && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  Interview Scheduled
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Date & Time</p>
                    <p className="text-sm font-medium text-slate-700">
                      {new Date(
                        caseData.embassy_submission.interview_date
                      ).toLocaleString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {caseData.embassy_submission.interview_location && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Location</p>
                      <p className="text-sm font-medium text-slate-700">
                        {caseData.embassy_submission.interview_location}
                      </p>
                    </div>
                  )}
                </div>
                {caseData.embassy_submission.interview_notes && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                    <p className="text-sm text-slate-700">
                      {caseData.embassy_submission.interview_notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Decision Details */}
            {caseData.embassy_submission.decision_date && (
              <div
                className={`mt-4 p-4 rounded-lg border ${
                  caseData.embassy_submission.status === "approved"
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  {caseData.embassy_submission.status === "approved" ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  Embassy Decision
                </h3>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Decision Date</p>
                  <p className="text-sm font-medium text-slate-700 mb-3">
                    {formatDate(caseData.embassy_submission.decision_date)}
                  </p>
                </div>
                {caseData.embassy_submission.decision_notes && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                    <p className="text-sm text-slate-700">
                      {caseData.embassy_submission.decision_notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStatusModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Update Status
              </button>
              {caseData.embassy_submission.status !== "interview_scheduled" &&
                caseData.embassy_submission.status !== "approved" &&
                caseData.embassy_submission.status !== "rejected" && (
                  <button
                    onClick={() => setShowInterviewModal(true)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                  >
                    Schedule Interview
                  </button>
                )}
            </div>
          </div>
        ) : allRequiredTypesApproved && pendingDocuments === 0 ? (
          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200 mt-6">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  Ready for Embassy Submission
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  All documents have been approved. You can now submit this case
                  to the embassy.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowEmbassyModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Submit to Embassy
            </button>
          </div>
        ) : null}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-6"
            >
              <div className="flex items-start gap-4 mb-6">
                <div
                  className={`p-3 rounded-full ${
                    reviewAction === "approved"
                      ? "bg-green-100"
                      : reviewAction === "rejected"
                      ? "bg-red-100"
                      : "bg-orange-100"
                  }`}
                >
                  {reviewAction === "approved" ? (
                    <ThumbsUp className="w-6 h-6 text-green-600" />
                  ) : reviewAction === "rejected" ? (
                    <ThumbsDown className="w-6 h-6 text-red-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {reviewAction === "approved"
                      ? "Approve Document"
                      : reviewAction === "rejected"
                      ? "Reject Document"
                      : "Request Revision"}
                  </h3>
                  <p className="text-sm text-slate-600 mb-1">
                    <strong>{selectedDocument.file_name}</strong>
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedDocument.document_type.replace("_", " ")}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {reviewAction === "approved"
                    ? "Notes (Optional)"
                    : reviewAction === "rejected"
                    ? "Reason for Rejection *"
                    : "Changes Required *"}
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder={
                    reviewAction === "approved"
                      ? "Add any notes about this approval..."
                      : reviewAction === "rejected"
                      ? "Explain why this document is rejected..."
                      : "Describe what changes are needed..."
                  }
                  required={reviewAction !== "approved"}
                  disabled={reviewing}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedDocument(null);
                    setReviewNotes("");
                  }}
                  className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-all"
                  disabled={reviewing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviewDocument}
                  className={`flex-1 px-6 py-3 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    reviewAction === "approved"
                      ? "bg-green-600 hover:bg-green-700"
                      : reviewAction === "rejected"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-orange-600 hover:bg-orange-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={
                    reviewing ||
                    (reviewAction !== "approved" && !reviewNotes.trim())
                  }
                >
                  {reviewing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {reviewAction === "approved" ? (
                        <ThumbsUp className="w-4 h-4" />
                      ) : reviewAction === "rejected" ? (
                        <ThumbsDown className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                      <span>Confirm</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Embassy Submission Modal */}
      <AnimatePresence>
        {showEmbassyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    Submit to Embassy
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Case {caseData.case_number}
                  </p>
                </div>
                <button
                  onClick={() => setShowEmbassyModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  disabled={reviewing}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();

                  const formData = new FormData(e.currentTarget);
                  const data = {
                    embassy_name: formData.get("embassy_name"),
                    embassy_location: formData.get("embassy_location"),
                    submission_date: formData.get("submission_date"),
                    tracking_number:
                      formData.get("tracking_number") || undefined,
                    expected_response:
                      formData.get("expected_response") || undefined,
                    receipt_url: formData.get("receipt_url") || undefined,
                  };

                  try {
                    setReviewing(true);

                    const response = await fetch(
                      `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases/${caseId}/embassy/submit`,
                      {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(data),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(
                        errorData.message || "Failed to submit to embassy"
                      );
                    }

                    toast.success("Case submitted to embassy successfully!");
                    setShowEmbassyModal(false);
                    fetchCase();
                  } catch (err) {
                    console.error("Submit error:", err);
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Failed to submit to embassy"
                    );
                  } finally {
                    setReviewing(false);
                  }
                }}
                className="p-6 space-y-4"
              >
                {/* Embassy Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Embassy Name *
                  </label>
                  <input
                    type="text"
                    name="embassy_name"
                    required
                    placeholder="e.g., US Embassy Morocco"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={reviewing}
                  />
                </div>

                {/* Embassy Location */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Embassy Location *
                  </label>
                  <input
                    type="text"
                    name="embassy_location"
                    required
                    placeholder="e.g., Casablanca, Morocco"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={reviewing}
                  />
                </div>

                {/* Submission Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Submission Date *
                  </label>
                  <input
                    type="date"
                    name="submission_date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={reviewing}
                  />
                </div>

                {/* Tracking Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tracking Number (Optional)
                  </label>
                  <input
                    type="text"
                    name="tracking_number"
                    placeholder="e.g., EMB-2025-001"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={reviewing}
                  />
                </div>

                {/* Expected Response */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Expected Response Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="expected_response"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={reviewing}
                  />
                </div>

                {/* Receipt URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Receipt URL (Optional)
                  </label>
                  <input
                    type="url"
                    name="receipt_url"
                    placeholder="https://..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={reviewing}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Link to submission receipt or confirmation
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowEmbassyModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-all"
                    disabled={reviewing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={reviewing}
                  >
                    {reviewing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Submit to Embassy</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Status Update Modal */}
      <AnimatePresence>
        {showStatusModal && caseData?.embassy_submission && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md"
            >
              <div className="border-b border-slate-200 p-6">
                <h3 className="text-2xl font-bold text-slate-800">
                  Update Embassy Status
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Case {caseData.case_number}
                </p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();

                  const formData = new FormData(e.currentTarget);
                  const data = {
                    status: formData.get("status"),
                    decision_date: formData.get("decision_date") || undefined,
                    decision_notes: formData.get("decision_notes") || undefined,
                  };

                  try {
                    setReviewing(true);

                    const response = await fetch(
                      `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases/${caseId}/embassy/status`,
                      {
                        method: "PUT",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(data),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(
                        errorData.message || "Failed to update status"
                      );
                    }

                    toast.success("Status updated successfully!");
                    setShowStatusModal(false);
                    fetchCase();
                  } catch (err) {
                    console.error("Update status error:", err);
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Failed to update status"
                    );
                  } finally {
                    setReviewing(false);
                  }
                }}
                className="p-6 space-y-4"
              >
                {/* Current Status Display */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-1">Current Status</p>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      caseData.embassy_submission.status
                    )}`}
                  >
                    {getStatusIcon(caseData.embassy_submission.status)}
                    {caseData.embassy_submission.status.replace("_", " ")}
                  </span>
                </div>

                {/* New Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Status *
                  </label>
                  <select
                    name="status"
                    required
                    defaultValue={caseData.embassy_submission.status}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={reviewing}
                  >
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="interview_scheduled">
                      Interview Scheduled
                    </option>
                    <option value="approved">Approved ✅</option>
                    <option value="rejected">Rejected ❌</option>
                  </select>
                </div>

                {/* Decision Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Decision Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="decision_date"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={reviewing}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    For approved/rejected status
                  </p>
                </div>

                {/* Decision Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="decision_notes"
                    rows={3}
                    placeholder="Add any notes about this status change..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={reviewing}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowStatusModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-all"
                    disabled={reviewing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={reviewing}
                  >
                    {reviewing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Status</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Interview Schedule Modal */}
      <AnimatePresence>
        {showInterviewModal && caseData?.embassy_submission && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md"
            >
              <div className="border-b border-slate-200 p-6">
                <h3 className="text-2xl font-bold text-slate-800">
                  Schedule Embassy Interview
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Case {caseData.case_number}
                </p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();

                  const formData = new FormData(e.currentTarget);

                  // Combine date and time
                  const date = formData.get("interview_date");
                  const time = formData.get("interview_time");
                  const interview_date = `${date}T${time}:00`;

                  const data = {
                    interview_date,
                    interview_location: formData.get("interview_location"),
                    interview_notes:
                      formData.get("interview_notes") || undefined,
                  };

                  try {
                    setReviewing(true);

                    const response = await fetch(
                      `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases/${caseId}/embassy/interview`,
                      {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(data),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(
                        errorData.message || "Failed to schedule interview"
                      );
                    }

                    toast.success("Interview scheduled successfully!");
                    setShowInterviewModal(false);
                    fetchCase();
                  } catch (err) {
                    console.error("Schedule interview error:", err);
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Failed to schedule interview"
                    );
                  } finally {
                    setReviewing(false);
                  }
                }}
                className="p-6 space-y-4"
              >
                {/* Interview Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Interview Date *
                  </label>
                  <input
                    type="date"
                    name="interview_date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={reviewing}
                  />
                </div>

                {/* Interview Time */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Interview Time *
                  </label>
                  <input
                    type="time"
                    name="interview_time"
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={reviewing}
                  />
                </div>

                {/* Interview Location */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Interview Location *
                  </label>
                  <input
                    type="text"
                    name="interview_location"
                    required
                    placeholder="e.g., US Embassy - Room 305"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={reviewing}
                  />
                </div>

                {/* Interview Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Preparation Notes (Optional)
                  </label>
                  <textarea
                    name="interview_notes"
                    rows={3}
                    placeholder="e.g., Bring original documents, arrive 30 minutes early..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={reviewing}
                  />
                </div>

                {/* Info Box */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-800">
                    📧 The candidate will receive an email with interview
                    details and preparation checklist.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowInterviewModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-all"
                    disabled={reviewing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={reviewing}
                  >
                    {reviewing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Scheduling...</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" />
                        <span>Schedule Interview</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
