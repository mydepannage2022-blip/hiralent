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
  Link as LinkIcon,
  Plus,
  Trash,
  Copy,
  AlertTriangle,
  Shield,
  Lock,
  Filter,
  ChevronDown,
  Library,
  User,
  Menu,
} from "lucide-react";
import NextLink from "next/link";

import { useAuth } from "../../../../context/AuthContext";
import QuestionEditor from "../questionbank/QuestionEditor";

interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard" | string;
  skillTags: string[];
  status: "draft" | "pending" | "approved" | "rejected" | string;
  createdAt: string;
  createdBy?: string;
  aiGenerated?: boolean;
  source?: string;
  type?: "coding" | "mcq" | string;
  canonicalSolution?: string;
  testCases?: Array<{ input: string; output: string }>;
  options?: { A: string; B: string; C: string; D: string };
  correctAnswer?: string;
  explanation?: string;
  views?: number;
  submissions?: number;
  successRate?: number;
  vectorStored?: boolean;
  vectorId?: string;
}

const pill = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px]  tracking-wide border";
const panel = "rounded-sm border border-gray-200/70 bg-white shadow-sm";

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
        compact ? "px-1.5 py-0.5 text-[10px] rounded-sm" : "px-2.5 py-1.5 rounded-sm text-[11px]"
      } border border-gray-200 bg-white font-medium text-gray-700 focus:ring-2 focus:ring-[#1B73E8] transition-all`}
      title="Change status"
    >
      <option value="pending_review">Pending</option>
      <option value="approved">Approved</option>
      <option value="rejected">Rejected</option>
    </select>
  );
};

