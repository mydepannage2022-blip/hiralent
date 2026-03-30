"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Code2,
  FileText,
  Terminal,
  Copy,
  Check,
  List,
  Info,
} from "lucide-react";
import { useAuth } from "../../../../../src/context/AuthContext";

// ===================== Types =====================
type QuestionType = "coding" | "mcq" | string;
type Difficulty = "easy" | "medium" | "hard" | string;

type Question = {
  id: string;
  title: string;
  description: string;
  problemStatement?: string;
  difficulty: Difficulty;
  type: QuestionType;
  skillTags: string[];

  canonicalSolution?: string;
  testCases?: any;

  options?: Record<string, string>;
  correctAnswer?: string;
  explanation?: string;

  source?: string;
  aiGenerated?: boolean;

  // diagram fields (same as QuestionEditor)
  hasDiagram?: boolean;
  diagramType?: string | null;
  diagramCode?: string | null;
  diagramImageUrl?: string | null;
};

// ===================== Helpers =====================
function sanitizeMarkdown(input: string) {
  let s = String(input ?? "");

  // normalize line endings
  s = s.replace(/\r\n/g, "\n");

  // remove horizontal rules
  s = s.replace(/^\s*[-*_]{3,}\s*$/gm, "");

  // remove headings markers (#, ##, ###...)
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "");

  // convert bold/italic markers to plain text
  // **text** or __text__  => text
  s = s.replace(/\*\*(.*?)\*\*/g, "$1");
  s = s.replace(/__(.*?)__/g, "$1");

  // *text* or _text_ => text (avoid breaking bullets: "- * item")
  s = s.replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1$2");
  s = s.replace(/(^|[^_])_(?!\s)([^_]+?)_(?!_)/g, "$1$2");

  // markdown links [text](url) => text
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

  // blockquotes ">" => remove marker
  s = s.replace(/^\s*>\s?/gm, "");

  return s.trim();
}

