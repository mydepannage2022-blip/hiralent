"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/src/context/AuthContext";
import { API_V1_BASE } from "@/src/lib/config/api";
import { Country, City } from "country-state-city";
import toast from "react-hot-toast";
import {
  Building2,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
  RefreshCw,
  AlertCircle,
  FileText,
  Home,
  Briefcase,
  ArrowRight,
  X,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/agency/ui/button";

interface Candidate {
  user_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
}

interface BaseStats {
  agencyType: "VISA" | "RELOCATION" | "INTEGRATION";
  agencyName: string;
  activeCases: number;
  completedCases: number;
  totalClients: number;
  revenue: number;
  pendingActions: number;
}

interface VisaStats extends BaseStats {
  totalVisaApplications: number;
  approvedVisas: number;
  pendingVisas: number;
  successRate: number;
  embassySubmissions: number;
}

interface RelocationStats extends BaseStats {
  totalRelocationCases: number;
  housingCompleted: number;
  housingInProgress: number;
  leasesActive: number;
  propertiesFound: number;
}

interface IntegrationStats extends BaseStats {
  totalIntegrationCases: number;
  servicesCompleted: number;
  servicesInProgress: number;
  bankAccountsOpened: number;
  healthcareRegistrations: number;
}

type Stats = VisaStats | RelocationStats | IntegrationStats;

interface Activity {
  id: string;
  type: "new_case" | "completed" | "pending_document" | "message";
  title: string;
  description: string;
  timestamp: string;
  status: "info" | "success" | "warning";
}

type ViewMode = "dashboard" | "clients" | "reports";

export default function AgencyDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientQuery, setClientQuery] = useState(" ");
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & View States
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");

  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateResults, setCandidateResults] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [showCandidateDropdown, setShowCandidateDropdown] = useState(false);

  // New Case Form State
  const [newCaseForm, setNewCaseForm] = useState({
    candidate_id: "", // Store selected candidate ID
    serviceType: "",
    originCountry: "",
    destinationCountry: "",
    destinationCity: "",
    priorityLevel: "medium",
    estimatedCompletion: "",
    estimatedCost: "",
    notes: "",
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("authToken");

      const statsResponse = await fetch(
        `${API_V1_BASE}/agency/dashboard/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!statsResponse.ok) {
        throw new Error("Failed to fetch stats");
      }

      const statsData = await statsResponse.json();
      setStats(statsData.data);

      const activitiesResponse = await fetch(
        `${API_V1_BASE}/agency/dashboard/activities`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.data || []);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `${API_V1_BASE}/agency/clients`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setClients(data.data || []);
      }
    } catch (error) {
      console.error("Fetch clients error:", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (viewMode === "clients") {
      fetchClients();
    } else if (viewMode === "reports") {
      fetchAnalytics();
    }
  }, [viewMode]);

  // Debounced candidate search
  useEffect(() => {
    const searchCandidates = async () => {
      if (candidateSearch.trim().length < 2) {
        setCandidateResults([]);
        return;
      }

      try {
        setSearchingCandidates(true);
        const token = localStorage.getItem("authToken");

        const response = await fetch(
          `${API_V1_BASE}/agency/candidates/search?query=${encodeURIComponent(
            candidateSearch
          )}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setCandidateResults(data.data || []);
        }
      } catch (error) {
        console.error("Candidate search error:", error);
      } finally {
        setSearchingCandidates(false);
      }
    };

    const debounceTimer = setTimeout(searchCandidates, 300);
    return () => clearTimeout(debounceTimer);
  }, [candidateSearch]);

  // Handle candidate selection
  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setCandidateSearch(candidate.full_name);
    setShowCandidateDropdown(false);
    setNewCaseForm({
      ...newCaseForm,
      candidate_id: candidate.user_id,
    });
  };

  // Filter service types based on agency type
  const getServiceTypeOptions = () => {
    if (!stats) return [];

    const allServices = [
      { value: "visa_processing", label: "Visa Processing", types: ["VISA"] },
      {
        value: "full_relocation",
        label: "Full Relocation Package (Visa + Housing + Integration)",
        types: ["VISA"],
      },
    ];

    return allServices.filter((service) =>
      service.types.includes(stats.agencyType)
    );
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCandidate) {
      toast.error("Please select a candidate from the dropdown");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");

      console.log("🔵 Creating case with data:", {
        candidate_id: newCaseForm.candidate_id,
        serviceType: newCaseForm.serviceType,
        originCountry: newCaseForm.originCountry,
        destinationCountry: newCaseForm.destinationCountry,
        destinationCity: newCaseForm.destinationCity,
        priorityLevel: newCaseForm.priorityLevel,
        estimatedCompletion: newCaseForm.estimatedCompletion,
        estimatedCost: newCaseForm.estimatedCost
          ? parseFloat(newCaseForm.estimatedCost)
          : null,
        notes: newCaseForm.notes,
      });

      const response = await fetch(
        `${API_V1_BASE}/agency/cases`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidate_id: newCaseForm.candidate_id,
            serviceType: newCaseForm.serviceType,
            originCountry: newCaseForm.originCountry,
            destinationCountry: newCaseForm.destinationCountry,
            destinationCity: newCaseForm.destinationCity,
            priorityLevel: newCaseForm.priorityLevel,
            estimatedCompletion: newCaseForm.estimatedCompletion,
            estimatedCost: newCaseForm.estimatedCost
              ? parseFloat(newCaseForm.estimatedCost)
              : null,
            notes: newCaseForm.notes,
          }),
        }
      );

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      const data = await response.json();
      console.log("📦 Response data:", data);

      if (!response.ok) {
        console.error("❌ Backend error response:", data);
        throw new Error(data.message || "Failed to create case");
      }

      console.log("✅ Case created successfully!");

      toast.success(
        `Case created successfully! Case Number: ${data.data.case_number}`,
        {
          duration: 5000,
          position: "bottom-right",
        }
      );

      setShowNewCaseModal(false);

      // Reset form
      setNewCaseForm({
        candidate_id: "",
        serviceType: "",
        originCountry: "",
        destinationCountry: "",
        destinationCity: "",
        priorityLevel: "medium",
        estimatedCompletion: "",
        estimatedCost: "",
        notes: "",
      });

      // Refresh dashboard
      fetchDashboardData();
    } catch (error) {
      console.error("❌ Create case error:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error(
        error instanceof Error ? error.message : "Failed to create case",
        {
          duration: 5000,
          position: "bottom-right",
        }
      );
    }
  };

  const getStatCards = () => {
    if (!stats) return [];

    const baseCards = [
      {
        title: "Active Cases",
        value: stats.activeCases,
        icon: Users,
        color: "bg-blue-50",
        iconColor: "text-blue-700",
        accentColor: "bg-blue-600",
        trend: `${stats.activeCases} in progress`,
      },
      {
        title: "Completed Cases",
        value: stats.completedCases,
        icon: CheckCircle,
        color: "bg-slate-50",
        iconColor: "text-emerald-700",
        accentColor: "bg-emerald-500",
        trend: "All time",
      },
      {
        title: "Total Clients",
        value: stats.totalClients,
        icon: Building2,
        color: "bg-slate-50",
        iconColor: "text-slate-700",
        accentColor: "bg-slate-600",
        trend: "Unique clients",
      },
      {
        title: "Revenue (YTD)",
        value:
          stats.revenue > 0 ? `$${(stats.revenue / 1000).toFixed(1)}k` : "$0",
        icon: DollarSign,
        color: "bg-slate-50",
        iconColor: "text-blue-700",
        accentColor: "bg-blue-600",
        trend: "Year to date",
      },
      {
        title: "Pending Actions",
        value: stats.pendingActions,
        icon: Clock,
        color: "bg-amber-50",
        iconColor: "text-amber-700",
        accentColor: "bg-amber-500",
        trend: stats.pendingActions > 0 ? "Needs attention" : "All caught up",
      },
    ];

    if (stats.agencyType === "VISA") {
      const visaStats = stats as VisaStats;
      return [
        ...baseCards,
        {
          title: "Visa Applications",
          value: visaStats.totalVisaApplications,
          icon: FileText,
          color: "bg-slate-50",
          iconColor: "text-blue-700",
          accentColor: "bg-blue-600",
          trend: "Total processed",
        },
        {
          title: "Success Rate",
          value: `${visaStats.successRate}%`,
          icon: TrendingUp,
          color: "bg-slate-50",
          iconColor: "text-emerald-700",
          accentColor: "bg-emerald-500",
          trend: "Approval rate",
        },
      ];
    } else if (stats.agencyType === "RELOCATION") {
      const relocationStats = stats as RelocationStats;
      return [
        ...baseCards,
        {
          title: "Housing Completed",
          value: relocationStats.housingCompleted,
          icon: Home,
          color: "bg-slate-50",
          iconColor: "text-blue-700",
          accentColor: "bg-blue-600",
          trend: "Properties secured",
        },
        {
          title: "In Progress",
          value: relocationStats.housingInProgress,
          icon: Briefcase,
          color: "bg-slate-50",
          iconColor: "text-slate-700",
          accentColor: "bg-slate-600",
          trend: "Active searches",
        },
      ];
    } else if (stats.agencyType === "INTEGRATION") {
      const integrationStats = stats as IntegrationStats;
      return [
        ...baseCards,
        {
          title: "Bank Accounts",
          value: integrationStats.bankAccountsOpened,
          icon: DollarSign,
          color: "bg-slate-50",
          iconColor: "text-blue-700",
          accentColor: "bg-blue-600",
          trend: "Opened",
        },
        {
          title: "Healthcare",
          value: integrationStats.healthcareRegistrations,
          icon: CheckCircle,
          color: "bg-slate-50",
          iconColor: "text-slate-700",
          accentColor: "bg-slate-600",
          trend: "Registered",
        },
      ];
    }

    return baseCards;
  };

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "new_case":
        return { color: "bg-blue-600" };
      case "completed":
        return { color: "bg-emerald-600" };
      case "pending_document":
        return { color: "bg-amber-600" };
      case "message":
        return { color: "bg-slate-700" };
      default:
        return { color: "bg-slate-500" };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const statCards = getStatCards();
  const agencyTypeLabel =
    stats?.agencyType === "VISA"
      ? "Visa"
      : stats?.agencyType === "RELOCATION"
      ? "Relocation"
      : "Integration";

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `${API_V1_BASE}/agency/dashboard/analytics`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error("Fetch analytics error:", error);
    }
  };

  const normalizedClientQuery = clientQuery.trim().toLowerCase();
  const visibleClients = normalizedClientQuery
    ? clients.filter((client) => {
        const name = String(client?.name ?? "").toLowerCase();
        const email = String(client?.email ?? "").toLowerCase();
        const phone = String(client?.phone ?? "").toLowerCase();
        return (
          name.includes(normalizedClientQuery) ||
          email.includes(normalizedClientQuery) ||
          phone.includes(normalizedClientQuery)
        );
      })
    : clients;

  return (
    <div className="w-full space-y-6">

      {/* Segmented View Switch */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-full sm:w-auto p-1 rounded-xl bg-white border border-slate-200 shadow-sm">
          <button
            onClick={() => setViewMode("dashboard")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              viewMode === "dashboard"
                ? "bg-blue-600 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode("clients")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              viewMode === "clients"
                ? "bg-blue-600 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            Clients
          </button>
          <button
            onClick={() => setViewMode("reports")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              viewMode === "reports"
                ? "bg-blue-600 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            Reports
          </button>
        </div>

        <div className="text-sm text-slate-500">
          {viewMode === "dashboard"
            ? "Key metrics and activity"
            : viewMode === "clients"
            ? "Your client directory"
            : "Analytics and trends"}
        </div>
      </div>

      {/* Dashboard View */}
      {viewMode === "dashboard" && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 p-5"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${stat.accentColor}`} />

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                      {stat.value}
                    </p>
                  </div>

                  <div
                    className={`shrink-0 h-10 w-10 rounded-xl border border-slate-200 ${stat.color} flex items-center justify-center`}
                    aria-hidden="true"
                  >
                    <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500 truncate">{stat.trend}</p>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions (compact) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-slate-900">Quick actions</h2>
              <p className="text-sm text-slate-500 hidden sm:block">
                Shortcuts to common tasks
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {stats?.agencyType === "VISA" ? (
                <button
                  onClick={() => setShowNewCaseModal(true)}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-200 transition-colors px-4 py-3 text-left"
                >
                  <span className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">New case</span>
                    <span className="block text-xs text-slate-500 truncate">Create a new visa case</span>
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => router.push("/agency/dashboard/cases")}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-200 transition-colors px-4 py-3 text-left"
                >
                  <span className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">Cases</span>
                    <span className="block text-xs text-slate-500 truncate">View assigned cases</span>
                  </span>
                </button>
              )}

              <button
                onClick={() => setViewMode("clients")}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors px-4 py-3 text-left"
              >
                <span className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">Clients</span>
                  <span className="block text-xs text-slate-500 truncate">Manage your client list</span>
                </span>
              </button>

              <button
                onClick={() => router.push("/agency/dashboard/cases")}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors px-4 py-3 text-left"
              >
                <span className="h-9 w-9 rounded-lg bg-white border border-slate-200 text-slate-900 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">Assigned</span>
                  <span className="block text-xs text-slate-500 truncate">Go to case management</span>
                </span>
              </button>

              <button
                onClick={() => setViewMode("reports")}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-200 transition-colors px-4 py-3 text-left"
              >
                <span className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">Reports</span>
                  <span className="block text-xs text-slate-500 truncate">Performance analytics</span>
                </span>
              </button>
            </div>
          </div>

          {/* Recent Activity (full width) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Recent activity</h2>
              <button
                onClick={fetchDashboardData}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {activities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
                  <AlertCircle className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-base font-semibold text-slate-900">
                  No recent activity
                </p>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
                  Activity will appear here once you start managing cases.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white overflow-hidden">
                {activities.map((activity) => {
                  const { color } = getActivityIcon(activity.type);
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="shrink-0 flex items-start gap-3 mt-0.5">
                        <div className={`w-1.5 h-9 rounded-full ${color}`} aria-hidden="true" />
                        <div className={`w-2 h-2 rounded-full ${color} mt-3`} aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">
                          {activity.title}
                        </p>
                        <p className="text-sm text-slate-600">
                          {activity.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                            activity.status === "success"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : activity.status === "warning"
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {activity.status === "success"
                            ? "Completed"
                            : activity.status === "warning"
                            ? "Action needed"
                            : "Info"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Clients View */}
      {viewMode === "clients" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Clients</h2>
              <p className="text-sm text-slate-600 mt-1">
                Directory of your clients and their case activity.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  placeholder="Search clients…"
                  className="w-full sm:w-72 pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={fetchClients}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-800 font-semibold"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-slate-600" />
                Refresh
              </button>
            </div>
          </div>

          {clients.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-linear-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-lg font-semibold text-slate-700 mb-2">
                No clients yet
              </p>
              <p className="text-sm text-slate-500">
                Clients will appear here once you create cases
              </p>
            </div>
          ) : (
            <>
              {visibleClients.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-linear-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-lg font-semibold text-slate-700 mb-2">
                    No matches
                  </p>
                  <p className="text-sm text-slate-500">
                    Try searching by name, email, or phone
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  {visibleClients.map((client) => {
                    const initial = String(client?.name ?? "?")
                      .trim()
                      .charAt(0)
                      .toUpperCase();
                    const status = String(client?.status ?? "");
                    const isActive = status.toLowerCase() === "active";

                    return (
                      <div
                        key={client.id}
                        className="p-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                {client.name}
                              </p>
                              <p className="text-sm text-slate-600 truncate">
                                {client.email}
                              </p>
                              {client.phone && (
                                <p className="text-xs text-slate-500 truncate">
                                  {client.phone}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
                              Total {client.totalCases}
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                              Active {client.activeCases}
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              Completed {client.completedCases}
                            </span>
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  : "bg-slate-50 text-slate-700 border-slate-200"
                              }`}
                            >
                              {status || "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Reports View */}
      {viewMode === "reports" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Reports</h2>
              <p className="text-sm text-slate-600 mt-1">
                Snapshot of key performance indicators.
              </p>
            </div>
            <button
              onClick={fetchAnalytics}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-800 font-semibold"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
              Refresh
            </button>
          </div>

          {!analytics ? (
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading analytics...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Monthly revenue</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      ${analytics.revenue.monthly.toLocaleString()}
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      {analytics.revenue.trend === "up" ? "Up" : "Down"} {Math.abs(analytics.revenue.change).toFixed(1)}% vs last month
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl border border-slate-200 bg-blue-50 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 text-blue-700" />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Completion rate</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {analytics.completionRate.rate}%
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      {analytics.completionRate.difference}% {analytics.completionRate.comparison} industry average
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl border border-slate-200 bg-emerald-50 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-700" />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-600" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Processing time</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {analytics.processingTime.days} days
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      {analytics.processingTime.difference} days {analytics.processingTime.comparison} than average
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-slate-700" />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Satisfaction</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {analytics.satisfaction.rating}/5
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      Based on {analytics.satisfaction.reviewCount} review{analytics.satisfaction.reviewCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl border border-slate-200 bg-blue-50 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-blue-700" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Case Modal */}
      <AnimatePresence>
        {showNewCaseModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xl"
            >
              <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
                <h3 className="text-lg font-semibold text-slate-900">Create New Case</h3>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setShowNewCaseModal(false);
                    setSelectedCandidate(null);
                    setCandidateSearch("");
                    setCandidateResults([]);
                  }}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-[calc(90vh-84px)] overflow-y-auto bg-slate-50/40 px-6 py-6">
                <form onSubmit={handleCreateCase} className="space-y-6">
                  {/* Candidate Search with Autocomplete */}
                  <div className="pb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select Candidate *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
                      <input
                        type="text"
                        required
                        value={candidateSearch}
                        onChange={(e) => {
                          setCandidateSearch(e.target.value);
                          setShowCandidateDropdown(true);
                          if (e.target.value.trim() === "") {
                            setSelectedCandidate(null);
                            setNewCaseForm({
                              ...newCaseForm,
                              candidate_id: "",
                            });
                          }
                        }}
                        onFocus={() => setShowCandidateDropdown(true)}
                        className="w-full rounded-xl border border-slate-200/70 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Search by name or email..."
                        autoComplete="off"
                      />

                      {/* Loading indicator */}
                      {searchingCandidates && (
                        <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
                      )}

                      {/* Dropdown Results */}
                      {showCandidateDropdown &&
                        candidateSearch.length >= 2 &&
                        !selectedCandidate && (
                          <div className="absolute top-full left-0 right-0 mt-2 overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-xl max-h-60 overflow-y-auto z-20">
                            {candidateResults.length === 0 ? (
                              <div className="p-4 text-center text-slate-500 text-sm">
                                {searchingCandidates
                                  ? "Searching..."
                                  : "No candidates found"}
                              </div>
                            ) : (
                              candidateResults.map((candidate) => (
                                <button
                                  key={candidate.user_id}
                                  type="button"
                                  onClick={() =>
                                    handleCandidateSelect(candidate)
                                  }
                                  className="w-full text-left px-4 py-3 transition-colors border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                                >
                                  <p className="font-medium text-slate-800">
                                    {candidate.full_name}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    {candidate.email}
                                  </p>
                                  {candidate.phone_number && (
                                    <p className="text-xs text-slate-500">
                                      {candidate.phone_number}
                                    </p>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                    </div>

                    {/* Selected Candidate Display */}
                    {selectedCandidate && (
                      <div className="mt-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 ring-1 ring-emerald-200">
                              <CheckCircle className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {selectedCandidate.full_name}
                              </p>
                              <p className="text-sm text-slate-700">
                                {selectedCandidate.email}
                              </p>
                              {selectedCandidate.phone_number && (
                                <p className="text-xs text-slate-600">
                                  {selectedCandidate.phone_number}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedCandidate(null);
                              setCandidateSearch("");
                              setNewCaseForm({
                                ...newCaseForm,
                                candidate_id: "",
                              });
                            }}
                            aria-label="Clear selection"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 mt-2">
                      Type at least 2 characters to search for existing
                      candidates
                    </p>
                  </div>

                  {/* Service Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Service Type *
                    </label>
                    <select
                      required
                      value={newCaseForm.serviceType}
                      onChange={(e) =>
                        setNewCaseForm({
                          ...newCaseForm,
                          serviceType: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select service type</option>
                      {getServiceTypeOptions().map((service) => (
                        <option key={service.value} value={service.value}>
                          {service.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Origin & Destination Country */}
                  {/* Origin & Destination Country - DROPDOWNS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Origin Country *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
                        <select
                          required
                          value={newCaseForm.originCountry}
                          onChange={(e) =>
                            setNewCaseForm({
                              ...newCaseForm,
                              originCountry: e.target.value,
                            })
                          }
                          className="w-full appearance-none rounded-xl border border-slate-200/70 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="">Select origin country</option>
                          {Country.getAllCountries().map((country) => (
                            <option key={country.isoCode} value={country.name}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Destination Country *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
                        <select
                          required
                          value={newCaseForm.destinationCountry}
                          onChange={(e) => {
                            setNewCaseForm({
                              ...newCaseForm,
                              destinationCountry: e.target.value,
                              destinationCity: "", // Reset city when country changes
                            });
                          }}
                          className="w-full appearance-none rounded-xl border border-slate-200/70 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="">Select destination country</option>
                          {Country.getAllCountries().map((country) => (
                            <option key={country.isoCode} value={country.name}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Destination City & Priority */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Destination City
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
                        <select
                          value={newCaseForm.destinationCity}
                          onChange={(e) =>
                            setNewCaseForm({
                              ...newCaseForm,
                              destinationCity: e.target.value,
                            })
                          }
                          className="w-full appearance-none rounded-xl border border-slate-200/70 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                          disabled={!newCaseForm.destinationCountry}
                        >
                          <option value="">Select city (optional)</option>
                          {newCaseForm.destinationCountry &&
                            City.getCitiesOfCountry(
                              Country.getAllCountries().find(
                                (c) => c.name === newCaseForm.destinationCountry
                              )?.isoCode || ""
                            )?.map((city, index) => (
                              <option
                                key={`${city.name}-${city.stateCode || index}`}
                                value={city.name}
                              >
                                {city.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      {!newCaseForm.destinationCountry && (
                        <p className="text-xs text-slate-500 mt-1">
                          Select destination country first
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Priority Level *
                      </label>
                      <select
                        required
                        value={newCaseForm.priorityLevel}
                        onChange={(e) =>
                          setNewCaseForm({
                            ...newCaseForm,
                            priorityLevel: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  {/* Estimated Completion & Cost */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Estimated Completion
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="date"
                          value={newCaseForm.estimatedCompletion}
                          onChange={(e) =>
                            setNewCaseForm({
                              ...newCaseForm,
                              estimatedCompletion: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-200/70 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Estimated Cost ($)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newCaseForm.estimatedCost}
                          onChange={(e) =>
                            setNewCaseForm({
                              ...newCaseForm,
                              estimatedCost: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-200/70 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          placeholder="5000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={newCaseForm.notes}
                      onChange={(e) =>
                        setNewCaseForm({
                          ...newCaseForm,
                          notes: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      rows={3}
                      placeholder="Additional information..."
                    />
                  </div>

                  {/* Buttons */}
                  <div className="sticky bottom-0 -mb-6 border-t border-slate-200 bg-white/90 pt-4 pb-2 backdrop-blur">
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowNewCaseModal(false);
                          setSelectedCandidate(null);
                          setCandidateSearch("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="soft"
                        className="flex-1"
                        disabled={!selectedCandidate}
                      >
                        Create Case
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
