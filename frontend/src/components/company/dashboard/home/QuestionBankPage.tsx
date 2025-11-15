"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  Zap,
  TrendingUp,
  Award,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Grid3x3,
  List,
  X,
  SlidersHorizontal,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Network,
  Globe,
  Code2,
  Database,
  ExternalLink,
  ArrowRight,
  Link,
  Plus,
  Trash,
  Copy,
} from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";
import QuestionEditor from "./QuestionEditor";

/* =============================
   Types
============================= */
interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard" | string;
  skillTags: string[];
  status: "draft" | "pending_review" | "approved" | "rejected" | string;
  createdAt: string;
  createdBy?: string;
  aiGenerated?: boolean;
  source?: string;
  type?: "coding" | "mcq" | string;
  canonicalSolution?: string;
  testCases?: Array<{ input: string; output: string }>;
  views?: number;
  submissions?: number;
  successRate?: number;
}

/* =============================
   Little UI helpers
============================= */
const pill =
  "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide border";
const glassCard =
  "relative rounded-2xl border border-white/10 bg-white/60 backdrop-blur-md shadow-[0_10px_30px_rgba(13,31,77,0.10)]";
const panel =
  "rounded-2xl border border-gray-200/70 bg-white shadow-[0_10px_40px_rgba(16,24,40,0.06)]";

/* =============================
   Status control (single selector)
============================= */
const StatusSelect: React.FC<{
  value: "pending_review" | "approved" | "rejected";
  onChange: (next: "pending_review" | "approved" | "rejected") => void;
  compact?: boolean;
}> = ({ value, onChange, compact }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as any)}
      className={`${
        compact ? "px-2 py-1 text-xs rounded-md" : "px-3 py-2 rounded-lg text-sm"
      } border border-gray-200 bg-white font-medium text-gray-700 focus:ring-2 focus:ring-[#1B73E8] transition-all`}
      title="Change status"
    >
      <option value="pending_review">Pending</option>
      <option value="approved">Approved</option>
      <option value="rejected">Rejected</option>
    </select>
  );
};

