"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Play,
  Settings,
  Copy,
  X,
  Sun,
  Moon,
  Command,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Code2,
  Lock,
  ListChecks,
  Shield,
  Timer,
  Loader2,
  Send,
  ChevronDown,
  Plus,
  Trash2,
  Files as FilesIcon,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

import {
  useAssessmentSession,
  useSessionQuestions,
  useSessionAnswers,
  useSaveAnswer,
  useRunCoding,
  useGetSubmission,
  useSubmitSession,
  useTelemetry,
  usePatchNavigation,
} from "@/src/lib/assessments/candidateAssessment.queries";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

/* ================================
   Types (UI normalized)
================================ */

type UiChoice = {
  id: string;    // unique for UI rendering (questionId::rawId)
  rawId: string; // original option id — sent to backend
  text: string;
};

type UiQuestion = {
  questionId: string;
  order?: number;
  points?: number;
  section?: string | null;
  type: "CODING" | "MCQ";
  title: string;
  difficulty?: string;
  statement?: string;
  constraints?: string[];
  examples?: { input: string; output: string; explanation?: string }[];
  choices?: UiChoice[];
  functionSignature?: string;
  // language locking (real assessment may have required lang)
  requiredLanguage?: string | null;
  allowedLanguages?: string[] | null;
  // diagram fields
  hasDiagram?: boolean | null;
  diagramType?: string | null;
  diagramCode?: string | null;
  diagramImageUrl?: string | null;
};

type UiRunTest = {
  input?: string;
  expected?: string;
  actual?: string;
  output?: string;
  stderr?: string;
  passed: boolean;
  memKb?: number;
  durationMs?: number;
};

type UiRunResult = {
  submission_id: string;
  status: string;
  score: number;
  total: number;
  passed: number;
  results: UiRunTest[];
  stdout?: string | null;
  stderr?: string | null;
  runtimeMs?: number | null;
  memoryKb?: number | null;
  raw?: unknown;
};

type Prefs = { theme: "light" | "dark"; fontSize: number };

type CodeFile = { id: string; name: string; language: string; code: string };

type TerminalLog = {
  message: string;
  type: "command" | "output" | "error" | "info";
  timestamp: string;
};

/* ================================
   Helpers
================================ */

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function msToClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0)
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function getDifficultyColor(difficulty?: string) {
  switch ((difficulty || "").toLowerCase()) {
    case "easy":   return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "hard":   return "bg-rose-100 text-rose-700 border-rose-300";
    default:       return "bg-slate-100 text-slate-700 border-slate-300";
  }
}

function extForLang(lang: string) {
  switch ((lang || "").toLowerCase()) {
    case "javascript":
    case "javascript-node":   return "js";
    case "typescript":
    case "typescript-strict": return "ts";
    case "java":              return "java";
    case "cpp":
    case "c++":               return "cpp";
    case "c":                 return "c";
    case "go":                return "go";
    case "csharp":            return "cs";
    case "ruby":              return "rb";
    case "rust":              return "rs";
    case "kotlin":            return "kt";
    case "swift":             return "swift";
    case "php":               return "php";
    case "scala":             return "scala";
    case "perl":              return "pl";
    case "r":                 return "r";
    case "dart":              return "dart";
    case "elixir":            return "ex";
    case "haskell":           return "hs";
    case "lua":               return "lua";
    case "bash":              return "sh";
    case "sql":               return "sql";
    case "python-numpy":
    case "python-ml":         return "py";
    default:                  return "py";
  }
}

function normalizeLang(lang: string | null | undefined) {
  return String(lang || "").trim().toLowerCase();
}

/**
 * Default editor template — NO main/entrypoint injected.
 * Backend runner handles harness wrapping.
 */
function defaultTemplateWithoutMain(language: string): string {
  switch (normalizeLang(language)) {
    case "javascript":
      return `// Write your solution here\n`;
    case "javascript-node":
      return `// Node.js — built-ins available (fs, path, crypto, stream…)\n// Write your solution here\n`;
    case "typescript":
    case "typescript-strict":
      return `// Write your solution here\n`;
    case "java":
      return `class Solution {\n    // Write your solution here\n}\n`;
    case "cpp":
    case "c++":
      return `#include <bits/stdc++.h>\nusing namespace std;\n\n// Write your solution here\n`;
    case "c":
      return `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\n// Write your solution here\n`;
    case "go":
      return `package main\n\n// Write your solution here\n`;
    case "csharp":
      return `using System;\nusing System.Collections.Generic;\nusing System.Linq;\n\n// Write your solution here\n`;
    case "rust":
      return `// Write your solution here\n`;
    case "kotlin":
      return `// Write your solution here\n`;
    case "swift":
      return `import Foundation\n\n// Write your solution here\n`;
    case "php":
      return `<?php\n// Write your solution here\n`;
    case "scala":
      return `object Solution {\n  // Write your solution here\n}\n`;
    case "perl":
      return `#!/usr/bin/perl\nuse strict;\nuse warnings;\n\n# Write your solution here\n`;
    case "r":
      return `# Write your solution here\n`;
    case "dart":
      return `// Write your solution here\n`;
    case "elixir":
      return `defmodule Solution do\n  # Write your solution here\nend\n`;
    case "haskell":
      return `module Solution where\n\n-- Write your solution here\n`;
    case "lua":
      return `-- Write your solution here\n`;
    case "bash":
      return `#!/bin/bash\n# Write your solution here\n`;
    case "sql":
      return `-- Write your SQL query here\n-- SELECT ...\n`;
    case "python-numpy":
      return `import numpy as np\nimport pandas as pd\nfrom collections import defaultdict, Counter\nfrom typing import List, Optional\n\n# Write your solution here\n`;
    case "python-ml":
      return `import numpy as np\nimport pandas as pd\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.model_selection import train_test_split\nfrom typing import List, Optional\n\n# Write your solution here\n`;
    default:
      return `from typing import List, Optional, Dict, Tuple\nfrom collections import defaultdict, Counter\nimport heapq\n\n# Write your solution here\n`;
  }
}

function extractNiceError(e: unknown) {
  const msg = String((e as any)?.message ?? e ?? "Unknown error");
  return msg.length > 600 ? msg.slice(0, 600) + "…" : msg;
}

function toNumber(x: any): number | null {
  const n = typeof x === "number" ? x : typeof x === "string" ? Number(x) : NaN;
  return Number.isFinite(n) ? n : null;
}

/* ================================
   Language catalog
================================ */

const ALL_LANG_OPTIONS: { value: string; label: string; group?: string }[] = [
  // ── Python ──────────────────────────────────────────────────────────────────
  { value: "python",           label: "Python",                 group: "Python"  },
  { value: "python-numpy",     label: "Python · NumPy / Pandas",group: "Python"  },
  { value: "python-ml",        label: "Python · ML (sklearn)",  group: "Python"  },
  // ── JavaScript / TypeScript ─────────────────────────────────────────────────
  { value: "javascript",       label: "JavaScript",             group: "JS / TS" },
  { value: "javascript-node",  label: "JavaScript · Node.js",   group: "JS / TS" },
  { value: "typescript",       label: "TypeScript",             group: "JS / TS" },
  { value: "typescript-strict",label: "TypeScript (Strict)",    group: "JS / TS" },
  // ── JVM ─────────────────────────────────────────────────────────────────────
  { value: "java",             label: "Java",                   group: "JVM"     },
  { value: "kotlin",           label: "Kotlin",                 group: "JVM"     },
  { value: "scala",            label: "Scala",                  group: "JVM"     },
  // ── Systems ─────────────────────────────────────────────────────────────────
  { value: "cpp",              label: "C++",                    group: "Systems" },
  { value: "c",                label: "C",                      group: "Systems" },
  { value: "rust",             label: "Rust",                   group: "Systems" },
  { value: "go",               label: "Go",                     group: "Systems" },
  // ── Mobile / Other compiled ─────────────────────────────────────────────────
  { value: "swift",            label: "Swift",                  group: "Mobile"  },
  { value: "dart",             label: "Dart",                   group: "Mobile"  },
  // ── Scripting ───────────────────────────────────────────────────────────────
  { value: "ruby",             label: "Ruby",                   group: "Scripting"},
  { value: "php",              label: "PHP",                    group: "Scripting"},
  { value: "perl",             label: "Perl",                   group: "Scripting"},
  { value: "lua",              label: "Lua",                    group: "Scripting"},
  { value: "bash",             label: "Bash / Shell",           group: "Scripting"},
  // ── Functional ──────────────────────────────────────────────────────────────
  { value: "haskell",          label: "Haskell",                group: "Functional"},
  { value: "elixir",           label: "Elixir",                 group: "Functional"},
  // ── Data / Query ────────────────────────────────────────────────────────────
  { value: "r",                label: "R",                      group: "Data"    },
  { value: "sql",              label: "SQL",                    group: "Data"    },
  // ── .NET ────────────────────────────────────────────────────────────────────
  { value: "csharp",           label: "C#",                     group: ".NET"    },
];

/* ================================
  Mini Markdown renderer (no libs)
================================ */

function formatInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const pushText = (t: string) => {
    if (!t) return;
    nodes.push(<React.Fragment key={`t-${key++}`}>{t}</React.Fragment>);
  };

  while (i < text.length) {
    if (text[i] === "`") {
      const j = text.indexOf("`", i + 1);
      if (j !== -1) {
        const code = text.slice(i + 1, j);
        nodes.push(
          <code key={`c-${key++}`} className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[12px]">
            {code}
          </code>
        );
        i = j + 1;
        continue;
      }
    }

    if (text.slice(i, i + 2) === "**") {
      const j = text.indexOf("**", i + 2);
      if (j !== -1) {
        const inner = text.slice(i + 2, j);
        nodes.push(<strong key={`b-${key++}`} className="font-semibold">{inner}</strong>);
        i = j + 2;
        continue;
      }
    }

    if (text[i] === "*") {
      const j = text.indexOf("*", i + 1);
      if (j !== -1) {
        const inner = text.slice(i + 1, j);
        nodes.push(<em key={`i-${key++}`} className="italic">{inner}</em>);
        i = j + 1;
        continue;
      }
    }

    const nextCandidates = [text.indexOf("`", i), text.indexOf("**", i), text.indexOf("*", i)]
      .filter((x) => x !== -1)
      .sort((a, b) => a - b);
    const next = nextCandidates.length ? nextCandidates[0] : -1;

    if (next === -1) { pushText(text.slice(i)); break; }
    else { pushText(text.slice(i, next)); i = next; }
  }

  return nodes;
}

/* ── LangDropdown ─────────────────────────────────────────────
   Custom language selector — fixes native <select> invisible
   options in dark mode.                                        */
