"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_V1_BASE } from "@/src/lib/config/api";
import {
  Search,
  Zap,
  FileText,
  Code2,
  Database,
  Globe,
  Sparkles,
  Award,
  Eye,
  Plus,
  TrendingUp,
  Filter,
  X,
  ChevronDown,
  Terminal,
  Layers,
  GitBranch,
  BarChart3,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  List,
  Info,
} from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";

interface Question {
  id: string;
  title: string;
  type: "coding" | "mcq";
  difficulty: "easy" | "medium" | "hard";
  skillTags: string[];
  description: string;
  problemStatement?: string;
  canonicalSolution?: string;
  testCases?: any;
  options?: { A: string; B: string; C: string; D: string };
  correctAnswer?: string;
  explanation?: string;
  metadata?: {
    category?: string;
    primaryTag?: string;
  };
  views?: number;
  submissions?: number;
  successRate?: number;
  source?: string;
  aiGenerated?: boolean;
}

// Simplified categories with Hiralent colors
const CATEGORIES = [
  { id: 'all', label: 'All Topics', icon: Globe },
  { id: 'dsa', label: 'DSA', icon: Terminal },
  { id: 'frontend', label: 'Frontend', icon: Sparkles },
  { id: 'backend', label: 'Backend', icon: Database },
  { id: 'python', label: 'Python', icon: Code2 },
  { id: 'db', label: 'Databases', icon: Layers },
  { id: 'devops', label: 'DevOps', icon: GitBranch },
  { id: 'math', label: 'Math', icon: BarChart3 },
  { id: 'business', label: 'Business', icon: Briefcase },
];

const panel = "rounded-sm border border-gray-200/70 bg-white shadow-sm";
const pill = "inline-flex items-center gap-1 px-3 py-2 rounded-sm text-[12px] ";