/* =============================
   AI Generate Modal (single)
============================= */
const AiGenerateModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onGenerate: (payload: {
    topic: string;
    difficulty: "easy" | "medium" | "hard";
    type: "coding" | "mcq";
    tags: string[];
    testCaseCount: number;
  }) => Promise<void>;
  generating: boolean;
}> = ({ open, onClose, onGenerate, generating }) => {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [type, setType] = useState<"coding" | "mcq">("coding");
  const [tagsInput, setTagsInput] = useState("");
  const [testCaseCount, setTestCaseCount] = useState(4);

  const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 6);
  const canSubmit = topic.trim().length >= 2;

  useEffect(() => {
    if (!open) {
      setTopic("");
      setDifficulty("medium");
      setType("coding");
      setTagsInput("");
      setTestCaseCount(4);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-[#0D47A1]/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`${panel} relative w-full max-w-xl overflow-hidden`}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Generate AI Question</h3>
                <p className="text-xs text-blue-100">Guide the AI for better results.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-800">Topic *</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Java loops, React hooks, SQL joins…"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1B73E8] transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-800">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1B73E8] transition-all"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-800">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1B73E8] transition-all"
              >
                <option value="coding">Coding</option>
                <option value="mcq">Multiple Choice</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-800">Tags (comma separated)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., java, arrays, loops"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1B73E8] transition-all"
            />
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-50 text-[#1B73E8] border border-blue-100"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {type === "coding" && (
            <div>
              <label className="text-xs font-semibold text-gray-800">
                Number of sample test cases
              </label>
              <input
                type="number"
                min={2}
                max={8}
                value={testCaseCount}
                onChange={(e) => {
                  const n = Math.max(2, Math.min(8, +e.target.value || 2));
                  setTestCaseCount(n);
                }}
                className="mt-2 w-28 rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1B73E8] transition-all"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                AI will try to include at least this many examples.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-200/70 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit || generating}
            onClick={() => onGenerate({ topic, difficulty, type, tags, testCaseCount })}
            className={`px-5 py-2 rounded-xl font-semibold text-white transition-all ${
              generating || !canSubmit
                ? "bg-[#1B73E8]/60 cursor-not-allowed"
                : "bg-[#1B73E8] hover:bg-[#1557B0] shadow"
            }`}
          >
            {generating ? "Generating…" : "Generate"}
          </button>
        </div>

        {/* Inline generating overlay */}
        <AnimatePresence>
          {generating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center"
            >
              <div className="w-12 h-12 border-4 border-blue-200 border-t-[#1B73E8] rounded-full animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const AiBatchModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onGenerate: (payload: {
    topics: string[];
    difficulty: "easy" | "medium" | "hard";
    countPerTopic: number;
  }) => Promise<void>;
  generating: boolean;
}> = ({ open, onClose, onGenerate, generating }) => {
  const [topicsInput, setTopicsInput] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [countPerTopic, setCountPerTopic] = useState<number>(2);

  const topics = topicsInput
    .split(/[\n,]/g)
    .map(t => t.trim())
    .filter(Boolean);

  const canSubmit = topics.length > 0 && countPerTopic >= 1;

  useEffect(() => {
    if (!open) {
      setTopicsInput("");
      setDifficulty("medium");
      setCountPerTopic(2);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        className="absolute inset-0 bg-[#0D47A1]/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`${panel} relative w-full max-w-xl overflow-hidden`}
      >
        <div className="px-6 py-5 bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Generate Batch (AI)</h3>
                <p className="text-xs text-blue-100">Matches API: topics[], difficulty, countPerTopic</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-800">
              Topics * <span className="font-normal text-gray-500">(comma or newline separated)</span>
            </label>
            <textarea
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              placeholder={`python, javascript, java\n(or one per line)`}
              rows={4}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1B73E8] transition-all"
            />
            {topics.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {topics.map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-50 text-[#1B73E8] border border-blue-100">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-800">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1B73E8]"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-800">Count per topic</label>
              <input
                type="number"
                min={1}
                max={20}
                value={countPerTopic}
                onChange={(e) => setCountPerTopic(Math.max(1, Math.min(20, +e.target.value || 1)))}
                className="mt-2 w-28 rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#1B73E8]"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-200/70 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit || generating}
            onClick={() => onGenerate({ topics, difficulty, countPerTopic })}
            className={`px-5 py-2 rounded-xl font-semibold text-white transition-all ${
              generating || !canSubmit
                ? "bg-[#1B73E8]/60 cursor-not-allowed"
                : "bg-[#1B73E8] hover:bg-[#1557B0] shadow"
            }`}
          >
            {generating ? "Generating…" : "Generate Batch"}
          </button>
        </div>

        <AnimatePresence>
          {generating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center"
            >
              <div className="w-12 h-12 border-4 border-blue-200 border-t-[#1B73E8] rounded-full animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

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

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30">
      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-900">{startItem}</span> to{" "}
        <span className="font-semibold text-gray-900">{endItem}</span> of{" "}
        <span className="font-semibold text-gray-900">{totalItems}</span> questions
      </div>

      <div className="flex items-center gap-2">
        {/* First page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4 text-gray-600" />
        </button>

        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((page, idx) => (
          <React.Fragment key={idx}>
            {page === "..." ? (
              <span className="px-3 py-2 text-gray-400">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  currentPage === page
                    ? "bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white shadow-md shadow-blue-200"
                    : "border border-gray-200 bg-white hover:bg-blue-50 text-gray-700"
                }`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>

        {/* Last page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
};
/* =============================
   URL Scraper Modal
============================= */
const UrlScraperModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onScrape: (urls: string[], platform: 'stackoverflow' | 'leetcode') => Promise<void>;
  scraping: boolean;
}> = ({ open, onClose, onScrape, scraping }) => {
  const [urlsInput, setUrlsInput] = useState("");
  const [platform, setPlatform] = useState<'stackoverflow' | 'leetcode'>('stackoverflow');

  const urls = urlsInput
    .split('\n')
    .map(u => u.trim())
    .filter(u => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://')));

  const canSubmit = urls.length > 0;

  useEffect(() => {
    if (!open) {
      setUrlsInput("");
      setPlatform('stackoverflow');
    }
  }, [open]);

  const handleAddSampleUrls = () => {
    const samples = platform === 'stackoverflow' 
      ? `https://stackoverflow.com/questions/231767/what-does-the-yield-keyword-do-in-python
https://stackoverflow.com/questions/419163/what-does-if-name-main-do
https://stackoverflow.com/questions/394809/does-python-have-a-ternary-conditional-operator`
      : `https://leetcode.com/problems/two-sum/
https://leetcode.com/problems/add-two-numbers/
https://leetcode.com/problems/longest-substring-without-repeating-characters/`;
    
    setUrlsInput(samples);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        className="absolute inset-0 bg-[#0D47A1]/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`${panel} relative w-full max-w-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                <Link className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Import from Custom URLs</h3>
                <p className="text-xs text-pink-100">Paste specific question URLs to scrape</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Platform selector */}
          <div>
            <label className="text-xs font-semibold text-gray-800 mb-2 block">
              Select Platform
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlatform('stackoverflow')}
                className={`flex-1 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                  platform === 'stackoverflow'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Code2 className="w-4 h-4" />
                  StackOverflow
                </div>
              </button>
              <button
                onClick={() => setPlatform('leetcode')}
                className={`flex-1 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                  platform === 'leetcode'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Code2 className="w-4 h-4" />
                  LeetCode
                </div>
              </button>
            </div>
          </div>

          {/* URL Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-800">
                Question URLs <span className="text-gray-500 font-normal">(one per line)</span>
              </label>
              <button
                onClick={handleAddSampleUrls}
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Add Sample URLs
              </button>
            </div>
            <textarea
              value={urlsInput}
              onChange={(e) => setUrlsInput(e.target.value)}
              placeholder={`Paste ${platform === 'stackoverflow' ? 'StackOverflow' : 'LeetCode'} question URLs here...\n\nExample:\nhttps://${platform === 'stackoverflow' ? 'stackoverflow.com/questions/...' : 'leetcode.com/problems/...'}`}
              rows={8}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
            
            {urls.length > 0 && (
              <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-900">
                    {urls.length} valid URL{urls.length > 1 ? 's' : ''} detected
                  </span>
                </div>
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                  {urls.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-green-700">
                      <div className="w-1 h-1 bg-green-500 rounded-full" />
                      <span className="truncate">{url}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-2">
              <ExternalLink className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-[11px] text-blue-900 leading-relaxed">
                <span className="font-bold">How it works:</span> The system will visit each URL, 
                extract the question content, and save it to your database. Make sure the URLs 
                are publicly accessible.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-200/70 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit || scraping}
            onClick={() => onScrape(urls, platform)}
            className={`px-5 py-2 rounded-xl font-semibold text-white transition-all ${
              scraping || !canSubmit
                ? "bg-purple-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow"
            }`}
          >
            {scraping ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Scraping...
              </span>
            ) : (
              `Scrape ${urls.length} URL${urls.length > 1 ? 's' : ''}`
            )}
          </button>
        </div>

        {/* Loading overlay */}
        <AnimatePresence>
          {scraping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center"
            >
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

/* =============================
   Main Page
============================= */
const QuestionBankPage: React.FC = () => {
  const { user, token } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [batchOpen, setBatchOpen] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filters
  const [filters, setFilters] = useState<{
    difficulty: string;
    status: string;
    search: string;
    source: "all" | "ai" | "manual";
  }>({
    difficulty: "",
    status: "",
    search: "",
    source: "all",
  });

  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [showUrlScraper, setShowUrlScraper] = useState(false); // NOUVEAU
  const [urlScraperPlatform, setUrlScraperPlatform] = useState<'stackoverflow' | 'leetcode'>('stackoverflow'); // NOUVEAU

  const authHeaders = (extra: HeadersInit = {}): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  });

  const requireAuth = (): boolean => {
    if (!token) {
      alert("You need to log in first.");
      return false;
    }
    return true;
  };

  useEffect(() => {
    setCurrentUserId(user?.user_id ?? null);
  }, [user]);

const loadQuestions = async () => {
  setLoading(true);
  try {
    // ✅ Demander jusqu'à 1000 questions
    const response = await fetch("http://localhost:5000/api/questions?limit=1000&page=1", { 
      headers: authHeaders() 
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    let loadedQuestions = [];
    
    if (data?.success && data.questions) {
      loadedQuestions = data.questions;
    } else if (Array.isArray(data)) {
      loadedQuestions = data;
    } else if (data?.data && Array.isArray(data.data)) {
      loadedQuestions = data.data;
    }
    
    console.log('📥 Loaded questions:', loadedQuestions.length);
    setQuestions(loadedQuestions);
  } catch (error) {
    console.error("❌ Failed to load questions:", error);
    setQuestions([]);
  }
  setLoading(false);
};

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const mine = currentUserId ? questions.filter((q) => q.createdBy === currentUserId) : [];

  const myStats = {
    total: mine.length,
    approved: mine.filter((q) => q.status === "approved").length,
    pending: mine.filter((q) => q.status === "pending_review").length,
    draft: mine.filter((q) => q.status === "draft").length,
    rejected: mine.filter((q) => q.status === "rejected").length,
  };

  // Filter questions
  const filteredQuestions = mine.filter((q) => {
    const s = filters.search.trim().toLowerCase();
    const matchSearch =
      !s || q.title.toLowerCase().includes(s) || (q.skillTags && q.skillTags.some((tag) => tag.toLowerCase().includes(s)));
    const matchDifficulty = !filters.difficulty || q.difficulty === filters.difficulty;
    const matchStatus = !filters.status || q.status === filters.status;
    const isAI = !!q.aiGenerated || (q.source && q.source.startsWith("ai"));
    const matchSource = filters.source === "all" ? true : filters.source === "ai" ? isAI : !isAI;
    return matchSearch && matchDifficulty && matchStatus && matchSource;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

  const changeStatus = async (
    q: Question,
    next: "pending_review" | "approved" | "rejected"
  ) => {
    if (!requireAuth()) return;
    try {
      let ok = false;
      if (next === "approved") {
        const r = await fetch(`http://localhost:5000/api/questions/${q.id}/approve`, {
          method: "PATCH",
          headers: authHeaders(),
        });
        const data = await r.json();
        ok = !!data.success;
      } else if (next === "rejected") {
        const r = await fetch(`http://localhost:5000/api/questions/${q.id}/reject`, {
          method: "PATCH",
          headers: authHeaders(),
        });
        const data = await r.json();
        ok = !!data.success;
      } else {
        const r = await fetch(`http://localhost:5000/api/questions/${q.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ status: "pending_review" }),
        });
        const data = await r.json();
        ok = !!data.success;
      }

      if (ok) {
        setQuestions((prev) =>
          prev.map((it) => (it.id === q.id ? { ...it, status: next } : it))
        );
      } else {
        alert("Failed to update status");
      }
    } catch (e) {
      console.error(e);
      alert("Network error while updating status");
    }
  };

  const approveQuestion = async (questionId: string) => {
    if (!requireAuth()) return;
    try {
      const response = await fetch(`http://localhost:5000/api/questions/${questionId}/approve`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, status: "approved" } : q)));
      } else {
        alert("Failed to approve question: " + (data.error || data.details || "Unknown error"));
      }
    } catch (error) {
      console.error("Failed to approve question:", error);
      alert("Network error during approval.");
    }
  };

  const handleCreateQuestion = () => {
    if (!requireAuth()) return;
    setEditorMode("create");
    setEditingQuestion(null);
    setShowEditor(true);
  };

  const handleEditQuestion = (question: Question) => {
    if (!requireAuth()) return;
    setEditorMode("edit");
    setEditingQuestion(question);
    setShowEditor(true);
  };

const handleSaveQuestion = async (questionData: Partial<Question>) => {
  if (!requireAuth()) return;
  try {
    const url = editorMode === "create" 
      ? "http://localhost:5000/api/questions" 
      : `http://localhost:5000/api/questions/${editingQuestion?.id}`;
    const method = editorMode === "create" ? "POST" : "PUT";

    const response = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(questionData),
    });
    
    const data = await response.json();
    
    if (data.success) {
      setShowEditor(false);
      
      // Instead of reloading all questions, add the new one to state
      if (editorMode === "create" && data.question) {
        const newQuestion: Question = {
          ...data.question,
          createdBy: currentUserId, // Ensure createdBy is set
        };
        
        setQuestions(prev => [newQuestion, ...prev]);
      } else {
        // For edits, reload to ensure data consistency
        await loadQuestions();
      }
    } else {
      alert("Failed to save question: " + (data.error || "Unknown error"));
    }
  } catch (error) {
    console.error("Failed to save question:", error);
    alert("Network error while saving question.");
  }
};

  const handleAiGenerate = async (payload: {
    topic: string;
    difficulty: "easy" | "medium" | "hard";
    type: "coding" | "mcq";
    tags: string[];
    testCaseCount: number;
  }) => {
    if (!requireAuth()) return;
    setGenerating(true);
    try {
      const response = await fetch("http://localhost:5000/api/questions/generate", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          topic: payload.topic,
          difficulty: payload.difficulty,
          type: payload.type,
          skillTags: payload.tags,
          testCaseCount: payload.testCaseCount,
        }),
      });

      const data = await response.json();
      if (data.success && data.question) {
        const q: Question = {
          ...data.question,
          aiGenerated: true,
          source: data.question.source || "ai_gemini",
          type: payload.type || data.question.type,
          skillTags: payload.tags?.length
            ? Array.from(new Set([...(data.question.skillTags || []), ...payload.tags]))
            : data.question.skillTags || [],
        };
        setQuestions((prev) => [q, ...prev]);
        setAiModalOpen(false);
      } else {
        alert("Failed to generate question: " + (data.error || data.details || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Network error during AI generation.");
    }
    setGenerating(false);
  };

  const handleAiBatchGenerate = async (payload: {
    topics: string[];
    difficulty: "easy" | "medium" | "hard";
    countPerTopic: number;
  }) => {
    if (!requireAuth()) return;
    setBatchGenerating(true);
    try {
      const res = await fetch("http://localhost:5000/api/questions/generate-batch", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          topics: payload.topics,
          difficulty: payload.difficulty,
          countPerTopic: payload.countPerTopic,
        }),
      });

      const data = await res.json();

      if (data.success && Array.isArray(data.questions)) {
        const normalized = data.questions.map((q: any) => ({
          ...q,
          aiGenerated: true,
          source: q.source || "ai_gemini",
        })) as Question[];

        setQuestions((prev) => [...normalized, ...prev]);
        setBatchOpen(false);
      } else {
        throw new Error(data.error || data.details || "Invalid batch response");
      }
    } catch (e: any) {
      console.error(e);
      alert(`Batch generation failed: ${e.message || "Network/Server error"}`);
    }
    setBatchGenerating(false);
  };
  const handleImportScraped = async (source: string = 'stackoverflow', maxPages: number = 3) => {
  if (!requireAuth()) return;
  
  const confirm = window.confirm(
    `🌐 Import Real Programming Questions\n\n` +
    `This will scrape ${maxPages} page(s) from ${source.toUpperCase()}\n` +
    `Source: Real questions from professional developers\n\n` +
    `Continue?`
  );

  
  if (!confirm) return;
  
  setImporting(true);
  setShowSourceSelector(false);
  
  try {
    console.log(`🕷️ Starting import from ${source}...`);
    
    const response = await fetch('http://localhost:5000/api/questions/import-scraped', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        source: source,
        max_pages: maxPages
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(
        `✅ Successfully imported ${data.imported_count} real questions from ${source.toUpperCase()}!\n\n` +
        `📊 Import Statistics:\n` +
        `• Total scraped: ${data.total_scraped}\n` +
        `• Imported: ${data.imported_count}\n` +
        `• Skipped (duplicates): ${data.skipped_count}\n` +
        `• Errors: ${data.error_count}\n\n` +
        `All questions are now in "Pending Review" status.`
      );
      
      // Reload questions to show new imports
      await loadQuestions();
    } else {
      alert(`❌ Failed to import: ${data.error}\n\n${data.details || ''}`);
    }
  } catch (error) {
    console.error('Failed to import scraped questions:', error);
    alert('❌ Network error during import.\n\nMake sure:\n• Backend is running on port 5000\n• Python AI service is running on port 8000');
  } finally {
    setImporting(false);
  }
};
const handleScrapeUrls = async (urls: string[], platform: 'stackoverflow' | 'leetcode') => {
  if (!requireAuth()) return;
  
  setImporting(true);
  setShowUrlScraper(false);
  
  try {
    console.log(`🔗 Scraping ${urls.length} URLs from ${platform}...`);
    
    const response = await fetch('http://localhost:5000/api/questions/scrape', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        urls: urls,
        platform: platform
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(
        `✅ Successfully scraped ${data.scrapingResult.successfullySaved} questions!\n\n` +
        `📊 Scraping Statistics:\n` +
        `• Total URLs: ${data.scrapingResult.totalUrls}\n` +
        `• Successfully scraped: ${data.scrapingResult.successfullyScraped}\n` +
        `• Saved to database: ${data.scrapingResult.successfullySaved}\n` +
        `• Errors: ${data.scrapingResult.savingErrors}\n\n` +
        `All questions are now in "Pending Review" status.`
      );
      
      // Reload questions
      await loadQuestions();
    } else {
      alert(`❌ Failed to scrape: ${data.error}\n\n${data.details || ''}`);
    }
  } catch (error) {
    console.error('Failed to scrape URLs:', error);
    alert('❌ Network error during scraping.');
  } finally {
    setImporting(false);
  }
};

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#F6FAFF_0%,#EEF4FF_100%)]">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -right-10 h-64 w-64 rounded-full bg-[#1B73E8]/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 h-72 w-72 rounded-full bg-[#0D47A1]/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-10 pb-6">
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className={`${glassCard} px-6 py-5`}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#1B73E8] to-[#0D47A1] rounded-xl flex items-center justify-center shadow-inner">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0D2A5B]">
                    Question Bank
                  </h1>
                  <p className="text-sm md:text-[15px] text-[#2c477b]/80 mt-1">
                    Build & curate assessments — manually or with AI assistance.
                    {user?.full_name ? (
                      <span className="ml-1 text-[#1B73E8] font-semibold">
                        Welcome, {user.full_name.split(" ")[0]}!
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
              {[
                { label: "My Total", value: myStats.total, icon: FileText, accent: "from-[#1B73E8] to-[#1557B0]" },
                { label: "My Approved", value: myStats.approved, icon: CheckCircle2, accent: "from-green-500 to-emerald-600" },
                { label: "My Pending", value: myStats.pending, icon: Clock, accent: "from-yellow-400 to-amber-500" },
                { label: "My Draft", value: myStats.draft, icon: Edit, accent: "from-slate-400 to-slate-500" },
                { label: "My Rejected", value: myStats.rejected, icon: XCircle, accent: "from-rose-500 to-rose-600" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className={`${glassCard} p-5`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.accent} text-white flex items-center justify-center shadow-inner`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <TrendingUp className="w-4 h-4 text-[#0D2A5B]/50" />
                  </div>
                  <div className="mt-3 text-3xl font-black text-[#0D2A5B]">{s.value}</div>
                  <div className="text-xs text-[#0D2A5B]/70 mt-1">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Controls */}
        <div className={`${panel} p-5 mb-6 sticky top-4 z-10`}>
          <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search my questions by title or skills…"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-[#1B73E8] transition-all"
              />
            </div>

            {/* Right controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                    viewMode === "grid" ? "bg-white text-[#1B73E8] shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                    viewMode === "table" ? "bg-white text-[#1B73E8] shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <List className="w-4 h-4" />
                  Table
                </button>
              </div>

              {/* Items per page (for table view) */}
              {viewMode === "table" && (
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:ring-2 focus:ring-[#1B73E8] transition-all"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              )}

              {/* Difficulty */}
              <select
                value={filters.difficulty}
                onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value }))}
                className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:ring-2 focus:ring-[#1B73E8] transition-all"
              >
                <option value="">All Difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              {/* Status */}
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:ring-2 focus:ring-[#1B73E8] transition-all"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* Source segmented */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                {(["all", "ai", "manual"] as const).map((src) => (
                  <button
                    key={src}
                    onClick={() => setFilters((f) => ({ ...f, source: src }))}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.source === src ? "bg-white text-[#1B73E8] shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                    title={src === "all" ? "Show all" : src === "ai" ? "AI generated only" : "Manual only"}
                  >
                    {src === "ai" ? "AI" : src === "manual" ? "Manual" : "All"}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <span className="hidden xl:block h-6 w-px bg-gray-200" />

              {/* Buttons */}
              <motion.button
                onClick={handleCreateQuestion}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-[#1B73E8] hover:bg-[#1557B0] text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow"
              >
                Create
              </motion.button>

              <motion.button
                onClick={() => setAiModalOpen(true)}
                disabled={generating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    Generating…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    AI Generate
                  </span>
                )}
              </motion.button>

              <motion.button
                onClick={() => setBatchOpen(true)}
                disabled={batchGenerating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-[#1B73E8] to-[#1557B0] hover:to-[#0D47A1] text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {batchGenerating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    AI Batch
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Batch
                  </span>
                )}
              </motion.button>

              {/*  NOUVEAU: Import from Web Button */}
              <div className="relative">
                <motion.button
                  onClick={() => setShowSourceSelector(!showSourceSelector)}
                  disabled={importing}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {importing ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      Importing...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Network className="w-4 h-4" />
                      Import from Web
                    </span>
                  )}
                </motion.button>
 

              {/* NOUVEAU: Import from URL Button */}
              <motion.button
                onClick={() => setShowUrlScraper(true)}
                disabled={importing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r mx-2 from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {importing ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    Scraping...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    Import from URL
                  </span>
                )}
              </motion.button>

                {/* Source Selector Dropdown */}
                <AnimatePresence>
                  {showSourceSelector && !importing && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ type: "spring", duration: 0.3 }}
                      className="absolute top-full mt-3 right-0 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 p-5 z-50 min-w-[420px]"
                    >
                      {/* Header */}
                      <div className="mb-4 pb-4 border-b-2 border-gray-100">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                          <Globe className="w-5 h-5 text-orange-600" />
                          Select Platform
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          Import real programming questions from professional platforms
                        </p>
                      </div>

                      {/* StackOverflow Option */}
                      <motion.button
                        onClick={() => handleImportScraped('stackoverflow', 2)}
                        whileHover={{ scale: 1.02, x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-xl mb-3 border-2 border-orange-300 transition-all group shadow-sm hover:shadow-md"
                      >
                        {/* Icon */}
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Code2 className="w-7 h-7 text-white" />
                        </div>
                        
                        {/* Content */}
                        <div className="text-left flex-1">
                          <div className="font-black text-gray-900 text-base flex items-center gap-2">
                            StackOverflow
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold border border-green-200">
                              REAL DATA
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5 font-medium">
                            Real questions from 20M+ developers
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <Database className="w-3 h-3" />
                              ~15 questions
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              High quality
                            </span>
                          </div>
                        </div>
                        
                        {/* Arrow */}
                        <ArrowRight className="w-5 h-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
                      </motion.button>

                      {/* LeetCode Option (Coming Soon) */}
                      <motion.button
                        onClick={() => handleImportScraped('leetcode', 2)}
                        whileHover={{ scale: 1.02, x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-100 hover:from-yellow-100 hover:to-amber-200 rounded-xl mb-3 border-2 border-amber-300 transition-all group shadow-sm hover:shadow-md"
                      >
                        {/* Icon */}
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Code2 className="w-7 h-7 text-white" />
                        </div>
                        
                        {/* Content */}
                        <div className="text-left flex-1">
                          <div className="font-black text-gray-900 text-base flex items-center gap-2">
                            LeetCode
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold border border-green-200">
                              REAL DATA
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5 font-medium">
                            Algorithm challenges from LeetCode
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <Database className="w-3 h-3" />
                              ~20 questions
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              Algorithm focus
                            </span>
                          </div>
                        </div>
                        
                        {/* Arrow */}
                        <ArrowRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
                      </motion.button>

                      {/* Info Banner */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-start gap-2">
                          <ExternalLink className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-[11px] text-blue-900 leading-relaxed">
                            <span className="font-bold">Real Questions:</span> All scraped questions come from actual programming problems posted by real developers on these platforms. They will be imported with "Pending Review" status.
                          </div>
                        </div>
                      </div>

                      {/* Cancel Button */}
                      <button
                        onClick={() => setShowSourceSelector(false)}
                        className="w-full mt-4 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${panel} p-6 animate-pulse`}>
                <div className="h-2 w-24 rounded bg-gradient-to-r from-[#1B73E8] to-[#1557B0]" />
                <div className="mt-5 h-6 w-3/4 rounded bg-gray-200" />
                <div className="mt-3 h-3 w-5/6 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-2/3 rounded bg-gray-200" />
                <div className="mt-4 h-8 w-full rounded-xl bg-gray-100" />
              </div>
            ))}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {paginatedQuestions.map((question, idx) => {
                const isAI = !!question.aiGenerated || (question.source && question.source.startsWith("ai"));
                const statusPill =
                  question.status === "approved"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : question.status === "pending_review"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : question.status === "rejected"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-slate-50 text-slate-700 border-slate-200";

                return (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: idx * 0.03 }}
                    whileHover={{ y: -4 }}
                    className={`${panel} overflow-hidden group`}
                  >
                    <div
                      className={`h-1.5 ${
                        question.difficulty === "easy"
                          ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                          : question.difficulty === "medium"
                          ? "bg-gradient-to-r from-amber-400 to-amber-600"
                          : "bg-gradient-to-r from-rose-400 to-rose-600"
                      }`}
                    />

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className={`${pill} ${statusPill}`}>
                          {question.status === "approved" && <CheckCircle2 className="w-3 h-3" />}
                          {question.status === "pending_review" && <Clock className="w-3 h-3" />}
                          {question.status === "rejected" && <XCircle className="w-3 h-3" />}
                          {question.status.replace("_", " ").toUpperCase()}
                        </span>

                        <div className="flex items-center gap-2">
                          <span
                            className={`${pill} ${
                              question.difficulty === "easy"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : question.difficulty === "medium"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {question.difficulty.toUpperCase()}
                          </span>
                          <span
                            className={`${pill} ${
                              isAI
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-gray-50 text-gray-700 border-gray-200"
                            }`}
                          >
                            {isAI ? (
                              <>
                                <Zap className="w-3 h-3" /> AI
                              </>
                            ) : (
                              <>
                                <FileText className="w-3 h-3" /> MANUAL
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 mb-2">
                        {isAI ? (
                          <Zap className="mt-0.5 w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <FileText className="mt-0.5 w-4 h-4 text-gray-600 shrink-0" />
                        )}
                        <h3 className="text-[15.5px] font-extrabold text-[#142c52] leading-snug line-clamp-2 group-hover:text-[#1B73E8] transition-colors">
                          {question.title}
                        </h3>
                      </div>

                      {question.type && (
                        <div className="mb-3">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
                            {question.type.toUpperCase()}
                          </span>
                        </div>
                      )}

                      <p className="text-sm text-[#2b3952]/80 mb-4 line-clamp-2">{question.description}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {question.skillTags &&
                          question.skillTags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 bg-blue-50 text-[#1B73E8] rounded-lg text-[11px] font-medium border border-blue-100"
                            >
                              {tag}
                            </span>
                          ))}
                        {question.skillTags && question.skillTags.length > 4 && (
                          <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded-lg text-[11px] font-medium border border-gray-200">
                            +{question.skillTags.length - 4}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[13px] text-gray-600 border-t border-gray-100 pt-4">
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-4 h-4" />
                          <span>{question.views || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4" />
                          <span>{question.submissions || 0}</span>
                        </div>
                        {question.successRate != null && (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <Award className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-emerald-600">{question.successRate}%</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <StatusSelect
                          value={
                            (["pending_review", "approved", "rejected"].includes(question.status)
                              ? (question.status as any)
                              : "pending_review")
                          }
                          onChange={(next) => changeStatus(question, next)}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditQuestion(question);
                          }}
                          className="p-2 bg-blue-50 text-[#1B73E8] rounded-lg hover:bg-blue-100 transition-colors border border-blue-100"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors border border-rose-100"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          // ENHANCED TABLE DESIGN
          <div className={`${panel} overflow-hidden shadow-xl`}>
            {/* Enhanced Header with Gradient */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <List className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Question Database</h3>
                  <p className="text-xs text-blue-100">
                    Showing {paginatedQuestions.length} of {filteredQuestions.length} results
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-sm font-medium">{filteredQuestions.length} Total</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50/50 border-b-2 border-[#1B73E8]/20">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#1B73E8]" />
                        Question
                      </div>
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                      Skills
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-[#1B73E8]" />
                        Views
                      </div>
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <BarChart3 className="w-4 h-4 text-[#1B73E8]" />
                        Subs
                      </div>
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedQuestions.map((q, idx) => {
                    const isAI = !!q.aiGenerated || (q.source && q.source.startsWith("ai"));
                    const statusPill =
                      q.status === "approved"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : q.status === "pending_review"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : q.status === "rejected"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-slate-50 text-slate-700 border-slate-200";

                    return (
                      <motion.tr
                        key={q.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-200 group"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-1 h-full rounded-full ${
                                q.difficulty === "easy"
                                  ? "bg-emerald-500"
                                  : q.difficulty === "medium"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-gray-900 group-hover:text-[#1B73E8] cursor-pointer transition-colors">
                                {q.title}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 line-clamp-1">{q.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {q.skillTags && q.skillTags.length > 0 ? (
                              <>
                                {q.skillTags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 bg-blue-50 text-[#1B73E8] rounded text-[10px] font-medium border border-blue-100 whitespace-nowrap"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {q.skillTags.length > 2 && (
                                  <span className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded text-[10px] font-medium border border-gray-200 whitespace-nowrap">
                                    +{q.skillTags.length - 2}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm">
                            {(q.type || "coding").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`${pill} shadow-sm ${
                              isAI ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"
                            }`}
                          >
                            {isAI ? (
                              <>
                                <Zap className="w-3.5 h-3.5" /> AI
                              </>
                            ) : (
                              <>
                                <FileText className="w-3.5 h-3.5" /> MANUAL
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`${pill} shadow-sm font-bold ${
                              q.difficulty === "easy"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : q.difficulty === "medium"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {q.difficulty.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`${pill} shadow-sm ${statusPill}`}>
                            {q.status === "approved" && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {q.status === "pending_review" && <Clock className="w-3.5 h-3.5" />}
                            {q.status === "rejected" && <XCircle className="w-3.5 h-3.5" />}
                            {q.status.replace("_", " ").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-gray-700 font-semibold">
                            <Eye className="w-4 h-4 text-gray-400" />
                            {q.views || 0}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-gray-700 font-semibold">
                            <BarChart3 className="w-4 h-4 text-gray-400" />
                            {q.submissions || 0}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <StatusSelect
                              compact
                              value={
                                (["pending_review", "approved", "rejected"].includes(q.status)
                                  ? (q.status as any)
                                  : "pending_review")
                              }
                              onChange={(next) => changeStatus(q, next)}
                            />
                            <button
                              onClick={() => handleEditQuestion(q)}
                              className="p-2 bg-blue-50 text-[#1B73E8] rounded-lg hover:bg-blue-100 hover:shadow-md transition-all border border-blue-100"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 hover:shadow-md transition-all border border-rose-100"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Empty state */}
              {paginatedQuestions.length === 0 && (
                <div className="py-16 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border-2 border-blue-200 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <FileText className="w-12 h-12 text-[#1B73E8]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">No questions match your filters</h3>
                  <p className="text-gray-600 mb-6">Try changing source, difficulty, status or search.</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {paginatedQuestions.length > 0 && totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredQuestions.length}
                itemsPerPage={itemsPerPage}
              />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AiGenerateModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onGenerate={handleAiGenerate}
        generating={generating}
      />
      <AiBatchModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        onGenerate={handleAiBatchGenerate}
        generating={batchGenerating}
      />

      {showEditor && (
        <QuestionEditor
          question={editingQuestion || undefined}
          onSave={handleSaveQuestion}
          onCancel={() => setShowEditor(false)}
          mode={editorMode}
        />
      )}

      {/* FULL-PAGE generating overlay */}
      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-[#0D47A1]/10 backdrop-blur-[1px] flex items-center justify-center"
          >
            <div className={`${panel} px-6 py-5 flex items-center gap-3`}>
              <div className="w-8 h-8 border-4 border-blue-200 border-t-[#1B73E8] rounded-full animate-spin" />
              <div className="text-gray-700 font-semibold">Generating AI question…</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* FULL-PAGE importing overlay */}
      <AnimatePresence>
        {importing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-gradient-to-br from-orange-900/20 via-red-900/20 to-pink-900/20 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`${panel} px-8 py-6 max-w-md`}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                  <Network className="absolute inset-0 m-auto w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-gray-900 font-bold text-lg">Scraping Real Questions...</div>
                  <div className="text-gray-600 text-sm mt-1">
                    Collecting questions from StackOverflow
                  </div>
                </div>
              </div>
              
              <div className="mt-5 flex items-center gap-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                Making HTTP requests to platform...
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NOUVEAU: URL Scraper Modal */}
      <UrlScraperModal
        open={showUrlScraper}
        onClose={() => setShowUrlScraper(false)}
        onScrape={handleScrapeUrls}
        scraping={importing}
      />

      {showEditor && (
        <QuestionEditor
          question={editingQuestion || undefined}
          onSave={handleSaveQuestion}
          onCancel={() => setShowEditor(false)}
          mode={editorMode}
        />
      )}
    </div>
  );
};

export default QuestionBankPage;