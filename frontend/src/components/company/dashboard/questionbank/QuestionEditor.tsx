"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SimilaritySearch from "./SimilaritySearch";
import { API_V1_BASE } from "@/src/lib/config/api";
import type { Question as QuestionType } from "@/src/types/question.types";

import {
  Save,
  X,
  TestTube,
  Code,
  FileText,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Lightbulb,
  Terminal,
  FlaskConical,
  List,
  Check,
  Lock,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
} from "lucide-react";

interface QuestionEditorProps {
  question?: QuestionType;
  onSave: (question: Partial<QuestionType>) => void;
  onCancel: () => void;
  mode: "create" | "edit";
}

/* ---------------------------
   Diagram Viewer (HackerRank-ish)
---------------------------- */
const DiagramViewer: React.FC<{
  hasDiagram?: boolean;
  diagramType?: string | null;
  diagramCode?: string | null;
  diagramImageUrl?: string | null;
}> = ({ hasDiagram, diagramType, diagramCode, diagramImageUrl }) => {
  const hasAnyDiagram = !!(diagramImageUrl || diagramCode);
  const [zoom, setZoom] = React.useState(1);
  const [tab, setTab] = React.useState<"preview" | "code">(
    diagramImageUrl ? "preview" : "code"
  );
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    // If we only have code, force code tab
    if (!diagramImageUrl && diagramCode) setTab("code");
    // If we only have image, force preview tab
    if (diagramImageUrl && !diagramCode) setTab("preview");
  }, [diagramImageUrl, diagramCode]);

  const safeType = (diagramType || "diagram").toUpperCase();

  if (!hasAnyDiagram && !hasDiagram) return null;

  const copyCode = async () => {
    if (!diagramCode) return;
    try {
      await navigator.clipboard.writeText(diagramCode);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const openImage = () => {
    if (!diagramImageUrl) return;
    window.open(diagramImageUrl, "_blank", "noopener,noreferrer");
  };

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const ToolbarButton: React.FC<
    React.PropsWithChildren<{ onClick?: () => void; title: string; disabled?: boolean }>
  > = ({ onClick, title, disabled, children }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2.5 py-2 rounded-md border text-xs flex items-center gap-2 transition ${
        disabled
          ? "bg-white/5 border-white/10 text-white/40 cursor-not-allowed"
          : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
      }`}
    >
      {children}
    </button>
  );

  const Panel = (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* HackerRank-ish header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#1B73E8] to-[#1557B0] text-white flex items-center justify-center shadow-sm">
            {/* simple icon-like mark */}
            <span className="text-sm font-semibold">D</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-gray-900">Diagram</div>
            <div className="text-xs text-gray-500">
              Attached visual for the problem (ER / UML / flow / etc.)
            </div>
          </div>
        </div>

        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
          {safeType}
        </span>
      </div>

      {/* Body: HR-like split */}
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Left: preview canvas */}
        <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-gray-200">
          {/* Tabs */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-900">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("preview")}
                disabled={!diagramImageUrl}
                className={`px-3 py-1.5 rounded-md text-xs border transition ${
                  tab === "preview"
                    ? "bg-white/15 text-white border-white/20"
                    : "bg-transparent text-white/70 border-white/10 hover:bg-white/10"
                } ${!diagramImageUrl ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setTab("code")}
                disabled={!diagramCode}
                className={`px-3 py-1.5 rounded-md text-xs border transition ${
                  tab === "code"
                    ? "bg-white/15 text-white border-white/20"
                    : "bg-transparent text-white/70 border-white/10 hover:bg-white/10"
                } ${!diagramCode ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                Code
              </button>
            </div>

            {/* toolbar */}
            <div className="flex items-center gap-2">
              {tab === "preview" ? (
                <>
                  <ToolbarButton
                    title="Zoom out"
                    onClick={() => setZoom((z) => clamp(Number((z - 0.1).toFixed(2)), 0.6, 2.5))}
                    disabled={!diagramImageUrl}
                  >
                    <span className="text-base leading-none">−</span>
                  </ToolbarButton>

                  <ToolbarButton
                    title="Zoom in"
                    onClick={() => setZoom((z) => clamp(Number((z + 0.1).toFixed(2)), 0.6, 2.5))}
                    disabled={!diagramImageUrl}
                  >
                    <span className="text-base leading-none">+</span>
                  </ToolbarButton>

                  <ToolbarButton
                    title="Reset zoom"
                    onClick={() => setZoom(1)}
                    disabled={!diagramImageUrl}
                  >
                    <span className="text-xs">100%</span>
                  </ToolbarButton>

                  <ToolbarButton
                    title="Fullscreen"
                    onClick={() => setIsFullscreen(true)}
                    disabled={!diagramImageUrl}
                  >
                    <span className="text-xs">Full</span>
                  </ToolbarButton>

                  <ToolbarButton
                    title="Open in new tab"
                    onClick={openImage}
                    disabled={!diagramImageUrl}
                  >
                    <span className="text-xs">Open</span>
                  </ToolbarButton>
                </>
              ) : (
                <>
                  <ToolbarButton title="Copy code" onClick={copyCode} disabled={!diagramCode}>
                    <span className="text-xs">Copy</span>
                  </ToolbarButton>
                </>
              )}
            </div>
          </div>

          {/* content */}
          {tab === "preview" ? (
            <div className="relative bg-gray-950">
              {/* grid background like editors */}
              <div
                className="absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              />
              <div className="relative p-4 overflow-auto">
                {diagramImageUrl ? (
                  <div className="w-full flex justify-center">
                    <img
                      src={diagramImageUrl}
                      alt="Question diagram"
                      className="select-none rounded-lg shadow-2xl border border-white/10 bg-white"
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: "top center",
                        maxWidth: "100%",
                        height: "auto",
                      }}
                    />
                  </div>
                ) : (
                  <div className="p-6 text-white/70 text-sm">
                    Diagram flagged, but no image was provided.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-950 text-gray-100 p-4 overflow-auto">
              {diagramCode ? (
                <pre className="text-xs leading-relaxed whitespace-pre-wrap">
                  {diagramCode}
                </pre>
              ) : (
                <div className="text-white/70 text-sm">No diagram code was provided.</div>
              )}
            </div>
          )}
        </div>

        {/* Right: info panel (like HR “Problem” sidebar) */}
        <div className="lg:col-span-2 p-4 space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Display</div>
            <div className="text-sm text-gray-800 mt-1">
              {diagramImageUrl ? "Image preview available" : "No image preview"}
            </div>
            <div className="text-sm text-gray-800">
              {diagramCode ? "Mermaid/source code available" : "No code"}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Tip</div>
            <div className="text-sm text-gray-700 mt-1">
              Keep the diagram consistent with the schema/solution. A wrong relationship here will confuse candidates fast.
            </div>
          </div>

          {!hasAnyDiagram && hasDiagram ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="text-xs text-amber-700 font-semibold">Warning</div>
              <div className="text-sm text-amber-800 mt-1">
                Diagram is flagged as needed, but no image/code was provided.
              </div>
            </div>
          ) : null}

          {diagramImageUrl ? (
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="w-full px-4 py-2.5 rounded-lg bg-[#1B73E8] hover:bg-[#1557B0] text-white text-sm font-medium transition"
            >
              View Diagram Fullscreen
            </button>
          ) : null}

          {diagramCode ? (
            <button
              type="button"
              onClick={() => {
                setTab("code");
                copyCode();
              }}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-800 text-sm font-medium transition"
            >
              Copy Diagram Code
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {Panel}

      {/* Fullscreen modal */}
      {isFullscreen && diagramImageUrl ? (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <div
            className="w-full max-w-6xl max-h-[90vh] bg-gray-950 rounded-xl overflow-hidden border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 text-white">
              <div className="text-sm font-semibold">
                Diagram • <span className="text-white/70">{safeType}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs"
                  onClick={() => setZoom(1)}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs"
                  onClick={() => setIsFullscreen(false)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="relative overflow-auto p-4 max-h-[80vh]">
              <div
                className="absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              />
              <div className="relative w-full flex justify-center">
                <img
                  src={diagramImageUrl}
                  alt="Diagram fullscreen"
                  className="select-none rounded-lg shadow-2xl border border-white/10 bg-white"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "top center",
                    maxWidth: "100%",
                    height: "auto",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};


const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  onSave,
  onCancel,
  mode,
}) => {
  const [formData, setFormData] = useState<Partial<QuestionType>>({
    title: "",
    description: "",
    problemStatement: "",
    difficulty: "medium",
    skillTags: [],
    type: "coding",
    canonicalSolution: "",
    testCases: [{ input: "", output: "" }],
    status: "draft",

    // diagram
    hasDiagram: false,
    diagramType: null,
    diagramCode: null,
    diagramImageUrl: null,
    diagramMetadata: null,

    // mcq
    options: { A: "", B: "", C: "", D: "" },
    correctAnswer: "",
    explanation: "",
  });

  const [newTag, setNewTag] = useState("");
  const [activeTab, setActiveTab] = useState<
    "details" | "solution" | "tests" | "mcq"
  >("details");
  const [typeSelected, setTypeSelected] = useState(false);

  useEffect(() => {
    if (question) {
      setFormData(question);
      setActiveTab("details");
      setTypeSelected(true);
    }
  }, [question]);

  const handleAddTag = () => {
    if (newTag.trim() && !formData.skillTags?.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        skillTags: [...(prev.skillTags || []), newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skillTags: prev.skillTags?.filter((tag) => tag !== tagToRemove) || [],
    }));
  };

  const handleAddTestCase = () => {
    setFormData((prev) => ({
      ...prev,
      testCases: [...(prev.testCases || []), { input: "", output: "" }],
    }));
  };

  const handleTestCaseChange = (
    index: number,
    field: "input" | "output",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      testCases:
        prev.testCases?.map((testCase: { input: string; output: string }, i: number) =>
          i === index ? { ...testCase, [field]: value } : testCase
        ) || [],
    }));
  };

  const handleRemoveTestCase = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      testCases: prev.testCases?.filter((_: { input: string; output: string }, i: number) => i !== index) || [],
    }));
  };

  const handleOptionChange = (optionKey: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      options: { ...prev.options, [optionKey]: value } as any,
    }));
  };

  const handleMultipleCorrectAnswers = (answerKey: string) => {
    const currentAnswers = formData.correctAnswer
      ?.split(",")
      .filter(Boolean) || [];
    let newAnswers: string[];
    if (currentAnswers.includes(answerKey)) {
      newAnswers = currentAnswers.filter((a) => a !== answerKey);
    } else {
      newAnswers = [...currentAnswers, answerKey];
    }
    setFormData((prev) => ({
      ...prev,
      correctAnswer: newAnswers.sort().join(","),
    }));
  };

  const handleTypeChange = (newType: string) => {
    if (typeSelected) return;

    setFormData((prev) => {
      const updated = { ...prev, type: newType };

      if (newType === "mcq") {
        return {
          ...updated,
          options: updated.options || { A: "", B: "", C: "", D: "" },
          correctAnswer: updated.correctAnswer || "",
          explanation: updated.explanation || "",
          canonicalSolution: "",
          testCases: [],
        };
      }

      return {
        ...updated,
        canonicalSolution: updated.canonicalSolution || "",
        testCases:
          updated.testCases && (updated.testCases as any).length > 0
            ? updated.testCases
            : [{ input: "", output: "" }],
        options: { A: "", B: "", C: "", D: "" },
        correctAnswer: "",
        explanation: "",
      };
    });

    setActiveTab("details");
    setTypeSelected(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isMCQ = formData.type === "mcq";

    if (isMCQ) {
      if (
        !formData.options?.A ||
        !formData.options?.B ||
        !formData.options?.C ||
        !formData.options?.D
      ) {
        alert("Please fill in all 4 options (A, B, C, D)");
        return;
      }
      if (!formData.correctAnswer) {
        alert("Please select at least one correct answer");
        return;
      }
    } else {
      if (!formData.canonicalSolution?.trim()) {
        alert("Please provide a canonical solution");
        return;
      }
      if (!formData.testCases || (formData.testCases as any).length === 0) {
        alert("Please add at least one test case");
        return;
      }
      const hasEmptyTestCase = (formData.testCases as any).some(
        (tc: any) => !tc.input.trim() || !tc.output.trim()
      );
      if (hasEmptyTestCase) {
        alert("All test cases must have both input and output");
        return;
      }
    }

    onSave(formData);
  };

  const isMCQ = formData.type === "mcq";

  const tabs = isMCQ
    ? [
        { id: "details" as const, label: "Details", icon: FileText },
        { id: "mcq" as const, label: "MCQ Options", icon: List },
      ]
    : [
        { id: "details" as const, label: "Details", icon: FileText },
        { id: "solution" as const, label: "Solution", icon: Code },
        { id: "tests" as const, label: "Tests", icon: TestTube },
      ];

  useEffect(() => {
    const validTabIds = tabs.map((t) => t.id);
    if (!validTabIds.includes(activeTab)) setActiveTab("details");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.type]);

  const optionColors = {
    A: {
      bg: "from-blue-500 to-cyan-500",
      light: "bg-blue-50 border-blue-200 hover:border-blue-400",
      selected: "bg-blue-100 border-blue-500 ring-2 ring-blue-200",
    },
    B: {
      bg: "from-purple-500 to-pink-500",
      light: "bg-purple-50 border-purple-200 hover:border-purple-400",
      selected: "bg-purple-100 border-purple-500 ring-2 ring-purple-200",
    },
    C: {
      bg: "from-orange-500 to-red-500",
      light: "bg-orange-50 border-orange-200 hover:border-orange-400",
      selected: "bg-orange-100 border-orange-500 ring-2 ring-orange-200",
    },
    D: {
      bg: "from-emerald-500 to-teal-500",
      light: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
      selected: "bg-emerald-100 border-emerald-500 ring-2 ring-emerald-200",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] text-white flex-shrink-0">
          <div className="relative px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg tracking-tight">
                    {mode === "create" ? "Create New Question" : "Edit Question"}
                  </h2>
                  <p className="text-blue-100 text-xs">
                    {isMCQ ? "Multiple Choice Question" : "Coding Challenge"}
                  </p>
                </div>
              </div>

              <motion.button
                onClick={onCancel}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 hover:bg-white/20 rounded-sm transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Type Selector & Tabs */}
            <div className="flex items-center justify-between mt-4">
              {!typeSelected ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white">Select Type:</span>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      type="button"
                      onClick={() => handleTypeChange("coding")}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 rounded-sm text-xs transition-all flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 border border-white/30"
                    >
                      <Code className="w-4 h-4" />
                      Coding Challenge
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => handleTypeChange("mcq")}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 rounded-sm text-xs transition-all flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 border border-white/30"
                    >
                      <List className="w-4 h-4" />
                      Multiple Choice
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-sm border border-white/40">
                    <Lock className="w-4 h-4 text-white" />
                    <span className="text-xs text-white">Type:</span>
                    {isMCQ ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/80 rounded-sm">
                        <List className="w-4 h-4 text-white" />
                        <span className="text-xs text-white">
                          Multiple Choice
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/80 rounded-sm">
                        <Code className="w-4 h-4 text-white" />
                        <span className="text-xs text-white">
                          Coding Challenge
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {typeSelected && (
                <div className="flex gap-2">
                  {tabs.map((tab) => (
                    <motion.button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs transition-all ${
                        activeTab === tab.id
                          ? "bg-white text-[#1B73E8] shadow-md"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {!typeSelected ? (
            <div className="flex items-center justify-center h-full p-12">
              <div className="text-center max-w-md">
                <h3 className="text-2lg text-gray-900 mb-3">
                  Choose Question Type
                </h3>
                <p className="text-gray-600 mb-6">
                  Select whether you want to create a{" "}
                  <span className="text-blue-600">Coding Challenge</span> or a{" "}
                  <span className="text-purple-600">
                    Multiple Choice Question
                  </span>
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>Once selected, the question type cannot be changed</span>
                </div>
              </div>
            </div>
          ) : (
            <form id="question-editor-form" onSubmit={handleSubmit} className="p-6">
              <AnimatePresence mode="wait">
                {/* DETAILS */}
                {activeTab === "details" && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* Title & Difficulty */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-3">
                        <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                          Question Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.title || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8] focus:bg-white transition-all"
                          placeholder="Enter a descriptive title..."
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                          Difficulty
                        </label>
                        <select
                          value={formData.difficulty || "medium"}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              difficulty: e.target.value as any,
                            }))
                          }
                          className="w-full px-4 py-3 text-sm border rounded-sm focus:outline-none focus:ring-2 transition-all"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        Short Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        value={formData.description || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8] focus:bg-white transition-all resize-none"
                        placeholder="Brief description of the question..."
                      />
                    </div>

                    {/* Problem Statement */}
                    <div>
                      <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        Problem Statement <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          required
                          value={formData.problemStatement || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              problemStatement: e.target.value,
                            }))
                          }
                          rows={6}
                          className="w-full px-4 py-3 text-sm bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8] transition-all resize-y min-h-[150px]"
                          placeholder="Detailed problem statement with examples, constraints, and requirements..."
                        />
                        <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-white px-2 py-1 rounded-sm shadow-sm">
                          <span className="text-xs text-gray-500 font-medium">
                            {formData.problemStatement?.length || 0} chars
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ✅ Diagram */}
                    <DiagramViewer
                      hasDiagram={formData.hasDiagram}
                      diagramType={formData.diagramType}
                      diagramCode={formData.diagramCode}
                      diagramImageUrl={formData.diagramImageUrl}
                    />

                    {/* Skills Tags */}
                    <div>
                      <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        Skills Tags
                      </label>
                      <div className="bg-gray-50 border border-gray-200 rounded-sm p-4">
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddTag();
                              }
                            }}
                            className="flex-1 px-4 py-2 text-sm bg-white border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8]"
                            placeholder="Type a skill tag..."
                          />
                          <motion.button
                            type="button"
                            onClick={handleAddTag}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-5 py-2 text-sm bg-[#1B73E8] text-white rounded-sm hover:bg-[#1557B0] transition-colors flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add
                          </motion.button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <AnimatePresence>
                            {formData.skillTags?.map((tag) => (
                              <motion.span
                                key={tag}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full text-xs flex items-center gap-2 shadow-sm"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(tag)}
                                  className="hover:bg-white/20 rounded-full p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </motion.span>
                            ))}
                          </AnimatePresence>

                          {formData.skillTags?.length === 0 && (
                            <span className="text-sm text-gray-400 italic">
                              No tags added yet
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Similarity Search */}
                    <SimilaritySearch
                      onSimilarityCheck={async (query) => {
                        try {
                          const response = await fetch(
                            `${API_V1_BASE}/questions/check-similarity`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                text: query,
                                currentQuestion:
                                  mode === "edit" && question
                                    ? {
                                        id: question.id,
                                        title: formData.title,
                                        description: formData.description,
                                        problemStatement: formData.problemStatement,
                                      }
                                    : undefined,
                              }),
                            }
                          );

                          if (!response.ok)
                            throw new Error("Similarity check failed");
                          return await response.json();
                        } catch (error: any) {
                          console.error("Similarity check error:", error);
                          return {
                            success: false,
                            error: error.message,
                            similar_questions_found: 0,
                            duplication_risk: "unknown",
                          };
                        }
                      }}
                    />
                  </motion.div>
                )}

                {/* SOLUTION */}
                {activeTab === "solution" && !isMCQ && (
                  <motion.div
                    key="solution"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <Terminal className="w-4 h-4 text-[#1B73E8]" />
                          Canonical Solution <span className="text-red-500">*</span>
                        </label>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Used to validate test cases
                        </span>
                      </div>

                      <div className="relative">
                        <textarea
                          required
                          value={formData.canonicalSolution || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              canonicalSolution: e.target.value,
                            }))
                          }
                          rows={16}
                          className="w-full px-4 py-3 bg-gray-900 text-green-400 border border-gray-700 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#1B73E8] font-mono text-sm resize-y min-h-[400px]"
                          placeholder="def solution(input):&#10;    # Write your canonical solution here&#10;    pass"
                        />
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-sm text-xs">
                            SQL / Code
                          </span>
                          <span className="px-2 py-1 bg-gray-800 text-gray-400 rounded-sm text-xs">
                            {formData.canonicalSolution?.split("\n").length || 0} lines
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TESTS */}
                {activeTab === "tests" && !isMCQ && (
                  <motion.div
                    key="tests"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <FlaskConical className="w-4 h-4 text-[#1B73E8]" />
                          Test Cases <span className="text-red-500">*</span>
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-[#1B73E8] rounded-full text-xs">
                            {formData.testCases?.length || 0} cases
                          </span>
                        </label>
                        <motion.button
                          type="button"
                          onClick={handleAddTestCase}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-sm hover:bg-green-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Test Case
                        </motion.button>
                      </div>

                      <div className="space-y-4">
                        <AnimatePresence>
                          {formData.testCases?.map((testCase: any, index: number) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -100 }}
                              className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-sm p-4"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-[#1B73E8] text-white rounded-sm text-sm flex items-center justify-center">
                                    {index + 1}
                                  </div>
                                  <span className="text-sm text-gray-700">
                                    Test Case #{index + 1}
                                  </span>
                                </div>

                                {formData.testCases && formData.testCases.length > 1 && (
                                  <motion.button
                                    type="button"
                                    onClick={() => handleRemoveTestCase(index)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-2 text-red-600 hover:bg-red-100 rounded-sm transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </motion.button>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                                    <ArrowRight className="w-3 h-3" />
                                    Input
                                  </label>
                                  <textarea
                                    required
                                    value={testCase.input}
                                    onChange={(e) =>
                                      handleTestCaseChange(index, "input", e.target.value)
                                    }
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8] font-mono resize-none"
                                    placeholder="Test input..."
                                  />
                                </div>

                                <div>
                                  <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                                    <CheckCircle className="w-3 h-3" />
                                    Expected Output
                                  </label>
                                  <textarea
                                    required
                                    value={testCase.output}
                                    onChange={(e) =>
                                      handleTestCaseChange(index, "output", e.target.value)
                                    }
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8] font-mono resize-none"
                                    placeholder="Expected output..."
                                  />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* MCQ */}
                {activeTab === "mcq" && isMCQ && (
                  <motion.div
                    key="mcq"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-sm flex items-center justify-center shadow-lg">
                          <List className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-balg text-gray-800">
                            Multiple Choice Options
                          </h3>
                          <p className="text-xs text-gray-500">
                            Click on an option to mark it as correct
                          </p>
                        </div>
                      </div>

                      {formData.correctAnswer && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-sm shadow-lg"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">
                            Correct: {formData.correctAnswer.split(",").join(", ")}
                          </span>
                        </motion.div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {(["A", "B", "C", "D"] as const).map((optionKey) => {
                        const isSelected = formData.correctAnswer?.includes(optionKey);
                        const colors = (optionColors as any)[optionKey];

                        return (
                          <motion.div
                            key={optionKey}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.01, y: -2 }}
                            className={`relative border rounded-lg p-4 transition-all cursor-pointer shadow-sm hover:shadow-md ${
                              isSelected ? colors.selected : colors.light
                            }`}
                            onClick={() => handleMultipleCorrectAnswers(optionKey)}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className={`w-9 h-9 bg-gradient-to-r ${colors.bg} text-white rounded-sm flex items-center justify-center text-base shadow-md`}
                              >
                                {optionKey}
                              </div>

                              <motion.div
                                className={`w-6 h-6 rounded-sm border flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "bg-green-500 border-green-500 shadow-md"
                                    : "bg-white border-gray-300"
                                }`}
                                whileTap={{ scale: 0.9 }}
                              >
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 500 }}
                                  >
                                    <Check className="w-4 h-4 text-white" />
                                  </motion.div>
                                )}
                              </motion.div>

                              <span
                                className={`text-xs ${
                                  isSelected ? "text-green-700" : "text-gray-500"
                                }`}
                              >
                                {isSelected ? "✓ Correct Answer" : "Click to mark correct"}
                              </span>
                            </div>

                            <textarea
                              required
                              value={(formData.options as any)?.[optionKey] || ""}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleOptionChange(optionKey, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              rows={3}
                              className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-none"
                              placeholder={`Enter option ${optionKey}...`}
                            />

                            {isSelected && (
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-b-2xl"
                              />
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-sm flex items-center justify-center shadow-md">
                          <Lightbulb className="w-4 h-4 text-white" />
                        </div>
                        <label className="text-sm text-gray-700">
                          Explanation (Why is this the correct answer?)
                        </label>
                      </div>
                      <textarea
                        value={formData.explanation || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            explanation: e.target.value,
                          }))
                        }
                        rows={4}
                        className="w-full px-4 py-3 text-sm bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-y min-h-[100px]"
                        placeholder="Explain why the selected answer(s) are correct and why other options are incorrect..."
                      />
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-sm">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <span className="font-semibold">Tips:</span> You can select
                        multiple correct answers for questions with more than one valid
                        response.
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          )}
        </div>

        {/* Footer */}
        {typeSelected && (
          <div className="bg-gray-50 border-t-2 border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <AlertCircle className="w-4 h-4" />
                <span>Fields marked with</span>
                <span className="text-red-500">*</span>
                <span>are required</span>
                <span className="mx-2">•</span>
                <span className={`${isMCQ ? "text-purple-600" : "text-blue-600"}`}>
                  {isMCQ ? "MCQ Question" : "Coding Challenge"}
                </span>
              </div>

              <div className="flex gap-3">
                <motion.button
                  type="button"
                  onClick={onCancel}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-100 transition-all flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </motion.button>

                <motion.button
                  type="submit"
                  form="question-editor-form"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2.5 text-sm bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white rounded-sm hover:shadow-lg transition-all flex items-center gap-2"
                >
                  {mode === "create" ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Create Question
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </motion.button>

              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default QuestionEditor;