// AiGenerateModal (keep your original)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-[#0D47A1]/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`${panel} relative w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col`}
      >
        <div className={`px-4 py-3 ${
          type === "mcq" 
            ? "bg-gradient-to-r from-purple-600 via-pink-600 to-red-600" 
            : "bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1]"
        } text-white transition-all duration-300 flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-sm flex items-center justify-center">
                {type === "mcq" ? (
                  <FileText className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold">
                  Generate AI {type === "mcq" ? "MCQ" : "Coding"}
                </h3>
                <p className="text-[9px] text-blue-100">
                  {type === "mcq" ? "Multiple-choice question" : "Coding challenge"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-sm hover:bg-white/10 transition-colors" aria-label="Close">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 space-y-2.5 overflow-y-auto flex-1">
          <div>
            <label className="text-[10px]  text-gray-800">Topic *</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={type === "mcq" ? "e.g., accounting, marketing..." : "e.g., Java loops, React hooks..."}
              className="mt-1 w-full rounded-sm border border-gray-200 bg-white px-3 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[#1B73E8] transition-all"
            />
          </div>

          <div>
            <label className="text-[10px]  text-gray-800 mb-1 block">Question Type *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType("coding")}
                className={`px-3 py-2 rounded-sm border-2  text-[11px] transition-all ${
                  type === "coding"
                    ? "border-[#1B73E8] bg-blue-50 text-[#1B73E8] shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <Code2 className="w-4 h-4" />
                  <span>Coding</span>
                </div>
              </button>
              <button
                onClick={() => setType("mcq")}
                className={`px-3 py-2 rounded-sm border-2  text-[11px] transition-all ${
                  type === "mcq"
                    ? "border-purple-600 bg-purple-50 text-purple-700 shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <FileText className="w-4 h-4" />
                  <span>MCQ</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px]  text-gray-800">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="mt-1 w-full rounded-sm border border-gray-200 bg-white px-3 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[#1B73E8] transition-all"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="text-[10px]  text-gray-800">
              Tags {type === "mcq" && <span className="text-gray-500 font-normal">(optional)</span>}
            </label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={type === "mcq" ? "e.g., finance, business" : "e.g., java, arrays"}
              className="mt-1 w-full rounded-sm border border-gray-200 bg-white px-3 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[#1B73E8] transition-all"
            />
            {tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded text-[9px] font-medium bg-blue-50 text-[#1B73E8] border border-blue-100">#{t}</span>
                ))}
              </div>
            )}
          </div>

          {type === "coding" && (
            <div>
              <label className="text-[10px]  text-gray-800">Test cases</label>
              <input
                type="number"
                min={2}
                max={8}
                value={testCaseCount}
                onChange={(e) => setTestCaseCount(Math.max(2, Math.min(8, +e.target.value || 2)))}
                className="mt-1 w-20 rounded-sm border border-gray-200 bg-white px-3 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[#1B73E8] transition-all"
              />
              <p className="text-[9px] text-gray-500 mt-0.5">Number of sample test cases</p>
            </div>
          )}

          <div className={`p-2 rounded-sm border ${type === "mcq" ? "bg-purple-50 border-purple-200" : "bg-blue-50 border-blue-200"}`}>
            <div className="flex items-start gap-1.5">
              <Sparkles className={`w-3 h-3 mt-0.5 flex-shrink-0 ${type === "mcq" ? "text-purple-600" : "text-blue-600"}`} />
              <div className={`text-[9px] leading-relaxed ${type === "mcq" ? "text-purple-900" : "text-blue-900"}`}>
                <span className="font-bold">AI-Powered:</span> {type === "mcq" ? "MCQ with 4 options & correct answer" : "Complete challenge with test cases"}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-2.5 bg-gray-50/80 border-t border-gray-200/70 flex items-center justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-3 py-1.5 rounded-sm border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-[11px] transition-colors">Cancel</button>
          <button
            disabled={!canSubmit || generating}
            onClick={() => onGenerate({ topic, difficulty, type, tags, testCaseCount })}
            className={`px-4 py-1.5 rounded-sm  text-[11px] text-white transition-all ${
              generating || !canSubmit
                ? `${type === "mcq" ? "bg-purple-400" : "bg-[#1B73E8]/60"} cursor-not-allowed`
                : type === "mcq"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow"
                : "bg-[#1B73E8] hover:bg-[#1557B0] shadow"
            }`}
          >
            {generating ? "Generating…" : `Generate`}
          </button>
        </div>

        <AnimatePresence>
          {generating && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
              <div className={`w-8 h-8 border-3 ${type === "mcq" ? "border-purple-200 border-t-purple-600" : "border-blue-200 border-t-[#1B73E8]"} rounded-full animate-spin`} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// AiBatchModal (keep your original)
const AiBatchModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onGenerate: (payload: {
    topics: string[];
    difficulty: "easy" | "medium" | "hard";
    countPerTopic: number;
    type: "coding" | "mcq";
  }) => Promise<void>;
  generating: boolean;
}> = ({ open, onClose, onGenerate, generating }) => {
  const [topicsInput, setTopicsInput] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [countPerTopic, setCountPerTopic] = useState<number>(2);
  const [type, setType] = useState<"coding" | "mcq">("coding");

  const topics = topicsInput.split(/[\n,]/g).map(t => t.trim()).filter(Boolean);
  const canSubmit = topics.length > 0 && countPerTopic >= 1;

  useEffect(() => {
    if (!open) {
      setTopicsInput("");
      setDifficulty("medium");
      setCountPerTopic(2);
      setType("coding");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-[#0D47A1]/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`${panel} relative w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col`}>
        <div className={`px-4 py-3 ${type === "mcq" ? "bg-gradient-to-r from-purple-600 via-pink-600 to-red-600" : "bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1]"} text-white transition-all duration-300 flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-sm flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
              <div><h3 className="text-sm font-bold">Generate Batch {type === "mcq" ? "MCQs" : "Coding"}</h3><p className="text-[9px] text-blue-100">Multiple topics, bulk generation</p></div>
            </div>
            <button onClick={onClose} className="p-1 rounded-sm hover:bg-white/10" aria-label="Close"><X className="w-4 h-4 text-white" /></button>
          </div>
        </div>

        <div className="px-4 py-3 space-y-2.5 overflow-y-auto flex-1">
          <div>
            <label className="text-[10px]  text-gray-800 mb-1 block">Question Type *</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setType("coding")} className={`px-3 py-1.5 rounded-sm border-2  text-[11px] transition-all ${type === "coding" ? "border-[#1B73E8] bg-blue-50 text-[#1B73E8]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
                <div className="flex items-center justify-center gap-1"><Code2 className="w-4 h-4" />Coding</div>
              </button>
              <button onClick={() => setType("mcq")} className={`px-3 py-1.5 rounded-sm border-2  text-[11px] transition-all ${type === "mcq" ? "border-purple-600 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
                <div className="flex items-center justify-center gap-1"><FileText className="w-4 h-4" />MCQ</div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px]  text-gray-800">Topics * <span className="font-normal text-gray-500">(comma or newline)</span></label>
            <textarea
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              placeholder={type === "mcq" ? `accounting, marketing, nursing` : `python, javascript, java`}
              rows={3}
              className="mt-1 w-full rounded-sm border border-gray-200 bg-white px-3 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[#1B73E8] transition-all"
            />
            {topics.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {topics.map((t) => (
                  <span key={t} className={`px-2 py-0.5 rounded text-[9px] font-medium border ${type === "mcq" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-[#1B73E8] border-blue-100"}`}>#{t}</span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px]  text-gray-800">Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className="mt-1 w-full rounded-sm border border-gray-200 bg-white px-3 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[#1B73E8]">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="text-[10px]  text-gray-800">Per topic</label>
              <input type="number" min={1} max={20} value={countPerTopic} onChange={(e) => setCountPerTopic(Math.max(1, Math.min(20, +e.target.value || 1)))} className="mt-1 w-full rounded-sm border border-gray-200 bg-white px-3 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-[#1B73E8]" />
            </div>
          </div>

          <div className={`p-2 rounded-sm border ${type === "mcq" ? "bg-purple-50 border-purple-200" : "bg-blue-50 border-blue-200"}`}>
            <div className="flex items-start gap-1.5">
              <Sparkles className={`w-3 h-3 mt-0.5 flex-shrink-0 ${type === "mcq" ? "text-purple-600" : "text-blue-600"}`} />
              <div className={`text-[9px] leading-relaxed ${type === "mcq" ? "text-purple-900" : "text-blue-900"}`}><span className="font-bold">Total:</span> {countPerTopic} × {topics.length} = {topics.length * countPerTopic} questions</div>
            </div>
          </div>
        </div>

        <div className="px-4 py-2.5 bg-gray-50/80 border-t border-gray-200/70 flex items-center justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-3 py-1.5 rounded-sm border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-[11px] transition-colors">Cancel</button>
          <button
            disabled={!canSubmit || generating}
            onClick={() => onGenerate({ topics, difficulty, countPerTopic, type })}
            className={`px-4 py-1.5 rounded-sm  text-[11px] text-white transition-all ${
              generating || !canSubmit
                ? `${type === "mcq" ? "bg-purple-400" : "bg-[#1B73E8]/60"} cursor-not-allowed`
                : type === "mcq"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow"
                : "bg-[#1B73E8] hover:bg-[#1557B0] shadow"
            }`}
          >
            {generating ? "Generating…" : `Generate ${topics.length * countPerTopic}`}
          </button>
        </div>

        <AnimatePresence>
          {generating && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
              <div className={`w-8 h-8 border-3 ${type === "mcq" ? "border-purple-200 border-t-purple-600" : "border-blue-200 border-t-[#1B73E8]"} rounded-full animate-spin`} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// Pagination (keep your original)
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
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
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
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30">
      <div className="text-[11px] text-gray-600">
        Showing <span className=" text-gray-900">{startItem}</span> to <span className=" text-gray-900">{endItem}</span> of <span className=" text-gray-900">{totalItems}</span> questions
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1} className="p-1.5 rounded-sm border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all" title="First page"><ChevronsLeft className="w-3.5 h-3.5 text-gray-600" /></button>
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded-sm border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all" title="Previous page"><ChevronLeft className="w-3.5 h-3.5 text-gray-600" /></button>
        {getPageNumbers().map((page, idx) => (
          <React.Fragment key={idx}>
            {page === "..." ? (
              <span className="px-2 py-1.5 text-gray-400 text-[11px]">...</span>
            ) : (
              <button onClick={() => onPageChange(page as number)} className={`px-2.5 py-1.5 rounded-sm text-[11px]  transition-all ${currentPage === page ? "bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white shadow-md shadow-blue-200" : "border border-gray-200 bg-white hover:bg-blue-50 text-gray-700"}`}>{page}</button>
            )}
          </React.Fragment>
        ))}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 rounded-sm border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all" title="Next page"><ChevronRight className="w-3.5 h-3.5 text-gray-600" /></button>
        <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded-sm border border-gray-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all" title="Last page"><ChevronsRight className="w-3.5 h-3.5 text-gray-600" /></button>
      </div>
    </div>
  );
};

// UrlScraperModal (keep your original)
const UrlScraperModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onScrape: (urls: string[], platform: "stackoverflow" | "leetcode" | "hackerrank") => Promise<void>;
  scraping: boolean;
  token?: string | null;
}> = ({ open, onClose, onScrape, scraping, token }) => {
  const [urlsInput, setUrlsInput] = useState("");
  const [platform, setPlatform] = useState<"stackoverflow" | "leetcode" | "hackerrank">("leetcode");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const urls = urlsInput.split("\n").map((u) => u.trim()).filter((u) => u.length > 0 && (u.startsWith("http://") || u.startsWith("https://")));
  const canSubmit = urls.length > 0;

  useEffect(() => {
    if (!open) {
      setUrlsInput("");
      setPlatform("leetcode");
      setTestResult(null);
      setTesting(false);
    }
  }, [open]);

  const handleAddSampleUrls = () => {
    const samples = platform === "stackoverflow"
      ? `https://stackoverflow.com/questions/231767/what-does-the-yield-keyword-do-in-python
https://stackoverflow.com/questions/419163/what-does-if-name-main-do
https://stackoverflow.com/questions/394809/does-python-have-a-ternary-conditional-operator`
      : platform === "leetcode"
      ? `https://leetcode.com/problems/two-sum/
https://leetcode.com/problems/add-two-numbers/
https://leetcode.com/problems/longest-substring-without-repeating-characters/
https://leetcode.com/problems/reverse-integer/
https://leetcode.com/problems/palindrome-number/`
      : `https://www.hackerrank.com/challenges/simple-array-sum/problem
https://www.hackerrank.com/challenges/compare-the-triplets/problem`;
    setUrlsInput(samples);
  };

  const handleTestFirstUrl = async () => {
    if (urls.length === 0 || platform !== "leetcode") return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch("http://localhost:5000/api/questions/scrape/leetcode/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: urls[0] }),
      });
      
      const data = await response.json();
      setTestResult(data);
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  if (!open) return null;

  const platformLabel = platform === "stackoverflow" ? "StackOverflow" : platform === "leetcode" ? "LeetCode" : "HackerRank";
  const exampleDomain = platform === "stackoverflow" ? "stackoverflow.com/questions/..." : platform === "leetcode" ? "leetcode.com/problems/..." : "hackerrank.com/challenges/...";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div className="absolute inset-0 bg-[#0D47A1]/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`${panel} relative w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="px-5 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shadow-inner"><LinkIcon className="w-4 h-4 text-white" /></div>
              <div><h3 className="text-base font-bold">Import from Custom URLs</h3><p className="text-[10px] text-pink-100">Paste specific question URLs to scrape</p></div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-white/10 transition-colors" aria-label="Close"><X className="w-4 h-4 text-white" /></button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
          <div>
            <label className="text-[11px]  text-gray-800 mb-1.5 block">Select Platform</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => { setPlatform("leetcode"); setTestResult(null); }} className={`flex-1 px-3 py-2.5 rounded-xl border-2  text-[11px] transition-all ${platform === "leetcode" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
                <div className="flex items-center justify-center gap-1.5"><Code2 className="w-4 h-4" />LeetCode</div>
              </button>
              <button onClick={() => { setPlatform("stackoverflow"); setTestResult(null); }} className={`flex-1 px-3 py-2.5 rounded-xl border-2  text-[11px] transition-all ${platform === "stackoverflow" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
                <div className="flex items-center justify-center gap-1.5"><Code2 className="w-4 h-4" />StackOverflow</div>
              </button>
              <button onClick={() => { setPlatform("hackerrank"); setTestResult(null); }} className={`flex-1 px-3 py-2.5 rounded-xl border-2  text-[11px] transition-all ${platform === "hackerrank" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
                <div className="flex items-center justify-center gap-1.5"><Code2 className="w-4 h-4" />HackerRank</div>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px]  text-gray-800">Question URLs <span className="text-gray-500 font-normal">(one per line)</span></label>
              <div className="flex items-center gap-2">
                {platform === "leetcode" && urls.length > 0 && (
                  <button
                    onClick={handleTestFirstUrl}
                    disabled={testing}
                    className="text-[10px]  text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-sm border border-blue-200 hover:bg-blue-100 transition-all disabled:opacity-50"
                  >
                    {testing ? (
                      <><span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />Testing...</>
                    ) : (
                      <><Eye className="w-3 h-3" />Test First URL</>
                    )}
                  </button>
                )}
                <button onClick={handleAddSampleUrls} className="text-[10px]  text-purple-600 hover:text-purple-700 flex items-center gap-1"><Copy className="w-3 h-3" />Add Sample URLs</button>
              </div>
            </div>
            <textarea
              value={urlsInput}
              onChange={(e) => setUrlsInput(e.target.value)}
              placeholder={`Paste ${platformLabel} question URLs here...\n\nExample:\nhttps://${exampleDomain}`}
              rows={6}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-[11px] font-mono outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
            {urls.length > 0 && (
              <div className="mt-2 p-2 bg-green-50 rounded-sm border border-green-200">
                <div className="flex items-center gap-1.5 text-[11px]"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /><span className=" text-green-900">{urls.length} valid URL{urls.length > 1 ? "s" : ""} detected</span></div>
                <div className="mt-1.5 max-h-24 overflow-y-auto space-y-0.5">
                  {urls.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[10px] text-green-700"><div className="w-1 h-1 bg-green-500 rounded-full" /><span className="truncate">{url}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Test Result Preview (LeetCode only) */}
          {platform === "leetcode" && testResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-xl border-2 ${testResult.success ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}
            >
              {testResult.success ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-green-800 text-[11px]">Test Successful!</span>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex items-start gap-2">
                      <span className=" text-gray-700 w-16">Title:</span>
                      <span className="text-gray-900 font-medium">{testResult.data?.title}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className=" text-gray-700 w-16">Difficulty:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                        testResult.data?.difficulty === "Easy" ? "bg-green-100 text-green-700" :
                        testResult.data?.difficulty === "Medium" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>{testResult.data?.difficulty}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className=" text-gray-700 w-16">Topics:</span>
                      <div className="flex flex-wrap gap-1">
                        {testResult.data?.topics?.slice(0, 5).map((topic: string) => (
                          <span key={topic} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-medium">{topic}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-green-600 mt-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{testResult.data?.description_length} characters ready to import</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-4 h-4" />
                  <span className="text-[11px]">Test Failed: {testResult.error || "Unknown error"}</span>
                </div>
              )}
            </motion.div>
          )}

          <div className="p-2 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-[10px] text-blue-900 leading-relaxed">
                <span className="font-bold">How it works:</span> {platform === "leetcode" 
                  ? "The system will fetch each LeetCode problem via GraphQL API, extract title, description, difficulty, topics, and test cases."
                  : "The system will visit each URL, extract the question content, and save it to your database."}
              </div>
            </div>
          </div>

          {platform === "leetcode" && (
            <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-[10px] text-amber-900 leading-relaxed">
                  <span className="font-bold">Note:</span> Only free problems can be scraped. Premium problems will be skipped. Rate limiting (1.5s/request) is applied automatically.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-200/70 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3.5 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-[11px] transition-colors">Cancel</button>
          <button
            disabled={!canSubmit || scraping}
            onClick={() => onScrape(urls, platform)}
            className={`px-4 py-1.5 rounded-xl  text-[11px] text-white transition-all ${scraping || !canSubmit ? "bg-purple-400 cursor-not-allowed" : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow"}`}
          >
            {scraping ? (
              <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />Scraping...</span>
            ) : (
              `Scrape ${urls.length} URL${urls.length > 1 ? "s" : ""}`
            )}
          </button>
        </div>

        <AnimatePresence>
          {scraping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// Vetting Confirmation Modal (keep your original)
const VettingConfirmModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  questionCount?: number;
}> = ({ open, onClose, onConfirm, questionCount = 1 }) => {
  if (!open) return null;

  const analysisItems = [
    { Icon: CheckCircle2, label: 'Code correctness', color: 'text-green-600' },
    { Icon: Shield, label: 'Test case validity', color: 'text-blue-600' },
    { Icon: Award, label: 'Solution quality', color: 'text-purple-600' },
    { Icon: Lock, label: 'Security issues', color: 'text-red-600' }
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-[#0D47A1]/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`${panel} relative w-full max-w-md overflow-hidden`}
      >
        <div className="px-5 py-4 bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold">AI Vetting Analysis</h3>
                <p className="text-[10px] text-blue-100">
                  {questionCount === 1 ? 'Single question' : `${questionCount} questions`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="mb-4">
            <p className="text-sm text-gray-700 font-medium mb-3">
              The AI will perform comprehensive analysis:
            </p>
            
            <div className="space-y-2">
              {analysisItems.map((item, i) => {
                const IconComponent = item.Icon;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2 p-2 rounded-sm bg-gray-50"
                  >
                    <IconComponent className={`w-4 h-4 ${item.color}`} />
                    <span className="text-[11px] font-medium text-gray-700">{item.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-sm border border-blue-200">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-[#1B73E8] mt-0.5 flex-shrink-0" />
              <div className="text-[10px] text-blue-900 leading-relaxed">
                <span className="font-bold">Processing time:</span> This may take a few seconds depending on code complexity.
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-sm border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-[11px]  transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-sm bg-gradient-to-r from-[#1B73E8] to-[#1557B0] hover:from-[#1557B0] hover:to-[#0D47A1] text-white text-[11px]  shadow transition-all"
          >
            Start Vetting
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Vetting Results Modal (keep your original)
const VettingResultsModal: React.FC<{
  open: boolean;
  onClose: () => void;
  result: any;
  isBatch?: boolean;
}> = ({ open, onClose, result, isBatch = false }) => {
  if (!open) return null;

  // Parse the actual backend response structure
  const vettingData = result?.vetting || {};
  
  // Get status from the actual backend response
  const status = vettingData.status || result.status || 'UNKNOWN';
  const isSuccess = status.toUpperCase() === 'APPROVED';
  
  // Get quality score (backend returns 0-1, convert to 0-100)
  const qualityScore = vettingData.quality_score || 0;
  const score = Math.round(qualityScore * 100);
  
  // Parse static validation results
  const staticValidation = vettingData.static_validation || {};
  const sandboxResult = vettingData.sandbox_result || {};
  
  // Get issues and recommendations
  const issues = staticValidation.issues || [];
  const recommendation = vettingData.recommendation || '';
  const hasErrors = vettingData.metadata?.has_errors || false;
  
  // Build check items from actual backend data
  const checkItems = [
    {
      key: 'static_validation',
      label: 'Static Validation',
      Icon: Code2,
      status: staticValidation.is_valid ? 'PASSED' : 'FAILED',
      message: staticValidation.is_valid ? `Quality: ${(staticValidation.quality_score * 100).toFixed(0)}%` : 'Validation failed'
    },
    {
      key: 'sandbox_test',
      label: 'Sandbox Execution',
      Icon: Zap,
      status: sandboxResult.all_passed ? 'PASSED' : 'FAILED',
      message: sandboxResult.all_passed 
        ? `All ${sandboxResult.test_results?.length || 0} tests passed (${(sandboxResult.execution_time * 1000).toFixed(2)}ms)`
        : `${sandboxResult.test_results?.filter((t: any) => !t.passed).length || 0} tests failed`
    },
    {
      key: 'test_cases',
      label: 'Test Cases',
      Icon: FileText,
      status: sandboxResult.all_passed ? 'PASSED' : 'FAILED',
      message: `${sandboxResult.test_results?.filter((t: any) => t.passed).length || 0}/${sandboxResult.test_results?.length || 0} passed`
    },
    {
      key: 'security',
      label: 'Security',
      Icon: Shield,
      status: hasErrors ? 'FAILED' : 'PASSED',
      message: hasErrors ? 'Security issues detected' : 'No security issues'
    }
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-[#0D47A1]/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`${panel} relative w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className={`px-5 py-4 ${isSuccess ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-rose-600'} text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                {isSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                ) : (
                  <XCircle className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold">
                  {isSuccess ? '✓ Vetting Passed' : '✗ Vetting Failed'}
                </h3>
                <p className="text-[10px] text-white/90">
                  {isBatch ? `${result?.total || 0} questions analyzed` : 'Single question analysis'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {isBatch ? (
            // Batch results
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-blue-50 rounded-sm border border-blue-200">
                  <div className="text-2xl text-[#1B73E8]">{result?.total || 0}</div>
                  <div className="text-[9px] text-gray-600 mt-1">Total</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-sm border border-green-200">
                  <div className="text-2xl text-green-600">{result?.vetted_count || 0}</div>
                  <div className="text-[9px] text-gray-600 mt-1">Passed</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-sm border border-red-200">
                  <div className="text-2xl text-red-600">{result?.errors?.length || 0}</div>
                  <div className="text-[9px] text-gray-600 mt-1">Failed</div>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-sm border border-blue-200">
                <p className="text-[11px] text-blue-900">
                  All questions have been updated with vetting results.
                </p>
              </div>
            </div>
          ) : (
            // Single question results
            <div className="space-y-3">
              {/* Overall Score */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-[#1B73E8]">
                <div>
                  <div className="text-[10px] text-gray-600  mb-1">Quality Score</div>
                  <div className="text-3xl text-[#1B73E8]">{score}/100</div>
                  <div className="text-[9px] text-gray-500 mt-1">
                    Difficulty: {vettingData.difficulty || 'N/A'}
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-sm ${isSuccess ? 'bg-green-500' : 'bg-red-500'} text-white text-sm shadow-lg`}>
                  {status}
                </div>
              </div>

              {/* Recommendation Badge */}
              {recommendation && (
                <div className={`p-3 rounded-sm border-2 ${
                  recommendation === 'APPROVE' 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-red-50 border-red-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <Award className={`w-4 h-4 ${recommendation === 'APPROVE' ? 'text-green-600' : 'text-red-600'}`} />
                    <span className={`text-xs ${recommendation === 'APPROVE' ? 'text-green-900' : 'text-red-900'}`}>
                      Recommendation: {recommendation}
                    </span>
                  </div>
                </div>
              )}

              {/* Individual Checks */}
              <div className="space-y-2">
                <div className="text-xs text-gray-700 mb-2">Detailed Analysis:</div>
                {checkItems.map((check) => {
                  const isPassed = check.status === 'PASSED';
                  const IconComponent = check.Icon;
                  
                  return (
                    <div key={check.key} className="p-2.5 rounded-sm bg-gray-50 border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <IconComponent className={`w-4 h-4 ${isPassed ? 'text-green-600' : 'text-red-600'}`} />
                          <span className="text-[11px] font-medium text-gray-700">{check.label}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                          isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {check.status}
                        </span>
                      </div>
                      
                      {/* Show check details */}
                      {check.message && (
                        <div className={`mt-1.5 text-[10px] rounded px-2 py-1 ${
                          isPassed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {check.message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Test Results Details (if failed) */}
              {!sandboxResult.all_passed && sandboxResult.test_results && (
                <div className="p-3 bg-red-50 rounded-sm border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-xs text-red-900">Failed Test Cases</span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {sandboxResult.test_results
                      .map((test: any, idx: number) => ({ test, idx }))
                      .filter(({ test }: any) => !test.passed)
                      .map(({ test, idx }: any) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-1 h-1 bg-red-600 rounded-full mt-1.5 flex-shrink-0" />
                          <span className="text-[10px] text-red-700 leading-relaxed">
                            Test {idx + 1}: {test.error_message || 'Failed'}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Issues List */}
              {issues.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-sm border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-amber-900">
                      {issues.length} Issue{issues.length > 1 ? 's' : ''} Found
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {issues.map((issue: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-1 h-1 bg-amber-600 rounded-full mt-1.5 flex-shrink-0" />
                        <span className="text-[10px] text-amber-900 leading-relaxed">
                          {typeof issue === 'string' ? issue : issue.message || 'Unknown issue'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata Info */}
              {vettingData.metadata && (
                <div className="p-3 bg-gray-50 rounded-sm border border-gray-200">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-gray-600">Cached:</span>
                      <span className="ml-1  text-gray-900">
                        {vettingData.metadata.cached ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Sandbox:</span>
                      <span className="ml-1  text-gray-900">
                        {vettingData.metadata.sandbox_tested ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  {vettingData.processed_at && (
                    <div className="mt-2 text-[9px] text-gray-500">
                      Processed: {new Date(vettingData.processed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Success Message */}
              {isSuccess && (
                <div className="p-3 bg-green-50 rounded-sm border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-[11px] text-green-900">
                      Question approved and ready for use!
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-sm ${
              isSuccess 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' 
                : 'bg-gradient-to-r from-[#1B73E8] to-[#1557B0] hover:from-[#1557B0] hover:to-[#0D47A1]'
            } text-white text-[11px]  shadow-md transition-all`}
          >
            {isSuccess ? '✓ Close' : 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ACTIONS MENU (from new design - keep this)
const ActionsMenu: React.FC<{
  onAiGenerate: () => void;
  onAiBatch: () => void;
  onImportWeb: () => void;
  onImportUrl: () => void;
  generating: boolean;
  importing: boolean;
}> = ({ onAiGenerate, onAiBatch, onImportWeb, onImportUrl, generating, importing }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1B73E8] to-[#1557B0] hover:from-[#1557B0] hover:to-[#0D47A1] text-white rounded-sm text-xs  shadow-md transition-all"
      >
        <Menu className="w-4 h-4" />
        Quick Actions
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50"
          >
            <button
              onClick={() => { onAiGenerate(); setIsOpen(false); }}
              disabled={generating}
              className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 disabled:opacity-50"
            >
              <div className="w-8 h-8 bg-emerald-100 rounded-sm flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-gray-900">AI Generate</div>
                <div className="text-[10px] text-gray-500">Single question</div>
              </div>
            </button>

            <button
              onClick={() => { onAiBatch(); setIsOpen(false); }}
              disabled={generating}
              className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 disabled:opacity-50"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#1B73E8]" />
              </div>
              <div>
                <div className="text-xs text-gray-900">AI Batch</div>
                <div className="text-[10px] text-gray-500">Multiple topics</div>
              </div>
            </button>

            <div className="my-1 border-t border-gray-100" />

            <button
              onClick={() => { onImportWeb(); setIsOpen(false); }}
              disabled={importing}
              className="w-full px-4 py-2.5 text-left hover:bg-orange-50 transition-colors flex items-center gap-3 disabled:opacity-50"
            >
              <div className="w-8 h-8 bg-orange-100 rounded-sm flex items-center justify-center">
                <Network className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <div className="text-xs text-gray-900">Import from Web</div>
                <div className="text-[10px] text-gray-500">Auto scrape platforms</div>
              </div>
            </button>

            <button
              onClick={() => { onImportUrl(); setIsOpen(false); }}
              disabled={importing}
              className="w-full px-4 py-2.5 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 disabled:opacity-50"
            >
              <div className="w-8 h-8 bg-purple-100 rounded-sm flex items-center justify-center">
                <LinkIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="text-xs text-gray-900">Import from URL</div>
                <div className="text-[10px] text-gray-500">Custom URLs</div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// MAIN COMPONENT - UPDATED LAYOUT
const QuestionBankPage: React.FC = () => {
  const { user, token } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState<{ difficulty: string; status: string; search: string; source: "all" | "ai" | "manual"; type: string }>({ difficulty: "", status: "", search: "", source: "all", type: "" });
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [showUrlScraper, setShowUrlScraper] = useState(false);
  const [vectorHealth, setVectorHealth] = useState<boolean>(true);
  
  // Vetting states (keep all your original vetting states)
  const [vetting, setVetting] = useState(false);
  const [vettingHealth, setVettingHealth] = useState<boolean>(true);
  const [showVettingConfirm, setShowVettingConfirm] = useState(false);
  const [showVettingResults, setShowVettingResults] = useState(false);
  const [vettingResult, setVettingResult] = useState<any>(null);
  const [currentVettingId, setCurrentVettingId] = useState<string | null>(null);
  const [batchVettingIds, setBatchVettingIds] = useState<string[]>([]);
  
  // NEW STATE: Question source toggle (from new design)
  const [questionSource, setQuestionSource] = useState<"mine" | "library">("mine");
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

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

  // Add a useEffect to check vector engine health
  useEffect(() => {
    const checkVectorHealth = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/questions/vector/health', {
          headers: authHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          setVectorHealth(data.success && data.status !== 'unavailable');
        } else {
          setVectorHealth(false);
        }
      } catch (error) {
        console.error('Vector health check failed:', error);
        setVectorHealth(false);
      }
    };
    
    checkVectorHealth();
    const interval = setInterval(checkVectorHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCurrentUserId(user?.user_id ?? null);
  }, [user]);

  // UPDATED loadQuestions to handle both mine and library
  const loadQuestions = async () => {
    setLoading(true);
    try {
      const endpoint = questionSource === "library" 
        ? "http://localhost:5000/api/questions?limit=500&page=1&isLibrary=true&status=approved"
        : "http://localhost:5000/api/questions?limit=1000&page=1";
        
      const response = await fetch(endpoint, { headers: authHeaders() });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      let loadedQuestions = [];
      if (data?.success && data.questions) loadedQuestions = data.questions;
      else if (Array.isArray(data)) loadedQuestions = data;
      else if (data?.data && Array.isArray(data.data)) loadedQuestions = data.data;
      
      // Filter based on source
      if (questionSource === "library") {
        loadedQuestions = loadedQuestions.filter((q: any) => q.isLibraryQuestion === true && q.status === 'approved');
      } else {
        loadedQuestions = currentUserId 
          ? loadedQuestions.filter((q: any) => q.createdBy === currentUserId)
          : [];
      }
      
      setQuestions(loadedQuestions);
    } catch (error) {
      console.error("Failed to load questions:", error);
      setQuestions([]);
    }
    setLoading(false);
  };

  useEffect(() => { 
    loadQuestions(); 
  }, [token, questionSource, currentUserId]);

  // Calculate stats for both mine and library
  const stats = {
    total: questions.length,
    approved: questions.filter(q => q.status === 'approved').length,
    pending: questions.filter(q => q.status === 'pending_review').length,
    draft: questions.filter(q => q.status === 'draft').length,
    rejected: questions.filter(q => q.status === 'rejected').length,
    coding: questions.filter(q => q.type === 'coding').length,
    mcq: questions.filter(q => q.type === 'mcq').length,
  };

  // Filter questions (keep your original logic but adapt for library)
  const filteredQuestions = questions.filter((q) => {
    const s = filters.search.trim().toLowerCase();
    const matchSearch = !s || q.title.toLowerCase().includes(s) || (q.skillTags && q.skillTags.some((tag) => tag.toLowerCase().includes(s)));
    const matchDifficulty = !filters.difficulty || q.difficulty === filters.difficulty;
    const matchStatus = !filters.status || q.status === filters.status;
    const matchType = !filters.type || q.type === filters.type;
    const isAI = !!q.aiGenerated || (q.source && q.source.startsWith("ai"));
    const matchSource = filters.source === "all" ? true : filters.source === "ai" ? isAI : !isAI;
    return matchSearch && matchDifficulty && matchStatus && matchType && matchSource;
  });

  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [filters, itemsPerPage, questionSource]);

  // KEEP ALL YOUR ORIGINAL ACTION HANDLERS
  const changeStatus = async (q: Question, next: "pending_review" | "approved" | "rejected") => {
    if (!requireAuth()) return;
    try {
      let ok = false;
      if (next === "approved") {
        const r = await fetch(`http://localhost:5000/api/questions/${q.id}/approve`, { method: "PATCH", headers: authHeaders() });
        ok = !!(await r.json()).success;
      } else if (next === "rejected") {
        const r = await fetch(`http://localhost:5000/api/questions/${q.id}/reject`, { method: "PATCH", headers: authHeaders() });
        ok = !!(await r.json()).success;
      } else {
        const r = await fetch(`http://localhost:5000/api/questions/${q.id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ status: "pending_review" }) });
        ok = !!(await r.json()).success;
      }
      if (ok) setQuestions((prev) => prev.map((it) => (it.id === q.id ? { ...it, status: next } : it)));
      else alert("Failed to update status");
    } catch (e) {
      console.error(e);
      alert("Network error while updating status");
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!requireAuth()) return;
    if (!window.confirm("Are you sure you want to delete this question?\n\nThis action cannot be undone.")) return;
    try {
      const response = await fetch(`http://localhost:5000/api/questions/${questionId}`, { method: "DELETE", headers: authHeaders() });
      const data = await response.json();
      if (data.success) {
        setQuestions(prev => prev.filter(q => q.id !== questionId));
        alert("Question deleted successfully!");
      } else alert("Failed to delete question: " + (data.error || "Unknown error"));
    } catch (error) {
      console.error("Failed to delete question:", error);
      alert("Network error while deleting question.");
    }
  };

  const handleCreateQuestion = () => { if (!requireAuth()) return; setEditorMode("create"); setEditingQuestion(null); setShowEditor(true); };
  const handleEditQuestion = (question: Question) => { if (!requireAuth()) return; setEditorMode("edit"); setEditingQuestion(question); setShowEditor(true); };

  const handleSaveQuestion = async (questionData: Partial<Question>) => {
    if (!requireAuth()) return;
    try {
      const url = editorMode === "create" ? "http://localhost:5000/api/questions" : `http://localhost:5000/api/questions/${editingQuestion?.id}`;
      const method = editorMode === "create" ? "POST" : "PUT";
      const response = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(questionData) });
      const data = await response.json();
      
      if (data.success) {
        setShowEditor(false);
        if (editorMode === "create" && data.question) {
          setQuestions(prev => [{ ...data.question, createdBy: currentUserId }, ...prev]);
        } else await loadQuestions();
      } else {
        if (data.code === 'DUPLICATE_QUESTION') {
          alert(`❌ Duplicate Question Detected!\n\nThis question is very similar to ${data.similarityCheck?.similar_questions_found} existing questions.\n\nSimilarity Risk: ${data.similarityCheck?.duplication_risk}\n\nPlease modify your question to make it more unique.`);
        } else {
          alert("Failed to save question: " + (data.error || "Unknown error"));
        }
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
      const endpoint = payload.type === "mcq" 
        ? "http://localhost:5000/api/questions/generate-mcq"
        : "http://localhost:5000/api/questions/generate";

      const response = await fetch(endpoint, {
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
          source: data.question.source || (payload.type === "mcq" ? "ai_gemini_mcq" : "ai_gemini"),
          type: payload.type || data.question.type,
          skillTags: payload.tags?.length
            ? Array.from(new Set([...(data.question.skillTags || []), ...payload.tags]))
            : data.question.skillTags || [],
        };
        setQuestions((prev) => [q, ...prev]);
        setAiModalOpen(false);
      } else {
        if (data.error?.includes('duplicate') || data.details?.includes('similar')) {
          alert(`❌ AI Generated Duplicate!\n\nThe AI generated a question that's very similar to existing ones.\n\nPlease try a different topic or modify the generated question.`);
        } else {
          alert("Failed to generate question: " + (data.error || data.details || "Unknown error"));
        }
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
    type: "coding" | "mcq";
  }) => {
    if (!requireAuth()) return;
    setBatchGenerating(true);
    try {
      const endpoint = payload.type === "mcq"
        ? "http://localhost:5000/api/questions/generate-mcq-batch"
        : "http://localhost:5000/api/questions/generate-batch";

      const requestBody = payload.type === "mcq"
        ? {
            topics: payload.topics,
            difficulty: payload.difficulty,
            count_per_topic: payload.countPerTopic,
          }
        : {
            topics: payload.topics,
            difficulty: payload.difficulty,
            countPerTopic: payload.countPerTopic,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (data.success && Array.isArray(data.questions)) {
        const normalized = data.questions.map((q: any) => ({
          ...q,
          aiGenerated: true,
          source: q.source || (payload.type === "mcq" ? "ai_gemini_mcq" : "ai_gemini"),
          type: payload.type,
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
    if (!window.confirm(`🌐 Import Real Programming Questions\n\nThis will scrape ${maxPages} page(s) from ${source.toUpperCase()}\nSource: Real questions from professional developers\n\nContinue?`)) return;
    setImporting(true);
    setShowSourceSelector(false);
    try {
      const response = await fetch('http://localhost:5000/api/questions/import-scraped', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ source: source, max_pages: maxPages })
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ Successfully imported ${data.imported_count} real questions from ${source.toUpperCase()}!\n\n📊 Import Statistics:\n• Total scraped: ${data.total_scraped}\n• Imported: ${data.imported_count}\n• Skipped (duplicates): ${data.skipped_count}\n• Errors: ${data.error_count}\n\nAll questions are now in "Pending Review" status.`);
        await loadQuestions();
      } else alert(`❌ Failed to import: ${data.error}\n\n${data.details || ''}`);
    } catch (error) {
      console.error('Failed to import scraped questions:', error);
      alert('❌ Network error during import.\n\nMake sure:\n• Backend is running on port 5000\n• Python AI service is running on port 8000');
    } finally {
      setImporting(false);
    }
  };

  const handleScrapeUrls = async (urls: string[], platform: "stackoverflow" | "leetcode" | "hackerrank") => {
    if (!requireAuth()) return;
    setImporting(true);
    setShowUrlScraper(false);
    
    try {
      let response;
      let data;

      if (platform === "leetcode") {
        response = await fetch("http://localhost:5000/api/questions/scrape/leetcode/batch", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ urls }),
        });
        data = await response.json();

        if (data.success) {
          const results = data.results;
          alert(
            `✅ LeetCode Scraping Complete!\n\n` +
            `📊 Results:\n` +
            `• Total URLs: ${results.total}\n` +
            `• Successfully scraped: ${results.successful}\n` +
            `• Saved to database: ${results.saved}\n` +
            `• Skipped (duplicates): ${results.skipped}\n` +
            `• Failed: ${results.failed}\n\n` +
            `All questions are now in "Pending Review" status.`
          );
          await loadQuestions();
        } else {
          throw new Error(data.error || data.details || "LeetCode scraping failed");
        }
      } else {
        response = await fetch("http://localhost:5000/api/questions/scrape", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ urls, platform }),
        });
        data = await response.json();

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
          await loadQuestions();
        } else {
          throw new Error(data.error || data.details || "Scraping failed");
        }
      }
    } catch (error: any) {
      console.error("Failed to scrape URLs:", error);
      alert(
        `❌ Scraping Failed\n\n` +
        `Error: ${error.message || "Unknown error"}\n\n` +
        `Make sure:\n` +
        `• Backend is running on port 5000\n` +
        `• Python AI service is running on port 8000\n` +
        `• URLs are valid and accessible`
      );
    } finally {
      setImporting(false);
    }
  };

  // Selection handlers (from new design)
  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const selectAllVisibleQuestions = () => {
    if (selectedQuestions.size === paginatedQuestions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(paginatedQuestions.map(q => q.id)));
    }
  };

  const clearSelection = () => {
    setSelectedQuestions(new Set());
  };

  const handleBatchDelete = async () => {
    if (!requireAuth()) return;
    
    const selectedIds = Array.from(selectedQuestions);
    if (selectedIds.length === 0) {
      alert('Please select at least one question to delete');
      return;
    }
    
    if (!window.confirm(`⚠️ Delete ${selectedIds.length} question${selectedIds.length > 1 ? 's' : ''}?\n\nThis action cannot be undone.`)) return;
    
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const questionId of selectedIds) {
        try {
          const response = await fetch(`http://localhost:5000/api/questions/${questionId}`, {
            method: 'DELETE',
            headers: authHeaders()
          });
          const data = await response.json();
          
          if (data.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Failed to delete question ${questionId}:`, error);
          errorCount++;
        }
      }

      setQuestions(prev => prev.filter(q => !selectedIds.includes(q.id)));
      clearSelection();

      if (errorCount === 0) {
        alert(`✅ Successfully deleted ${successCount} question${successCount > 1 ? 's' : ''}!`);
      } else {
        alert(`⚠️ Deleted ${successCount} question${successCount > 1 ? 's' : ''}\n${errorCount} failed to delete.`);
      }
    } catch (error) {
      console.error('Batch delete error:', error);
      alert('❌ Network error during batch delete.');
    }
  };

  // KEEP YOUR ORIGINAL VETTING FUNCTIONS
  useEffect(() => {
    const checkVettingHealth = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/questions/vetting/health', {
          headers: authHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          setVettingHealth(data.success && data.vetting?.status === 'healthy');
        } else {
          setVettingHealth(false);
        }
      } catch (error) {
        console.error('Vetting health check failed:', error);
        setVettingHealth(false);
      }
    };
    
    checkVettingHealth();
    const interval = setInterval(checkVettingHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleVetQuestion = async (questionId: string) => {
    if (!requireAuth()) return;
    
    setCurrentVettingId(questionId);
    setShowVettingConfirm(true);
  };

  const performVetting = async () => {
    if (!currentVettingId) return;
    
    setVetting(true);
    try {
      const response = await fetch(`http://localhost:5000/api/questions/${currentVettingId}/vet`, {
        method: 'POST',
        headers: authHeaders()
      });
      
      const data = await response.json();
      
      setVettingResult(data);
      setShowVettingResults(true);
      await loadQuestions();
    } catch (error: any) {
      console.error('Vetting error:', error);
      setVettingResult({ 
        success: false, 
        error: error.message 
      });
      setShowVettingResults(true);
    } finally {
      setVetting(false);
      setCurrentVettingId(null);
    }
  };

  const handleBatchVetting = async (selectedIds: string[]) => {
    if (!requireAuth()) return;
    
    if (selectedIds.length === 0) {
      alert('Please select at least one question to vet');
      return;
    }
    
    setBatchVettingIds(selectedIds);
    setShowVettingConfirm(true);
  };

  const performBatchVetting = async () => {
    if (batchVettingIds.length === 0) return;
    
    setVetting(true);
    try {
      const response = await fetch('http://localhost:5000/api/questions/vetting/batch', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ids: batchVettingIds })
      });
      
      const data = await response.json();
      
      setVettingResult({ 
        ...data, 
        total: batchVettingIds.length 
      });
      setShowVettingResults(true);
      await loadQuestions();
      clearSelection();

    } catch (error: any) {
      console.error('Batch vetting error:', error);
      setVettingResult({ 
        success: false, 
        error: error.message 
      });
      setShowVettingResults(true);
    } finally {
      setVetting(false);
      setBatchVettingIds([]);
    }
  };

  return (
    <div className="bg-gray-50 h-full">
      <div className="">


        <div className="flex w-full gap-4 justify-between items-center mt-4">
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5 w-3/5">
          {[
            { label: "Total", value: stats.total, icon: Database, color: "blue" },
            { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "green" },
            { label: "Pending", value: stats.pending, icon: Clock, color: "amber" },
            { label: "Draft", value: stats.draft, icon: FileText, color: "gray" },
            { label: "Rejected", value: stats.rejected, icon: XCircle, color: "red" },
            { label: "Coding", value: stats.coding, icon: Code2, color: "indigo" },
            { label: "MCQ", value: stats.mcq, icon: Award, color: "purple" },
          ].map((stat) => {
            const IconComponent = stat.icon;
            return (
              <motion.div 
                key={stat.label} 
                whileHover={{ scale: 1.03 }}
                className={`${panel} px-2 hover:shadow-md transition-all flex items-center justify-between`}
              >
                <div className={`text-lg`}>{stat.value}</div>
                  <div className="text-[9px] text-gray-500 uppercase  tracking-wide">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>
        
        
        <div className="flex flex-col justify-between items-center gap-2">
           <p className="text-xs text-gray-600">
                  {stats.total} questions • {stats.coding} coding • {stats.mcq} MCQ
                </p>


              <div className="flex items-center bg-gray-100 rounded-sm p-1">
                <button
                  onClick={() => setQuestionSource("mine")}
                  className={`px-4 py-2 rounded-sm text-xs  transition-all flex items-center gap-2 ${
                    questionSource === "mine"
                      ? "bg-white text-[#1B73E8] shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  My Questions
                </button>
                <button
                  onClick={() => setQuestionSource("library")}
                  className={`px-4 py-2 rounded-sm text-xs  transition-all flex items-center gap-2 ${
                    questionSource === "library"
                      ? "bg-white text-[#1B73E8] shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Library className="w-3.5 h-3.5" />
                  Library
                </button>
              </div>
        </div>



        </div>
        {/* SEARCH & CONTROLS (NEW DESIGN) */}
        <div className={`${panel} p-4 mb-4`}>
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, skills, or description..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 rounded-sm border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#1B73E8] transition-all"
              />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode */}
              <div className="flex items-center bg-gray-100 rounded-sm p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-2 rounded-sm text-xs  transition-all ${
                    viewMode === "grid" ? "bg-white text-[#1B73E8] shadow-sm" : "text-gray-600"
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-2 rounded-sm text-xs  transition-all ${
                    viewMode === "table" ? "bg-white text-[#1B73E8] shadow-sm" : "text-gray-600"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-sm text-xs  hover:bg-gray-50 transition-all"
              >
                <Filter className="w-4 h-4" />
                Filters
                {(filters.difficulty || filters.status || filters.type || filters.source !== "all") && (
                  <span className="w-2 h-2 bg-[#1B73E8] rounded-full" />
                )}
              </button>

              {/* Actions for "My Questions" only */}
              {questionSource === "mine" && (
                <>
                  <button
                    onClick={handleCreateQuestion}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1B73E8] hover:bg-[#1557B0] text-white rounded-sm text-xs  shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Create
                  </button>

                  <ActionsMenu
                    onAiGenerate={() => setAiModalOpen(true)}
                    onAiBatch={() => setBatchOpen(true)}
                    onImportWeb={() => setShowSourceSelector(true)}
                    onImportUrl={() => setShowUrlScraper(true)}
                    generating={generating}
                    importing={importing}
                  />

                  {/* Selection Controls */}
                  {paginatedQuestions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAllVisibleQuestions}
                        className="px-3 py-2 rounded-sm border border-gray-200 bg-white hover:bg-blue-50 text-[10px]  text-gray-700 transition-all"
                      >
                        {selectedQuestions.size === paginatedQuestions.length ? 'Deselect All' : 'Select All'}
                      </button>
                      
                      {selectedQuestions.size > 0 && (
                        <>
                          <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 rounded-sm border border-blue-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#1B73E8]" />
                            <span className="text-[10px] text-[#1B73E8]">
                              {selectedQuestions.size} selected
                            </span>
                          </div>
                          
                          <button
                            onClick={clearSelection}
                            className="p-2 rounded-sm hover:bg-red-50 text-red-600 transition-all"
                            title="Clear selection"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {selectedQuestions.size > 0 && (
                    <>
                      <motion.button 
                        onClick={() => {
                          const selectedIds = Array.from(selectedQuestions);
                          handleBatchVetting(selectedIds);
                        }} 
                        disabled={vetting || !vettingHealth}
                        whileHover={{ scale: 1.02 }} 
                        whileTap={{ scale: 0.98 }} 
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] hover:from-[#1557B0] hover:via-[#0D47A1] hover:to-[#0A3A8C] text-white rounded-sm text-xs  shadow-sm transition-all disabled:opacity-60"
                      >
                        <Sparkles className="w-4 h-4" />
                        Vet ({selectedQuestions.size})
                      </motion.button>
                      
                      <button
                        onClick={handleBatchDelete}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-sm text-xs  shadow-sm transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete ({selectedQuestions.size})
                      </button>
                    </>
                  )}

                  {/* Library Link */}
                  <NextLink
                    href="questions/library"
                    className="flex items-center gap-2 px-4 py-2 rounded-sm border border-gray-200 bg-white text-[10px]  text-[#1B73E8] hover:bg-blue-50"
                  >
                    <Library className="w-4 h-4" />
                    Browse Library
                  </NextLink>
                </>
              )}
            </div>
          </div>

          {/* Advanced Filters (NEW DESIGN) */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-200">
                  <select
                    value={filters.difficulty}
                    onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value }))}
                    className="px-3 py-2 rounded-sm border border-gray-200 bg-white text-xs focus:ring-2 focus:ring-[#1B73E8]"
                  >
                    <option value="">All Difficulty</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>

                  <select
                    value={filters.status}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                    className="px-3 py-2 rounded-sm border border-gray-200 bg-white text-xs focus:ring-2 focus:ring-[#1B73E8]"
                  >
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="pending_review">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <select
                    value={filters.type}
                    onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                    className="px-3 py-2 rounded-sm border border-gray-200 bg-white text-xs focus:ring-2 focus:ring-[#1B73E8]"
                  >
                    <option value="">All Types</option>
                    <option value="coding">Coding</option>
                    <option value="mcq">MCQ</option>
                  </select>

                  <select
                    value={filters.source}
                    onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value as any }))}
                    className="px-3 py-2 rounded-sm border border-gray-200 bg-white text-xs focus:ring-2 focus:ring-[#1B73E8]"
                  >
                    <option value="all">All Sources</option>
                    <option value="ai">AI Generated</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                {(filters.difficulty || filters.status || filters.type || filters.source !== "all") && (
                  <button
                    onClick={() => setFilters({ difficulty: "", status: "", search: filters.search, source: "all", type: "" })}
                    className="mt-3 text-xs text-red-600 hover:text-red-700  flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear Filters
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* QUESTIONS GRID/TABLE (KEEP YOUR ORIGINAL COMPONENTS BUT UPDATE LAYOUT) */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${panel} p-5 animate-pulse`}>
                <div className="h-3 w-24 rounded bg-gray-200" />
                <div className="mt-3 h-4 w-3/4 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-full rounded bg-gray-200" />
                <div className="mt-4 flex gap-2">
                  <div className="h-6 w-16 rounded bg-gray-200" />
                  <div className="h-6 w-16 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === "grid" ? (
          // Grid View (update with new design but keep your functionality)
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {paginatedQuestions.map((question, idx) => {
                const isAI = !!question.aiGenerated || (question.source && question.source.startsWith("ai"));
                const isMCQ = question.type === "mcq";
                const statusPill = question.status === "approved" ? "bg-green-50 text-green-700 border-green-200" : question.status === "pending_review" ? "bg-amber-50 text-amber-700 border-amber-200" : question.status === "rejected" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-50 text-slate-700 border-slate-200";

                return (
                  <motion.div key={question.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ delay: idx * 0.03 }} whileHover={{ y: -4 }} className={`${panel} overflow-hidden group relative`}>
                    <div className={`h-1 ${question.difficulty === "easy" ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : question.difficulty === "medium" ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-gradient-to-r from-rose-400 to-rose-600"}`} />
                    
                    {questionSource === "mine" && (
                      <div className="absolute top-3 left-3 z-10">
                        <input
                          type="checkbox"
                          checked={selectedQuestions.has(question.id)}
                          onChange={() => toggleQuestionSelection(question.id)}
                          className="w-5 h-5 rounded border-2 border-gray-300 text-[#1B73E8] focus:ring-2 focus:ring-[#1B73E8] cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}

                    <div className={`p-4 ${questionSource === "mine" ? "pl-10" : ""}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`${pill} ${statusPill}`}>
                          {question.status === "approved" && <CheckCircle2 className="w-3 h-3" />}
                          {question.status === "pending_review" && <Clock className="w-3 h-3" />}
                          {question.status === "rejected" && <XCircle className="w-3 h-3" />}
                          {question.status.replace("_", " ").toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`${pill} ${question.difficulty === "easy" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : question.difficulty === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                            {question.difficulty.toUpperCase()}
                          </span>
                          <span className={`${pill} ${isAI ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}`}>
                            {isAI ? (<><Zap className="w-3 h-3" /> AI</>) : (<><FileText className="w-3 h-3" /> MANUAL</>)}
                          </span>
                          {question.vectorStored && (
                            <span className={`${pill} bg-blue-50 text-blue-700 border-blue-200`} title="Stored in vector database">
                              <Database className="w-3 h-3" /> VECTOR
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-1.5 mb-1.5">
                        {isAI ? (<Zap className="mt-0.5 w-4 h-4 text-emerald-600 shrink-0" />) : (<FileText className="mt-0.5 w-4 h-4 text-gray-600 shrink-0" />)}
                        <h3 className="text-[13px] font-extrabold text-[#142c52] leading-snug line-clamp-2 group-hover:text-[#1B73E8] transition-colors">{question.title}</h3>
                      </div>

                      {question.type && (
                        <div className="mb-2.5">
                          <span className={`px-2 py-0.5 rounded-sm text-[9px]  border ${isMCQ ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>{isMCQ ? "MULTIPLE CHOICE" : "CODING"}</span>
                        </div>
                      )}

                      <p className="text-[11px] text-[#2b3952]/80 mb-3 line-clamp-2">{question.description}</p>

                      {isMCQ && question.options && (
                        <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-sm">
                          <div className="flex items-center gap-1.5 mb-1.5"><FileText className="w-3 h-3 text-purple-600" /><span className="text-[10px]  text-purple-700">Options Preview</span></div>
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            {Object.entries(question.options).slice(0, 4).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-1">
                                <span className={`w-4 h-4 flex items-center justify-center text-[9px] rounded ${question.correctAnswer?.includes(key) ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>{key}</span>
                                <span className="text-gray-600 truncate">{value as string}</span>
                              </div>
                            ))}
                          </div>
                          {question.correctAnswer && (<div className="mt-1.5 text-[10px] text-green-600 font-medium">Correct: {question.correctAnswer}</div>)}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {question.skillTags && question.skillTags.slice(0, 4).map((tag) => (<span key={tag} className="px-2 py-0.5 bg-blue-50 text-[#1B73E8] rounded-sm text-[9px] font-medium border border-blue-100">{tag}</span>))}
                        {question.skillTags && question.skillTags.length > 4 && (<span className="px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded-sm text-[9px] font-medium border border-gray-200">+{question.skillTags.length - 4}</span>)}
                      </div>

                      <div className="flex items-center gap-2.5 text-[11px] text-gray-600 border-t border-gray-100 pt-3">
                        <div className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /><span>{question.views || 0}</span></div>
                        <div className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /><span>{question.submissions || 0}</span></div>
                        {question.successRate != null && (<div className="flex items-center gap-1 ml-auto"><Award className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-600">{question.successRate}%</span></div>)}
                      </div>

                      {/* Actions (only for "mine") */}
                      {questionSource === "mine" && (
                        <div className="mt-3 flex items-center gap-1.5">
                          <StatusSelect value={(["pending_review", "approved", "rejected"].includes(question.status) ? (question.status as any) : "pending_review")} onChange={(next) => changeStatus(question, next)} />
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleVetQuestion(question.id); 
                            }} 
                            disabled={vetting || !vettingHealth}
                            className="p-1.5 bg-purple-50 text-purple-600 rounded-sm hover:bg-purple-100 transition-colors border border-purple-100 disabled:opacity-40 disabled:cursor-not-allowed" 
                            title="AI Vetting"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleEditQuestion(question); }} className="p-1.5 bg-blue-50 text-[#1B73E8] rounded-sm hover:bg-blue-100 transition-colors border border-blue-100" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(question.id); }} className="p-1.5 bg-rose-50 text-rose-600 rounded-sm hover:bg-rose-100 transition-colors border border-rose-100" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          // Table View (keep your original table but update styling)
          <div className={`${panel} overflow-hidden shadow-xl`}>
            <div className="px-4 py-3 bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <div><h3 className="text-sm">Question Database</h3><p className="text-[10px] text-blue-100">Showing {paginatedQuestions.length} of {filteredQuestions.length} results</p></div>
              </div>
              <div className="flex items-center gap-1.5 text-white/90"><SlidersHorizontal className="w-3.5 h-3.5" /><span className="text-[10px] font-medium">{filteredQuestions.length} Total</span></div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50/50 border-b-2 border-[#1B73E8]/20">
                  <tr>
                    {/* Checkbox column (only for "mine") */}
                    {questionSource === "mine" && (
                      <th className="px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={selectedQuestions.size === paginatedQuestions.length && paginatedQuestions.length > 0}
                          onChange={selectAllVisibleQuestions}
                          className="w-4 h-4 rounded border-2 border-gray-300 text-[#1B73E8] focus:ring-2 focus:ring-[#1B73E8] cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-3 py-2 text-left text-[10px] text-gray-800 uppercase tracking-wider"><div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[#1B73E8]" />Question</div></th>
                    <th className="px-3 py-2 text-left text-[10px] text-gray-800 uppercase tracking-wider">Skills</th>
                    <th className="px-3 py-2 text-left text-[10px] text-gray-800 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-2 text-left text-[10px] text-gray-800 uppercase tracking-wider">Source</th>
                    <th className="px-3 py-2 text-left text-[10px] text-gray-800 uppercase tracking-wider">Difficulty</th>
                    <th className="px-3 py-2 text-left text-[10px] text-gray-800 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-[10px] text-gray-800 uppercase tracking-wider"><div className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-[#1B73E8]" />Views</div></th>
                    <th className="px-3 py-2 text-left text-[10px] text-gray-800 uppercase tracking-wider"><div className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5 text-[#1B73E8]" />Subs</div></th>
                    {questionSource === "mine" && (
                      <th className="px-3 py-2 text-left text-[10px] text-gray-800 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedQuestions.map((q, idx) => {
                    const isAI = !!q.aiGenerated || (q.source && q.source.startsWith("ai"));
                    const statusPill = q.status === "approved" ? "bg-green-50 text-green-700 border-green-200" : q.status === "pending_review" ? "bg-amber-50 text-amber-700 border-amber-200" : q.status === "rejected" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-50 text-slate-700 border-slate-200";

                    return (
                      <motion.tr key={q.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-200 group">
                        {/* Checkbox column (only for "mine") */}
                        {questionSource === "mine" && (
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedQuestions.has(q.id)}
                              onChange={() => toggleQuestionSelection(q.id)}
                              className="w-4 h-4 rounded border-2 border-gray-300 text-[#1B73E8] focus:ring-2 focus:ring-[#1B73E8] cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                        )}
                        <td className="px-3 py-3">
                          <div className="flex items-start gap-2">
                            <div className={`w-1 h-full rounded-full ${q.difficulty === "easy" ? "bg-emerald-500" : q.difficulty === "medium" ? "bg-amber-500" : "bg-rose-500"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] text-gray-900 group-hover:text-[#1B73E8] cursor-pointer transition-colors">{q.title}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{q.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {q.skillTags && q.skillTags.length > 0 ? (
                              <>
                                {q.skillTags.slice(0, 2).map((tag) => (<span key={tag} className="px-1.5 py-0.5 bg-blue-50 text-[#1B73E8] rounded text-[9px] font-medium border border-blue-100 whitespace-nowrap">{tag}</span>))}
                                {q.skillTags.length > 2 && (<span className="px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded text-[9px] font-medium border border-gray-200 whitespace-nowrap">+{q.skillTags.length - 2}</span>)}
                              </>
                            ) : (<span className="text-[10px] text-gray-400">—</span>)}
                          </div>
                        </td>
                        <td className="px-3 py-3"><span className="px-2 py-1 rounded-sm text-[9px] border bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm">{(q.type || "coding").toUpperCase()}</span></td>
                        <td className="px-3 py-3"><span className={`${pill} shadow-sm ${isAI ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}`}>{isAI ? (<><Zap className="w-3 h-3" /> AI</>) : (<><FileText className="w-3 h-3" /> MANUAL</>)}</span></td>
                        <td className="px-3 py-3"><span className={`${pill} shadow-sm ${q.difficulty === "easy" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : q.difficulty === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>{q.difficulty.toUpperCase()}</span></td>
                        <td className="px-3 py-3"><span className={`${pill} shadow-sm ${statusPill}`}>{q.status === "approved" && <CheckCircle2 className="w-3 h-3" />}{q.status === "pending_review" && <Clock className="w-3 h-3" />}{q.status === "rejected" && <XCircle className="w-3 h-3" />}{q.status.replace("_", " ").toUpperCase()}</span></td>
                        <td className="px-3 py-3"><div className="flex items-center gap-1.5 text-[11px] text-gray-700 "><Eye className="w-3.5 h-3.5 text-gray-400" />{q.views || 0}</div></td>
                        <td className="px-3 py-3"><div className="flex items-center gap-1.5 text-[11px] text-gray-700 "><BarChart3 className="w-3.5 h-3.5 text-gray-400" />{q.submissions || 0}</div></td>
                        {questionSource === "mine" && (
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5">
                              <StatusSelect compact value={(["pending_review", "approved", "rejected"].includes(q.status) ? (q.status as any) : "pending_review")} onChange={(next) => changeStatus(q, next)} />
                              <button 
                                onClick={() => handleVetQuestion(q.id)} 
                                disabled={vetting || !vettingHealth}
                                className="p-1.5 bg-purple-50 text-purple-600 rounded-sm hover:bg-purple-100 hover:shadow-md transition-all border border-purple-100 disabled:opacity-40 disabled:cursor-not-allowed" 
                                title="AI Vetting"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleEditQuestion(q)} className="p-1.5 bg-blue-50 text-[#1B73E8] rounded-sm hover:bg-blue-100 hover:shadow-md transition-all border border-blue-100" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 bg-rose-50 text-rose-600 rounded-sm hover:bg-rose-100 hover:shadow-md transition-all border border-rose-100" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>

              {paginatedQuestions.length === 0 && (
                <div className="py-12 text-center">
                  <h3 className="text-base text-gray-900 mb-1">No questions match your filters</h3>
                  <p className="text-[11px] text-gray-600 mb-4">Try changing source, difficulty, status or search.</p>
                </div>
              )}
            </div>

            {paginatedQuestions.length > 0 && totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredQuestions.length} itemsPerPage={itemsPerPage} />
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredQuestions.length === 0 && (
          <div className={`${panel} p-12 text-center`}>
            <h3 className="text-lg text-gray-900 mb-2">No questions found</h3>
            <p className="text-sm text-gray-600 mb-4">
              {questionSource === "library" 
                ? "The library is empty or no questions match your filters"
                : "Create your first question or adjust your filters"}
            </p>
            {questionSource === "mine" && (
              <button
                onClick={handleCreateQuestion}
                className="px-6 py-3 bg-[#1B73E8] hover:bg-[#1557B0] text-white rounded-sm text-sm  shadow-sm transition-all"
              >
                Create Question
              </button>
            )}
          </div>
        )}
      </div>

      {/* KEEP ALL YOUR EXISTING MODALS */}
      <AiGenerateModal open={aiModalOpen} onClose={() => setAiModalOpen(false)} onGenerate={handleAiGenerate} generating={generating} />
      <AiBatchModal open={batchOpen} onClose={() => setBatchOpen(false)} onGenerate={handleAiBatchGenerate} generating={batchGenerating} />

      {showEditor && (
        <QuestionEditor question={editingQuestion || undefined} onSave={handleSaveQuestion} onCancel={() => setShowEditor(false)} mode={editorMode} />
      )}

      {/* FULL-PAGE generating overlay */}
      <AnimatePresence>
        {generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-[#0D47A1]/10 backdrop-blur-[1px] flex items-center justify-center">
            <div className={`${panel} px-5 py-4 flex items-center gap-2`}>
              <div className="w-7 h-7 border-3 border-blue-200 border-t-[#1B73E8] rounded-full animate-spin" />
              <div className="text-[12px] text-gray-700 ">Generating AI question…</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Vetting Modals */}
      <VettingConfirmModal
        open={showVettingConfirm}
        onClose={() => {
          setShowVettingConfirm(false);
          setCurrentVettingId(null);
          setBatchVettingIds([]);
        }}
        onConfirm={currentVettingId ? performVetting : performBatchVetting}
        questionCount={currentVettingId ? 1 : batchVettingIds.length}
      />

      <VettingResultsModal
        open={showVettingResults}
        onClose={() => {
          setShowVettingResults(false);
          setVettingResult(null);
        }}
        result={vettingResult}
        isBatch={batchVettingIds.length > 0 || (vettingResult?.total !== undefined)}
      />
      
      {/* VETTING OVERLAY */}
      <AnimatePresence>
        {vetting && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[60] bg-gradient-to-br from-purple-900/20 via-violet-900/20 to-purple-900/20 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              className={`${panel} px-6 py-5 max-w-sm`}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-10 h-10 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-gray-900 text-sm">AI Vetting in Progress...</div>
                  <div className="text-gray-600 text-[10px] mt-0.5">Analyzing code quality & correctness</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] text-gray-500">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                Running syntax, logic, and security checks...
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL-PAGE importing overlay */}
      <AnimatePresence>
        {importing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-gradient-to-br from-orange-900/20 via-red-900/20 to-pink-900/20 backdrop-blur-sm flex items-center justify-center">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className={`${panel} px-6 py-5 max-w-sm`}>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-10 h-10 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                  <Network className="absolute inset-0 m-auto w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <div className="text-gray-900 text-sm">Scraping Real Questions...</div>
                  <div className="text-gray-600 text-[10px] mt-0.5">Collecting questions from platform</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] text-gray-500">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                Making HTTP requests to platform...
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* URL Scraper Modal */}
      <UrlScraperModal open={showUrlScraper} onClose={() => setShowUrlScraper(false)} onScrape={handleScrapeUrls} scraping={importing} token={token} />
    </div>
  );
};

export default QuestionBankPage;