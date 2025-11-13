"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Code,
  Target,
  Sparkles,
  Eye,
  Calendar,
  Shield,
  Activity,
  Clipboard,
  ClipboardCheck,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";

/* =============================
   Types
============================= */
interface TestCase { input: string; output: string }
interface Question {
  id: string;
  title: string;
  description: string;
  problemStatement: string;
  difficulty: "easy" | "medium" | "hard" | string;
  skillTags: string[];
  type: "coding" | "mcq" | string;
  canonicalSolution: string;
  testCases: any; // Changed from TestCase[] to any to handle different formats
  status: "draft" | "pending_review" | "approved" | string;
  aiGenerated?: boolean;
  createdBy?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

/* =============================
   Helpers
============================= */
const panel =
  "rounded-2xl border border-gray-200/60 bg-white shadow-[0_10px_35px_rgba(14,34,92,0.06)]";
const pill =
  "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide border";

const ScrollShadow: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={`relative ${className || ""}`}>
    <div className="pointer-events-none absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-white to-transparent z-10" />
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-white to-transparent z-10" />
    {children}
  </div>
);

/* =============================
   Pagination Component
============================= */
const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}> = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between mt-6 px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl border border-gray-200"
    >
      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-900">{startItem}</span> to{" "}
        <span className="font-semibold text-gray-900">{endItem}</span> of{" "}
        <span className="font-semibold text-gray-900">{totalItems}</span> questions
      </div>

      <div className="flex items-center gap-2">
        {/* First page */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4 text-gray-600" />
        </motion.button>

        {/* Previous */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </motion.button>

        {/* Page numbers */}
        {getPageNumbers().map((page, idx) => (
          <React.Fragment key={idx}>
            {page === "..." ? (
              <span className="px-3 py-2 text-gray-400">...</span>
            ) : (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPageChange(page as number)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  currentPage === page
                    ? "bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white shadow-md shadow-blue-200"
                    : "border border-gray-200 bg-white hover:bg-blue-50 text-gray-700"
                }`}
              >
                {page}
              </motion.button>
            )}
          </React.Fragment>
        ))}

        {/* Next */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </motion.button>

        {/* Last page */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4 text-gray-600" />
        </motion.button>
      </div>
    </motion.div>
  );
};

/* =============================
   Page
============================= */
const ReviewQueuePage: React.FC = () => {
  const { user, token } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Question | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // copy + solution fullscreen states
  const [copied, setCopied] = useState<"solution" | `tc-${number}` | null>(null);
  const [showFullSolution, setShowFullSolution] = useState(false);

  // test cases show-all toggle (default show 2)
  const [showAllTC, setShowAllTC] = useState(false);

  const authHeaders = (extra: HeadersInit = {}): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  });

  const requireAuth = () => {
    if (!token) {
      alert("You need to log in first.");
      return false;
    }
    return true;
  };

  // ✅ FIX: Helper to normalize testCases to array format
  const normalizeTestCases = (testCases: any): TestCase[] => {
    if (!testCases) return [];
    
    // If it's already an array, return it
    if (Array.isArray(testCases)) return testCases;
    
    // If it's a string, try to parse it as JSON
    if (typeof testCases === 'string') {
      try {
        const parsed = JSON.parse(testCases);
        if (Array.isArray(parsed)) return parsed;
        // If parsed object has examples
        if (parsed.examples && Array.isArray(parsed.examples)) {
          return parsed.examples;
        }
        return [];
      } catch {
        return [];
      }
    }
    
    // If it's an object with examples property
    if (testCases.examples && Array.isArray(testCases.examples)) {
      return testCases.examples;
    }
    
    // If it's an object with inputs and outputs arrays
    if (testCases.inputs && testCases.outputs && 
        Array.isArray(testCases.inputs) && Array.isArray(testCases.outputs)) {
      const result: TestCase[] = [];
      const maxLen = Math.min(testCases.inputs.length, testCases.outputs.length);
      for (let i = 0; i < maxLen; i++) {
        result.push({
          input: String(testCases.inputs[i]),
          output: String(testCases.outputs[i])
        });
      }
      return result;
    }
    
    // Default fallback
    return [];
  };

  const loadMyPending = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/questions?limit=9999", {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.questions)) {
        setQuestions(data.questions);
      } else {
        setQuestions([]);
      }
    } catch (e) {
      console.error(e);
      setQuestions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMyPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const currentUserId = user?.user_id ?? null;

  const minePending = useMemo(() => {
    const pending = new Set(["draft", "pending_review"]);
    return (questions || []).filter(
      (q) => q.createdBy === currentUserId && pending.has(q.status)
    );
  }, [questions, currentUserId]);

  // Pagination calculations
  const totalPages = Math.ceil(minePending.length / itemsPerPage);
  const paginatedQuestions = minePending.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when questions change
  useEffect(() => {
    setCurrentPage(1);
  }, [minePending.length]);

  const stats = useMemo(
    () => ({
      total: minePending.length,
      ai: minePending.filter((q) => q.aiGenerated || (q.source && q.source.startsWith("ai"))).length,
      manual: minePending.filter((q) => !q.aiGenerated && !(q.source && q.source.startsWith("ai"))).length,
    }),
    [minePending]
  );

  const onCopy = async (text: string, key: "solution" | `tc-${number}`) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  };

  const approve = async (id: string) => {
    if (!requireAuth()) return;
    try {
      const res = await fetch(`http://localhost:5000/api/questions/${id}/approve`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        setSelected(null);
      } else {
        alert(data.error || "Failed to approve");
      }
    } catch {
      alert("Network error");
    }
  };

  const reject = async (id: string) => {
    if (!requireAuth()) return;
    try {
      const res = await fetch(`http://localhost:5000/api/questions/${id}/reject`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        setSelected(null);
      } else {
        alert(data.error || "Failed to reject");
      }
    } catch {
      alert("Network error");
    }
  };

  // reset view-only states when switching selection
  useEffect(() => {
    setShowFullSolution(false);
    setShowAllTC(false);
  }, [selected?.id]);

  // ✅ FIX: Normalize test cases when selected question changes
  const normalizedTestCases = useMemo(() => {
    if (!selected) return [];
    return normalizeTestCases(selected.testCases);
  }, [selected]);

  if (!token || !currentUserId) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F6FAFF]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`${panel} p-10 text-center max-w-lg`}
        >
          <motion.div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#1B73E8] to-[#0D47A1] flex items-center justify-center shadow-lg"
            animate={{ rotate: [0, 5, 0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-black text-[#0D2A5B]">Login required</h2>
          <p className="text-[#334b7a] mt-2">Please sign in to view your review queue.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6FAFF]">
      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #1B73E8 0%, #1557B0 100%);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #1557B0 0%, #0D47A1 100%);
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #1B73E8 #f1f5f9;
        }
      `}</style>

      {/* ====== HEADER ====== */}
      <div className="relative border-b border-gray-200/70 bg-white overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-20 -right-20 w-96 h-96 bg-[#1B73E8]/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 30, 0],
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-20 -left-20 w-96 h-96 bg-[#0D47A1]/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -30, 0],
            }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${panel} px-6 py-5`}
          >
            <div className="flex items-start gap-3">
              <motion.div
                className="w-12 h-12 bg-gradient-to-br from-[#1B73E8] to-[#0D47A1] rounded-xl flex items-center justify-center shadow-lg"
        
              >
                <Clock className="w-6 h-6 text-white" />
              </motion.div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0D2A5B]">
                  Review Queue
                </h1>
                <p className="text-sm md:text-[15px] text-[#2c477b]/80 mt-1 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Quality Control & Validation Center
                </p>
              </div>
              <motion.div
                className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <motion.div
                  className="w-2 h-2 bg-green-500 rounded-full"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-xs font-bold text-[#0D2A5B]">LIVE</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            {[
              {
                key: "pending",
                label: "My Pending",
                value: stats.total,
                icon: AlertTriangle,
                card: "bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-amber-300/40",
                badge: "bg-yellow-600",
              },
              {
                key: "ai",
                label: "AI in Queue",
                value: stats.ai,
                icon: Sparkles,
                card: "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-emerald-300/40",
                badge: "bg-emerald-600",
              },
              {
                key: "manual",
                label: "Manual in Queue",
                value: stats.manual,
                icon: FileText,
                card: "bg-gradient-to-br from-slate-500/20 to-slate-600/20 border-slate-300/40",
                badge: "bg-slate-700",
              },
            ].map((s, i) => (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className={`rounded-2xl border ${s.card} p-5 shadow-[0_10px_35px_rgba(14,34,92,0.06)] cursor-pointer`}
              >
                <div className="flex items-center justify-between">
                  <motion.div
                    className={`w-10 h-10 rounded-xl ${s.badge} text-white flex items-center justify-center shadow-lg`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <s.icon className="w-5 h-5" />
                  </motion.div>
                  <TrendingUp className="w-4 h-4 text-[#0D2A5B]/50" />
                </div>
                <motion.div
                  className="mt-3 text-3xl font-black text-[#0D2A5B]"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 + 0.2, type: "spring" }}
                >
                  {s.value}
                </motion.div>
                <div className="text-xs text-[#0D2A5B]/70 mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ====== MAIN ====== */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <motion.div
            className="flex items-center justify-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="relative">
              <motion.div
                className="w-20 h-20 border-4 border-blue-200 border-t-[#1B73E8] rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-8 h-8 text-[#1B73E8]" />
                </motion.div>
              </div>
            </div>
            <div className="ml-6">
              <motion.p
                className="text-gray-900 font-bold text-lg"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Analyzing Questions...
              </motion.p>
              <p className="text-gray-600 text-sm">Loading your review queue</p>
            </div>
          </motion.div>
        ) : minePending.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${panel} p-14 text-center`}
          >
            <motion.div
              className="w-24 h-24 bg-emerald-100 rounded-3xl border border-emerald-200 flex items-center justify-center mx-auto mb-4"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </motion.div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">All clear!</h3>
            <p className="text-gray-600">No questions pending review for your account.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ===== LIST ===== */}
            <div>
              <motion.div
                className="flex items-center justify-between mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h2 className="text-xl font-black text-[#0D2A5B] flex items-center gap-2">
                  {/* Enhanced Eye animation */}
                  <motion.div
                    className="relative w-6 h-6"
                    animate={{
                      scale: [1, 1.15, 1],
                      rotate: [0, -5, 5, 0],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Eye className="w-6 h-6 text-[#1B73E8] absolute" />
                    {/* Blinking effect */}
                    <motion.div
                      className="absolute inset-0"
                      animate={{ opacity: [0, 0.6, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Eye className="w-6 h-6 text-[#1B73E8]" />
                    </motion.div>
                    {/* Ripple effect */}
                    <motion.div
                      className="absolute inset-0"
                      animate={{
                        scale: [1, 1.5, 1.5],
                        opacity: [0.5, 0, 0],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Eye className="w-6 h-6 text-[#1B73E8]" />
                    </motion.div>
                  </motion.div>
                  My Pending Questions
                </h2>
                <motion.span
                  className="px-3 py-1 bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white rounded-full text-xs font-bold shadow-lg"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {minePending.length} items
                </motion.span>
              </motion.div>

              {/* Questions list */}
              <div className="space-y-4">
                {paginatedQuestions.map((q, idx) => {
                  const isAI = !!q.aiGenerated || (q.source && q.source.startsWith("ai"));
                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 20, x: -20 }}
                      animate={{ opacity: 1, y: 0, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ y: -5, x: 5, scale: 1.02 }}
                      onClick={() => setSelected(q)}
                      className={`${panel} p-6 cursor-pointer border-2 transition-all duration-300 ${
                        selected?.id === q.id
                          ? "border-[#1B73E8] shadow-xl shadow-blue-200/50"
                          : "border-transparent hover:border-blue-200 hover:shadow-lg"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <motion.span
                            whileHover={{ scale: 1.1 }}
                            className={`${pill} ${
                              q.difficulty === "easy"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : q.difficulty === "medium"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {q.difficulty.toUpperCase()}
                          </motion.span>
                          <motion.span
                            whileHover={{ scale: 1.1 }}
                            className={`${pill} ${
                              q.status === "pending_review"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {q.status.replace("_", " ").toUpperCase()}
                          </motion.span>
                          <motion.span
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className={`${pill} ${
                              isAI ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"
                            }`}
                            title={isAI ? "AI-generated" : "Manually created"}
                          >
                            {isAI ? (
                              <>
                                <Sparkles className="w-3 h-3" /> AI
                              </>
                            ) : (
                              <>
                                <FileText className="w-3 h-3" /> MANUAL
                              </>
                            )}
                          </motion.span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <motion.h3
                        className="text-[15.5px] font-extrabold text-[#142c52] leading-snug mb-1"
                        whileHover={{ x: 5 }}
                      >
                        {q.title}
                      </motion.h3>
                      <p className="text-sm text-[#2b3952]/80 line-clamp-2">{q.description}</p>

                      {q.skillTags?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {q.skillTags.slice(0, 3).map((tag, i) => (
                            <motion.span
                              key={tag}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              whileHover={{ scale: 1.1, y: -2 }}
                              className="px-2.5 py-1 bg-blue-50 text-[#1B73E8] rounded-lg text-[11px] font-medium border border-blue-100"
                            >
                              {tag}
                            </motion.span>
                          ))}
                          {q.skillTags.length > 3 && (
                            <motion.span
                              whileHover={{ scale: 1.1 }}
                              className="px-2 py-1 bg-gray-50 text-gray-600 rounded-lg text-[11px] font-medium border border-gray-200"
                            >
                              +{q.skillTags.length - 3}
                            </motion.span>
                          )}
                        </div>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={minePending.length}
                itemsPerPage={itemsPerPage}
              />
            </div>

            {/* ===== DETAILS ===== */}
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, x: 30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={`${panel} p-6 sticky top-6 max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar`}
                >
                  {/* Header */}
                  <motion.div
                    className="-m-6 mb-6 p-6 rounded-t-2xl bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] relative overflow-hidden"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                  >
                    {/* Animated particles */}
                    <div className="absolute inset-0 opacity-10">
                      {[...Array(15)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 bg-white rounded-full"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                          }}
                          animate={{
                            y: [0, -10, 0],
                            opacity: [0.3, 1, 0.3],
                          }}
                          transition={{
                            duration: 2 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                          }}
                        />
                      ))}
                    </div>

                    <div className="relative">
                      <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        <motion.div
                        
                        >
                          <Shield className="w-6 h-6" />
                        </motion.div>
                        Quality Review
                      </h2>
                      <p className="text-blue-100 text-sm mt-1">Detailed Question Analysis</p>
                    </div>
                  </motion.div>

                  {/* Problem Statement */}
                  <motion.div
                    className="mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <motion.div
                        className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <FileText className="w-5 h-5 text-[#1B73E8]" />
                      </motion.div>
                      <h3 className="font-bold text-gray-900">Problem Statement</h3>
                    </div>
                    <div className="rounded-xl p-4 border border-gray-200 bg-white">
                      <ScrollShadow className="max-h-72 overflow-auto custom-scrollbar">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                          {selected.problemStatement}
                        </p>
                      </ScrollShadow>
                    </div>
                  </motion.div>

                  {/* Canonical Solution */}
                  <motion.div
                    className="mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <motion.div
                          className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"
                          whileHover={{ rotate: 360, scale: 1.1 }}
                          transition={{ duration: 0.5 }}
                        >
                          <Code className="w-5 h-5 text-green-600" />
                        </motion.div>
                        <h3 className="font-bold text-gray-900">Canonical Solution</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopy(selected.canonicalSolution || "", "solution");
                          }}
                          className="inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"
                          title="Copy solution"
                        >
                          {copied === "solution" ? (
                            <>
                              <ClipboardCheck className="w-4 h-4" /> Copied
                            </>
                          ) : (
                            <>
                              <Clipboard className="w-4 h-4" /> Copy
                            </>
                          )}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowFullSolution(true)}
                          className="inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"
                          title="Show full"
                        >
                          <Maximize2 className="w-4 h-4" />
                          Show Full
                        </motion.button>
                      </div>
                    </div>

                    <div className="relative rounded-xl border border-gray-200 bg-[#0b1220]">
                      <ScrollShadow className="max-h-80 overflow-auto custom-scrollbar">
                        <pre className="text-[12px] leading-relaxed text-[#b5ffcb] whitespace-pre break-words px-4 py-4">
                          <code>{selected.canonicalSolution}</code>
                        </pre>
                      </ScrollShadow>
                    </div>
                  </motion.div>

                  {/* Test Cases - ✅ FIXED */}
                  <motion.div
                    className="mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <motion.div
                        className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Target className="w-5 h-5 text-purple-600" />
                      </motion.div>
                      <h3 className="font-bold text-gray-900">Test Cases</h3>
                      <motion.span
                        className="ml-auto px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {normalizedTestCases.length}
                      </motion.span>
                    </div>

                    {normalizedTestCases.length === 0 ? (
                      <div className="rounded-xl p-4 border border-gray-200 bg-gray-50 text-center">
                        <p className="text-sm text-gray-600">No test cases available</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {normalizedTestCases
                          .slice(0, showAllTC ? normalizedTestCases.length : 2)
                          .map((tc, i) => {
                            const key: `tc-${number}` = `tc-${i}`;
                            return (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ scale: 1.02, x: 5 }}
                                className="rounded-xl p-4 border border-gray-200 bg-white"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <motion.div
                                    className="w-6 h-6 bg-[#1B73E8] text-white rounded text-xs flex items-center justify-center font-bold"
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.5 }}
                                  >
                                    {i + 1}
                                  </motion.div>
                                  <span className="text-xs text-gray-600 font-bold">TEST CASE #{i + 1}</span>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => onCopy(`INPUT:\n${tc.input}\n\nOUTPUT:\n${tc.output}`, key)}
                                    className="ml-auto inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md bg-white border border-gray-200 hover:bg-gray-50"
                                  >
                                    {copied === key ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                                    {copied === key ? "Copied" : "Copy"}
                                  </motion.button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  <div className="bg-white rounded p-2 border border-gray-200">
                                    <span className="text-gray-500 font-bold block mb-1">INPUT:</span>
                                    <ScrollShadow className="max-h-40 overflow-auto custom-scrollbar">
                                      <pre className="text-gray-800 font-mono whitespace-pre-wrap break-words">{tc.input}</pre>
                                    </ScrollShadow>
                                  </div>
                                  <div className="bg-white rounded p-2 border border-gray-200">
                                    <span className="text-green-600 font-bold block mb-1">OUTPUT:</span>
                                    <ScrollShadow className="max-h-40 overflow-auto custom-scrollbar">
                                      <pre className="text-gray-800 font-mono whitespace-pre-wrap break-words">{tc.output}</pre>
                                    </ScrollShadow>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                      </div>
                    )}

                    {normalizedTestCases.length > 2 && (
                      <div className="mt-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowAllTC((v) => !v)}
                          className="text-xs font-semibold text-[#1B73E8] hover:underline"
                        >
                          {showAllTC ? "Show less" : `Show all (${normalizedTestCases.length})`}
                        </motion.button>
                      </div>
                    )}
                  </motion.div>

                  {/* Actions */}
                  <motion.div
                    className="flex gap-3 pt-4 border-t border-gray-200"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => approve(selected.id)}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Approve
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => reject(selected.id)}
                      className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200"
                    >
                      <XCircle className="w-5 h-5" />
                      Reject
                    </motion.button>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`${panel} p-10 text-center sticky top-6`}
                >
                  <motion.div
                    className="relative w-20 h-20 mx-auto mb-4"
                    animate={{
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Eye className="w-20 h-20 text-[#1B73E8] mx-auto" />
                    <motion.div
                      className="absolute inset-0 opacity-30"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Eye className="w-20 h-20 text-[#1B73E8]" />
                    </motion.div>
                  </motion.div>
                  <h3 className="text-xl font-bold text-[#0D2A5B] mb-1">Select a question</h3>
                  <p className="text-[#29406e] text-sm">Click an item from your list to review its details.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ===== Fullscreen Solution Modal ===== */}
      <AnimatePresence>
        {showFullSolution && selected && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-modal
            role="dialog"
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFullSolution(false)}
            />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 20 }}
              className="relative z-[61] w-[95vw] max-w-5xl max-h-[85vh] bg-[#0b1220] rounded-2xl border border-gray-700 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <div className="text-white/80 text-sm font-semibold flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Canonical Solution
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopy(selected.canonicalSolution || "", "solution");
                    }}
                    className="inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white"
                    title="Copy solution"
                  >
                    {copied === "solution" ? (
                      <>
                        <ClipboardCheck className="w-4 h-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-4 h-4" /> Copy
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowFullSolution(false)}
                    className="inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white"
                    title="Close"
                  >
                    <Minimize2 className="w-4 h-4" />
                    Close
                  </motion.button>
                </div>
              </div>

              <ScrollShadow className="flex-1 overflow-auto custom-scrollbar">
                <pre className="px-5 py-5 text-[13px] leading-relaxed text-[#b5ffcb] whitespace-pre break-words">
                  <code>{selected.canonicalSolution}</code>
                </pre>
              </ScrollShadow>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReviewQueuePage;