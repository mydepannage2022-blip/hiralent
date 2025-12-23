"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/src/context/AuthContext";
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
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & View States
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");

  // New Case Form State
  const [newCaseForm, setNewCaseForm] = useState({
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
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
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/dashboard/stats`,
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
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/dashboard/activities`,
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
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/clients`,
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

    try {
      const token = localStorage.getItem("authToken");

      console.log("🔵 Creating case with data:", {
        candidateEmail: newCaseForm.candidateEmail,
        candidateName: newCaseForm.candidateName,
        candidatePhone: newCaseForm.candidatePhone,
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
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidateEmail: newCaseForm.candidateEmail,
            candidateName: newCaseForm.candidateName,
            candidatePhone: newCaseForm.candidatePhone,
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
        candidateName: "",
        candidateEmail: "",
        candidatePhone: "",
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
        iconColor: "text-blue-600",
        accentColor: "bg-blue-500",
        trend: `${stats.activeCases} in progress`,
      },
      {
        title: "Completed Cases",
        value: stats.completedCases,
        icon: CheckCircle,
        color: "bg-green-50",
        iconColor: "text-green-600",
        accentColor: "bg-green-500",
        trend: "All time",
      },
      {
        title: "Total Clients",
        value: stats.totalClients,
        icon: Building2,
        color: "bg-purple-50",
        iconColor: "text-purple-600",
        accentColor: "bg-purple-500",
        trend: "Unique clients",
      },
      {
        title: "Revenue (YTD)",
        value:
          stats.revenue > 0 ? `$${(stats.revenue / 1000).toFixed(1)}k` : "$0",
        icon: DollarSign,
        color: "bg-emerald-50",
        iconColor: "text-emerald-600",
        accentColor: "bg-emerald-500",
        trend: "Year to date",
      },
      {
        title: "Pending Actions",
        value: stats.pendingActions,
        icon: Clock,
        color: "bg-orange-50",
        iconColor: "text-orange-600",
        accentColor: "bg-orange-500",
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
          color: "bg-indigo-50",
          iconColor: "text-indigo-600",
          accentColor: "bg-indigo-500",
          trend: "Total processed",
        },
        {
          title: "Success Rate",
          value: `${visaStats.successRate}%`,
          icon: TrendingUp,
          color: "bg-teal-50",
          iconColor: "text-teal-600",
          accentColor: "bg-teal-500",
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
          color: "bg-indigo-50",
          iconColor: "text-indigo-600",
          accentColor: "bg-indigo-500",
          trend: "Properties secured",
        },
        {
          title: "In Progress",
          value: relocationStats.housingInProgress,
          icon: Briefcase,
          color: "bg-cyan-50",
          iconColor: "text-cyan-600",
          accentColor: "bg-cyan-500",
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
          color: "bg-indigo-50",
          iconColor: "text-indigo-600",
          accentColor: "bg-indigo-500",
          trend: "Opened",
        },
        {
          title: "Healthcare",
          value: integrationStats.healthcareRegistrations,
          icon: CheckCircle,
          color: "bg-pink-50",
          iconColor: "text-pink-600",
          accentColor: "bg-pink-500",
          trend: "Registered",
        },
      ];
    }

    return baseCards;
  };

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "new_case":
        return { color: "bg-blue-500" };
      case "completed":
        return { color: "bg-green-500" };
      case "pending_document":
        return { color: "bg-orange-500" };
      case "message":
        return { color: "bg-purple-500" };
      default:
        return { color: "bg-gray-500" };
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
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/dashboard/analytics`,
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
  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8 bg-linear-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-800">
                Welcome Back, {stats?.agencyName || user?.full_name}! 👋
              </h1>
            </div>
            <p className="text-slate-600 mb-3">
              Here's what's happening with your agency today.
            </p>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium shadow-sm">
                {agencyTypeLabel} Agency
              </span>
              <span className="text-sm text-slate-500">•</span>
              <span className="text-sm text-slate-600">
                Last updated:{" "}
                {new Date().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
          <button
            onClick={fetchDashboardData}
            className="p-3 bg-white hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 hover:border-blue-300 shadow-sm"
            title="Refresh Dashboard"
          >
            <RefreshCw
              className={`w-5 h-5 text-slate-600 ${
                loading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      {viewMode !== "dashboard" && (
        <div className="mb-6">
          <button
            onClick={() => setViewMode("dashboard")}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to Dashboard
          </button>
        </div>
      )}

      {/* Dashboard View */}
      {viewMode === "dashboard" && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative overflow-hidden bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200"
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${stat.accentColor}`}
                ></div>

                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`p-3 ${stat.color} rounded-xl group-hover:scale-110 transition-transform duration-200`}
                  >
                    <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                </div>

                <p className="text-3xl font-bold text-slate-800 mb-2">
                  {stat.value}
                </p>
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  {stat.title}
                </p>
                <p className="text-xs text-slate-500">{stat.trend}</p>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ONLY SHOW FOR VISA AGENCIES */}
              {stats?.agencyType === "VISA" && (
                <button
                  onClick={() => setShowNewCaseModal(true)}
                  className="group relative overflow-hidden rounded-xl p-6 bg-linear-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex flex-col items-start gap-3">
                    <div className="p-3 bg-blue-500 rounded-xl group-hover:scale-110 transition-transform duration-200">
                      <Plus className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold text-slate-800 mb-1">
                        New Case
                      </p>
                      <p className="text-sm text-slate-600">
                        Create a new visa case
                      </p>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </button>
              )}

              {/* NEW: Show "Assigned Cases" for RELOCATION/INTEGRATION */}
              {(stats?.agencyType === "RELOCATION" ||
                stats?.agencyType === "INTEGRATION") && (
                <button
                  onClick={() => router.push("/agency/dashboard/cases")}
                  className="group relative overflow-hidden rounded-xl p-6 bg-linear-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex flex-col items-start gap-3">
                    <div className="p-3 bg-blue-500 rounded-xl group-hover:scale-110 transition-transform duration-200">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold text-slate-800 mb-1">
                        View Assigned Cases
                      </p>
                      <p className="text-sm text-slate-600">
                        See cases assigned to you
                      </p>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </button>
              )}

              <button
                onClick={() => {
                  setViewMode("clients");
                  fetchClients();
                }}
                className="group relative overflow-hidden rounded-xl p-6 bg-linear-to-br from-green-50 to-green-100 border-2 border-green-200 hover:border-green-400 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex flex-col items-start gap-3">
                  <div className="p-3 bg-green-500 rounded-xl group-hover:scale-110 transition-transform duration-200">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-slate-800 mb-1">
                      View Clients
                    </p>
                    <p className="text-sm text-slate-600">
                      Manage your client list
                    </p>
                  </div>
                </div>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setViewMode("reports");
                  fetchAnalytics();
                }}
                className="group relative overflow-hidden rounded-xl p-6 bg-linear-to-br from-purple-50 to-purple-100 border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex flex-col items-start gap-3">
                  <div className="p-3 bg-purple-500 rounded-xl group-hover:scale-110 transition-transform duration-200">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-slate-800 mb-1">
                      View Reports
                    </p>
                    <p className="text-sm text-slate-600">
                      Performance analytics
                    </p>
                  </div>
                </div>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">
                Recent Activity
              </h2>
              <button
                onClick={fetchDashboardData}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            {activities.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-linear-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-lg font-semibold text-slate-700 mb-2">
                  No recent activity
                </p>
                <p className="text-sm text-slate-500">
                  Activity will appear here once you start managing cases
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const { color } = getActivityIcon(activity.type);
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${color} mt-2`}
                      ></div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">
                          {activity.title}
                        </p>
                        <p className="text-sm text-slate-600">
                          {activity.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatTimestamp(activity.timestamp)}
                        </p>
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Client List</h2>
            <button
              onClick={fetchClients}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </button>
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
            <div className="space-y-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-linear-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {client.name}
                      </p>
                      <p className="text-sm text-slate-600">{client.email}</p>
                      {client.phone && (
                        <p className="text-xs text-slate-500">{client.phone}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Total Cases</p>
                      <p className="font-bold text-slate-800">
                        {client.totalCases}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Active</p>
                      <p className="font-bold text-blue-600">
                        {client.activeCases}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Completed</p>
                      <p className="font-bold text-green-600">
                        {client.completedCases}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        client.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {client.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports View */}
      {viewMode === "reports" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">
              Performance Reports
            </h2>
            <button
              onClick={fetchAnalytics}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {!analytics ? (
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading analytics...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Monthly Revenue */}
              <div className="p-6 bg-linear-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <h3 className="font-bold text-slate-800 mb-2">
                  Monthly Revenue
                </h3>
                <p className="text-3xl font-bold text-blue-600 mb-2">
                  ${analytics.revenue.monthly.toLocaleString()}
                </p>
                <p className="text-sm text-slate-600">
                  {analytics.revenue.trend === "up" ? "↑" : "↓"}
                  {Math.abs(analytics.revenue.change).toFixed(1)}% from last
                  month
                </p>
              </div>

              {/* Completion Rate */}
              <div className="p-6 bg-linear-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                <h3 className="font-bold text-slate-800 mb-2">
                  Completion Rate
                </h3>
                <p className="text-3xl font-bold text-green-600 mb-2">
                  {analytics.completionRate.rate}%
                </p>
                <p className="text-sm text-slate-600">
                  {analytics.completionRate.difference}%{" "}
                  {analytics.completionRate.comparison} industry average
                </p>
              </div>

              {/* Avg Processing Time */}
              <div className="p-6 bg-linear-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                <h3 className="font-bold text-slate-800 mb-2">
                  Avg. Processing Time
                </h3>
                <p className="text-3xl font-bold text-purple-600 mb-2">
                  {analytics.processingTime.days} days
                </p>
                <p className="text-sm text-slate-600">
                  {analytics.processingTime.difference} days{" "}
                  {analytics.processingTime.comparison} than average
                </p>
              </div>

              {/* Client Satisfaction */}
              <div className="p-6 bg-linear-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <h3 className="font-bold text-slate-800 mb-2">
                  Client Satisfaction
                </h3>
                <p className="text-3xl font-bold text-orange-600 mb-2">
                  {analytics.satisfaction.rating}/5
                </p>
                <p className="text-sm text-slate-600">
                  Based on {analytics.satisfaction.reviewCount} review
                  {analytics.satisfaction.reviewCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Case Modal */}
      <AnimatePresence>
        {showNewCaseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800">
                  Create New Case
                </h3>
                <button
                  onClick={() => setShowNewCaseModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCase} className="p-6 space-y-6">
                {/* Candidate Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Candidate Name *
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={newCaseForm.candidateName}
                      onChange={(e) =>
                        setNewCaseForm({
                          ...newCaseForm,
                          candidateName: e.target.value,
                        })
                      }
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={newCaseForm.candidateEmail}
                        onChange={(e) =>
                          setNewCaseForm({
                            ...newCaseForm,
                            candidateEmail: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="tel"
                        value={newCaseForm.candidatePhone}
                        onChange={(e) =>
                          setNewCaseForm({
                            ...newCaseForm,
                            candidatePhone: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>
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
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
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
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
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
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
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
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      setNewCaseForm({ ...newCaseForm, notes: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Additional information..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowNewCaseModal(false)}
                    className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
                  >
                    Create Case
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
