"use client";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/src/components/agency/ui/button";
import { API_V1_BASE } from "@/src/lib/config/api";
import {
  Briefcase,
  RefreshCw,
  AlertCircle,
  Search,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { motion } from "framer-motion";

interface Agency {
  agency_id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Document {
  document_id: string;
  document_type: string;
  file_name: string;
  status: string;
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
  created_at: string;
  agency: Agency;
  documents: Document[];
}

type FilterTab = "all" | "active" | "completed";

export default function CasesPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const toStatusKey = (status?: string) =>
    (status ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_V1_BASE}/candidates/cases`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch cases');
      }

      const data = await response.json();
      setCases(data.data || []);
      setFilteredCases(data.data || []);
    } catch (err) {
      console.error("Fetch cases error:", err);
      setError(err instanceof Error ? err.message : "Failed to load cases");
      toast.error("Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    let filtered = cases;

    if (activeTab === "active") {
      filtered = filtered.filter((c) => {
        const key = toStatusKey(c.status);
        return key !== "completed" && key !== "cancelled";
      });
    } else if (activeTab === "completed") {
      filtered = filtered.filter((c) => toStatusKey(c.status) === "completed");
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => {
        const route = `${c.origin_country} ${c.destination_country} ${c.destination_city ?? ""}`;
        return (
          c.case_number.toLowerCase().includes(q) ||
          c.service_type.toLowerCase().includes(q) ||
          c.agency?.name?.toLowerCase().includes(q) ||
          route.toLowerCase().includes(q)
        );
      });
    }

    setFilteredCases(filtered);
  }, [activeTab, cases, searchQuery]);

  const counts = useMemo(
    () => ({
      all: cases.length,
      active: cases.filter((c) => {
        const key = toStatusKey(c.status);
        return key !== "completed" && key !== "cancelled";
      }).length,
      completed: cases.filter((c) => toStatusKey(c.status) === "completed").length,
    }),
    [cases]
  );

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading cases...</p>
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
          <Button onClick={fetchCases} variant="soft">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header: search + filters */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by case number, agency name, or destination"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <Button
              onClick={fetchCases}
              variant="outline"
              className="h-11 w-full justify-center gap-2 lg:w-auto"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="inline-flex w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {([
              { key: "all", label: "All", count: counts.all },
              { key: "active", label: "Active", count: counts.active },
              { key: "completed", label: "Completed", count: counts.completed },
            ] as const).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                      : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-3">
            <p className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{filteredCases.length}</span> of{" "}
              <span className="font-semibold text-slate-900">{cases.length}</span> cases
            </p>
          </div>
        </div>
      </div>

      {filteredCases.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
            {searchQuery ? (
              <Search className="h-7 w-7 text-slate-400" />
            ) : (
              <Briefcase className="h-7 w-7 text-slate-400" />
            )}
          </div>

          <h3 className="mt-5 text-lg font-semibold text-slate-900">
            {searchQuery ? "No matches" : "No cases yet"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            {searchQuery
              ? "Try a different keyword or clear your search."
              : "Cases will appear here once they’re created or assigned by an agency."}
          </p>

          {searchQuery && (
            <div className="mt-6 flex items-center justify-center">
              <Button onClick={() => setSearchQuery("")} variant="outline">
                Clear search
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredCases.map((caseItem, index) => {
            const candidateName = user?.full_name || "—";
            const routeLabel = `${caseItem.origin_country} → ${caseItem.destination_country}`;
            const routeSubLabel = caseItem.destination_city || "—";

            return (
              <motion.div
                key={caseItem.case_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium text-slate-500">Case</p>
                      <p className="text-xs font-semibold text-slate-800">
                        {caseItem.case_number}
                      </p>
                    </div>

                    <h3 className="mt-2 truncate text-base font-semibold text-slate-900">
                      {candidateName}
                    </h3>

                    <div className="mt-2 flex min-w-0 items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {routeLabel}
                        </p>
                        <p className="truncate text-xs text-slate-600">
                          {routeSubLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Button
                      onClick={() =>
                        router.push(
                          `/candidate/dashboard/cases/${caseItem.case_id}`
                        )
                      }
                      variant="soft"
                      size="md"
                      className="gap-2"
                      title="View Details"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}