// Professional Text Formatter Component (HackerRank-style)
function FormattedProblemText({ text }: { text: string }) {
  const formatText = (rawText: string) => {
    // Split into lines
    const lines = rawText.split('\n');
    const elements: React.JSX.Element[] = [];
    let inList = false;
    let listItems: string[] = [];
    
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      
      // Skip empty lines but add spacing
      if (!trimmed) {
        if (inList) {
          elements.push(
            <ul key={`list-${idx}`} className="ml-6 space-y-1.5 mb-4">
              {listItems.map((item, i) => (
                <li key={i} className="text-gray-700 leading-relaxed relative pl-2">
                  <span className="absolute left-0 top-0 text-[#1B73E8] font-bold">•</span>
                  {item}
                </li>
              ))}
            </ul>
          );
          inList = false;
          listItems = [];
        }
        return;
      }
      
      // Check if it's a list item (starts with - or •)
      if (/^[-•]\s/.test(trimmed)) {
        inList = true;
        listItems.push(trimmed.replace(/^[-•]\s/, ''));
        return;
      }
      
      // If we were in a list and now we're not, close it
      if (inList && !/^[-•]\s/.test(trimmed)) {
        elements.push(
          <ul key={`list-${idx}`} className="ml-6 space-y-1.5 mb-4">
            {listItems.map((item, i) => (
              <li key={i} className="text-gray-700 leading-relaxed relative pl-2">
                <span className="absolute left-0 top-0 text-[#1B73E8] font-bold">•</span>
                {item}
              </li>
            ))}
          </ul>
        );
        inList = false;
        listItems = [];
      }
      
      // Format code blocks (text in backticks)
      const formattedLine = trimmed.split(/(`[^`]+`)/).map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="px-2 py-0.5 bg-gray-100 text-[#1B73E8] rounded text-sm font-mono border border-gray-200">
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });
      
      // Check if it's a heading (ends with :)
      if (trimmed.endsWith(':') && trimmed.length < 100) {
        elements.push(
          <h4 key={idx} className="text-base font-bold text-gray-900 mt-5 mb-2 flex items-center gap-2">
            <div className="w-1 h-5 bg-[#1B73E8] rounded-sm"></div>
            {formattedLine}
          </h4>
        );
      } else {
        elements.push(
          <p key={idx} className="text-sm text-gray-700 leading-relaxed mb-3">
            {formattedLine}
          </p>
        );
      }
    });
    
    // Close any remaining list
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key="list-final" className="ml-6 space-y-1.5 mb-4">
          {listItems.map((item, i) => (
            <li key={i} className="text-gray-700 leading-relaxed relative pl-2">
              <span className="absolute left-0 top-0 text-[#1B73E8] font-bold">•</span>
              {item}
            </li>
          ))}
        </ul>
      );
    }
    
    return elements;
  };

  return <div className="space-y-1">{formatText(text)}</div>;
}

// Question Detail Modal Component
function QuestionDetailModal({
  question,
  isOpen,
  onClose,
  onAdd,
  isAdding,
}: {
  question: Question | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  isAdding: boolean;
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'solution' | 'test-cases'>('description');

  if (!question || !isOpen) return null;

  const isCoding = question.type === 'coding';
  const isMCQ = question.type === 'mcq';

  const handleCopyCode = () => {
    if (question.canonicalSolution) {
      navigator.clipboard.writeText(question.canonicalSolution);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Parse test cases
  const testCases = (() => {
    if (!question.testCases) return [];
    if (Array.isArray(question.testCases)) return question.testCases;
    if (question.testCases.examples) return question.testCases.examples;
    if (question.testCases.inputs && question.testCases.outputs) {
      const inputs = question.testCases.inputs;
      const outputs = question.testCases.outputs;
      return inputs.map((input: any, i: number) => ({
        input,
        output: outputs[i]
      }));
    }
    return [];
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`${panel} relative w-full h-full overflow-hidden flex flex-col shadow-2xl`}
          >
            {/* Header with Hiralent Blue Gradient */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#1B73E8] via-[#1565D8] to-[#1557B0] text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`${pill} ${
                      question.difficulty === 'easy' ? 'bg-emerald-500 text-white border-emerald-600' :
                      question.difficulty === 'medium' ? 'bg-amber-500 text-white border-amber-600' :
                      'bg-rose-500 text-white border-rose-600'
                    } shadow-sm`}>
                      {question.difficulty.toUpperCase()}
                    </span>
                    <span className={`${pill} bg-white/20 text-white border-white/30 backdrop-blur-sm`}>
                      {isCoding ? (
                        <>
                          <Code2 className="w-3 h-3" />
                          CODING
                        </>
                      ) : (
                        <>
                          <FileText className="w-3 h-3" />
                          MCQ
                        </>
                      )}
                    </span>
                    {question.aiGenerated && (
                      <span className={`${pill} bg-white/20 text-white border-white/30 backdrop-blur-sm`}>
                        <Sparkles className="w-3 h-3" />
                        AI
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold mb-3 leading-tight">
                    {question.title}
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {question.skillTags?.map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-white/20 text-white rounded-sm text-[10px] font-semibold border border-white/30 backdrop-blur-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-sm transition-colors backdrop-blur-sm"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Tabs for Coding Questions */}
            {isCoding && (
              <div className="px-6 py-3 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('description')}
                    className={`px-4 py-2 rounded-sm text-xs font-semibold transition-all ${
                      activeTab === 'description'
                        ? 'bg-[#1B73E8] text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Description
                    </div>
                  </button>
                  {question.canonicalSolution && (
                    <button
                      onClick={() => setActiveTab('solution')}
                      className={`px-4 py-2 rounded-sm text-xs font-semibold transition-all ${
                        activeTab === 'solution'
                          ? 'bg-[#1B73E8] text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5" />
                        Solution
                      </div>
                    </button>
                  )}
                  {testCases.length > 0 && (
                    <button
                      onClick={() => setActiveTab('test-cases')}
                      className={`px-4 py-2 rounded-sm text-xs font-semibold transition-all ${
                        activeTab === 'test-cases'
                          ? 'bg-[#1B73E8] text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        Test Cases
                        <span className="ml-0.5 px-1.5 py-0.5 bg-current/20 rounded text-[9px]">
                          {testCases.length}
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Content - Professional HackerRank Style */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {/* MCQ Content */}
              {isMCQ && (
                <div className="space-y-6">
                  {/* Description with Professional Formatting */}
                  <div className="bg-white rounded-sm border border-gray-200 shadow-sm p-6">
                    <FormattedProblemText text={question.problemStatement || question.description} />
                  </div>

                  {/* Options */}
                  {question.options && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <List className="w-4 h-4 text-[#1B73E8]" />
                        Answer Options
                      </h3>
                      <div className="space-y-2.5">
                        {Object.entries(question.options).map(([key, value]) => {
                          const isCorrect = question.correctAnswer?.includes(key);
                          return (
                            <div
                              key={key}
                              className={`p-4 rounded-sm border-2 transition-all shadow-sm ${
                                isCorrect
                                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-400'
                                  : 'bg-white border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold shadow-sm ${
                                  isCorrect
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {key}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-gray-700 leading-relaxed">{value}</p>
                                  {isCorrect && (
                                    <div className="flex items-center gap-1.5 mt-2 text-emerald-700">
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span className="text-xs font-bold">Correct Answer</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {question.explanation && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#1B73E8]" />
                        Explanation
                      </h3>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-sm border border-blue-200 shadow-sm p-6">
                        <FormattedProblemText text={question.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Coding Content */}
              {isCoding && (
                <div className="space-y-6">
                  {/* Description Tab - Professional HackerRank Format */}
                  {activeTab === 'description' && (
                    <div className="bg-white rounded-sm border border-gray-200 shadow-sm p-6">
                      <FormattedProblemText text={question.problemStatement || question.description} />
                    </div>
                  )}

                  {/* Solution Tab */}
                  {activeTab === 'solution' && question.canonicalSolution && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-[#1B73E8]" />
                          Solution Code
                        </h3>
                        <button
                          onClick={handleCopyCode}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B73E8] hover:bg-[#1557B0] text-white rounded-sm text-xs font-semibold transition-all shadow-sm"
                        >
                          {copiedCode ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy Code
                            </>
                          )}
                        </button>
                      </div>
                      <div className="relative rounded-sm overflow-hidden shadow-lg border border-gray-300">
                        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-red-500"></div>
                            <div className="w-3 h-3 rounded-sm bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                          </div>
                          <span className="text-xs text-gray-400 ml-2">solution.py</span>
                        </div>
                        <pre className="p-4 bg-gray-900 overflow-x-auto">
                          <code className="text-sm text-gray-100 font-mono leading-relaxed">
                            {question.canonicalSolution}
                          </code>
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Test Cases Tab */}
                  {activeTab === 'test-cases' && testCases.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-[#1B73E8]" />
                        Test Cases
                      </h3>
                      <div className="space-y-3">
                        {testCases.map((tc: any, index: number) => (
                          <div key={index} className="p-4 bg-white rounded-sm border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="px-2.5 py-1 bg-[#1B73E8] text-white rounded-sm text-[10px] font-bold shadow-sm">
                                Test Case {index + 1}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-[10px] font-bold text-[#1B73E8] mb-2 uppercase tracking-wide">Input:</div>
                                <pre className="p-3 bg-gray-50 rounded-sm border border-gray-200 text-xs text-gray-800 font-mono overflow-x-auto">
                                  {typeof tc.input === 'object' ? JSON.stringify(tc.input, null, 2) : tc.input}
                                </pre>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-[#1B73E8] mb-2 uppercase tracking-wide">Expected Output:</div>
                                <pre className="p-3 bg-gray-50 rounded-sm border border-gray-200 text-xs text-gray-800 font-mono overflow-x-auto">
                                  {typeof tc.output === 'object' ? JSON.stringify(tc.output, null, 2) : tc.output || tc.expected_output}
                                </pre>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stats */}
              {(question.views || question.submissions || question.successRate) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#1B73E8]" />
                    Statistics
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {question.views && (
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-sm border border-blue-200 shadow-sm">
                        <Eye className="w-5 h-5 text-[#1B73E8] mx-auto mb-2" />
                        <div className="text-2xl font-black text-[#1B73E8]">{question.views}</div>
                        <div className="text-[10px] text-gray-600 mt-1 font-semibold">Views</div>
                      </div>
                    )}
                    {question.submissions && (
                      <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-sm border border-purple-200 shadow-sm">
                        <Code2 className="w-5 h-5 text-purple-600 mx-auto mb-2" />
                        <div className="text-2xl font-black text-purple-600">{question.submissions}</div>
                        <div className="text-[10px] text-gray-600 mt-1 font-semibold">Submissions</div>
                      </div>
                    )}
                    {question.successRate && (
                      <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-sm border border-emerald-200 shadow-sm">
                        <Award className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
                        <div className="text-2xl font-black text-emerald-600">{question.successRate}%</div>
                        <div className="text-[10px] text-gray-600 mt-1 font-semibold">Success Rate</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                {question.source && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-sm">
                    <Database className="w-3.5 h-3.5 text-[#1B73E8]" />
                    <span className="font-medium">{question.source}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-sm border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-all"
                >
                  Close
                </button>
                <button
                  onClick={onAdd}
                  disabled={isAdding}
                  className="px-5 py-2.5 rounded-sm bg-[#1B73E8] hover:bg-[#1557B0] text-white text-xs font-semibold transition-all disabled:opacity-60 flex items-center gap-1.5 shadow-md hover:shadow-lg"
                >
                  {isAdding ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-sm animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Add to My Questions
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function LibraryPage() {
  const { token } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  
  // Modal state
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const authHeaders = (extra: HeadersInit = {}): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  });

  const fetchLibraryQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_V1_BASE}/questions?limit=20000&page=1&isLibrary=true&status=approved`, {
        headers: authHeaders()
      });
      const data = await res.json();

      const libraryQuestions = (data.questions || data.data || [])
        .filter((q: any) => q.isLibraryQuestion === true && q.status === 'approved');

      setQuestions(libraryQuestions);
    } catch (err) {
      console.error("Failed to load library questions", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLibraryQuestions();
  }, []);

  const getCategoryForQuestion = (q: Question): string => {
    if (q.metadata?.category) return q.metadata.category;
    
    const tags = q.skillTags.map(t => t.toLowerCase()).join(' ');
    const title = q.title.toLowerCase();
    const text = title + ' ' + tags;

    if (/array|linked-list|tree|graph|sorting|dynamic-programming|dfs|bfs|binary-search/.test(text)) return 'dsa';
    if (/javascript|typescript|react|nextjs|vue|css|html|dom|frontend/.test(text)) return 'frontend';
    if (/nodejs|express|spring-boot|rest-api|jwt|authentication|backend/.test(text)) return 'backend';
    if (/python|django|flask|pandas|numpy/.test(text)) return 'python';
    if (/sql|postgresql|mongodb|database/.test(text)) return 'db';
    if (/git|docker|kubernetes|cicd|nginx|devops/.test(text)) return 'devops';
    if (/probability|statistics|math|variance/.test(text)) return 'math';
    if (/agile|scrum|marketing|business/.test(text)) return 'business';
    
    return 'other';
  };

  const filtered = questions.filter((q) => {
    const matchSearch = !search || 
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.skillTags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    
    const matchCategory = selectedCategory === 'all' || getCategoryForQuestion(q) === selectedCategory;
    const matchDifficulty = !selectedDifficulty || q.difficulty === selectedDifficulty;
    const matchType = !selectedType || q.type === selectedType;

    return matchSearch && matchCategory && matchDifficulty && matchType;
  });

  const groupedByCategory: Record<string, Question[]> = {};
  filtered.forEach(q => {
    const cat = getCategoryForQuestion(q);
    if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
    groupedByCategory[cat].push(q);
  });

  const categoriesWithCounts = CATEGORIES.map(cat => ({
    ...cat,
    count: cat.id === 'all' ? questions.length : questions.filter(q => getCategoryForQuestion(q) === cat.id).length
  }));

  const stats = {
    total: questions.length,
    coding: questions.filter(q => q.type === 'coding').length,
    mcq: questions.filter(q => q.type === 'mcq').length,
    easy: questions.filter(q => q.difficulty === 'easy').length,
    medium: questions.filter(q => q.difficulty === 'medium').length,
    hard: questions.filter(q => q.difficulty === 'hard').length,
  };

  const handleViewQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setIsModalOpen(true);
  };

  const handleAddToMyQuestions = async (questionId: string) => {
    setAdding(questionId);
    try {
      const response = await fetch(`${API_V1_BASE}/questions/clone-from-library`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ libraryQuestionId: questionId })
      });
      
      if (response.ok) {
        alert('✅ Question added to your collection!');
        setIsModalOpen(false);
      } else {
        alert('❌ Failed to add question');
      }
    } catch (error) {
      alert('❌ Network error');
    }
    setAdding(null);
  };

  return (
    <div className="h-full bg-gray-50">
      <div className="">
        
        {/* Compact Header */}
        <div className={`${panel} px-5 py-4 mb-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-lg font-bold text-gray-900">Question Library</h1>
                <p className="text-xs text-gray-600">
                  {stats.total} questions across {categoriesWithCounts.filter(c => c.count > 0 && c.id !== 'all').length} categories
                </p>
              </div>
            </div>

            {/* Compact Stats */}
            <div className="hidden md:flex items-center gap-2">
              <div className={`${pill} border border-indigo-200`}>
                <Code2 className="w-3 h-3" />
                {stats.coding}
              </div>
              <div className={`${pill} border border-purple-200`}>
                <FileText className="w-3 h-3" />
                {stats.mcq}
              </div>
              <div className={`${pill} border border-emerald-200`}>
                {stats.easy}
              </div>
              <div className={`${pill} border-amber-200`}>
                {stats.medium}
              </div>
              <div className={`${pill} border-rose-200`}>
                {stats.hard}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          
          {/* Sidebar - Compact */}
          <div className="col-span-12 lg:col-span-3">
            <div className={`${panel} p-4`}>
              <h3 className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">
                Categories
              </h3>
              
              <div className="space-y-1">
                {categoriesWithCounts.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = selectedCategory === cat.id;
                  
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full px-3 py-2 rounded-sm text-xs font-medium transition-all flex items-center justify-between ${
                        isActive
                          ? 'bg-[#1B73E8] text-white shadow-sm'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-white/20' : 'bg-gray-200'
                      }`}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full mt-4 px-3 py-2 rounded-sm border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5" />
                  Filters
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-3 pt-3 border-t border-gray-200">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-600 mb-1.5 block">Difficulty</label>
                        <select
                          value={selectedDifficulty}
                          onChange={(e) => setSelectedDifficulty(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-sm border border-gray-200 text-xs focus:ring-1 focus:ring-[#1B73E8] focus:border-[#1B73E8]"
                        >
                          <option value="">All</option>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-gray-600 mb-1.5 block">Type</label>
                        <select
                          value={selectedType}
                          onChange={(e) => setSelectedType(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-sm border border-gray-200 text-xs focus:ring-1 focus:ring-[#1B73E8] focus:border-[#1B73E8]"
                        >
                          <option value="">All</option>
                          <option value="coding">Coding</option>
                          <option value="mcq">MCQ</option>
                        </select>
                      </div>

                      {(selectedDifficulty || selectedType) && (
                        <button
                          onClick={() => {
                            setSelectedDifficulty('');
                            setSelectedType('');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-sm bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-semibold flex items-center justify-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Clear
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Content */}
          <div className="col-span-12 lg:col-span-9">
            {/* Search */}
            <div className={`${panel} p-3 mb-4`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-sm border border-gray-200 text-sm focus:ring-1 focus:ring-[#1B73E8] focus:border-[#1B73E8] outline-none"
                />
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`${panel} p-4 animate-pulse`}>
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
            )}

            {/* No Results */}
            {!loading && filtered.length === 0 && (
              <div className={`${panel} p-8 text-center`}>
                <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-gray-900 mb-1">No questions found</h3>
                <p className="text-xs text-gray-600 mb-4">Try different filters</p>
                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedCategory('all');
                    setSelectedDifficulty('');
                    setSelectedType('');
                  }}
                  className="px-4 py-2 bg-[#1B73E8] hover:bg-[#1557B0] text-white rounded-sm text-xs font-medium"
                >
                  Reset Filters
                </button>
              </div>
            )}

            {/* Questions */}
            {!loading && filtered.length > 0 && (
              <div className="space-y-4">
                {Object.entries(groupedByCategory).map(([category, categoryQuestions]) => {
                  const catInfo = categoriesWithCounts.find(c => c.id === category);
                  if (!catInfo || categoryQuestions.length === 0) return null;

                  const Icon = catInfo.icon;

                  return (
                    <div key={category} className={`${panel} overflow-hidden`}>
                      {/* Category Header - Compact */}
                      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-[#1B73E8]" />
                          <h2 className="text-sm font-bold text-gray-900">{catInfo.label}</h2>
                          <span className="text-xs text-gray-600">({categoryQuestions.length})</span>
                        </div>
                      </div>

                      {/* Questions Grid with Scrollbar */}
                      <div className="p-4">
                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${
                          categoryQuestions.length > 6 
                            ? 'max-h-[400px] overflow-y-auto pr-2 scrollbar-thin' 
                            : ''
                        }`}>
                          {categoryQuestions.map((q, idx) => (
                            <QuestionCard
                              key={q.id}
                              question={q}
                              index={idx}
                              isAdding={adding === q.id}
                              onAdd={() => handleAddToMyQuestions(q.id)}
                              onView={() => handleViewQuestion(q)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Question Detail Modal */}
      <QuestionDetailModal
        question={selectedQuestion}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedQuestion(null);
        }}
        onAdd={() => {
          if (selectedQuestion) {
            handleAddToMyQuestions(selectedQuestion.id);
          }
        }}
        isAdding={adding === selectedQuestion?.id}
      />

      {/* Add custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }

        /* For Firefox */
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #c1c1c1 #f1f1f1;
        }
      `}</style>
    </div>
  );
}

/* Question Card - Compact */
function QuestionCard({
  question,
  index,
  isAdding,
  onAdd,
  onView,
}: {
  question: Question;
  index: number;
  isAdding: boolean;
  onAdd: () => void;
  onView: () => void;
}) {
  const isCoding = question.type === 'coding';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`${panel} p-3 hover:shadow-md transition-shadow group cursor-pointer`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-xs font-semibold text-gray-900 group-hover:text-[#1B73E8] transition-colors line-clamp-2 leading-snug flex-1">
          {question.title}
        </h3>
        <span className={`${pill} shrink-0 ${
          question.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          question.difficulty === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
          'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {question.difficulty.toUpperCase()}
        </span>
      </div>

      {/* Type */}
      <div className="mb-2">
        <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${
          isCoding
            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            : 'bg-purple-50 text-purple-700 border border-purple-200'
        }`}>
          {isCoding ? 'CODING' : 'MCQ'}
        </span>
      </div>

      {/* Description */}
      <p className="text-[10px] text-gray-600 mb-2 line-clamp-2 leading-relaxed">
        {question.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {question.skillTags?.slice(0, 3).map(tag => (
          <span key={tag} className="px-1.5 py-0.5 bg-blue-50 text-[#1B73E8] rounded text-[9px] font-medium border border-blue-100">
            #{tag}
          </span>
        ))}
        {question.skillTags && question.skillTags.length > 3 && (
          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-medium">
            +{question.skillTags.length - 3}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAdd}
          disabled={isAdding}
          className="flex-1 px-3 py-1.5 bg-[#1B73E8] hover:bg-[#1557B0] text-white rounded-sm text-[10px] font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-1"
        >
          {isAdding ? (
            <>
              <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-sm animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              Add
            </>
          )}
        </button>
        
        <button 
          onClick={onView}
          className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-sm transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-gray-600" />
        </button>
      </div>
    </motion.div>
  );
}