// ===================== Pretty text formatting =====================
function FormattedProblemText({ text }: { text: string }) {
  const nodes = useMemo(() => {
    const clean = sanitizeMarkdown(text);
    const lines = clean.split("\n");
    const out: React.ReactNode[] = [];

    let inList = false;
    let listItems: string[] = [];

    const flushList = (key: string) => {
      if (!inList || listItems.length === 0) return;
      out.push(
        <ul
          key={key}
          className="ml-5 list-disc space-y-1 text-sm text-gray-700"
        >
          {listItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      );
      inList = false;
      listItems = [];
    };

    lines.forEach((raw, idx) => {
      const line = raw.trim();

      if (!line) {
        flushList(`list-${idx}`);
        out.push(<div key={`sp-${idx}`} className="h-2" />);
        return;
      }

      // bullets: "- item" or "• item"
      if (/^[-•]\s+/.test(line)) {
        inList = true;
        listItems.push(line.replace(/^[-•]\s+/, ""));
        return;
      }

      flushList(`list-${idx}`);

      // heading-ish: ends with ":" and short
      if (line.endsWith(":") && line.length < 120) {
        out.push(
          <h4
            key={`h-${idx}`}
            className="mt-4 text-sm font-semibold text-gray-900"
          >
            {line}
          </h4>
        );
        return;
      }

      // inline code: `code`
      const parts = line.split(/(`[^`]+`)/g).map((p, i) => {
        if (p.startsWith("`") && p.endsWith("`")) {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono text-[12px] text-[#1B73E8]"
            >
              {p.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={i}>{p}</React.Fragment>;
      });

      out.push(
        <p key={`p-${idx}`} className="text-sm text-gray-700 leading-relaxed">
          {parts}
        </p>
      );
    });

    flushList("list-final");
    return out;
  }, [text]);

  return <div className="space-y-2">{nodes}</div>;
}

// ===================== Diagram Viewer (read-only, mirrors QuestionEditor) =====================
function DiagramViewer({
  hasDiagram,
  diagramType,
  diagramCode,
  diagramImageUrl,
}: {
  hasDiagram?: boolean;
  diagramType?: string | null;
  diagramCode?: string | null;
  diagramImageUrl?: string | null;
}) {
  const hasAnyDiagram = !!(diagramImageUrl || diagramCode);
  const [zoom, setZoom] = useState(1);
  const [tab, setTab] = useState<"preview" | "code">(
    diagramImageUrl ? "preview" : "code"
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!diagramImageUrl && diagramCode) setTab("code");
    if (diagramImageUrl && !diagramCode) setTab("preview");
  }, [diagramImageUrl, diagramCode]);

  if (!hasAnyDiagram && !hasDiagram) return null;

  const safeType = (diagramType || "diagram").toUpperCase();
  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

  const copyCode = async () => {
    if (!diagramCode) return;
    try {
      await navigator.clipboard.writeText(diagramCode);
    } catch {}
  };

  const TBtn = ({
    onClick,
    title,
    disabled,
    children,
  }: React.PropsWithChildren<{
    onClick?: () => void;
    title: string;
    disabled?: boolean;
  }>) => (
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

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#1B73E8] to-[#1557B0] text-white flex items-center justify-center shadow-sm">
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

        <div>
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
            <div className="flex items-center gap-2">
              {tab === "preview" ? (
                <>
                  <TBtn
                    title="Zoom out"
                    onClick={() =>
                      setZoom((z) => clamp(+(z - 0.1).toFixed(2), 0.6, 2.5))
                    }
                    disabled={!diagramImageUrl}
                  >
                    <span className="text-base leading-none">−</span>
                  </TBtn>
                  <TBtn
                    title="Zoom in"
                    onClick={() =>
                      setZoom((z) => clamp(+(z + 0.1).toFixed(2), 0.6, 2.5))
                    }
                    disabled={!diagramImageUrl}
                  >
                    <span className="text-base leading-none">+</span>
                  </TBtn>
                  <TBtn
                    title="Reset zoom"
                    onClick={() => setZoom(1)}
                    disabled={!diagramImageUrl}
                  >
                    <span className="text-xs">100%</span>
                  </TBtn>
                  <TBtn
                    title="Fullscreen"
                    onClick={() => setIsFullscreen(true)}
                    disabled={!diagramImageUrl}
                  >
                    <span className="text-xs">Full</span>
                  </TBtn>
                  <TBtn
                    title="Open in new tab"
                    onClick={() =>
                      diagramImageUrl &&
                      window.open(diagramImageUrl, "_blank", "noopener,noreferrer")
                    }
                    disabled={!diagramImageUrl}
                  >
                    <span className="text-xs">Open</span>
                  </TBtn>
                </>
              ) : (
                <TBtn title="Copy code" onClick={copyCode} disabled={!diagramCode}>
                  <span className="text-xs">Copy</span>
                </TBtn>
              )}
            </div>
          </div>

          {tab === "preview" ? (
            <div className="relative bg-gray-950 min-h-[220px]">
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
            <div className="bg-gray-950 text-gray-100 p-4 overflow-auto min-h-[120px]">
              {diagramCode ? (
                <pre className="text-xs leading-relaxed whitespace-pre-wrap">
                  {diagramCode}
                </pre>
              ) : (
                <div className="text-white/70 text-sm">
                  No diagram code was provided.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isFullscreen && diagramImageUrl && (
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
            <div className="overflow-auto p-4 max-h-[80vh] flex justify-center">
              <img
                src={diagramImageUrl}
                alt="Question diagram fullscreen"
                className="rounded-lg border border-white/10 bg-white"
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
      )}
    </>
  );
}

// ===================== Modal =====================
function QuestionDetailModal({
  question,
  isOpen,
  onClose,
}: {
  question: Question | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"description" | "solution" | "testcases">(
    "description"
  );

  const isCoding = String(question?.type).toLowerCase() === "coding";
  const isMCQ = String(question?.type).toLowerCase() === "mcq";

  const statement = question?.problemStatement || question?.description || "";

  const testCases = useMemo(() => {
    const tc = question?.testCases;
    if (!tc) return [];
    if (Array.isArray(tc)) return tc;
    if (tc.examples) return tc.examples;
    if (tc.inputs && tc.outputs) {
      return (tc.inputs as any[]).map((input, i) => ({
        input,
        output: tc.outputs?.[i],
      }));
    }
    return [];
  }, [question?.testCases]);

  const onCopy = async () => {
    if (!question?.canonicalSolution) return;
    await navigator.clipboard.writeText(question.canonicalSolution);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && question && (
        <motion.div
          key="q-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Close overlay"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="relative w-full max-w-5xl h-[92vh] bg-white overflow-hidden flex flex-col rounded-xl shadow-2xl border border-gray-200"
          >
            <div className="px-6 py-5 bg-gradient-to-r from-[#1B73E8] via-[#1565D8] to-[#1557B0] text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[11px] px-2 py-1 rounded border bg-white/10 text-white border-white/20">
                      {String(question.difficulty).toUpperCase()}
                    </span>
                    <span className="text-[11px] px-2 py-1 rounded border bg-white/10 text-white border-white/20">
                      {isCoding ? "CODING" : "MCQ"}
                    </span>
                    {question.aiGenerated && (
                      <span className="text-[11px] px-2 py-1 rounded border bg-white/10 text-white border-white/20">
                        AI
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold leading-snug break-words">
                    {question.title}
                  </h2>

                  {(question.skillTags ?? []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.skillTags.slice(0, 10).map((t) => (
                        <span
                          key={t}
                          className="text-[11px] px-2 py-1 bg-white/15 border border-white/25 rounded-lg"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/15 rounded-lg transition"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-3 border-b bg-white">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTab("description")}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    tab === "description"
                      ? "bg-[#1B73E8] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Description
                  </span>
                </button>

                {isCoding && question.canonicalSolution && (
                  <button
                    onClick={() => setTab("solution")}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      tab === "solution"
                        ? "bg-[#1B73E8] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Code2 className="w-4 h-4" />
                      Solution
                    </span>
                  </button>
                )}

                {isCoding && testCases.length > 0 && (
                  <button
                    onClick={() => setTab("testcases")}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      tab === "testcases"
                        ? "bg-[#1B73E8] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      Test cases
                      <span className="text-[10px] px-2 py-0.5 rounded bg-black/10">
                        {testCases.length}
                      </span>
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
              {tab === "description" && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
                  <DiagramViewer
                    hasDiagram={question?.hasDiagram}
                    diagramType={question?.diagramType}
                    diagramCode={question?.diagramCode}
                    diagramImageUrl={question?.diagramImageUrl}
                  />

                  <div className="text-[15px] leading-7">
                    <FormattedProblemText text={statement} />
                  </div>
                </div>
              )}

              {isMCQ && tab === "description" && (
                <div className="mt-5 space-y-4">
                  {question.options && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <List className="w-4 h-4 text-[#1B73E8]" />
                        Answer options
                      </h3>

                      <div className="space-y-2.5">
                        {Object.entries(question.options).map(([key, val]) => {
                          const correct = (question.correctAnswer ?? "").includes(
                            key
                          );
                          return (
                            <div
                              key={key}
                              className={`p-4 rounded-xl border ${
                                correct
                                  ? "border-emerald-300 bg-emerald-50"
                                  : "border-gray-200 bg-white"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                    correct
                                      ? "bg-emerald-500 text-white"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {key}
                                </div>
                                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                  {val}
                                </p>
                              </div>
                              {correct && (
                                <div className="mt-2 text-xs font-semibold text-emerald-700">
                                  ✅ Correct answer
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {question.explanation && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#1B73E8]" />
                        Explanation
                      </h3>
                      <div className="text-[15px] leading-7">
                        <FormattedProblemText text={question.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isCoding && tab === "solution" && question.canonicalSolution && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-[#1B73E8]" />
                      Canonical solution
                    </h3>

                    <button
                      onClick={onCopy}
                      className="px-3 py-2 rounded-lg bg-[#1B73E8] hover:bg-[#1557B0] text-white text-xs font-semibold inline-flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="w-3 h-3 rounded-full bg-yellow-400" />
                          <span className="w-3 h-3 rounded-full bg-emerald-500" />
                        </div>
                        <span className="text-xs text-gray-300 ml-2 font-medium">
                          solution.ts
                        </span>
                      </div>

                      <span className="text-[11px] text-gray-400">Read-only</span>
                    </div>

                    <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm leading-relaxed">
                      <code>{question.canonicalSolution}</code>
                    </pre>
                  </div>
                </div>
              )}

              {isCoding && tab === "testcases" && testCases.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#1B73E8]" />
                    Test cases
                  </h3>

                  <div className="space-y-3">
                    {testCases.map((tc: any, i: number) => (
                      <div
                        key={i}
                        className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                      >
                        <div className="text-xs font-semibold text-gray-700 mb-2">
                          Test case {i + 1}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-[11px] font-bold text-[#1B73E8] mb-1">
                              Input
                            </div>
                            <pre className="bg-white border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto">
                              {typeof tc.input === "object"
                                ? JSON.stringify(tc.input, null, 2)
                                : String(tc.input)}
                            </pre>
                          </div>

                          <div>
                            <div className="text-[11px] font-bold text-[#1B73E8] mb-1">
                              Expected output
                            </div>
                            <pre className="bg-white border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto">
                              {typeof tc.output === "object"
                                ? JSON.stringify(tc.output, null, 2)
                                : String(tc.output ?? tc.expected_output ?? "")}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-white flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ===================== Page =====================
export default function QuestionDetailsPage() {
  const params = useParams<{ questionId: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const questionId = useMemo(() => params?.questionId, [params]);

  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  useEffect(() => {
    const run = async () => {
      if (!questionId) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `http://localhost:5000/api/v1/questions/${questionId}`,
          { headers: authHeaders }
        );

        const data = await res.json();
        const q: Question | null =
          data?.question ?? data?.result ?? data?.data ?? data ?? null;

        if (!res.ok) throw new Error(data?.error || "Failed to load question");
        if (!q?.id) throw new Error("Question payload invalid");

        setQuestion(q);
      } catch (e: any) {
        setError(e?.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [questionId, authHeaders]);

  return (
    <div>
      {loading && (
        <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-600">
          Loading question...
        </div>
      )}

      {!loading && error && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <div className="text-sm text-red-600 font-semibold">{error}</div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-semibold"
          >
            Go back
          </button>
        </div>
      )}

      {!loading && !error && (
        <QuestionDetailModal
          question={question}
          isOpen={open}
          onClose={() => {
            setOpen(false);
            router.back();
          }}
        />
      )}
    </div>
  );
}