function LangDropdown({
  value, options, onChange, disabled, isLight,
}: {
  value: string;
  options: { value: string; label: string; group?: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
  isLight: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value) ?? options[0];

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Build grouped list
  const grouped: { group: string; items: typeof options }[] = [];
  for (const opt of options) {
    const g = opt.group ?? "Other";
    const existing = grouped.find(x => x.group === g);
    if (existing) existing.items.push(opt);
    else grouped.push({ group: g, items: [opt] });
  }

  const menuBg   = isLight ? "bg-white border-slate-200 shadow-xl"         : "bg-[#1a1f2e] border-[#3d4451] shadow-2xl";
  const groupLbl = isLight ? "text-slate-400"                               : "text-slate-500";
  const itemHov  = isLight ? "hover:bg-blue-50 hover:text-blue-700"        : "hover:bg-[#1B73E8]/15 hover:text-cyan-300";
  const itemSel  = isLight ? "bg-blue-50 text-blue-700 font-semibold"      : "bg-[#1B73E8]/25 text-cyan-300 font-semibold";
  const itemDef  = isLight ? "text-slate-700"                               : "text-slate-300";
  const divider  = isLight ? "border-slate-100"                             : "border-[#2d3451]";
  const trigBg   = isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-[#2d3139] border-[#3d4451] text-slate-100";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 border text-sm font-medium transition-all ${trigBg} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:brightness-95"}`}
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isLight ? "bg-blue-500" : "bg-cyan-400"}`} />
        <span>{selected?.label ?? value}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform text-slate-400 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-1 z-50 rounded-xl border overflow-y-auto ${menuBg}`}
          style={{ minWidth: "200px", maxHeight: "320px" }}>
          {grouped.map((grp, gi) => (
            <div key={grp.group}>
              {gi > 0 && <div className={`border-t ${divider}`} />}
              <div className={`px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest ${groupLbl}`}>
                {grp.group}
              </div>
              {grp.items.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                    opt.value === value ? itemSel : `${itemDef} ${itemHov}`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── RunnerDiagramViewer ──────────────────────────────────────
   Renders a question's diagram (image + optional code) inside
   the runner. Respects the runner's existing isLight theme.   */
function RunnerDiagramViewer({
  hasDiagram, diagramType, diagramCode, diagramImageUrl, isLight,
}: {
  hasDiagram?: boolean | null;
  diagramType?: string | null;
  diagramCode?: string | null;
  diagramImageUrl?: string | null;
  isLight: boolean;
}) {
  const hasAny = !!(diagramImageUrl || diagramCode);
  const [tab, setTab] = React.useState<"preview" | "code">(diagramImageUrl ? "preview" : "code");
  const [zoom, setZoom] = React.useState(1);
  const [fullscreen, setFullscreen] = React.useState(false);

  React.useEffect(() => {
    if (diagramImageUrl) setTab("preview");
    else if (diagramCode) setTab("code");
  }, [diagramImageUrl, diagramCode]);

  if (!hasAny && !hasDiagram) return null;

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const safeType = (diagramType || "diagram").toUpperCase();

  const border  = isLight ? "border-slate-200"  : "border-[#3d4451]";
  const headerBg = isLight ? "bg-slate-50"       : "bg-[#1e2330]";
  const bodyBg  = isLight ? "bg-slate-100"       : "bg-[#181d28]";
  const labelTxt = isLight ? "text-slate-500"    : "text-slate-400";
  const titleTxt = isLight ? "text-slate-800"    : "text-slate-100";
  const badgeCls = isLight
    ? "bg-blue-50 text-blue-700 border border-blue-100"
    : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
  const tabActive = isLight
    ? "bg-white border-slate-300 text-slate-800 shadow-sm"
    : "bg-white/15 border-white/20 text-white";
  const tabIdle   = isLight
    ? "text-slate-400 border-transparent hover:bg-slate-200"
    : "text-white/50 border-transparent hover:bg-white/10";
  const toolBtn   = isLight
    ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10";
  const canvasBg  = isLight ? "bg-slate-200"     : "bg-[#0e1219]";

  return (
    <>
      <div className={`rounded-xl border ${border} overflow-hidden`}>
        {/* header */}
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${border} ${headerBg}`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1B73E8] to-[#1557B0] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              D
            </div>
            <div>
              <div className={`text-xs font-semibold ${titleTxt}`}>Diagram</div>
              <div className={`text-[10px] ${labelTxt}`}>Visual attached to this problem</div>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeCls}`}>{safeType}</span>
        </div>

        {/* tab bar */}
        <div className={`flex items-center justify-between px-3 py-2 border-b ${border} ${bodyBg}`}>
          <div className="flex items-center gap-1.5">
            {(["preview", "code"] as const).map(t => (
              <button key={t} type="button"
                disabled={t === "preview" ? !diagramImageUrl : !diagramCode}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-md text-xs border transition ${
                  tab === t ? tabActive : tabIdle
                } disabled:opacity-30 disabled:cursor-not-allowed`}>
                {t === "preview" ? "Preview" : "Code"}
              </button>
            ))}
          </div>
          {/* toolbar */}
          <div className="flex items-center gap-1.5">
            {tab === "preview" && diagramImageUrl ? (
              <>
                {([["−", -0.15], ["+", +0.15]] as [string, number][]).map(([lbl, delta]) => (
                  <button key={lbl} type="button"
                    className={`w-7 h-7 rounded-md border text-sm flex items-center justify-center transition ${toolBtn}`}
                    onClick={() => setZoom(z => clamp(+(z + delta).toFixed(2), 0.5, 3))}>
                    {lbl}
                  </button>
                ))}
                <button type="button"
                  className={`px-2 py-1 rounded-md border text-[10px] transition ${toolBtn}`}
                  onClick={() => setZoom(1)}>100%</button>
                <button type="button"
                  className={`px-2 py-1 rounded-md border text-[10px] transition ${toolBtn}`}
                  onClick={() => setFullscreen(true)}>Full</button>
                <button type="button"
                  className={`px-2 py-1 rounded-md border text-[10px] transition ${toolBtn}`}
                  onClick={() => window.open(diagramImageUrl, "_blank", "noopener,noreferrer")}>Open↗</button>
              </>
            ) : tab === "code" && diagramCode ? (
              <button type="button"
                className={`px-2 py-1 rounded-md border text-[10px] transition ${toolBtn}`}
                onClick={() => navigator.clipboard.writeText(diagramCode).catch(() => {})}>Copy</button>
            ) : null}
          </div>
        </div>

        {/* content */}
        {tab === "preview" ? (
          <div className={`relative ${canvasBg} min-h-[180px]`} style={{
            backgroundImage: "linear-gradient(rgba(128,128,128,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.07) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}>
            {diagramImageUrl ? (
              <div className="p-4 overflow-auto flex justify-center">
                <img src={diagramImageUrl} alt="Question diagram"
                  className="rounded-lg shadow-lg max-w-full h-auto select-none"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "top center",
                    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            ) : (
              <div className={`p-6 text-sm ${labelTxt}`}>Diagram flagged but no image provided.</div>
            )}
          </div>
        ) : (
          <div className={`${canvasBg} p-4 overflow-auto max-h-64`}>
            {diagramCode
              ? <pre className={`text-xs leading-relaxed whitespace-pre-wrap font-mono ${isLight ? "text-slate-700" : "text-slate-300"}`}>{diagramCode}</pre>
              : <div className={`text-sm ${labelTxt}`}>No diagram code provided.</div>}
          </div>
        )}
      </div>

      {/* fullscreen modal */}
      {fullscreen && diagramImageUrl && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}>
          <div className="w-full max-w-5xl max-h-[90vh] bg-[#0e1219] rounded-xl overflow-hidden border border-white/10 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 text-white">
              <span className="text-sm font-semibold">Diagram <span className="text-white/50 font-normal">· {safeType}</span></span>
              <div className="flex items-center gap-2">
                <button type="button" className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs"
                  onClick={() => setZoom(1)}>Reset</button>
                <button type="button" className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs"
                  onClick={() => setFullscreen(false)}>Close ✕</button>
              </div>
            </div>
            <div className="overflow-auto p-6 max-h-[80vh] flex justify-center" style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}>
              <img src={diagramImageUrl} alt="Diagram fullscreen"
                className="rounded-lg shadow-2xl border border-white/10 bg-white max-w-full h-auto select-none"
                style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function renderMarkdownLike(raw: string, isLight: boolean) {
  if (!raw) return null;

  const text = String(raw).replace(/\r\n/g, "\n").trim();
  const parts = text.split("```");
  const blocks: React.ReactNode[] = [];
  let key = 0;

  for (let p = 0; p < parts.length; p++) {
    const chunk = parts[p];
    const isCode = p % 2 === 1;

    if (isCode) {
      const lines = chunk.split("\n");
      const maybeLang = lines[0]?.trim();
      const code = lines.slice(1).join("\n").trim() || chunk.trim();

      blocks.push(
        <pre key={`pre-${key++}`} className={`text-xs font-mono rounded-xl p-3 overflow-auto border ${isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/30 border-white/10 text-white/80"}`}>
          {maybeLang && maybeLang.length < 20 && /^[a-z0-9#+.-]+$/i.test(maybeLang) ? (
            <div className={`text-[11px] mb-2 ${isLight ? "text-slate-500" : "text-white/50"}`}>{maybeLang}</div>
          ) : null}
          <code>{code}</code>
        </pre>
      );
      continue;
    }

    const lines = chunk.split("\n");
    let ul: React.ReactNode[] = [];
    let ol: React.ReactNode[] = [];
    let inUl = false;
    let inOl = false;

    const flushLists = () => {
      if (inUl) { blocks.push(<ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1">{ul}</ul>); ul = []; inUl = false; }
      if (inOl) { blocks.push(<ol key={`ol-${key++}`} className="list-decimal pl-5 space-y-1">{ol}</ol>); ol = []; inOl = false; }
    };

    for (const lineRaw of lines) {
      const line = lineRaw.replace(/\t/g, "  ");

      if (!line.trim()) { flushLists(); blocks.push(<div key={`sp-${key++}`} className="h-2" />); continue; }

      const hMatch = line.match(/^(#{1,3})\s+(.*)$/);
      if (hMatch) {
        flushLists();
        const level = hMatch[1].length;
        blocks.push(
          <div key={`h-${key++}`} className={level === 1 ? "text-lg font-bold" : level === 2 ? "text-base font-bold" : "text-sm font-semibold"}>
            {formatInline(hMatch[2])}
          </div>
        );
        continue;
      }

      const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
      if (olMatch) {
        if (inUl) flushLists();
        inOl = true;
        ol.push(<li key={`oli-${key++}`} className={isLight ? "text-slate-700" : "text-slate-300"}>{formatInline(olMatch[2])}</li>);
        continue;
      }

      const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
      if (ulMatch) {
        if (inOl) flushLists();
        inUl = true;
        ul.push(<li key={`uli-${key++}`} className={isLight ? "text-slate-700" : "text-slate-300"}>{formatInline(ulMatch[1])}</li>);
        continue;
      }

      flushLists();
      blocks.push(
        <p key={`p-${key++}`} className={`text-sm leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
          {formatInline(line)}
        </p>
      );
    }
    flushLists();
  }

  return <div className="space-y-3">{blocks}</div>;
}

/* ================================
   Payload helpers
   Supports backend GET shape { answer: {...} }
================================ */

function getPayload(a: any) {
  if (!a) return {};
  if (a.payload && typeof a.payload === "object") return a.payload;
  if (a.answer && typeof a.answer === "object") return a.answer;
  if (a.response && typeof a.response === "object") return a.response;
  if (a.data && typeof a.data === "object") return a.data;
  return {};
}

function getMcqSelectedIds(a: any): string[] {
  if (!a) return [];
  const p = getPayload(a);

  const arr =
    (Array.isArray(p.selectedOptionIds) && p.selectedOptionIds) ||
    (Array.isArray(p.selected_option_ids) && p.selected_option_ids) ||
    (Array.isArray(p.selected_option_id) && p.selected_option_id) ||
    null;

  if (arr) return arr.map((x: any) => String(x)).filter(Boolean);

  if (typeof p.selected_option_id === "string") return [p.selected_option_id];
  if (typeof p.selectedChoiceId === "string") return [p.selectedChoiceId];

  return [];
}

function getCodingCode(a: any): string {
  const p = getPayload(a);
  return typeof p.code === "string" ? p.code : "";
}

function getCodingLanguage(a: any): string {
  const p = getPayload(a);
  return typeof p.language === "string" ? p.language : "";
}

/* ================================
   Normalizers
================================ */

function getRequiredLanguageFromQuestion(q: any): string | null {
  const direct =
    q?.requiredLanguage ??
    q?.language ??
    q?.programmingLanguage ??
    q?.codingLanguage ??
    q?.lang ??
    null;

  const allowed = q?.allowedLanguages ?? q?.languages ?? q?.codingLanguages ?? null;

  if (Array.isArray(allowed) && allowed.length === 1) {
    const only = normalizeLang(allowed[0]);
    return only || null;
  }

  const n = normalizeLang(direct);
  return n || null;
}

function normalizeQuestionsAny(payload: any): UiQuestion[] {
  const arr = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.questions)
    ? payload.questions
    : [];

  const sorted = [...arr].sort((a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0));

  return sorted
    .map((q: any) => {
      const typeRaw = String(q.type || "").toUpperCase();
      const type: "CODING" | "MCQ" = typeRaw.includes("MCQ") ? "MCQ" : "CODING";

      const statement =
        q.problemStatement ?? q.problem_statement ?? q.statement ??
        q.description ?? q.prompt ?? q.question_text ?? "";

      const constraints = Array.isArray(q.constraints) ? q.constraints : Array.isArray(q.constraint_list) ? q.constraint_list : null;
      const examples = Array.isArray(q.examples) ? q.examples : Array.isArray(q.sampleTests) ? q.sampleTests : null;

      const optionsRaw = q.options ?? q.choices ?? q.mcqOptions ?? q.mcq_options ?? null;
      let optionsArr: any[] | null = null;

      if (Array.isArray(optionsRaw)) {
        optionsArr = optionsRaw;
      } else if (typeof optionsRaw === "string") {
        try {
          const parsed = JSON.parse(optionsRaw);
          if (Array.isArray(parsed)) optionsArr = parsed;
          else if (Array.isArray(parsed?.choices)) optionsArr = parsed.choices;
          else if (Array.isArray(parsed?.options)) optionsArr = parsed.options;
          else {
            const entries = parsed && typeof parsed === "object" ? Object.entries(parsed) : [];
            if (entries.length) optionsArr = entries.map(([k, v]) => ({ id: k, text: String(v) }));
          }
        } catch { optionsArr = null; }
      } else if (optionsRaw && typeof optionsRaw === "object") {
        const o: any = optionsRaw;
        if (Array.isArray(o.choices)) optionsArr = o.choices;
        else if (Array.isArray(o.options)) optionsArr = o.options;
        else {
          const entries = Object.entries(o);
          if (entries.length) optionsArr = entries.map(([k, v]) => ({ id: k, text: String(v) }));
        }
      }

      const questionId = String(q.question_id ?? q.questionId ?? q.id ?? "");
      if (!questionId) return null;

      const seenUi = new Set<string>();
      const choices: UiChoice[] | undefined = Array.isArray(optionsArr)
        ? optionsArr.map((c: any, idx: number) => {
            const rawIdCandidate = String(c.id ?? c.option_id ?? c.choice_id ?? c.value ?? c.key ?? "");
            const rawText = String(c.text ?? c.label ?? c.title ?? c.option_text ?? c.value ?? c);
            const rawId = rawIdCandidate && rawIdCandidate !== "[object Object]" ? rawIdCandidate : `opt_${idx}`;
            let uiLocal = rawId;
            if (seenUi.has(uiLocal)) uiLocal = `${uiLocal}_${idx}`;
            seenUi.add(uiLocal);
            return { id: `${questionId}::${uiLocal}`, rawId, text: rawText };
          })
        : undefined;

      const requiredLanguage = type === "CODING" ? getRequiredLanguageFromQuestion(q) : null;

      const allowedLanguages: string[] | null =
        type === "CODING"
          ? Array.isArray(q.allowedLanguages)
            ? q.allowedLanguages.map((x: any) => normalizeLang(x)).filter(Boolean)
            : Array.isArray(q.languages)
            ? q.languages.map((x: any) => normalizeLang(x)).filter(Boolean)
            : Array.isArray(q.codingLanguages)
            ? q.codingLanguages.map((x: any) => normalizeLang(x)).filter(Boolean)
            : null
          : null;

      const finalAllowed =
        requiredLanguage && (!allowedLanguages || allowedLanguages.length === 0)
          ? [normalizeLang(requiredLanguage)]
          : allowedLanguages;

      return {
        questionId,
        order: q.order ?? undefined,
        points: q.points ?? undefined,
        section: q.section ?? null,
        type,
        title: String(q.title ?? "Untitled question"),
        difficulty: q.difficulty ?? undefined,
        statement: statement ? String(statement) : undefined,
        constraints: constraints ? constraints.map((x: any) => String(x)) : undefined,
        examples: examples
          ? examples.map((ex: any) => ({
              input: String(ex.input ?? ex.stdin ?? ""),
              output: String(ex.output ?? ex.stdout ?? ex.expected ?? ""),
              explanation: ex.explanation ? String(ex.explanation) : undefined,
            }))
          : undefined,
        choices,
        functionSignature: q.functionSignature ?? q.function_signature ?? undefined,
        requiredLanguage,
        allowedLanguages: finalAllowed,
        hasDiagram: typeof q.hasDiagram === "boolean" ? q.hasDiagram : null,
        diagramType: typeof q.diagramType === "string" ? q.diagramType : null,
        diagramCode: typeof q.diagramCode === "string" ? q.diagramCode : null,
        diagramImageUrl: typeof q.diagramImageUrl === "string" ? q.diagramImageUrl : null,
      } as UiQuestion;
    })
    .filter(Boolean) as UiQuestion[];
}

/**
 * Normalise answers — backend GET: { answer: {...} } → copy into payload
 */
function normalizeAnswersAny(payload: any): any[] {
  const arr = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.answers)
    ? payload.answers
    : [];
  return arr.map((a: any) => {
    if (!a?.payload && a?.answer && typeof a.answer === "object") {
      return { ...a, payload: a.answer };
    }
    return a;
  });
}

function isTestPassed(t: any): boolean {
  if (t?.passed === true) return true;
  if (t?.passed === false) return false;
  if (t?.passed === 1) return true;
  if (t?.ok === true) return true;
  if (t?.success === true) return true;

  const s = String(t?.status ?? t?.state ?? t?.result ?? "").toUpperCase();
  if (["PASSED", "PASS", "OK", "SUCCESS"].includes(s)) return true;
  if (["FAILED", "FAIL", "ERROR"].includes(s)) return false;

  const ec = toNumber(t?.exit_code ?? t?.exitCode);
  if (ec === 0) return true;

  return false;
}

function normalizeSubmissionAny(raw: any): UiRunResult | null {
  if (!raw) return null;

  const payload = raw?.payload ?? raw?.data?.payload ?? raw?.data ?? raw;

  const submission_id = String(payload?.submission_id ?? payload?.submissionId ?? payload?.id ?? "");
  const status = String(payload?.status ?? payload?.state ?? payload?.submission?.status ?? "UNKNOWN").toUpperCase();

  const resultObj = payload?.result ?? payload?.submission?.result ?? payload;
  const runner = resultObj?.runner ?? payload?.runner ?? payload?.submission?.runner ?? null;

  const resultsArrRaw =
    (Array.isArray(resultObj?.results) ? resultObj.results : null) ??
    (Array.isArray(runner?.results) ? runner.results : null) ??
    (Array.isArray(payload?.results) ? payload.results : null) ??
    (Array.isArray(runner?.tests) ? runner.tests : null) ??
    (Array.isArray(resultObj?.tests) ? resultObj.tests : null) ??
    [];

  const tests: UiRunTest[] = resultsArrRaw.map((t: any) => ({
    input:    t.input ?? t.stdin ?? "",
    expected: t.expected ?? t.stdout_expected ?? t.expectedOutput ?? t.expected_output ?? "",
    actual:   t.actual ?? t.output ?? t.stdout ?? t.actual_output ?? "",
    output:   t.output ?? t.actual ?? t.stdout ?? t.actual_output ?? "",
    stderr:   t.stderr ?? "",
    passed:   isTestPassed(t),
    memKb:    t.memKb ?? t.mem_kb ?? t.memoryKb ?? undefined,
    durationMs: t.durationMs ?? t.duration_ms ?? t.runtimeMs ?? undefined,
  }));

  const total =
    toNumber(resultObj?.total ?? resultObj?.total_tests ?? runner?.totalTests ?? runner?.total_tests ?? runner?.total ?? runner?.summary?.total) ??
    tests.length ?? 0;

  const passed =
    toNumber(resultObj?.passedCount ?? resultObj?.passed ?? resultObj?.passed_tests ?? runner?.totalPassed ?? runner?.passed ?? runner?.passed_tests ?? runner?.summary?.passed) ??
    tests.filter((t) => t.passed).length;

  const scoreDirect =
    payload?.score ?? resultObj?.score ?? runner?.score ?? runner?.summary?.score ?? null;

  const scoreN = toNumber(scoreDirect);
  const score = scoreN !== null ? Math.round(scoreN) : total > 0 ? Math.round((passed / total) * 100) : 0;

  const runtimeMs = toNumber(runner?.runtimeMs ?? runner?.runtime_ms ?? resultObj?.runtimeMs ?? payload?.runtimeMs) ?? null;
  const memoryKb  = toNumber(runner?.memoryKb ?? runner?.memory_kb ?? resultObj?.memoryKb ?? payload?.memoryKb) ?? null;

  return {
    submission_id: submission_id || "unknown",
    status,
    score,
    total: total ?? 0,
    passed: passed ?? 0,
    results: tests,
    stdout:   runner?.stdout ?? resultObj?.stdout ?? payload?.stdout ?? null,
    stderr:   runner?.stderr ?? resultObj?.stderr ?? payload?.stderr ?? null,
    runtimeMs,
    memoryKb,
    raw,
  };
}

/* ================================
   LocalStorage keys
================================ */

function sessionKeys(sessionId: string) {
  const base = `hiralent.assessment.${sessionId}.v2`;
  return {
    PREF_KEY: `${base}.prefs`,
    GLOBAL_TAB_SWITCHES_KEY: `${base}.tabSwitches`,
  };
}

function questionKeys(sessionId: string, questionId: string) {
  const base = `hiralent.assessment.${sessionId}.q.${questionId}.v2`;
  return {
    FILES_KEY:         `${base}.files`,
    ACTIVE_FILE_KEY:   `${base}.activeFile`,
    TERMINAL_KEY:      `${base}.terminal`,
    TAB_SWITCHES_KEY:  `${base}.editorTabSwitches`,
    RUN_CACHE_KEY:     `${base}.lastRun`,
    OUTPUT_TAB_KEY:    `${base}.outputTab`,
  };
}

function usePrefs(sessionId: string) {
  const { PREF_KEY } = sessionKeys(sessionId);

  const [prefs, setPrefs] = useState<Prefs>(() => {
    if (typeof window === "undefined") return { theme: "dark", fontSize: 14 };
    return safeJsonParse<Prefs>(localStorage.getItem(PREF_KEY), { theme: "dark", fontSize: 14 });
  });

  useEffect(() => {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch {}
  }, [PREF_KEY, prefs]);

  return [prefs, setPrefs] as const;
}

const serialize = (x: any) => { try { return JSON.stringify(x); } catch { return String(x); } };

/* ================================
   Main Component
================================ */

export default function HiralentRunner({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  // Backend hooks
  const sess         = useAssessmentSession(sessionId);
  const qs           = useSessionQuestions(sessionId);
  const ans          = useSessionAnswers(sessionId);
  const saveAnswer   = useSaveAnswer(sessionId);
  const runCoding    = useRunCoding(sessionId);
  const getSubmission = useGetSubmission(sessionId);
  const submitSession = useSubmitSession(sessionId);
  const telemetry    = useTelemetry(sessionId);
  const nav          = usePatchNavigation(sessionId);

  const questions   = useMemo(() => normalizeQuestionsAny(qs.data), [qs.data]);
  const answersArr  = useMemo(() => normalizeAnswersAny(ans.data), [ans.data]);

  const answersByQ = useMemo(() => {
    const map = new Map<string, any>();
    answersArr.forEach((a: any) => {
      const qid = a.question_id ?? a.questionId ?? a.questionID;
      if (qid) map.set(String(qid), a);
    });
    return map;
  }, [answersArr]);

  const answersByQRef = useRef<Map<string, any>>(new Map());
  useEffect(() => { answersByQRef.current = answersByQ; }, [answersByQ]);

  // dedupe saves
  const lastSavedRef = useRef<Record<string, string>>({});

  // Session meta
  const sessionStatus          = useMemo(() => String((sess.data as any)?.status || "").toUpperCase(), [sess.data]);
  const submitted              = sessionStatus.includes("SUBMITTED");
  const sessionExpiredByStatus = sessionStatus.includes("EXPIRED");

  const expiresAtIso          = (sess.data as any)?.expiresAt ?? (sess.data as any)?.expires_at ?? null;
  const remainingSecondsServer = (sess.data as any)?.remainingSeconds ?? (sess.data as any)?.remaining_seconds ?? null;

  // Prefs
  const [prefs, setPrefs] = usePrefs(sessionId);
  const isLight = prefs.theme === "light";

  // Layout offset (avoid header overlap)
  const [pageOffset, setPageOffset] = useState<number>(48);
  useEffect(() => {
    function computeOffset() {
      try {
        let header = document.querySelector("header, nav, [role=banner], .navbar, .site-header") as HTMLElement | null;
        if (!header) {
          const all = Array.from(document.querySelectorAll("body *")) as HTMLElement[];
          header = all.find((el) => {
            const cs = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return (cs.position === "fixed" || cs.position === "sticky") && Math.abs(rect.top) < 2 && rect.height > 0;
          }) || null;
        }
        const h = header ? Math.round(header.getBoundingClientRect().height) : 0;
        setPageOffset(h + 24);
      } catch { setPageOffset(48); }
    }
    computeOffset();
    window.addEventListener("resize", computeOffset);
    return () => window.removeEventListener("resize", computeOffset);
  }, []);

  // UI states
  const [showSettings, setShowSettings]         = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [toast, setToast]                       = useState<string | null>(null);
  const [showQuestionPanel, setShowQuestionPanel] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  /* ================================
     Navigation + backend sync
  ================================ */

  const [activeIndex, setActiveIndex] = useState(0);
  const hydratedFromBackendRef = useRef(false);

  useEffect(() => {
    const idx = (sess.data as any)?.currentIndex ?? (sess.data as any)?.current_index ?? undefined;
    if (typeof idx === "number" && idx >= 0 && idx < questions.length) {
      hydratedFromBackendRef.current = true;
      setActiveIndex(idx);
      queueMicrotask(() => { hydratedFromBackendRef.current = false; });
    }
  }, [sess.data, questions.length]);

  const navDebounceRef  = useRef<any>(null);
  const lastNavSentRef  = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId || !questions.length || sess.isLoading) return;
    if (submitted || sessionExpiredByStatus) return;
    if (hydratedFromBackendRef.current) return;
    if (lastNavSentRef.current === activeIndex) return;
    if ((nav as any)?.isPending) return;

    if (navDebounceRef.current) clearTimeout(navDebounceRef.current);
    navDebounceRef.current = setTimeout(() => {
      lastNavSentRef.current = activeIndex;
      nav.mutate({ current_index: activeIndex } as any);
    }, 450);

    return () => { if (navDebounceRef.current) clearTimeout(navDebounceRef.current); };
  }, [activeIndex, nav, sessionId, questions.length, sess.isLoading, submitted, sessionExpiredByStatus]);

  const activeQ = questions[activeIndex];

  const goPrev = useCallback(() => setActiveIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setActiveIndex((i) => Math.min(questions.length - 1, i + 1)), [questions.length]);

  /* ================================
     Global Timer + auto-submit at 0
  ================================ */

  const [timeLeftMs, setTimeLeftMs]   = useState<number | null>(null);
  const [lockedByTime, setLockedByTime] = useState(false);
  const autoSubmitOnceRef             = useRef(false);

  useEffect(() => {
    setLockedByTime(false);
    autoSubmitOnceRef.current = false;

    if (typeof remainingSecondsServer === "number" && Number.isFinite(remainingSecondsServer)) {
      setTimeLeftMs(Math.max(0, remainingSecondsServer) * 1000);
      return;
    }
    if (expiresAtIso) {
      const expireTime = new Date(expiresAtIso).getTime();
      if (Number.isFinite(expireTime)) setTimeLeftMs(Math.max(0, expireTime - Date.now()));
      return;
    }
    setTimeLeftMs(null);
  }, [remainingSecondsServer, expiresAtIso]);

  useEffect(() => {
    if (timeLeftMs === null || timeLeftMs <= 0 || submitted || sessionExpiredByStatus) return;
    const id = setInterval(() => setTimeLeftMs((prev) => (prev === null || prev <= 0 ? prev : prev - 1000)), 1000);
    return () => clearInterval(id);
  }, [submitted, sessionExpiredByStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (timeLeftMs === null || submitted || sessionExpiredByStatus || autoSubmitOnceRef.current) return;
    if (timeLeftMs > 0) return;

    autoSubmitOnceRef.current = true;
    setLockedByTime(true);

    (async () => {
      try { await submitSession.mutateAsync({ reason: "TIME_EXPIRED" } as any); } catch {}
      finally { router.replace("/candidate/dashboard/skills-assessment"); }
    })();
  }, [timeLeftMs, submitted, sessionExpiredByStatus, submitSession, router]);

  const locked = submitted || sessionExpiredByStatus || lockedByTime;

  /* ================================
     Telemetry: tab switches + paste blocked
  ================================ */

  const MAX_TAB_SWITCHES = 7;
  const { GLOBAL_TAB_SWITCHES_KEY } = sessionKeys(sessionId);

  const [tabSwitches, setTabSwitches] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = parseInt(localStorage.getItem(GLOBAL_TAB_SWITCHES_KEY) || "0");
    return Number.isFinite(v) ? v : 0;
  });

  const [tabSwitchAlert, setTabSwitchAlert] = useState<string | null>(null);
  const lastVisibilityRef = useRef<boolean>(false);

  useEffect(() => {
    try { localStorage.setItem(GLOBAL_TAB_SWITCHES_KEY, String(tabSwitches)); } catch {}
  }, [GLOBAL_TAB_SWITCHES_KEY, tabSwitches]);

  useEffect(() => {
    if (!tabSwitchAlert) return;
    const t = setTimeout(() => setTabSwitchAlert(null), 3500);
    return () => clearTimeout(t);
  }, [tabSwitchAlert]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && !lastVisibilityRef.current) {
        lastVisibilityRef.current = true;
        setTabSwitches((prev) => {
          const next = prev + 1;
          const msg =
            next >= MAX_TAB_SWITCHES
              ? `ALERT: Tab switch limit reached! (${next}/${MAX_TAB_SWITCHES})`
              : `Tab switched away. Violations: ${next}/${MAX_TAB_SWITCHES}`;
          setToast(msg);
          setTabSwitchAlert(`Please focus on this tab. Violations recorded: ${next}/${MAX_TAB_SWITCHES}`);
          return next;
        });
        telemetry.mutate({ events: [{ type: "TAB_SWITCH", at: Date.now() }] } as any);
      } else if (!document.hidden) {
        lastVisibilityRef.current = false;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [telemetry]);

  // Copy/Paste restriction (editor-only)
  const clipboardOriginRef = useRef<boolean>(false);

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isEditorFocused = activeEl?.closest(".monaco-editor") !== null;
      if (!isEditorFocused) {
        e.preventDefault();
        setToast("Copy is only allowed from the code editor.");
        clipboardOriginRef.current = false;
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInEditor = activeEl?.closest(".monaco-editor") !== null;
      if (isInEditor && !clipboardOriginRef.current) {
        e.preventDefault();
        setToast("Pasting from external sources is not allowed.");
        telemetry.mutate({ events: [{ type: "PASTE_BLOCKED", at: Date.now() }] } as any);
      }
      clipboardOriginRef.current = false;
    };

    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("paste", handlePaste, true);
    return () => {
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("paste", handlePaste, true);
    };
  }, [telemetry]);

  /* ================================
     Editor / Runner state (per-question)
  ================================ */

  const editorRef = useRef<any>(null);

  const [outputTab, setOutputTab]   = useState<"results" | "terminal">("results");
  const [runResult, setRunResult]   = useState<UiRunResult | null>(null);
  const [runLoading, setRunLoading] = useState(false);

  const [terminalLogs, setTerminalLogs]   = useState<TerminalLog[]>([]);
  const [terminalInput, setTerminalInput] = useState("");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const [files, setFiles]         = useState<CodeFile[]>([
    { id: "f1", name: "main.py", language: "python", code: defaultTemplateWithoutMain("python") },
  ]);
  const [activeFile, setActiveFile] = useState<string>("f1");
  const [editorTabSwitches, setEditorTabSwitches] = useState<number>(0);

  const activeFileObj = useMemo(
    () => files.find((f) => f.id === activeFile) || files[0],
    [files, activeFile]
  );

  const [mcqSelected, setMcqSelected] = useState<string[]>([]);
  const hydratingAnswerRef = useRef(false);

  const toggleMcq = useCallback((rawId: string) => {
    setMcqSelected((prev) => prev.includes(rawId) ? prev.filter((x) => x !== rawId) : [...prev, rawId]);
  }, []);

  // Hydrate state per active question
  useEffect(() => {
    if (!activeQ) return;

    hydratingAnswerRef.current = true;
    setRunLoading(false);
    setOutputTab("results");
    setTerminalInput("");

    if (activeQ.type === "MCQ") {
      const saved = answersByQRef.current.get(activeQ.questionId);
      const savedIds = getMcqSelectedIds(saved);
      setMcqSelected(savedIds);
      lastSavedRef.current[activeQ.questionId] = serialize({ payload: { selectedOptionIds: savedIds } });
      setTerminalLogs([]);
      setRunResult(null);
      queueMicrotask(() => { hydratingAnswerRef.current = false; });
      return;
    }

    // CODING
    const qk = questionKeys(sessionId, activeQ.questionId);

    const storedFiles       = typeof window !== "undefined" ? safeJsonParse<CodeFile[]>(localStorage.getItem(qk.FILES_KEY), []) : [];
    const storedActive      = typeof window !== "undefined" ? localStorage.getItem(qk.ACTIVE_FILE_KEY) || "" : "";
    const storedTerminal    = typeof window !== "undefined" ? safeJsonParse<TerminalLog[]>(localStorage.getItem(qk.TERMINAL_KEY), []) : [];
    const storedEditorTabs  = typeof window !== "undefined" ? parseInt(localStorage.getItem(qk.TAB_SWITCHES_KEY) || "0") : 0;
    const storedLastRun     = typeof window !== "undefined" ? safeJsonParse<any>(localStorage.getItem(qk.RUN_CACHE_KEY), null) : null;
    const storedOutputTab   = typeof window !== "undefined" ? (localStorage.getItem(qk.OUTPUT_TAB_KEY) as "results" | "terminal" | null) : null;

    setTerminalLogs(Array.isArray(storedTerminal) ? storedTerminal : []);
    setEditorTabSwitches(Number.isFinite(storedEditorTabs) ? storedEditorTabs : 0);
    if (storedOutputTab === "results" || storedOutputTab === "terminal") setOutputTab(storedOutputTab);

    if (storedLastRun) setRunResult(normalizeSubmissionAny(storedLastRun));
    else setRunResult(null);

    const requiredLang = activeQ.requiredLanguage ? normalizeLang(activeQ.requiredLanguage) : null;

    if (storedFiles.length) {
      const enforcedFiles = requiredLang
        ? storedFiles.map((f) => {
            const ext = extForLang(requiredLang);
            const base = f.name.replace(/\.[^.]+$/, "");
            return { ...f, language: requiredLang, name: `${base}.${ext}` };
          })
        : storedFiles;

      setFiles(enforcedFiles);
      const ok = storedActive && enforcedFiles.some((f) => f.id === storedActive);
      setActiveFile(ok ? storedActive : enforcedFiles[0].id);

      const f = ok ? enforcedFiles.find((ff) => ff.id === storedActive) : enforcedFiles[0];
      lastSavedRef.current[activeQ.questionId] = serialize({
        payload: { code: String(f?.code || ""), language: String(f?.language || "python") },
      });

      queueMicrotask(() => { hydratingAnswerRef.current = false; });
      return;
    }

    // Fallback: use saved answer or functionSignature/template
    const saved = answersByQRef.current.get(activeQ.questionId);
    const savedPayload = getPayload(saved);
    const lang = requiredLang || String(savedPayload?.language || "python");
    const savedCode = typeof savedPayload?.code === "string" ? savedPayload.code : "";
    const starter = activeQ.functionSignature?.trim() ? String(activeQ.functionSignature) : defaultTemplateWithoutMain(lang);
    const code = savedCode.trim().length ? savedCode : starter;
    const ext = extForLang(lang);

    setFiles([{ id: "f1", name: `main.${ext}`, language: lang, code }]);
    setActiveFile("f1");
    lastSavedRef.current[activeQ.questionId] = serialize({ payload: { code, language: lang } });

    queueMicrotask(() => { hydratingAnswerRef.current = false; });
  }, [activeQ?.questionId, activeQ?.type, sessionId]);

  // Persist per-question coding state
  useEffect(() => {
    if (!activeQ || activeQ.type !== "CODING" || typeof window === "undefined") return;
    const qk = questionKeys(sessionId, activeQ.questionId);
    try {
      localStorage.setItem(qk.FILES_KEY, JSON.stringify(files));
      localStorage.setItem(qk.ACTIVE_FILE_KEY, activeFile);
      localStorage.setItem(qk.TERMINAL_KEY, JSON.stringify(terminalLogs));
      localStorage.setItem(qk.TAB_SWITCHES_KEY, String(editorTabSwitches));
      localStorage.setItem(qk.OUTPUT_TAB_KEY, outputTab);
    } catch {}
  }, [activeQ, sessionId, files, activeFile, terminalLogs, editorTabSwitches, outputTab]);

  // Auto scroll terminal
  useEffect(() => {
    if (terminalEndRef.current && outputTab === "terminal") {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs, outputTab]);

  const addTerminalLog = useCallback((message: string, type: TerminalLog["type"] = "output") => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [...prev, { message, type, timestamp }]);
  }, []);

  /* ================================
     Terminal commands
  ================================ */

  const handleTerminalCommand = useCallback(
    (cmd: string) => {
      if (!cmd.trim()) return;
      addTerminalLog(`$ ${cmd}`, "command");
      setTerminalInput("");

      const c = cmd.toLowerCase().trim();

      if (c === "help" || c === "help()") {
        addTerminalLog("", "info");
        addTerminalLog("Available Commands:", "info");
        addTerminalLog("  run, test     - Execute code against test cases", "info");
        addTerminalLog("  status        - Show session status", "info");
        addTerminalLog("  clear, cls    - Clear terminal", "info");
        addTerminalLog("  debug         - Show execution context", "info");
        addTerminalLog("  help          - Show this message", "info");
        addTerminalLog("", "info");
        return;
      }
      if (c === "clear" || c === "cls") { setTerminalLogs([]); addTerminalLog("Terminal cleared", "info"); return; }

      if (c === "status") {
        addTerminalLog(`session=${sessionId.slice(0, 8)} status=${sessionStatus || "—"}`, "info");
        addTerminalLog(`tabSwitches=${tabSwitches}/${MAX_TAB_SWITCHES}`, "info");
        addTerminalLog(`locked=${locked ? "yes" : "no"}`, "info");
        if (activeQ?.type === "CODING") {
          addTerminalLog(`editorTabs=${editorTabSwitches}/${MAX_TAB_SWITCHES}`, "info");
          addTerminalLog(`lastRun=${runResult ? `${runResult.score}% (${runResult.passed}/${runResult.total})` : "—"}`, "info");
        }
        return;
      }

      if (c === "debug") {
        addTerminalLog(`question=${activeQ?.title ?? "—"}`, "info");
        addTerminalLog(`type=${activeQ?.type ?? "—"}`, "info");
        if (activeQ?.type === "CODING") {
          addTerminalLog(`language=${activeFileObj?.language ?? "—"}`, "info");
          addTerminalLog(`files=${files.length}`, "info");
          addTerminalLog(`note=harness is server-side (no main injected in UI)`, "info");
          if (runResult?.stderr) addTerminalLog(`stderr: ${String(runResult.stderr).slice(0, 240)}`, "error");
        }
        return;
      }

      if (c === "run" || c === "test") {
        if (locked) { addTerminalLog("Session is locked.", "error"); return; }
        if (tabSwitches >= MAX_TAB_SWITCHES) { addTerminalLog(`Tab switch limit reached (${MAX_TAB_SWITCHES}).`, "error"); return; }
        if (activeQ?.type !== "CODING") { addTerminalLog("Run available for CODING questions only.", "error"); return; }
        onRunCodingNow();
        return;
      }

      addTerminalLog(`command not found: '${cmd}'`, "error");
      addTerminalLog("Use 'help' for available commands", "info");
    },
    [addTerminalLog, sessionId, sessionStatus, tabSwitches, locked, editorTabSwitches, runResult, activeQ, activeFileObj, files.length] // onRunCodingNow intentionally omitted — declared later
  );

  /* ================================
     Save / Autosave (deduped)
  ================================ */

  const onSave = useCallback(async () => {
    if (!activeQ || locked) return;

    if (activeQ.type === "MCQ") {
      const selectedOptionIds = Array.isArray(mcqSelected) ? mcqSelected : [];
      const body = { payload: { selectedOptionIds } };
      const sig = serialize(body);
      if (lastSavedRef.current[activeQ.questionId] === sig) return;

      await saveAnswer.mutateAsync({ questionId: activeQ.questionId, ...body } as any);
      lastSavedRef.current[activeQ.questionId] = sig;
      return;
    }

    const lang = String(activeFileObj?.language || "python");
    const code = String(activeFileObj?.code || "");
    const body = { payload: { code, language: lang } };
    const sig = serialize(body);
    if (lastSavedRef.current[activeQ.questionId] === sig) return;

    await saveAnswer.mutateAsync({ questionId: activeQ.questionId, ...body } as any);
    lastSavedRef.current[activeQ.questionId] = sig;
  }, [activeQ, locked, saveAnswer, mcqSelected, activeFileObj]);

  const autosaveRef = useRef<any>(null);

  useEffect(() => {
    if (!activeQ || activeQ.type !== "MCQ" || locked || hydratingAnswerRef.current) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => { onSave().catch(() => {}); }, 450);
    return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); };
  }, [activeQ?.questionId, activeQ?.type, locked, mcqSelected, onSave]);

  useEffect(() => {
    if (!activeQ || activeQ.type !== "CODING" || locked || hydratingAnswerRef.current) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => { onSave().catch(() => {}); }, 900);
    return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); };
  }, [activeQ?.questionId, activeQ?.type, locked, files, activeFile, onSave]);

  /* ================================
     Coding runner
  ================================ */

  const onRunCodingNow = useCallback(async () => {
    if (!activeQ || activeQ.type !== "CODING") return;
    if (locked) return setToast("Session is locked");
    if (tabSwitches >= MAX_TAB_SWITCHES) return setToast(`Tab switch limit reached (${MAX_TAB_SWITCHES}). Run disabled.`);

    setRunLoading(true);
    setRunResult(null);
    setOutputTab("results");

    const requiredLang = activeQ.requiredLanguage ? normalizeLang(activeQ.requiredLanguage) : null;
    const lang = requiredLang || String(activeFileObj?.language || "python");
    const code = String(activeFileObj?.code || "").trimEnd() + "\n";

    addTerminalLog("🟦 Run requested…", "info");
    addTerminalLog(`$ run --lang ${lang}`, "command");

    try {
      const r = await runCoding.mutateAsync({
        questionId: activeQ.questionId,
        language: lang,
        code,
      } as any);

      const sid = (r as any)?.submission_id ?? (r as any)?.submissionId;
      if (!sid) {
        addTerminalLog("❌ No submission id returned", "error");
        setToast("No submission_id returned");
        return;
      }

      addTerminalLog(`🟨 Submission created: ${sid}`, "info");

      let tries = 0;
      const maxTries = 45;

      while (tries < maxTries) {
        await new Promise((res) => setTimeout(res, 700));
        const outRaw = await getSubmission.mutateAsync({ submissionId: sid } as any);
        const out = normalizeSubmissionAny(outRaw);

        if (out && out.status && !["QUEUED", "RUNNING", "PENDING"].includes(out.status)) {
          setRunResult(out);

          try {
            const qk = questionKeys(sessionId, activeQ.questionId);
            localStorage.setItem(qk.RUN_CACHE_KEY, JSON.stringify(outRaw));
          } catch {}

          addTerminalLog(`✅ Completed: ${out.score}% (${out.passed}/${out.total})`, "output");

          if (out.stdout && String(out.stdout).trim().length) {
            addTerminalLog("----- STDOUT -----", "info");
            String(out.stdout).split("\n").forEach((line) => addTerminalLog(line, "output"));
          }
          if (out.stderr && String(out.stderr).trim().length) {
            addTerminalLog("----- STDERR -----", "info");
            String(out.stderr).split("\n").forEach((line) => addTerminalLog(line, "error"));
          }

          setToast("Completed ✓");
          break;
        }

        tries++;
        if (tries === 8) addTerminalLog("⏳ Still running…", "info");
      }

      if (tries >= maxTries) {
        setToast("Run timeout");
        addTerminalLog("⏱️ Run timed out. Try again.", "error");
      }
    } catch (e: any) {
      const msg = extractNiceError(e);
      setToast(msg || "Run failed");
      addTerminalLog(`❌ Run failed: ${msg}`, "error");
    } finally {
      setRunLoading(false);
    }
  }, [activeQ, locked, tabSwitches, activeFileObj, runCoding, getSubmission, addTerminalLog, sessionId]);

  /* ================================
     Editor actions
  ================================ */

  const updateActiveCode = useCallback((newCode: string) => {
    setFiles((prev) => prev.map((f) => (f.id === activeFile ? { ...f, code: newCode } : f)));
  }, [activeFile]);

  const changeLanguage = useCallback((fileId: string, newLang: string) => {
    if (activeQ?.type === "CODING" && activeQ.requiredLanguage) {
      setToast("Language is locked for this question");
      return;
    }
    const allowed = activeQ?.type === "CODING" ? (activeQ.allowedLanguages || null) : null;
    if (allowed && allowed.length > 0) {
      const nl = normalizeLang(newLang);
      if (!allowed.includes(nl)) { setToast("This language is not allowed for this question"); return; }
    }

    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== fileId) return f;
        const base = f.name.replace(/\.[^.]+$/, "");
        return { ...f, language: newLang, name: `${base}.${extForLang(newLang)}` };
      })
    );
    setToast("Language updated");
  }, [activeQ?.type, activeQ?.requiredLanguage, activeQ?.allowedLanguages]);

  const addFile = useCallback(() => {
    if (activeQ?.type !== "CODING") return;
    const requiredLang = activeQ.requiredLanguage ? normalizeLang(activeQ.requiredLanguage) : null;
    const defaultLang = requiredLang || files[0]?.language || "python";
    const id = `f${Date.now()}`;
    const code = activeQ.functionSignature?.trim() ? String(activeQ.functionSignature) : defaultTemplateWithoutMain(defaultLang);
    const file: CodeFile = { id, name: `file${files.length + 1}.${extForLang(defaultLang)}`, language: defaultLang, code };
    setFiles((prev) => [file, ...prev]);
    setActiveFile(id);
    setToast("New file created");
  }, [files, activeQ]);

  const duplicateFile = useCallback((id: string) => {
    const src = files.find((f) => f.id === id);
    if (!src) return setToast("File not found");
    const nid = `f${Date.now()}`;
    const requiredLang = activeQ?.type === "CODING" && activeQ.requiredLanguage ? normalizeLang(activeQ.requiredLanguage) : null;
    const lang = requiredLang || src.language;
    const base = src.name.replace(/\.[^.]+$/, "");
    const copy: CodeFile = { id: nid, name: `${base}-copy.${extForLang(lang)}`, language: lang, code: src.code };
    setFiles((prev) => {
      const next = [...prev];
      next.splice(next.findIndex((f) => f.id === id) + 1, 0, copy);
      return next;
    });
    setActiveFile(nid);
    setToast("File duplicated");
  }, [files, activeQ?.type, activeQ?.requiredLanguage]);

  const deleteFile = useCallback((id: string) => {
    if (files.length === 1) return setToast("Cannot delete last file");
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (activeFile === id) setActiveFile(next[0]?.id || "f1");
      return next;
    });
    setToast("File deleted");
  }, [files.length, activeFile]);

  const onCopy = useCallback(() => {
    if (!activeFileObj?.code) return;
    navigator.clipboard?.writeText(activeFileObj.code);
    clipboardOriginRef.current = true;
    telemetry.mutate({ events: [{ type: "COPY", at: Date.now() }] } as any);
    setToast("Copied from editor");
  }, [activeFileObj, telemetry]);

  /* ================================
     Monaco mount
  ================================ */

  const onEditorMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    try { editor.focus(); } catch {}

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
      const selection = editor.getSelection();
      if (selection) {
        const text = editor.getModel().getValueInRange(selection);
        navigator.clipboard?.writeText(text).then(() => {
          clipboardOriginRef.current = true;
          telemetry.mutate({ events: [{ type: "COPY", at: Date.now() }] } as any);
          setToast("Copied from editor");
        });
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
      if (!clipboardOriginRef.current) {
        setToast("Pasting from external sources is not allowed.");
        telemetry.mutate({ events: [{ type: "PASTE_BLOCKED", at: Date.now() }] } as any);
      }
      clipboardOriginRef.current = false;
    });
  }, [telemetry]);

  /* ================================
     Keyboard shortcuts
  ================================ */

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showCommandPalette) setShowCommandPalette(false);
        if (showSettings) setShowSettings(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette((s) => !s);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (activeQ?.type === "CODING") onRunCodingNow();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeQ?.type, onRunCodingNow, showCommandPalette, showSettings]);

  useEffect(() => {
    if (!activeQ || activeQ.type !== "CODING") return;

    function tabHandler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Tab") {
        e.preventDefault();
        if (editorTabSwitches >= MAX_TAB_SWITCHES) {
          setToast(`⚠️ Tab switch limit reached (${MAX_TAB_SWITCHES}).`);
          return;
        }
        const idx = files.findIndex((f) => f.id === activeFile);
        if (idx === -1) return;
        const nextIdx = e.shiftKey ? (idx - 1 + files.length) % files.length : (idx + 1) % files.length;
        setActiveFile(files[nextIdx].id);
        setEditorTabSwitches((v) => v + 1);
      }
    }
    window.addEventListener("keydown", tabHandler);
    return () => window.removeEventListener("keydown", tabHandler);
  }, [activeQ, files, activeFile, editorTabSwitches]);

  /* ================================
     Submit flow
  ================================ */

  const [showPreview, setShowPreview] = useState(false);

  const onSubmit = useCallback(async () => {
    if (locked) return;
    try {
      await onSave();
      setShowPreview(true);
    } catch (e: any) {
      setToast(extractNiceError(e) || "Save failed before submit");
    }
  }, [locked, onSave]);

  const confirmSubmit = useCallback(async () => {
    try {
      await submitSession.mutateAsync({ reason: "USER_SUBMIT" } as any);
      setToast("Submitted ✓");
      setShowPreview(false);
      router.replace("/candidate/dashboard/skills-assessment");
    } catch (e: any) {
      setToast(extractNiceError(e) || "Submit failed");
    }
  }, [submitSession, router]);

  /* ================================
     Computed UI values
  ================================ */

  const requiredLangUI = activeQ?.type === "CODING" ? (activeQ.requiredLanguage ? normalizeLang(activeQ.requiredLanguage) : null) : null;
  const languageLocked = !!requiredLangUI;

  const allowedLangsUI =
    activeQ?.type === "CODING" && Array.isArray(activeQ.allowedLanguages) && activeQ.allowedLanguages.length > 0
      ? activeQ.allowedLanguages.map(normalizeLang).filter(Boolean)
      : null;

  const languageOptions = useMemo(() => {
    if (languageLocked && requiredLangUI) {
      return [{ value: requiredLangUI, label: requiredLangUI.charAt(0).toUpperCase() + requiredLangUI.slice(1) }];
    }
    if (allowedLangsUI && allowedLangsUI.length) {
      const set = new Set(allowedLangsUI);
      return ALL_LANG_OPTIONS.filter((o) => set.has(normalizeLang(o.value)));
    }
    return ALL_LANG_OPTIONS;
  }, [languageLocked, requiredLangUI, allowedLangsUI]);

  const runDisabled = locked || runLoading || tabSwitches >= MAX_TAB_SWITCHES || activeQ?.type !== "CODING";

  /* ================================
     Guards
  ================================ */

  if (sess.isLoading || qs.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-300 bg-[#05070b]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            <span className="text-slate-300 font-medium">Loading assessment…</span>
          </div>
        </div>
      </div>
    );
  }

  if (sess.error || qs.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05070b] px-6">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <div className="text-rose-300 font-semibold">Failed to load assessment</div>
          <div className="text-slate-500 text-sm">{(sess.error as any)?.message || (qs.error as any)?.message || "Unknown error"}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!activeQ) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-300 bg-[#05070b]">
        No questions found for this session.
      </div>
    );
  }

  /* ================================
     RENDER
  ================================ */

  return (
    <div
      className={`h-full rounded-lg overflow-hidden flex flex-col ${isLight ? "bg-white text-slate-800" : "bg-[#0a0e14] text-white"}`}
      style={{ minHeight: `calc(100vh - ${pageOffset}px)` }}
    >
      {/* Tab Switch Alert Banner */}
      {tabSwitchAlert && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 flex items-center gap-3 shadow-lg animate-pulse">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold text-sm">{tabSwitchAlert}</span>
        </div>
      )}

      {/* ── Top Toolbar ── */}
      <div className={`${isLight ? "bg-white border-slate-200" : "bg-[#16191e] border-[#2d3139]"} px-6 py-4 flex items-center justify-between border-b shadow-sm`}>
        <div className="flex items-center gap-6 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white shadow-md">
            <Code2 className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
              Hiralent Skill Assessment{" "}
              <span className={isLight ? "text-slate-500" : "text-slate-400"}>• Monitored</span>
            </div>
            <div className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"} truncate`}>
              Q{activeIndex + 1}/{questions.length} • {activeQ.type}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isLight ? "bg-slate-100 border border-slate-200" : "bg-white/8 border border-white/12"}`}>
            <Timer className="w-4 h-4 text-cyan-400" />
            <span className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-white"}`}>
              {timeLeftMs !== null ? msToClock(timeLeftMs) : "—"}
            </span>
          </div>

          {/* Status */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm transition-all ${
            locked
              ? isLight ? "bg-rose-50 border border-rose-200" : "bg-rose-500/10 border border-rose-400/20"
              : isLight ? "bg-emerald-50 border border-emerald-200" : "bg-emerald-500/10 border border-emerald-400/20"
          }`}>
            <Shield className="w-4 h-4" />
            <span className={`text-xs font-semibold ${
              locked
                ? isLight ? "text-rose-700" : "text-rose-200"
                : isLight ? "text-emerald-700" : "text-emerald-200"
            }`}>
              {submitted ? "SUBMITTED" : sessionExpiredByStatus || lockedByTime ? "EXPIRED" : "MONITORED"}
            </span>
          </div>

          {!locked && (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              <span>{tabSwitches}/{MAX_TAB_SWITCHES}</span>
            </div>
          )}

          <div className={`w-px h-6 ${isLight ? "bg-slate-200" : "bg-slate-700"}`} />

          {/* Run + Submit */}
          <div className="flex items-center gap-3">
            <button
              className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                runDisabled
                  ? "opacity-50 bg-slate-600 cursor-not-allowed text-white"
                  : "bg-emerald-500 hover:bg-emerald-600 hover:shadow-lg hover:scale-105 active:scale-95 text-white"
              }`}
              onClick={onRunCodingNow}
              disabled={runDisabled}
              style={{ boxShadow: !runDisabled ? "0 4px 12px rgba(16,185,129,0.3)" : "none" }}
              title={activeQ.type !== "CODING" ? "Run is available for coding questions only" : "Run code"}
            >
              {runLoading ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : null}
              {runLoading ? "Running" : "Run Code"}
            </button>

            <button
              onClick={onSubmit}
              disabled={locked || submitSession.isPending}
              className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                locked || submitSession.isPending
                  ? "opacity-50 bg-slate-600 cursor-not-allowed text-white"
                  : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:scale-105 active:scale-95 text-white"
              }`}
              style={{ boxShadow: !locked && !submitSession.isPending ? "0 4px 12px rgba(37,99,235,0.3)" : "none" }}
            >
              {submitSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Submit
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
              className={`p-2 rounded-md transition-all duration-200 ${isLight ? "text-slate-600 hover:bg-slate-100" : "text-slate-400 hover:bg-white/8"}`}
              onClick={() => setPrefs({ ...prefs, theme: isLight ? "dark" : "light" })}
            >
              {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <button
              title="Settings"
              className={`p-2 rounded-md transition-all duration-200 ${isLight ? "text-slate-600 hover:bg-slate-100" : "text-slate-400 hover:bg-white/8"}`}
              onClick={() => setShowSettings(true)}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Locked banner */}
      {locked && (
        <div className="px-6 pt-4">
          <div className={`rounded-xl p-3 text-sm flex items-start gap-2 ${
            isLight ? "bg-amber-50 border border-amber-200 text-amber-700" : "bg-amber-500/10 border border-amber-400/20 text-amber-200"
          }`}>
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            {submitted ? "Session already submitted. UI is read-only." : "Session locked (time expired)."}
          </div>
        </div>
      )}

      {/* ── Main 3-Panel Layout ── */}
      <div className={`flex-1 flex items-stretch gap-0 ${isLight ? "bg-slate-50" : "bg-[#0a0e14]"}`}>

        {/* ── Left: Question Panel ── */}
        {showQuestionPanel && (
          <div className={`w-96 flex flex-col ${isLight ? "border-slate-200 bg-white" : "border-[#2d3139] bg-[#16191e]"} border-r overflow-hidden`}>
            {/* Header */}
            <div className={`sticky top-0 px-5 py-3 border-b ${isLight ? "border-slate-200 bg-white" : "border-[#2d3139] bg-[#16191e]"} flex-shrink-0`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className={`text-lg font-bold leading-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                  {activeQ.title}
                </h2>
                <button
                  onClick={() => setShowQuestionPanel(false)}
                  className={`p-1 rounded flex-shrink-0 ${isLight ? "hover:bg-slate-100 text-slate-400" : "hover:bg-[#2d3139] text-slate-500"}`}
                  aria-label="Hide question"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-block text-xs px-2 py-1 rounded-full font-semibold border ${getDifficultyColor(activeQ.difficulty)}`}>
                  {(activeQ.difficulty || "medium").charAt(0).toUpperCase() + (activeQ.difficulty || "medium").slice(1)}
                </span>
                <span className={`inline-block text-xs px-2 py-1 rounded-full font-semibold border ${
                  isLight ? "border-slate-200 bg-slate-100 text-slate-700" : "border-white/10 bg-white/8 text-white/80"
                }`}>
                  {activeQ.type}
                </span>
                {activeQ.points != null && (
                  <span className={`inline-block text-xs px-2 py-1 rounded-full font-semibold border ${
                    isLight ? "border-blue-200 bg-blue-50 text-blue-700" : "border-blue-400/20 bg-blue-500/10 text-blue-300"
                  }`}>
                    {activeQ.points} pts
                  </span>
                )}
                {activeQ.type === "CODING" && languageLocked && requiredLangUI && (
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold border ${
                    isLight ? "border-amber-200 bg-amber-50 text-amber-700" : "border-amber-400/20 bg-amber-500/10 text-amber-200"
                  }`} title="Language locked by question">
                    <Lock className="w-3.5 h-3.5" />
                    {requiredLangUI}
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 min-h-0" style={{ scrollbarGutter: "stable" }}>
              {activeQ.statement
                ? <div>{renderMarkdownLike(activeQ.statement, isLight)}</div>
                : <div className={`${isLight ? "text-slate-500" : "text-white/50"} text-sm`}>No statement provided.</div>
              }

              <RunnerDiagramViewer
                hasDiagram={activeQ.hasDiagram}
                diagramType={activeQ.diagramType}
                diagramCode={activeQ.diagramCode}
                diagramImageUrl={activeQ.diagramImageUrl}
                isLight={isLight}
              />

              {activeQ.constraints?.length ? (
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 ${isLight ? "text-slate-600" : "text-slate-400"}`}>Constraints</h4>
                  <ul className="space-y-1.5">
                    {activeQ.constraints.map((c, i) => (
                      <li key={i} className={`text-sm flex items-start gap-2 ${isLight ? "text-slate-700" : "text-slate-400"}`}>
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {activeQ.examples?.length ? (
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 ${isLight ? "text-slate-600" : "text-slate-400"}`}>Examples</h4>
                  <div className="space-y-2.5">
                    {activeQ.examples.map((ex, idx) => (
                      <div key={idx} className={`p-3 rounded-lg ${isLight ? "bg-slate-100 border-slate-200" : "bg-[#2d3139] border-[#3d4451]"} border text-xs space-y-1`}>
                        <div className={`font-semibold ${isLight ? "text-slate-800" : "text-slate-300"}`}>Example {idx + 1}:</div>
                        <div className={`font-mono ${isLight ? "text-slate-700" : "text-slate-400"}`}>
                          <div>
                            <span className={isLight ? "text-slate-600" : "text-slate-500"}>Input:</span>{" "}
                            <span className={isLight ? "text-blue-600" : "text-cyan-400"}>{ex.input || "—"}</span>
                          </div>
                          <div>
                            <span className={isLight ? "text-slate-600" : "text-slate-500"}>Output:</span>{" "}
                            <span className={isLight ? "text-emerald-600" : "text-emerald-400"}>{ex.output || "—"}</span>
                          </div>
                        </div>
                        {ex.explanation && <div className={`${isLight ? "text-slate-600" : "text-slate-400"} text-[11px] pt-1`}>{ex.explanation}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer nav */}
            <div className={`border-t ${isLight ? "border-slate-200" : "border-[#2d3139]"} px-5 py-4`}>
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={goPrev}
                  disabled={activeIndex === 0}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                    isLight ? "border-slate-200 hover:bg-slate-50" : "border-white/10 hover:bg-white/10"
                  } disabled:opacity-40`}
                >
                  <ChevronLeft className="w-4 h-4 inline" /> Prev
                </button>
                <button
                  onClick={goNext}
                  disabled={activeIndex >= questions.length - 1}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                    isLight ? "border-slate-200 hover:bg-slate-50" : "border-white/10 hover:bg-white/10"
                  } disabled:opacity-40`}
                >
                  Next <ChevronRight className="w-4 h-4 inline" />
                </button>
              </div>

              <div className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Tab switches: {tabSwitches} / {MAX_TAB_SWITCHES} • Editor tabs: {editorTabSwitches} / {MAX_TAB_SWITCHES}
              </div>
            </div>
          </div>
        )}

        {!showQuestionPanel && (
          <button
            onClick={() => setShowQuestionPanel(true)}
            className={`p-3 rounded-r-lg h-fit ${
              isLight ? "bg-slate-100 hover:bg-slate-200 border border-slate-200" : "bg-slate-900 hover:bg-slate-800 border border-slate-700"
            }`}
            title="Show question"
          >
            <ChevronDown className="w-4 h-4 rotate-90" />
          </button>
        )}

        {/* ── Middle: MCQ or Editor ── */}
        <div className={`flex-1 flex flex-col ${isLight ? "bg-white" : "bg-[#16191e]"} relative`}>
          {locked && (
            <div className="absolute inset-0 bg-black/10 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className={`px-4 py-2 rounded-xl border ${isLight ? "bg-white border-slate-200 text-slate-700" : "bg-black/40 border-white/10 text-white/80"}`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="w-4 h-4" /> Locked
                </div>
              </div>
            </div>
          )}

          {activeQ.type === "MCQ" ? (
            <div className="p-6 overflow-y-auto">
              <div className={`rounded-2xl border p-4 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ListChecks className="h-5 w-5 text-cyan-400" />
                    Multiple answers allowed
                  </div>
                  <div className={`text-xs ${isLight ? "text-slate-500" : "text-white/60"}`}>
                    Selected: <span className="font-semibold">{mcqSelected.length}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {(activeQ.choices || []).map((c) => {
                    const selected = mcqSelected.includes(c.rawId);
                    return (
                      <button
                        key={c.id}
                        disabled={locked}
                        onClick={() => toggleMcq(c.rawId)}
                        className={`w-full text-left p-3 rounded-xl border transition disabled:opacity-50 ${
                          selected
                            ? isLight ? "border-blue-300 bg-blue-50" : "border-cyan-300/40 bg-cyan-500/10"
                            : isLight ? "border-slate-200 bg-white hover:bg-slate-50" : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center ${
                            selected
                              ? isLight ? "border-blue-600 bg-blue-600" : "border-cyan-400 bg-cyan-400"
                              : isLight ? "border-slate-300" : "border-white/20"
                          }`}>
                            {selected && <div className={`h-2 w-2 rounded ${isLight ? "bg-white" : "bg-black"}`} />}
                          </div>
                          <div className={`text-sm ${isLight ? "text-slate-800" : "text-white/90"}`}>{c.text}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!activeQ.choices?.length && <div className={`text-sm mt-3 ${isLight ? "text-slate-500" : "text-white/60"}`}>No choices found.</div>}

                <div className={`mt-4 text-xs ${isLight ? "text-slate-500" : "text-white/60"}`}>
                  Tip: select multiple options. Changes are autosaved.
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Editor top bar */}
              <div className={`${isLight ? "bg-white border-slate-200" : "bg-[#16191e] border-[#2d3139]"} border-b px-6 py-3 flex items-center gap-3`}>
                <div className="flex gap-2 items-center flex-wrap" role="tablist" aria-label="Files">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-t-lg transition border-b-2 cursor-pointer ${
                        activeFile === f.id
                          ? `border-b-blue-500 ${isLight ? "bg-white text-slate-900 font-medium" : "bg-[#16191e] text-white font-medium"}`
                          : `border-b-transparent ${isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-500 hover:text-slate-300"}`
                      }`}
                      role="tab"
                      aria-selected={activeFile === f.id}
                      tabIndex={0}
                      onClick={() => {
                        if (locked) return;
                        if (activeFile !== f.id && editorTabSwitches >= MAX_TAB_SWITCHES) {
                          setToast(`⚠️ Tab switch limit reached (${MAX_TAB_SWITCHES}).`);
                          return;
                        }
                        if (activeFile !== f.id) {
                          setActiveFile(f.id);
                          setEditorTabSwitches((p) => p + 1);
                        }
                      }}
                    >
                      <button className="text-xs font-medium truncate max-w-[8rem]">{f.name}</button>

                      {files.length > 1 && !locked && (
                        <>
                          <button
                            title="Duplicate file"
                            onClick={(e) => { e.stopPropagation(); duplicateFile(f.id); }}
                            className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                          >
                            <FilesIcon className="w-3 h-3" />
                          </button>
                          <button
                            title="Delete file"
                            onClick={(e) => { e.stopPropagation(); deleteFile(f.id); }}
                            className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}

                  {!locked && (
                    <button
                      onClick={addFile}
                      className={`px-3 py-2 rounded-t-lg text-sm font-medium transition ${isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-500 hover:text-slate-300"}`}
                    >
                      <Plus className="w-4 h-4 inline -mt-0.5 mr-1" />
                      New File
                    </button>
                  )}
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    {languageLocked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                    <LangDropdown
                      value={languageLocked && requiredLangUI ? requiredLangUI : (activeFileObj?.language || "python")}
                      options={languageOptions}
                      onChange={(v) => { if (locked || languageLocked || !activeFileObj) return; changeLanguage(activeFileObj.id, v); }}
                      disabled={locked || languageLocked}
                      isLight={isLight}
                    />
                  </div>

                  <button
                    className={`px-2 py-1 rounded transition ${isLight ? "hover:bg-slate-100 text-slate-600" : "hover:bg-[#2d3139] text-slate-500"}`}
                    onClick={onCopy}
                    disabled={locked}
                    title="Copy code"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Monaco Editor */}
              <div className={`flex-1 rounded-none overflow-hidden min-h-0 relative ${isLight ? "bg-white" : "bg-[#16191e]"}`}>
                <MonacoEditor
                  key={activeFile}
                  height="100%"
                  language={languageLocked && requiredLangUI ? requiredLangUI : (activeFileObj?.language || "python")}
                  defaultLanguage={languageLocked && requiredLangUI ? requiredLangUI : (activeFileObj?.language || "python")}
                  value={activeFileObj?.code || ""}
                  onChange={(v) => { if (locked) return; updateActiveCode(v || ""); }}
                  onMount={onEditorMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: prefs.fontSize || 14,
                    lineHeight: (prefs.fontSize || 14) * 1.5,
                    automaticLayout: true,
                    renderWhitespace: "boundary",
                    smoothScrolling: true,
                    scrollBeyondLastLine: false,
                    folding: true,
                    glyphMargin: true,
                    tabSize: 4,
                    readOnly: locked,
                  }}
                  theme={isLight ? "light" : "vs-dark"}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Right: Results + Terminal Panel ── */}
        <div className={`w-full sm:w-96 flex flex-col border-l ${isLight ? "border-slate-200 bg-white" : "border-[#2d3139] bg-[#0a0e14]"}`}>
          {/* Panel Tabs */}
          <div className={`${isLight ? "bg-slate-100 border-slate-200" : "bg-[#1a1f2e] border-[#2d3139]"} border-b px-0 flex items-center`}>
            <button
              onClick={() => setOutputTab("results")}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
                outputTab === "results"
                  ? `border-b-green-500 ${isLight ? "text-slate-900 bg-white" : "text-cyan-400 bg-[#16191e]"}`
                  : `border-b-transparent ${isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50" : "text-slate-400 hover:text-slate-200 hover:bg-[#242a38]"}`
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Results
              </span>
            </button>

            <button
              onClick={() => setOutputTab("terminal")}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
                outputTab === "terminal"
                  ? `border-b-green-500 ${isLight ? "text-slate-900 bg-white" : "text-cyan-400 bg-[#16191e]"}`
                  : `border-b-transparent ${isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50" : "text-slate-400 hover:text-slate-200 hover:bg-[#242a38]"}`
              }`}
            >
              <span className="flex items-center gap-2">
                <Code2 className="w-4 h-4" /> Terminal
              </span>
            </button>

            <div className="ml-auto flex items-center gap-2 pr-4">
              {locked && (
                <div className="text-xs text-rose-500 flex items-center gap-1 px-3 py-1 rounded-full bg-rose-900/20 border border-rose-700/50 font-semibold">
                  <Lock className="w-3 h-3" /> Locked
                </div>
              )}
            </div>
          </div>

          {/* Panel Content */}
          <div className={`flex-1 overflow-auto text-xs min-h-0 font-mono p-0 ${isLight ? "bg-white text-slate-900" : "bg-[#0a0e14] text-slate-100"}`}>

            {/* ── Results Tab ── */}
            {outputTab === "results" && (
              <div className={`h-full flex flex-col ${isLight ? "bg-white" : "bg-slate-950"}`}>
                {activeQ.type !== "CODING" ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isLight ? "bg-slate-100" : "bg-slate-800"}`}>
                      <ListChecks className={`w-5 h-5 ${isLight ? "text-slate-400" : "text-slate-600"}`} />
                    </div>
                    <div className="text-center">
                      <div className={`text-sm font-medium ${isLight ? "text-slate-700" : "text-slate-300"}`}>MCQ question</div>
                      <div className={`text-xs ${isLight ? "text-slate-500" : "text-slate-500"}`}>No run results for MCQ.</div>
                    </div>
                  </div>
                ) : !runResult && !runLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isLight ? "bg-slate-100" : "bg-slate-800"}`}>
                      <Play className={`w-5 h-5 ${isLight ? "text-slate-400" : "text-slate-600"}`} />
                    </div>
                    <div className="text-center">
                      <div className={`text-sm font-medium ${isLight ? "text-slate-700" : "text-slate-300"}`}>Ready to run code</div>
                      <div className={`text-xs ${isLight ? "text-slate-500" : "text-slate-500"}`}>Press Run Code or Ctrl+Enter</div>
                    </div>
                  </div>
                ) : runLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <div className="flex gap-1">
                      {[0, 150, 300].map((delay) => (
                        <div key={delay} className={`w-1.5 h-1.5 rounded-full ${isLight ? "bg-blue-500" : "bg-blue-400"} animate-pulse`} style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                    <div className={`text-sm font-medium ${isLight ? "text-slate-600" : "text-slate-400"}`}>Executing code…</div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto flex flex-col">
                    {/* Metrics bar */}
                    <div className={`${isLight ? "bg-slate-50 border-b border-slate-200" : "bg-slate-900 border-b border-slate-800"} px-6 py-4 flex items-center justify-center gap-12`}>
                      <div>
                        <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isLight ? "text-slate-600" : "text-slate-500"}`}>Score</div>
                        <div className={`text-2xl font-bold ${runResult!.score === 100 ? "text-blue-500" : (runResult!.score ?? 0) >= 50 ? "text-amber-500" : "text-red-500"}`}>
                          {runResult!.score ?? 0}%
                        </div>
                      </div>
                      <div>
                        <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isLight ? "text-slate-600" : "text-slate-500"}`}>Runtime</div>
                        <div className={`text-2xl font-bold ${isLight ? "text-slate-900" : "text-slate-300"}`}>
                          {runResult!.runtimeMs ?? runResult!.results?.reduce((a, t) => a + (t.durationMs || 0), 0) ?? 0}ms
                        </div>
                      </div>
                      <div>
                        <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isLight ? "text-slate-600" : "text-slate-500"}`}>Memory</div>
                        <div className={`text-2xl font-bold ${isLight ? "text-slate-900" : "text-slate-300"}`}>
                          {runResult!.memoryKb ?? 0}KB
                        </div>
                      </div>
                    </div>

                    {/* Test cards */}
                    <div className="flex-1 px-6 py-6 overflow-y-auto space-y-4">
                      {(runResult!.results || []).length === 0 ? (
                        <div className={`text-center py-12 ${isLight ? "text-slate-500" : "text-slate-500"}`}>
                          <div className="text-sm">No test results returned.</div>
                        </div>
                      ) : (
                        (runResult!.results || []).map((t, i) => (
                          <div key={i} className={`border rounded-lg p-4 ${
                            t.passed
                              ? isLight ? "bg-white border-green-200" : "bg-slate-900 border-green-900/40"
                              : isLight ? "bg-white border-red-200" : "bg-slate-900 border-red-900/40"
                          }`}>
                            <div className="flex items-center justify-between mb-4">
                              <div className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>Test {i + 1}</div>
                              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${
                                t.passed
                                  ? isLight ? "bg-green-100 text-green-700" : "bg-green-900/30 text-green-400"
                                  : isLight ? "bg-red-100 text-red-700" : "bg-red-900/30 text-red-400"
                              }`}>
                                <span>{t.passed ? "✓" : "✗"}</span>
                                <span>{t.passed ? "PASSED" : "FAILED"}</span>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <div className={`text-xs font-semibold mb-1 ${isLight ? "text-slate-600" : "text-slate-500"}`}>Input:</div>
                                <div className={`text-sm font-mono p-2 rounded ${isLight ? "bg-slate-50 text-slate-700" : "bg-slate-800 text-slate-300"}`}>
                                  {t.input ? String(t.input).substring(0, 120) : "—"}
                                </div>
                              </div>
                              <div>
                                <div className={`text-xs font-semibold mb-1 ${isLight ? "text-slate-600" : "text-slate-500"}`}>Expected:</div>
                                <div className={`text-sm font-mono p-2 rounded ${isLight ? "bg-slate-50 text-slate-700" : "bg-slate-800 text-slate-300"}`}>
                                  {t.expected ? String(t.expected).substring(0, 120) : "—"}
                                </div>
                              </div>
                              <div>
                                <div className={`text-xs font-semibold mb-1 ${isLight ? "text-slate-600" : "text-slate-500"}`}>Actual:</div>
                                <div className={`text-sm font-mono p-2 rounded ${
                                  !t.passed
                                    ? isLight ? "bg-red-50 text-red-700" : "bg-red-900/30 text-red-400"
                                    : isLight ? "bg-slate-50 text-slate-700" : "bg-slate-800 text-slate-300"
                                }`}>
                                  {(t.actual ?? t.output) ? String(t.actual ?? t.output).substring(0, 120) : "—"}
                                </div>
                              </div>
                              {t.stderr && String(t.stderr).trim() && (
                                <div>
                                  <div className={`text-xs font-semibold mb-1 ${isLight ? "text-rose-600" : "text-rose-400"}`}>Stderr:</div>
                                  <div className={`text-sm font-mono p-2 rounded ${isLight ? "bg-rose-50 text-rose-700" : "bg-rose-900/30 text-rose-400"}`}>
                                    {String(t.stderr).substring(0, 200)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Terminal Tab ── */}
            {outputTab === "terminal" && (
              <div
                className="h-full flex flex-col bg-black"
                onClick={() => { const inp = document.querySelector("#terminal-input") as HTMLInputElement; if (inp) inp.focus(); }}
              >
                <div className="flex-1 overflow-y-auto px-4 py-4 font-mono text-sm bg-black text-slate-300" style={{ fontFamily: "'JetBrains Mono','Fira Code',monospace", lineHeight: "1.5" }}>
                  {terminalLogs.length === 0 ? (
                    <div className="text-slate-500 text-xs">Ready. Type 'help' to see options.</div>
                  ) : (
                    <div className="space-y-0">
                      {terminalLogs.map((log, idx) => (
                        <div key={idx} className={
                          log.type === "command" ? "text-blue-400" :
                          log.type === "error"   ? "text-red-400" :
                          log.type === "info"    ? "text-cyan-400" :
                          "text-slate-300"
                        }>
                          {log.message}
                        </div>
                      ))}
                    </div>
                  )}

                  <div ref={terminalEndRef} />

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-emerald-500 font-semibold text-sm">$</span>
                    <input
                      id="terminal-input"
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (terminalInput.trim()) handleTerminalCommand(terminalInput);
                        }
                      }}
                      placeholder={locked ? "Locked" : "Enter command… (help/run/status/clear)"}
                      className="flex-1 bg-black text-emerald-500 text-sm outline-none placeholder:text-slate-600 caret-emerald-500 disabled:opacity-60"
                      style={{ fontFamily: "'JetBrains Mono','Courier New',monospace" }}
                      autoFocus
                      disabled={locked}
                    />
                    <button
                      onClick={() => handleTerminalCommand(terminalInput)}
                      className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
                      disabled={locked || !terminalInput.trim()}
                      title="Send"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Submit Preview Modal ── */}
      {showPreview && (
        <SubmitPreviewModal
          questions={questions}
          answers={answersArr}
          onClose={() => setShowPreview(false)}
          onConfirm={confirmSubmit}
          loading={submitSession.isPending}
          theme={prefs.theme}
        />
      )}

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur z-50">
          <div className={`${isLight ? "bg-white" : "bg-[#16191e] border border-[#2d3139]"} rounded-xl p-6 w-96 shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Settings</h3>
              <button onClick={() => setShowSettings(false)} className={`p-1 rounded ${isLight ? "hover:bg-slate-100 text-slate-600" : "hover:bg-white/10 text-slate-400"}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className={`text-sm font-medium block mb-2 ${isLight ? "text-slate-700" : "text-slate-300"}`}>Theme</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPrefs({ ...prefs, theme: "dark" })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${prefs.theme === "dark" ? "bg-[#1B73E8] text-white" : isLight ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-white/8 text-slate-400 hover:bg-white/12"}`}
                  >
                    <Moon className="w-4 h-4" /> Dark
                  </button>
                  <button
                    onClick={() => setPrefs({ ...prefs, theme: "light" })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${prefs.theme === "light" ? "bg-[#1B73E8] text-white" : isLight ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-white/8 text-slate-400 hover:bg-white/12"}`}
                  >
                    <Sun className="w-4 h-4" /> Light
                  </button>
                </div>
              </div>

              <div>
                <label className={`text-sm font-medium block mb-2 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  Font Size <span className={`font-normal ${isLight ? "text-slate-400" : "text-slate-500"}`}>({prefs.fontSize || 14}px)</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min={12} max={20}
                    value={prefs.fontSize || 14}
                    onChange={(e) => setPrefs({ ...prefs, fontSize: Number(e.target.value) })}
                    className="flex-1 accent-[#1B73E8]"
                  />
                  <span className={`text-sm font-mono font-semibold w-10 ${isLight ? "text-slate-700" : "text-slate-300"}`}>{prefs.fontSize || 14}</span>
                </div>
              </div>

              <div className={`text-xs ${isLight ? "text-slate-400" : "text-slate-500"} border-t ${isLight ? "border-slate-100" : "border-white/8"} pt-3`}>
                Ctrl/Cmd+K · command palette &nbsp;•&nbsp; Ctrl/Cmd+Enter · run &nbsp;•&nbsp; Esc · close modals
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Command Palette ── */}
      {showCommandPalette && (
        <div className="fixed inset-0 flex items-start justify-center pt-24 z-50 bg-black/30 backdrop-blur-sm">
          <div className="w-[640px] bg-slate-900 rounded-xl p-3 border border-white/10">
            <div className="flex items-center gap-2 mb-2 text-white/80">
              <Command className="w-4 h-4" />
              <input
                autoFocus
                placeholder="run / prev / next / submit / close"
                className="flex-1 bg-transparent outline-none text-white placeholder-white/40"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const v = (e.target as HTMLInputElement).value.toLowerCase();
                  if (v.includes("run")) onRunCodingNow();
                  if (v.includes("prev")) goPrev();
                  if (v.includes("next")) goNext();
                  if (v.includes("submit")) onSubmit();
                  setShowCommandPalette(false);
                }}
              />
              <button
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm"
                onClick={() => setShowCommandPalette(false)}
              >
                Close
              </button>
            </div>
            <div className="text-xs text-white/50 px-1">Ctrl/Cmd+K • Ctrl/Cmd+Enter: run • Esc: close</div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ================================
   Submit Preview Modal
================================ */

function SubmitPreviewModal({
  questions,
  answers,
  onClose,
  onConfirm,
  loading,
  theme,
}: {
  questions: UiQuestion[];
  answers: any[];
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  theme: "light" | "dark";
}) {
  const isLight = theme === "light";

  const byQ = useMemo(() => {
    const m = new Map<string, any>();
    answers.forEach((a) => {
      const qid = a.question_id || a.questionId;
      if (qid) m.set(String(qid), a);
    });
    return m;
  }, [answers]);

  const answeredCount = useMemo(() => {
    return questions.filter((q) => {
      const a = byQ.get(q.questionId);
      if (!a) return false;
      if (q.type === "MCQ") return getMcqSelectedIds(a).length > 0;
      if (q.type === "CODING") return getCodingCode(a).trim().length > 0;
      return false;
    }).length;
  }, [questions, byQ]);

  const mcqChoiceTexts = (q: UiQuestion, rawIds: string[]) => {
    const map = new Map((q.choices || []).map((c) => [c.rawId, c.text]));
    const texts = rawIds.map((id) => map.get(id) || id).filter(Boolean);
    return texts.length ? texts : ["—"];
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
      <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#0b0f16] border-white/10"}`}>
        <div className={`p-5 border-b flex items-center justify-between ${isLight ? "border-slate-200" : "border-white/10"}`}>
          <div>
            <div className="text-lg font-bold">Submission Preview</div>
            <div className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-white/60"}`}>
              Answered {answeredCount}/{questions.length} — this action is final.
            </div>
          </div>
          <button
            onClick={onClose}
            className={`px-3 py-2 rounded-xl border ${isLight ? "border-slate-200 bg-slate-50 hover:bg-slate-100" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
          >
            Close
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-auto space-y-3">
          {questions.map((q, idx) => {
            const a = byQ.get(q.questionId);
            const selectedIds = q.type === "MCQ" ? getMcqSelectedIds(a) : [];
            const code = q.type === "CODING" ? getCodingCode(a) : "";
            const lang = q.type === "CODING" ? getCodingLanguage(a) : "";
            const saved = q.type === "MCQ" ? selectedIds.length > 0 : code.trim().length > 0;

            return (
              <div key={q.questionId} className={`rounded-xl border p-4 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold">Q{idx + 1}. {q.title}</div>
                    <div className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-white/60"}`}>{q.type}</div>
                  </div>
                  <div className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    saved
                      ? isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                      : isLight ? "border-slate-200 bg-white text-slate-500" : "border-white/10 bg-white/5 text-white/60"
                  }`}>
                    {saved ? "SAVED" : "EMPTY"}
                  </div>
                </div>

                {q.type === "MCQ" ? (
                  <div className={`mt-3 text-sm ${isLight ? "text-slate-700" : "text-white/80"}`}>
                    Selected:
                    <div className="mt-2 flex flex-wrap gap-2">
                      {mcqChoiceTexts(q, selectedIds).map((t, i) => (
                        <span key={i} className={`px-2.5 py-1 rounded-full text-xs border ${
                          isLight ? "bg-white border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-white/80"
                        }`}>{t}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className={`text-xs ${isLight ? "text-slate-600" : "text-white/60"}`}>Language: {lang || "—"}</div>
                    <pre className={`mt-2 text-xs rounded-xl p-3 overflow-auto border ${isLight ? "bg-white border-slate-200" : "bg-black/40 border-white/10"}`}>
                      {code.slice(0, 1800) || "—"}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className={`p-5 border-t flex items-center justify-end gap-3 ${isLight ? "border-slate-200" : "border-white/10"}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl border font-semibold ${isLight ? "border-slate-200 bg-slate-50 hover:bg-slate-100" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
          >
            Keep working
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 font-bold text-white"
          >
            {loading ? "Submitting…" : "Confirm Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}