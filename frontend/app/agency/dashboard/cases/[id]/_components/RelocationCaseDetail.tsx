"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_V1_BASE } from "@/src/lib/config/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Droplet,
  FileText,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Upload,
  User,
  Wifi,
  Zap,
} from "lucide-react";

import { Button } from "@/src/components/agency/ui/button";
import type { Case } from "./types";

type RelocationProps = {
  caseData: Case;
  caseId: string;
  token: string;
  onRefresh: () => void;
};

export default function RelocationCaseDetail({
  caseData,
  caseId,
  token,
  onRefresh,
}: RelocationProps) {
  const router = useRouter();

  const fieldClassName =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";

  type UtilityKey = "utility_water" | "utility_electricity" | "utility_internet";
  const formatUtilityStatus = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  const getUtilityBadgeClassName = (status: string) => {
    switch (status) {
      case "completed":
        return "border-emerald-200/70 bg-emerald-50 text-emerald-800";
      case "in_progress":
        return "border-amber-200/70 bg-amber-50 text-amber-800";
      case "pending":
      default:
        return "border-slate-200 bg-slate-50 text-slate-700";
    }
  };

  const getDisplayStatus = (c: Pick<Case, "status" | "statusForAgency">) =>
    c.statusForAgency ?? c.status;

  const displayStatus = useMemo(() => getDisplayStatus(caseData), [caseData]);
  const alreadyMarkedFromStatus = useMemo(() => {
    return (
      displayStatus === "ready_for_arrival" ||
      displayStatus === "integration_assigned" ||
      displayStatus === "integration_in_progress" ||
      displayStatus === "completed"
    );
  }, [displayStatus]);

  const [housingData, setHousingData] = useState({
    housing_type: "",
    housing_address: "",
    monthly_rent_mad: "",
    agency_fee_amount: "",
    lease_start_date: "",
    lease_end_date: "",
    housing_notes: "",
  });

  const [utilityStatus, setUtilityStatus] = useState({
    utility_water: "pending",
    utility_electricity: "pending",
    utility_internet: "pending",
  });

  const [arrivalData, setArrivalData] = useState({
    arrival_date: "",
    flight_number: "",
    airport_pickup_required: false,
    arrival_notes: "",
  });

  const [savingHousing, setSavingHousing] = useState(false);
  const [savingUtilities, setSavingUtilities] = useState(false);
  const [savingArrival, setSavingArrival] = useState(false);
  const [markingReadyForArrival, setMarkingReadyForArrival] = useState(false);
  const [markedReadyForArrival, setMarkedReadyForArrival] = useState(
    alreadyMarkedFromStatus
  );

  useEffect(() => {
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

    setMarkedReadyForArrival(alreadyMarkedFromStatus);
  }, [caseData, alreadyMarkedFromStatus]);

  const handleSaveHousing = async () => {
    try {
      setSavingHousing(true);

      const response = await fetch(
        `${API_V1_BASE}/agency/cases/${caseId}/housing`,
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
      onRefresh();
    } catch (err) {
      console.error("Save housing error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save housing details"
      );
    } finally {
      setSavingHousing(false);
    }
  };

  const handleUtilityChange = async (utility: string, status: string) => {
    try {
      setSavingUtilities(true);

      const updatedUtilities = {
        ...utilityStatus,
        [utility]: status,
      };

      const response = await fetch(
        `${API_V1_BASE}/agency/cases/${caseId}/utilities`,
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

      setUtilityStatus(updatedUtilities);
      toast.success("Utility status updated!");
      onRefresh();
    } catch (err) {
      console.error("Update utility error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update utility status"
      );
    } finally {
      setSavingUtilities(false);
    }
  };

  const handleSaveArrival = async () => {
    try {
      setSavingArrival(true);

      const response = await fetch(
        `${API_V1_BASE}/agency/cases/${caseId}/arrival`,
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
      onRefresh();
    } catch (err) {
      console.error("Save arrival error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save arrival details"
      );
    } finally {
      setSavingArrival(false);
    }
  };

  const calculateRelocationProgress = () => {
    const requiresMoveInDate = caseData.housing_type !== "temporary";

    const steps = [
      {
        id: 1,
        name: "Visa Approved",
        description: "Candidate ready for relocation",
        completed: caseData.embassy_submission?.status === "approved",
        icon: CheckCircle,
        color: "green" as const,
      },
      {
        id: 2,
        name: "Agency Assigned",
        description: "You've been selected",
        completed: true,
        icon: CheckCircle,
        color: "green" as const,
      },
      {
        id: 3,
        name: "Housing Secured",
        description: "Accommodation arranged",
        completed: !!(
          caseData.housing_type &&
          caseData.housing_address &&
          caseData.monthly_rent_mad &&
          (!requiresMoveInDate || caseData.lease_start_date)
        ),
        icon: caseData.housing_type ? CheckCircle : Clock,
        color: caseData.housing_type ? ("green" as const) : ("yellow" as const),
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
            : Clock,
        color:
          caseData.utility_water === "completed" &&
          caseData.utility_electricity === "completed" &&
          caseData.utility_internet === "completed"
            ? ("green" as const)
            : caseData.utility_water === "in_progress" ||
                caseData.utility_electricity === "in_progress" ||
                caseData.utility_internet === "in_progress"
              ? ("yellow" as const)
              : ("gray" as const),
      },
      {
        id: 5,
        name: "Ready for Arrival",
        description: "All preparations complete",
        completed: !!(caseData.arrival_date && caseData.flight_number),
        icon: caseData.arrival_date ? CheckCircle : Clock,
        color: caseData.arrival_date ? ("green" as const) : ("gray" as const),
      },
    ];

    const completedSteps = steps.filter((step) => step.completed).length;
    const percentage = Math.round((completedSteps / steps.length) * 100);

    return { steps, percentage, completedSteps, totalSteps: steps.length };
  };

  const isReadyForArrival = () => {
    const requiresMoveInDate = caseData.housing_type !== "temporary";

    return !!(
      caseData.housing_type &&
      caseData.housing_address &&
      caseData.monthly_rent_mad &&
      (!requiresMoveInDate || caseData.lease_start_date) &&
      caseData.utility_water === "completed" &&
      caseData.utility_electricity === "completed" &&
      caseData.utility_internet === "completed" &&
      caseData.arrival_date &&
      caseData.flight_number
    );
  };

  const relocationProgress = calculateRelocationProgress();
  const canMarkReady = isReadyForArrival();
  const isMarkedReady = alreadyMarkedFromStatus || markedReadyForArrival;

  return (
    <div className="w-full">
      <div className="mb-6">
        <Button
          onClick={() => router.push("/agency/dashboard/cases")}
          variant="outline"
          size="sm"
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cases
        </Button>

        <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 rounded-xl">
                <FileText className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Case ID
                </p>
                <h1 className="text-lg font-bold text-slate-900 mb-1">
                  {caseData.case_number}
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-600">
                    Housing & Relocation Case
                  </p>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {displayStatus.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={onRefresh}
              title="Refresh case data"
              variant="outline"
              size="icon"
              className="group border-slate-200/70 hover:border-indigo-200/70 hover:bg-indigo-50"
            >
              <RefreshCw className="w-5 h-5 text-slate-600 group-hover:text-indigo-600" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="overflow-visible rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50/60 p-6">
              <h2 className="text-lg font-bold text-slate-900">Candidate</h2>
              <p className="mt-1 text-sm text-slate-600">
                Contact details and relocation destination.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/60 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Housing details</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Add the housing setup information for the candidate.
                </p>
              </div>
              <Button
                onClick={handleSaveHousing}
                disabled={savingHousing}
                variant="soft"
                size="sm"
              >
                {savingHousing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>

            <div className="p-6 space-y-4">
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
                  className={fieldClassName}
                >
                  <option value="">Select housing type</option>
                  <option value="temporary">Temporary (Hotel/Airbnb)</option>
                  <option value="1_year_lease">1-Year Lease</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>

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
                  className={fieldClassName}
                />
              </div>

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
                    className={fieldClassName}
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
                    className={fieldClassName}
                  />
                </div>
              </div>

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
                    className={fieldClassName}
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
                    className={fieldClassName}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Lease Contract (PDF)
                </label>
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center transition-colors hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-slate-500 mt-1">PDF up to 10MB</p>
                </div>
              </div>

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
                  className={fieldClassName}
                />
              </div>
            </div>
          </div>

          <div className="overflow-visible rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/60 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Utility setup</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Track the setup of essential services.
                </p>
              </div>
              {savingUtilities ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Saving
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  Update statuses
                </span>
              )}
            </div>

            <div className="p-6 grid grid-cols-1 gap-3">
              {(
                [
                  {
                    key: "utility_water" as const,
                    label: "Water",
                    description: "Water connection status",
                    Icon: Droplet,
                  },
                  {
                    key: "utility_electricity" as const,
                    label: "Electricity",
                    description: "Power connection status",
                    Icon: Zap,
                  },
                  {
                    key: "utility_internet" as const,
                    label: "Internet",
                    description: "Internet setup status",
                    Icon: Wifi,
                  },
                ] satisfies Array<{
                  key: UtilityKey;
                  label: string;
                  description: string;
                  Icon: typeof Droplet;
                }>
              ).map(({ key, label, description, Icon }) => {
                const status = utilityStatus[key];
                return (
                  <div
                    key={key}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                        <Icon className="h-5 w-5 text-slate-700" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {label}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:justify-end">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getUtilityBadgeClassName(
                          status
                        )}`}
                      >
                        {formatUtilityStatus(status)}
                      </span>

                      <details
                        className={`relative ${savingUtilities ? "pointer-events-none opacity-60" : ""}`}
                      >
                        <Button asChild variant="soft" size="sm">
                          <summary className="list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden">
                            Change
                          </summary>
                        </Button>

                        <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                          <div className="p-1">
                            {(
                              [
                                { value: "pending", label: "Pending" },
                                { value: "in_progress", label: "In Progress" },
                                { value: "completed", label: "Completed" },
                              ] as const
                            ).map((opt) => (
                              <Button
                                key={opt.value}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                disabled={savingUtilities || opt.value === status}
                                onClick={(e) => {
                                  const details = e.currentTarget.closest(
                                    "details"
                                  ) as HTMLDetailsElement | null;
                                  if (details) details.open = false;
                                  handleUtilityChange(key, opt.value);
                                }}
                              >
                                {opt.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/60 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Travel & arrival</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Capture arrival details and pickup requirements.
                </p>
              </div>
              <Button
                onClick={handleSaveArrival}
                disabled={savingArrival}
                variant="soft"
                size="sm"
              >
                {savingArrival ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save arrival"
                )}
              </Button>
            </div>

            <div className="p-6 space-y-4">
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
                    className={fieldClassName}
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
                    className={fieldClassName}
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
                      className="h-4 w-4 text-blue-600"
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
                      className="h-4 w-4 text-blue-600"
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
                  className={fieldClassName}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50/60 p-6">
              <h3 className="text-lg font-bold text-slate-900">Quick actions</h3>
              <p className="mt-1 text-sm text-slate-600">Common workflow actions.</p>
            </div>

            <div className="p-6 space-y-3">
              {canMarkReady || isMarkedReady ? (
                <Button
                  onClick={async () => {
                    if (isMarkedReady || markingReadyForArrival) return;
                    try {
                      setMarkingReadyForArrival(true);
                      const response = await fetch(
                        `${API_V1_BASE}/agency/cases/${caseId}/ready-for-arrival`,
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
                      setMarkedReadyForArrival(true);
                      onRefresh();
                    } catch (err) {
                      toast.error("Failed to update status");
                    } finally {
                      setMarkingReadyForArrival(false);
                    }
                  }}
                  variant="soft"
                  className="w-full"
                  disabled={markingReadyForArrival || isMarkedReady}
                >
                  {markingReadyForArrival
                    ? "Marking..."
                    : isMarkedReady
                      ? "Already marked for arrival"
                      : "Mark Ready for Arrival"}
                </Button>
              ) : (
                <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-center text-sm font-semibold text-slate-500">
                  Complete all steps to mark ready
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50/60 p-6">
              <h3 className="text-lg font-bold text-slate-900">Progress</h3>
              <p className="mt-1 text-sm text-slate-600">
                A quick view of what’s done.
              </p>
            </div>

            <div className="p-6 space-y-3">
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
                  <div
                    key={step.id}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                      <IconComponent className={`h-5 w-5 ${iconColorClass}`} />
                    </span>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${textColorClass}`}>
                        {step.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {step.description}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        step.completed
                          ? "border-emerald-200/70 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {step.completed ? "Done" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-emerald-200/70 bg-linear-to-br from-emerald-50/70 to-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Completion</h3>
            <p className="mt-1 text-sm text-slate-600">
              {relocationProgress.completedSteps} of {relocationProgress.totalSteps} steps.
            </p>

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Overall</span>
                <span className="font-bold text-emerald-700">
                  {relocationProgress.percentage}%
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full rounded-full bg-emerald-200">
                <div
                  className="h-2.5 rounded-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${relocationProgress.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
