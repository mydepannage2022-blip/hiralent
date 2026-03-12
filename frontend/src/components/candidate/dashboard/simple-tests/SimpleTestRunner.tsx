"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
  Timer,
  Loader2,
  Send,
  ChevronDown,
  Plus,
  Trash2,
  Files as FilesIcon,
  Shield,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

import type {
  GetAttemptDTO,
  SimpleTestQuestionDTO,
  SubmitSimpleTestResponse,
  SubmitAnswersPayload,
} from "@/src/types/simpleTest.types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

/* =========================================================
  Simple Test Runner (Practice UI) — CodeRunner-like UI
  ✅ FIXES (as requested)
  1) NO main()/entrypoint in editor AND we DO NOT inject it client-side.
     -> harness/main is generated server-side by your runner (same as real assessment).
  2) If question requires a language -> selector locked + cannot switch.
  3) If question defines allowedLanguages -> selector shows ONLY those languages.
  4) Submit is “safe”: reads last saved editor state from localStorage per question.

  ✅ IMPORTANT NEW FIX (your ask):
  - We extract **question testcases** (input/expected) from the fetched question object
    and use them in the UI (Examples + Results fallback).
  - If runner response misses/has wrong input/expected fields, we **fallback to the fetched question testcases**
    (by index) so the UI stays consistent with the currently fetched question (dynamic).

  IMPORTANT:
  - The UI sends ONLY the user’s function/body code (editor content) to backend.
  - If you still see mismatched expected values, it’s backend fetching wrong tests / wrong questionId,
    BUT the UI will at least display the fetched question's inputs/expected.
========================================================= */

type RunCreateResponse = { submission_id?: string; submissionId?: string } & Record<string, unknown>;
type RunSubmissionRaw = unknown;

type Props = {
  attemptId: string;
  payload: GetAttemptDTO;

  // final submit only
  onSubmit: (answers: SubmitAnswersPayload) => Promise<SubmitSimpleTestResponse | void>;
  isSubmitting?: boolean;

  // optional runner hooks (NOW includes attemptId)
  onRunCoding?: (params: {
    attemptId: string;
    questionId: string;
    language: string;
    code: string;
  }) => Promise<RunCreateResponse>;

  onGetSubmission?: (params: { submissionId: string }) => Promise<RunSubmissionRaw>;

  /**
   * Optional: if you support “Retake” by creating a new attempt on server
   * If absent, we only reset local drafts.
   */
  onRetake?: () => Promise<void> | void;
};

type UiChoice = { id: string; rawId: string; text: string };

type UiTestCase = {
  input: string;
  expected: string;
  isHidden?: boolean;
};

type UiQuestion = {
  questionId: string;
  order?: number;
  type: "CODING" | "MCQ";
  title: string;
  difficulty?: string;
  prompt?: string;
  constraints?: string[];
  examples?: { input: string; output: string; explanation?: string }[];
  choices?: UiChoice[];

  /**
   * If backend provides a functionSignature / starter code, we render it.
   * This is the correct place to enforce something like `def greetUser(name):`
   */
  functionSignature?: string;

  // language locking
  requiredLanguage?: string | null;
  allowedLanguages?: string[] | null;

  // ✅ public testcases fetched from the question object (dynamic)
  testCases?: UiTestCase[];
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
  if (hh > 0) return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function getDifficultyColor(difficulty?: string) {
  switch ((difficulty || "").toLowerCase()) {
    case "easy":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "medium":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "hard":
      return "bg-rose-100 text-rose-700 border-rose-300";
    default:
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
}

function extForLang(lang: string) {
  switch ((lang || "").toLowerCase()) {
    case "javascript":
      return "js";
    case "typescript":
    case "typescript-strict":
      return "ts";
    case "java":
      return "java";
    case "cpp":
    case "c++":
      return "cpp";
    case "c":
      return "c";
    case "go":
      return "go";
    case "csharp":
      return "cs";
    case "ruby":
      return "rb";
    case "rust":
      return "rs";
    case "kotlin":
      return "kt";
    case "swift":
      return "swift";
    case "php":
      return "php";
    case "scala":
      return "scala";
    case "perl":
      return "pl";
    case "r":
      return "r";
    default:
      return "py";
  }
}

function normalizeLang(lang: string | null | undefined) {
  return String(lang || "").trim().toLowerCase();
}

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

/**
 * ✅ Editor template:
 * - NEVER includes main/entrypoint.
 * - If backend provides functionSignature, we display that instead (best).
 */
function defaultTemplateWithoutMain(language: string): string {
  switch (normalizeLang(language)) {
    case "javascript":
      return `// Write your solution here\n`;
    case "typescript":
    case "typescript-strict":
      return `// Write your solution here\n`;
    case "java":
      return `class Solution {\n  // Write your solution here\n}\n`;
    case "cpp":
    case "c++":
    case "c":
    case "go":
    case "csharp":
    case "rust":
      return `// Write your solution here\n`;
    default:
      return `# Write your solution here\n`;
  }
}

/**
 * ✅ IMPORTANT FIX:
 * We do NOT inject main/entrypoint client-side.
 * The backend runner will wrap/execute with the correct harness/tests.
 */
function buildExecutableCode(_language: string, editorCode: string) {
  return String(editorCode || "").trimEnd() + "\n";
}

function extractNiceError(e: unknown) {
  const msg = String((e as any)?.message ?? e ?? "Unknown error");
  return msg.length > 700 ? msg.slice(0, 700) + "…" : msg;
}

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
          </code>,
        );
        i = j + 1;
        continue;
      }
    }

    if (text.slice(i, i + 2) === "**") {
      const j = text.indexOf("**", i + 2);
      if (j !== -1) {
        const inner = text.slice(i + 2, j);
        nodes.push(
          <strong key={`b-${key++}`} className="font-semibold">
            {inner}
          </strong>,
        );
        i = j + 2;
        continue;
      }
    }

    if (text[i] === "*") {
      const j = text.indexOf("*", i + 1);
      if (j !== -1) {
        const inner = text.slice(i + 1, j);
        nodes.push(
          <em key={`i-${key++}`} className="italic">
            {inner}
          </em>,
        );
        i = j + 1;
        continue;
      }
    }

    const nextCandidates = [text.indexOf("`", i), text.indexOf("**", i), text.indexOf("*", i)]
      .filter((x) => x !== -1)
      .sort((a, b) => a - b);
    const next = nextCandidates.length ? nextCandidates[0] : -1;

    if (next === -1) {
      pushText(text.slice(i));
      break;
    } else {
      pushText(text.slice(i, next));
      i = next;
    }
  }

  return nodes;
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
        <pre
          key={`pre-${key++}`}
          className={`text-xs font-mono rounded-xl p-3 overflow-auto border ${
            isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/30 border-white/10 text-white/80"
          }`}
        >
          {maybeLang && maybeLang.length < 20 && /^[a-z0-9#+.-]+$/i.test(maybeLang) ? (
            <div className={`text-[11px] mb-2 ${isLight ? "text-slate-500" : "text-white/50"}`}>{maybeLang}</div>
          ) : null}
          <code>{code}</code>
        </pre>,
      );
      continue;
    }

    const lines = chunk.split("\n");
    let ul: React.ReactNode[] = [];
    let ol: React.ReactNode[] = [];
    let inUl = false;
    let inOl = false;

    const flushLists = () => {
      if (inUl) {
        blocks.push(
          <ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1">
            {ul}
          </ul>,
        );
        ul = [];
        inUl = false;
      }
      if (inOl) {
        blocks.push(
          <ol key={`ol-${key++}`} className="list-decimal pl-5 space-y-1">
            {ol}
          </ol>,
        );
        ol = [];
        inOl = false;
      }
    };

    for (const lineRaw of lines) {
      const line = lineRaw.replace(/\t/g, "  ");

      if (!line.trim()) {
        flushLists();
        blocks.push(<div key={`sp-${key++}`} className="h-2" />);
        continue;
      }

      const hMatch = line.match(/^(#{1,3})\s+(.*)$/);
      if (hMatch) {
        flushLists();
        const level = hMatch[1].length;
        const content = hMatch[2];
        blocks.push(
          <div
            key={`h-${key++}`}
            className={level === 1 ? "text-lg font-bold" : level === 2 ? "text-base font-bold" : "text-sm font-semibold"}
          >
            {formatInline(content)}
          </div>,
        );
        continue;
      }

      const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
      if (olMatch) {
        if (inUl) flushLists();
        inOl = true;
        ol.push(
          <li key={`oli-${key++}`} className={isLight ? "text-slate-700" : "text-slate-300"}>
            {formatInline(olMatch[2])}
          </li>,
        );
        continue;
      }

      const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
      if (ulMatch) {
        if (inOl) flushLists();
        inUl = true;
        ul.push(
          <li key={`uli-${key++}`} className={isLight ? "text-slate-700" : "text-slate-300"}>
            {formatInline(ulMatch[1])}
          </li>,
        );
        continue;
      }

      flushLists();
      blocks.push(
        <p key={`p-${key++}`} className={`text-sm leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
          {formatInline(line)}
        </p>,
      );
    }

    flushLists();
  }

  return <div className="space-y-3">{blocks}</div>;
}

/* ================================
   Normalizers (Simple Test -> UI)
================================ */

function toChoices(questionId: string, raw: any): UiChoice[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    const seen = new Set<string>();
    return raw.map((opt: any, idx: number) => {
      const rawIdCandidate = String(opt?.id ?? opt?.option_id ?? opt?.value ?? `opt_${idx}`);
      const rawText = String(opt?.text ?? opt?.label ?? opt?.title ?? opt?.option_text ?? opt?.value ?? opt);
      const rawId = rawIdCandidate && rawIdCandidate !== "[object Object]" ? rawIdCandidate : `opt_${idx}`;

      let uiLocal = rawId;
      if (seen.has(uiLocal)) uiLocal = `${uiLocal}_${idx}`;
      seen.add(uiLocal);

      return { id: `${questionId}::${uiLocal}`, rawId, text: rawText };
    });
  }

  if (typeof raw === "object") {
    return Object.entries(raw).map(([k, v]) => ({
      id: `${questionId}::${String(k)}`,
      rawId: String(k),
      text: String(v),
    }));
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return toChoices(questionId, parsed);
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeTestCases(raw: any): UiTestCase[] {
  if (!raw) return [];

  const arr = (() => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (typeof raw === "object") {
      // sometimes { tests: [...] }
      if (Array.isArray((raw as any).tests)) return (raw as any).tests;
      if (Array.isArray((raw as any).testCases)) return (raw as any).testCases;
      if (Array.isArray((raw as any).publicTests)) return (raw as any).publicTests;
    }
    return [];
  })();

  const out: UiTestCase[] = [];
  for (const t of arr) {
    const input = String(t?.input ?? t?.stdin ?? t?.in ?? t?.args ?? "");
    const expected = String(t?.expected ?? t?.expectedOutput ?? t?.stdout_expected ?? t?.out ?? "");
    if (!input && !expected) continue;
    out.push({
      input,
      expected,
      isHidden: Boolean(t?.hidden ?? t?.isHidden ?? t?.private ?? false),
    });
  }
  return out;
}

function normalizeSimpleTestQuestions(questions: SimpleTestQuestionDTO[]): UiQuestion[] {
  const arr = Array.isArray(questions) ? [...questions] : [];
  arr.sort((a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0));

  return arr
    .map((q) => {
      const kind = String((q as any)?.kind ?? (q as any)?.type ?? "").toUpperCase();
      const type: "MCQ" | "CODING" = kind.includes("MCQ") ? "MCQ" : "CODING";

      const questionId = String((q as any)?.id ?? (q as any)?.questionId ?? (q as any)?.question_id ?? "");
      if (!questionId) return null;

      const prompt = String(
        (q as any)?.prompt ??
          (q as any)?.statement ??
          (q as any)?.description ??
          (q as any)?.problemStatement ??
          "",
      );

      const optionsRaw = (q as any)?.options ?? (q as any)?.choices ?? null;
      const choices: UiChoice[] | undefined = type === "MCQ" ? toChoices(questionId, optionsRaw) : undefined;

      const requiredLanguage = type === "CODING" ? getRequiredLanguageFromQuestion(q) : null;

      const allowedLanguages: string[] | null =
        type === "CODING"
          ? Array.isArray((q as any)?.allowedLanguages)
            ? (q as any).allowedLanguages.map((x: any) => normalizeLang(x)).filter(Boolean)
            : Array.isArray((q as any)?.languages)
              ? (q as any).languages.map((x: any) => normalizeLang(x)).filter(Boolean)
              : Array.isArray((q as any)?.codingLanguages)
                ? (q as any).codingLanguages.map((x: any) => normalizeLang(x)).filter(Boolean)
                : null
          : null;

      const finalAllowed =
        requiredLanguage && (!allowedLanguages || allowedLanguages.length === 0)
          ? [normalizeLang(requiredLanguage)]
          : allowedLanguages;

      // ✅ pull public testcases dynamically from fetched question properties
      const tcRaw =
        (q as any)?.testCases ??
        (q as any)?.tests ??
        (q as any)?.publicTests ??
        (q as any)?.sampleTests ??
        (q as any)?.public_test_cases ??
        null;

      const testCases = normalizeTestCases(tcRaw);

      return {
        questionId,
        order: (q as any)?.order ?? undefined,
        type,
        title: String((q as any)?.title ?? "Untitled question"),
        difficulty: (q as any)?.difficulty ?? undefined,
        prompt: prompt || undefined,
        constraints: Array.isArray((q as any)?.constraints) ? (q as any).constraints.map(String) : undefined,
        examples: Array.isArray((q as any)?.examples)
          ? (q as any).examples.map((ex: any) => ({
              input: String(ex?.input ?? ex?.stdin ?? ""),
              output: String(ex?.output ?? ex?.stdout ?? ex?.expected ?? ""),
              explanation: ex?.explanation ? String(ex.explanation) : undefined,
            }))
          : undefined,
        choices,
        functionSignature: (q as any)?.functionSignature ?? (q as any)?.function_signature ?? undefined,
        requiredLanguage,
        allowedLanguages: finalAllowed,
        testCases: testCases.length ? testCases : undefined,
      } as UiQuestion;
    })
    .filter(Boolean) as UiQuestion[];
}

function toNumber(x: any): number | null {
  const n = typeof x === "number" ? x : typeof x === "string" ? Number(x) : NaN;
  return Number.isFinite(n) ? n : null;
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
    input: t.input ?? t.stdin ?? "",
    expected: t.expected ?? t.stdout_expected ?? t.expectedOutput ?? t.expected_output ?? "",
    actual: t.actual ?? t.output ?? t.stdout ?? t.actual_output ?? "",
    output: t.output ?? t.actual ?? t.stdout ?? t.actual_output ?? "",
    stderr: t.stderr ?? "",
    passed: isTestPassed(t),
    memKb: t.memKb ?? t.mem_kb ?? t.memoryKb ?? undefined,
    durationMs: t.durationMs ?? t.duration_ms ?? t.runtimeMs ?? undefined,
  }));

  const total =
    toNumber(
      resultObj?.total ??
        resultObj?.total_tests ??
        runner?.totalTests ??
        runner?.total_tests ??
        runner?.total ??
        runner?.summary?.total ??
        runner?.summary?.total_tests,
    ) ?? (tests?.length ?? 0);

  const passed =
    toNumber(
      resultObj?.passedCount ??
        resultObj?.passed ??
        resultObj?.passed_tests ??
        runner?.totalPassed ??
        runner?.passed ??
        runner?.passed_tests ??
        runner?.summary?.passed ??
        runner?.summary?.passed_tests,
    ) ?? tests.filter((t) => t.passed).length;

  const scoreDirect =
    payload?.score ??
    resultObj?.score ??
    runner?.score ??
    runner?.summary?.score ??
    resultObj?.summary?.score ??
    payload?.payload?.score ??
    payload?.data?.score;

  const scoreN = toNumber(scoreDirect);
  const score = scoreN !== null ? Math.round(scoreN) : total > 0 ? Math.round((passed / total) * 100) : 0;

  const runtimeMs =
    toNumber(runner?.runtimeMs ?? runner?.runtime_ms ?? resultObj?.runtimeMs ?? payload?.runtimeMs) ?? null;
  const memoryKb =
    toNumber(runner?.memoryKb ?? runner?.memory_kb ?? resultObj?.memoryKb ?? payload?.memoryKb) ?? null;

  return {
    submission_id: submission_id || "unknown",
    status,
    score,
    total: total ?? 0,
    passed: passed ?? 0,
    results: tests,
    stdout: runner?.stdout ?? resultObj?.stdout ?? payload?.stdout ?? null,
    stderr: runner?.stderr ?? resultObj?.stderr ?? payload?.stderr ?? null,
    runtimeMs,
    memoryKb,
    raw,
  };
}

/**
 * ✅ Merge runner test results with fetched question testCases (input/expected).
 * - If runner doesn't provide input/expected, we fallback to the fetched question values.
 * - If runner returned wrong/empty strings, we also fallback (only when missing/blank).
 */
function mergeRunWithQuestionTests(run: UiRunResult | null, q: UiQuestion | undefined): UiRunResult | null {
  if (!run) return null;
  const tcs = q?.testCases && q.testCases.length ? q.testCases : null;
  if (!tcs) return run;

  const merged: UiRunTest[] = (run.results || []).map((t, idx) => {
    const tc = tcs[idx];
    const input = (t?.input ?? "").toString();
    const expected = (t?.expected ?? "").toString();

    return {
      ...t,
      input: input.trim().length ? input : tc?.input ?? input,
      expected: expected.trim().length ? expected : tc?.expected ?? expected,
    };
  });

  return { ...run, results: merged };
}

/* ================================
   LocalStorage keys (attempt scoped)
================================ */

function attemptKeys(attemptId: string) {
  const base = `hiralent.simpleTest.${attemptId}.v3`;
  return {
    PREF_KEY: `${base}.prefs`,
    GLOBAL_TAB_SWITCHES_KEY: `${base}.tabSwitches`,
    ANSWERS_KEY: `${base}.answers`,
    NAV_KEY: `${base}.nav`,
  };
}

function questionKeys(attemptId: string, questionId: string) {
  const base = `hiralent.simpleTest.${attemptId}.q.${questionId}.v3`;
  return {
    FILES_KEY: `${base}.files`,
    ACTIVE_FILE_KEY: `${base}.activeFile`,
    TERMINAL_KEY: `${base}.terminal`,
    EDITOR_TAB_SWITCHES_KEY: `${base}.editorTabSwitches`,
    RUN_CACHE_KEY: `${base}.lastRun`,
    OUTPUT_TAB_KEY: `${base}.outputTab`,
  };
}

function usePrefs(attemptId: string) {
  const { PREF_KEY } = attemptKeys(attemptId);

  const [prefs, setPrefs] = useState<Prefs>(() => {
    if (typeof window === "undefined") return { theme: "dark", fontSize: 14 };
    return safeJsonParse<Prefs>(localStorage.getItem(PREF_KEY), { theme: "dark", fontSize: 14 });
  });

  useEffect(() => {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch {}
  }, [PREF_KEY, prefs]);

  return [prefs, setPrefs] as const;
}

/* ================================
   Language catalog
================================ */

const ALL_LANG_OPTIONS: { value: string; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "typescript-strict", label: "TypeScript (Strict)" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "go", label: "Go" },
  { value: "csharp", label: "C#" },
  { value: "ruby", label: "Ruby" },
  { value: "rust", label: "Rust" },
  { value: "kotlin", label: "Kotlin" },
  { value: "swift", label: "Swift" },
  { value: "php", label: "PHP" },
  { value: "scala", label: "Scala" },
  { value: "perl", label: "Perl" },
  { value: "r", label: "R" },
];

/* ================================
   Main Component
================================ */

export default function SimpleTestRunner({
  attemptId,
  payload,
  onSubmit,
  isSubmitting,
  onRunCoding,
  onGetSubmission,
  onRetake,
}: Props) {
  const questions = useMemo(
    () => normalizeSimpleTestQuestions((payload?.test?.questions ?? []) as SimpleTestQuestionDTO[]),
    [payload],
  );
  const hasMcq = useMemo(() => questions.some((q) => q.type === "MCQ"), [questions]);

  const [prefs, setPrefs] = usePrefs(attemptId);
  const isLight = prefs.theme === "light";

  // Layout offset (avoid header overlap)
  const [pageOffset, setPageOffset] = useState<number>(48);
  useEffect(() => {
    function computeOffset() {
      try {
        let header = document.querySelector("header, nav, [role=banner], .navbar, .site-header") as HTMLElement | null;
        if (!header) {
          const all = Array.from(document.querySelectorAll("body *")) as HTMLElement[];
          header =
            all.find((el) => {
              const cs = getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              return (cs.position === "fixed" || cs.position === "sticky") && Math.abs(rect.top) < 2 && rect.height > 0;
            }) || null;
        }
        const headerHeight = header ? Math.round(header.getBoundingClientRect().height) : 0;
        setPageOffset(headerHeight + 24);
      } catch {
        setPageOffset(48);
      }
    }
    computeOffset();
    window.addEventListener("resize", computeOffset);
    return () => window.removeEventListener("resize", computeOffset);
  }, []);

  const [toast, setToast] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showQuestionPanel, setShowQuestionPanel] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  /* -------------------------
     Timer: lock THIS attempt locally if expired
  ------------------------- */
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);
  const [lockedByTime, setLockedByTime] = useState(false);
  const autoLockOnceRef = useRef(false);

  useEffect(() => {
    setLockedByTime(false);
    autoLockOnceRef.current = false;

    const expiresAt = (payload as any)?.expires_at ?? (payload as any)?.expiresAt ?? null;
    if (expiresAt) {
      setTimeLeftMs(new Date(expiresAt as any).getTime() - Date.now());
      return;
    }

    const minutes = Number(payload?.test?.time_limit_min ?? (payload as any)?.test?.timeLimitMin ?? 0);
    if (minutes > 0) {
      setTimeLeftMs(minutes * 60 * 1000);
      return;
    }

    setTimeLeftMs(null);
  }, [payload]);

  useEffect(() => {
    if (timeLeftMs === null) return;
    const id = setInterval(() => {
      setTimeLeftMs((prev) => (prev === null ? prev : prev - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [timeLeftMs]);

  useEffect(() => {
    if (timeLeftMs === null) return;
    if (autoLockOnceRef.current) return;
    if (timeLeftMs > 0) return;

    autoLockOnceRef.current = true;
    setLockedByTime(true);
    setToast("⏱️ Time expired. This practice attempt is locked.");
  }, [timeLeftMs]);

  const locked = lockedByTime;

  /* -------------------------
     Navigation (local only)
  ------------------------- */
  const { NAV_KEY } = attemptKeys(attemptId);
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = parseInt(localStorage.getItem(NAV_KEY) || "0", 10);
    return Number.isFinite(v) ? Math.max(0, v) : 0;
  });

  useEffect(() => {
    try {
      localStorage.setItem(NAV_KEY, String(activeIndex));
    } catch {}
  }, [NAV_KEY, activeIndex]);

  const activeQ = questions[Math.min(activeIndex, Math.max(0, questions.length - 1))];

  const goPrev = useCallback(() => setActiveIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setActiveIndex((i) => Math.min(questions.length - 1, i + 1)), [questions.length]);

  /* -------------------------
     Tab switches (global)
  ------------------------- */
  const MAX_TAB_SWITCHES = 7;
  const { GLOBAL_TAB_SWITCHES_KEY } = attemptKeys(attemptId);

  const [tabSwitches, setTabSwitches] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = parseInt(localStorage.getItem(GLOBAL_TAB_SWITCHES_KEY) || "0", 10);
    return Number.isFinite(v) ? v : 0;
  });

  const [tabSwitchWarning, setTabSwitchWarning] = useState(false);
  const [tabSwitchAlert, setTabSwitchAlert] = useState<string | null>(null);
  const lastVisibilityStateRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(GLOBAL_TAB_SWITCHES_KEY, String(tabSwitches));
    } catch {}
  }, [GLOBAL_TAB_SWITCHES_KEY, tabSwitches]);

  useEffect(() => {
    if (!tabSwitchAlert) return;
    const t = setTimeout(() => setTabSwitchAlert(null), 3500);
    return () => clearTimeout(t);
  }, [tabSwitchAlert]);

  useEffect(() => {
    if (!tabSwitchWarning) return;
    const t = setTimeout(() => setTabSwitchWarning(false), 4000);
    return () => clearTimeout(t);
  }, [tabSwitchWarning]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !lastVisibilityStateRef.current) {
        lastVisibilityStateRef.current = true;
        setTabSwitches((prev) => {
          const next = prev + 1;
          const msg =
            next >= MAX_TAB_SWITCHES
              ? `ALERT: Tab switch limit reached! (${next}/${MAX_TAB_SWITCHES}) Running is disabled.`
              : `Tab switched away. Count: ${next}/${MAX_TAB_SWITCHES}`;
          setToast(msg);
          setTabSwitchAlert(`Reminder: Please focus and remain on this tab. Violations recorded: ${next}/${MAX_TAB_SWITCHES}`);
          if (next >= MAX_TAB_SWITCHES) setTabSwitchWarning(true);
          return next;
        });
      } else if (!document.hidden) {
        lastVisibilityStateRef.current = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  /* -------------------------
     Copy/Paste restriction (editor-only)
  ------------------------- */
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
        setToast("Pasting from external sources is not allowed. Only paste content copied from this editor.");
      }
      clipboardOriginRef.current = false;
    };

    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("paste", handlePaste, true);
    return () => {
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("paste", handlePaste, true);
    };
  }, []);

  /* -------------------------
     Draft answers (LOCAL ONLY)
     ✅ MULTI-MCQ: selectedOptionIds: string[]
  ------------------------- */
  type DraftAnswer =
    | { type: "MCQ"; selectedOptionIds: string[] }
    | { type: "CODING"; language: string; code: string };

  const { ANSWERS_KEY } = attemptKeys(attemptId);

  const [draftByQ, setDraftByQ] = useState<Record<string, DraftAnswer>>(() => {
    if (typeof window === "undefined") return {};
    return safeJsonParse<Record<string, DraftAnswer>>(localStorage.getItem(ANSWERS_KEY), {});
  });

  useEffect(() => {
    try {
      localStorage.setItem(ANSWERS_KEY, JSON.stringify(draftByQ));
    } catch {}
  }, [ANSWERS_KEY, draftByQ]);

  /* -------------------------
     Editor / Runner state (per-question)
  ------------------------- */
  const editorRefInstance = useRef<any>(null);

  const [outputTab, setOutputTab] = useState<"results" | "terminal">("results");

  const [runResultRaw, setRunResultRaw] = useState<UiRunResult | null>(null);
  const [runLoading, setRunLoading] = useState(false);

  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [terminalInput, setTerminalInput] = useState("");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const [files, setFiles] = useState<CodeFile[]>([
    { id: "f1", name: "main.py", language: "python", code: defaultTemplateWithoutMain("python") },
  ]);
  const [activeFile, setActiveFile] = useState<string>("f1");
  const [editorTabSwitches, setEditorTabSwitches] = useState<number>(0);

  const activeFileObj = useMemo(() => files.find((f) => f.id === activeFile) || files[0], [files, activeFile]);

  const [mcqSelected, setMcqSelected] = useState<string[]>([]);
  const toggleMcq = useCallback((rawId: string) => {
    setMcqSelected((prev) => (prev.includes(rawId) ? prev.filter((x) => x !== rawId) : [...prev, rawId]));
  }, []);

  // ✅ merged results: always prefer runner, but fallback to fetched question testCases for input/expected
  const runResult = useMemo(() => mergeRunWithQuestionTests(runResultRaw, activeQ), [runResultRaw, activeQ]);

  // Hydrate state per active question
  useEffect(() => {
    if (!activeQ) return;

    setRunLoading(false);
    setOutputTab("results");
    setTerminalInput("");

    if (activeQ.type === "MCQ") {
      const prev = draftByQ[activeQ.questionId];
      const selected = prev?.type === "MCQ" ? prev.selectedOptionIds : [];
      setMcqSelected(Array.isArray(selected) ? selected : []);

      setTerminalLogs([]);
      setEditorTabSwitches(0);
      setRunResultRaw(null);
      return;
    }

    // CODING
    const qk = questionKeys(attemptId, activeQ.questionId);

    const storedFiles =
      typeof window !== "undefined" ? safeJsonParse<CodeFile[]>(localStorage.getItem(qk.FILES_KEY), []) : [];
    const storedActive = typeof window !== "undefined" ? localStorage.getItem(qk.ACTIVE_FILE_KEY) || "" : "";
    const storedTerminal =
      typeof window !== "undefined" ? safeJsonParse<TerminalLog[]>(localStorage.getItem(qk.TERMINAL_KEY), []) : [];
    const storedEditorTabs =
      typeof window !== "undefined" ? parseInt(localStorage.getItem(qk.EDITOR_TAB_SWITCHES_KEY) || "0", 10) : 0;
    const storedLastRun =
      typeof window !== "undefined" ? safeJsonParse<any>(localStorage.getItem(qk.RUN_CACHE_KEY), null) : null;
    const storedOutputTab =
      typeof window !== "undefined" ? (localStorage.getItem(qk.OUTPUT_TAB_KEY) as "results" | "terminal" | null) : null;

    setTerminalLogs(Array.isArray(storedTerminal) ? storedTerminal : []);
    setEditorTabSwitches(Number.isFinite(storedEditorTabs) ? storedEditorTabs : 0);
    if (storedOutputTab === "results" || storedOutputTab === "terminal") setOutputTab(storedOutputTab);

    if (storedLastRun) setRunResultRaw(normalizeSubmissionAny(storedLastRun));
    else setRunResultRaw(null);

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
      return;
    }

    const prev = draftByQ[activeQ.questionId];
    const draftLang = normalizeLang(prev?.type === "CODING" ? prev.language : "python") || "python";
    const lang = requiredLang || draftLang || "python";

    const codeDraft = String(prev?.type === "CODING" ? prev.code : "");

    // ✅ If backend provided functionSignature/starter, use it.
    // Otherwise show a generic template (still no main()).
    const starter =
      activeQ.functionSignature?.trim()
        ? String(activeQ.functionSignature)
        : defaultTemplateWithoutMain(lang);

    const code = codeDraft.trim().length ? codeDraft : starter;
    const ext = extForLang(lang);

    setFiles([{ id: "f1", name: `main.${ext}`, language: lang, code }]);
    setActiveFile("f1");
  }, [activeQ?.questionId, activeQ?.type]); // avoid draftByQ in deps to prevent reset loops

  // Persist per-question coding cache
  useEffect(() => {
    if (!activeQ || activeQ.type !== "CODING") return;
    if (typeof window === "undefined") return;

    const qk = questionKeys(attemptId, activeQ.questionId);
    try {
      localStorage.setItem(qk.FILES_KEY, JSON.stringify(files));
      localStorage.setItem(qk.ACTIVE_FILE_KEY, activeFile);
      localStorage.setItem(qk.TERMINAL_KEY, JSON.stringify(terminalLogs));
      localStorage.setItem(qk.EDITOR_TAB_SWITCHES_KEY, String(editorTabSwitches));
      localStorage.setItem(qk.OUTPUT_TAB_KEY, outputTab);
    } catch {}
  }, [attemptId, activeQ, files, activeFile, terminalLogs, editorTabSwitches, outputTab]);

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

  /* -------------------------
     Run coding (optional real runner)
     ✅ sends ONLY editor code (no injection)
  ------------------------- */
  const onRunCodingNow = useCallback(async () => {
    if (!activeQ || activeQ.type !== "CODING") return;
    if (locked) return setToast("Attempt is locked");
    if (tabSwitches >= MAX_TAB_SWITCHES) return setToast(`Tab switch limit reached (${MAX_TAB_SWITCHES}). Run disabled.`);

    setRunLoading(true);
    setRunResultRaw(null);
    setOutputTab("results");

    const requiredLang = activeQ.requiredLanguage ? normalizeLang(activeQ.requiredLanguage) : null;
    const lang = requiredLang || String(activeFileObj?.language || "python");

    // ✅ no main injection here
    const code = buildExecutableCode(lang, String(activeFileObj?.code || ""));

    addTerminalLog("🟦 Run requested…", "info");
    addTerminalLog(`$ run --lang ${lang}`, "command");

    if (!onRunCoding || !onGetSubmission) {
      addTerminalLog("⚠️ Runner not connected for Simple Test.", "error");
      addTerminalLog("Wire onRunCoding + onGetSubmission to enable execution.", "info");
      setToast("Runner not connected");
      setRunLoading(false);
      return;
    }

    try {
      // ✅ PASS attemptId so backend hits /:attemptId/run correctly
      const r = await onRunCoding({ attemptId, questionId: activeQ.questionId, language: lang, code });
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
        const outRaw = await onGetSubmission({ submissionId: sid });
        const out = normalizeSubmissionAny(outRaw);

        if (out && out.status && !["QUEUED", "RUNNING", "PENDING"].includes(out.status)) {
          setRunResultRaw(out);

          try {
            const qk = questionKeys(attemptId, activeQ.questionId);
            localStorage.setItem(qk.RUN_CACHE_KEY, JSON.stringify(outRaw));
          } catch {}

          addTerminalLog(`✅ Completed: ${out.score}% (${out.passed}/${out.total})`, "output");
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
  }, [activeQ, locked, tabSwitches, activeFileObj, onRunCoding, onGetSubmission, addTerminalLog, attemptId]);

  const handleTerminalCommand = useCallback(
    (cmd: string) => {
      if (!cmd.trim()) return;
      addTerminalLog(`$ ${cmd}`, "command");
      setTerminalInput("");

      const c = cmd.toLowerCase().trim();

      if (c === "help" || c === "help()") {
        addTerminalLog("", "info");
        addTerminalLog("Available Commands:", "info");
        addTerminalLog("  run, test        - Execute code against test cases", "info");
        addTerminalLog("  status           - Show current run status", "info");
        addTerminalLog("  clear, cls       - Clear terminal output", "info");
        addTerminalLog("  debug            - Show execution context", "info");
        addTerminalLog("  reset-tabs       - Reset tab switches counter (local)", "info");
        addTerminalLog("  help             - Show this help message", "info");
        addTerminalLog("", "info");
        return;
      }

      if (c === "clear" || c === "cls") {
        setTerminalLogs([]);
        addTerminalLog("Terminal cleared", "info");
        return;
      }

      if (c === "reset-tabs") {
        setTabSwitches(0);
        setTabSwitchWarning(false);
        addTerminalLog("Tab switches reset to 0", "output");
        addTerminalLog("Ready", "info");
        return;
      }

      if (c === "status") {
        addTerminalLog(`attempt=${attemptId.slice(0, 8)} locked=${locked ? "yes" : "no"}`, "info");
        addTerminalLog(`tabSwitches=${tabSwitches}/${MAX_TAB_SWITCHES}`, "info");
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
          if (activeQ?.testCases?.length) addTerminalLog(`question.testCases=${activeQ.testCases.length} (used as fallback input/expected)`, "info");
          if (runResult?.stderr) addTerminalLog(`stderr: ${String(runResult.stderr).slice(0, 240)}`, "error");
        }
        return;
      }

      if (c === "run" || c === "test") {
        if (locked) {
          addTerminalLog("Attempt is locked (time expired).", "error");
          return;
        }
        if (tabSwitches >= MAX_TAB_SWITCHES) {
          addTerminalLog(`Tab switch limit reached (${MAX_TAB_SWITCHES}). Run disabled.`, "error");
          return;
        }
        if (activeQ?.type !== "CODING") {
          addTerminalLog("Run is available for CODING questions only.", "error");
          return;
        }
        onRunCodingNow();
        return;
      }

      addTerminalLog(`command not found: '${cmd}'`, "error");
      addTerminalLog(`Use 'help' for available commands`, "info");
    },
    [
      addTerminalLog,
      attemptId,
      locked,
      tabSwitches,
      editorTabSwitches,
      runResult,
      activeQ,
      activeFileObj,
      files.length,
      onRunCodingNow,
    ],
  );

  /* -------------------------
     Autosave drafts (local only)
  ------------------------- */
  const autosaveRef = useRef<any>(null);

  // MCQ autosave
  useEffect(() => {
    if (!activeQ || activeQ.type !== "MCQ" || locked) return;

    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      setDraftByQ((prev) => ({
        ...prev,
        [activeQ.questionId]: { type: "MCQ", selectedOptionIds: Array.isArray(mcqSelected) ? mcqSelected : [] },
      }));
    }, 250);

    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
    };
  }, [activeQ?.questionId, activeQ?.type, mcqSelected, locked]);

  // CODING autosave
  useEffect(() => {
    if (!activeQ || activeQ.type !== "CODING" || locked) return;

    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      const requiredLang = activeQ.requiredLanguage ? normalizeLang(activeQ.requiredLanguage) : null;
      const lang = requiredLang || String(activeFileObj?.language || "python");
      const code = String(activeFileObj?.code || "");
      setDraftByQ((prev) => ({
        ...prev,
        [activeQ.questionId]: { type: "CODING", language: lang, code },
      }));
    }, 800);

    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
    };
  }, [activeQ?.questionId, activeQ?.type, activeFileObj?.language, activeFileObj?.code, activeQ?.requiredLanguage, locked]);

  /* -------------------------
     Editor actions (files)
  ------------------------- */
  const updateActiveCode = useCallback(
    (newCode: string) => {
      setFiles((prev) => prev.map((f) => (f.id === activeFile ? { ...f, code: newCode } : f)));
    },
    [activeFile],
  );

  const changeLanguage = useCallback(
    (fileId: string, newLang: string) => {
      // ✅ lock if question requires a language
      if (activeQ?.type === "CODING" && activeQ.requiredLanguage) {
        setToast("Language is locked for this question");
        return;
      }

      // ✅ if allowedLanguages exists, enforce
      const allowed = activeQ?.type === "CODING" ? (activeQ.allowedLanguages || null) : null;
      if (allowed && allowed.length > 0) {
        const nl = normalizeLang(newLang);
        if (!allowed.includes(nl)) {
          setToast("This language is not allowed for this question");
          return;
        }
      }

      setFiles((prev) =>
        prev.map((f) => {
          if (f.id !== fileId) return f;
          const base = f.name.replace(/\.[^.]+$/, "");
          const ext = extForLang(newLang);
          return { ...f, language: newLang, name: `${base}.${ext}` };
        }),
      );
      setToast("Language updated");
    },
    [activeQ?.type, activeQ?.requiredLanguage, activeQ?.allowedLanguages],
  );

  const addFile = useCallback(() => {
    if (activeQ?.type !== "CODING") return;

    const requiredLang = activeQ.requiredLanguage ? normalizeLang(activeQ.requiredLanguage) : null;
    const defaultLang = requiredLang || files[0]?.language || "python";

    const id = `f${Date.now()}`;
    const ext = extForLang(defaultLang);
    const name = `file${files.length + 1}.${ext}`;

    // ✅ If signature provided, use it for new files too; else generic
    const code = activeQ.functionSignature?.trim()
      ? String(activeQ.functionSignature)
      : defaultTemplateWithoutMain(defaultLang);

    const file: CodeFile = { id, name, language: defaultLang, code };
    setFiles((prev) => [file, ...prev]);
    setActiveFile(id);
    setToast("New file created");
  }, [files, activeQ]);

  const duplicateFile = useCallback(
    (id: string) => {
      const src = files.find((f) => f.id === id);
      if (!src) return setToast("File not found");
      const nid = `f${Date.now()}`;

      const requiredLang =
        activeQ?.type === "CODING" && activeQ.requiredLanguage ? normalizeLang(activeQ.requiredLanguage) : null;
      const lang = requiredLang || src.language;

      const base = src.name.replace(/\.[^.]+$/, "");
      const ext = extForLang(lang);
      const name = `${base}-copy.${ext}`;
      const copy: CodeFile = { id: nid, name, language: lang, code: src.code };
      setFiles((prev) => {
        const next = [...prev];
        const idx = next.findIndex((f) => f.id === id);
        next.splice(idx + 1, 0, copy);
        return next;
      });
      setActiveFile(nid);
      setToast("File duplicated");
    },
    [files, activeQ?.type, activeQ?.requiredLanguage],
  );

  const deleteFile = useCallback(
    (id: string) => {
      if (files.length === 1) return setToast("Cannot delete last file");
      setFiles((prev) => {
        const next = prev.filter((f) => f.id !== id);
        if (activeFile === id) setActiveFile(next[0]?.id || "f1");
        return next;
      });
      setToast("File deleted");
    },
    [files.length, activeFile],
  );

  const onCopy = useCallback(() => {
    if (!activeFileObj?.code) return;
    navigator.clipboard?.writeText(activeFileObj.code);
    clipboardOriginRef.current = true;
    setToast("Copied from editor");
  }, [activeFileObj]);

  /* -------------------------
     Monaco mount: set ref + intercept copy shortcut
  ------------------------- */
  const onEditorMount = useCallback((editor: any, monaco: any) => {
    editorRefInstance.current = editor;
    try {
      editor.focus();
    } catch {}

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
      const selection = editor.getSelection();
      if (selection) {
        const model = editor.getModel();
        const selectedText = model.getValueInRange(selection);
        navigator.clipboard?.writeText(selectedText).then(() => {
          clipboardOriginRef.current = true;
          setToast("Copied from editor");
        });
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
      if (!clipboardOriginRef.current) {
        setToast("Pasting from external sources is not allowed. Only paste content copied from this editor.");
      }
      clipboardOriginRef.current = false;
    });
  }, []);

  /* -------------------------
     Keyboard shortcuts
  ------------------------- */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQ?.type, onRunCodingNow, showCommandPalette, showSettings]);

  // Ctrl/Cmd+Tab to switch editor files (counts as editorTabSwitches)
  useEffect(() => {
    if (!activeQ || activeQ.type !== "CODING") return;

    function tabHandler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Tab") {
        e.preventDefault();

        if (editorTabSwitches >= MAX_TAB_SWITCHES) {
          setToast(`⚠️ Tab switch limit reached (${MAX_TAB_SWITCHES}). You can no longer switch files.`);
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

  /* -------------------------
     Submit flow (practice)
     ✅ DOES NOT inject main/harness.
     ✅ Safe: reads last saved per-question file state from localStorage
  ------------------------- */
  const [showPreview, setShowPreview] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [submittedOnce, setSubmittedOnce] = useState(false);

  const getBestCodingSnapshot = useCallback(
    (q: UiQuestion): { language: string; code: string } => {
      const d = draftByQ[q.questionId];
      const requiredLang = q.requiredLanguage ? normalizeLang(q.requiredLanguage) : null;

      if (d?.type === "CODING" && typeof d.code === "string") {
        const lang = requiredLang || normalizeLang(d.language) || "python";
        return { language: lang, code: d.code };
      }

      if (typeof window !== "undefined") {
        const qk = questionKeys(attemptId, q.questionId);
        const storedFiles = safeJsonParse<CodeFile[]>(localStorage.getItem(qk.FILES_KEY), []);
        const storedActive = localStorage.getItem(qk.ACTIVE_FILE_KEY) || "";

        const picked = (storedActive && storedFiles.find((f) => f.id === storedActive)) || storedFiles[0] || null;

        if (picked) {
          const lang = requiredLang || normalizeLang(picked.language) || "python";
          return { language: lang, code: String(picked.code || "") };
        }
      }

      const fallbackLang = requiredLang || normalizeLang(files[0]?.language) || "python";
      const fallbackCode = String(files[0]?.code || "");
      return { language: fallbackLang, code: fallbackCode };
    },
    [attemptId, draftByQ, files],
  );

  const buildSubmitPayload = useCallback((): SubmitAnswersPayload => {
    const answers: SubmitAnswersPayload = {};

    for (const q of questions) {
      const d = draftByQ[q.questionId];

      if (q.type === "MCQ") {
        const selectedOptionIds = d?.type === "MCQ" ? d.selectedOptionIds : [];
        answers[q.questionId] = { selectedOptionIds: Array.isArray(selectedOptionIds) ? selectedOptionIds : [] } as any;
        continue;
      }

      const snap = getBestCodingSnapshot(q);
      const requiredLang = q.requiredLanguage ? normalizeLang(q.requiredLanguage) : null;
      const lang = requiredLang || snap.language || "python";

      // ✅ no injection
      const finalCode = buildExecutableCode(lang, String(snap.code || ""));

      answers[q.questionId] = { code: finalCode, language: lang } as any;
    }

    return answers;
  }, [questions, draftByQ, getBestCodingSnapshot]);

  const onSubmitClick = useCallback(() => {
    if (locked) return;
    setShowPreview(true);
  }, [locked]);

  const confirmSubmit = useCallback(async () => {
    if (locked) return;

    try {
      const answers = buildSubmitPayload();
      const res = await onSubmit(answers);

      const s = (res as any)?.score ?? (res as any)?.data?.score ?? null;
      if (typeof s === "number") setFinalScore(s);

      setSubmittedOnce(true);
      setShowPreview(false);
      setToast("Submitted ✓");
    } catch (e: any) {
      setToast(extractNiceError(e) || "Submit failed");
    }
  }, [locked, buildSubmitPayload, onSubmit]);

  const resetLocalAttempt = useCallback(() => {
    try {
      const keys = attemptKeys(attemptId);

      localStorage.removeItem(keys.ANSWERS_KEY);
      localStorage.removeItem(keys.NAV_KEY);
      localStorage.removeItem(keys.GLOBAL_TAB_SWITCHES_KEY);

      for (const q of questions) {
        const qk = questionKeys(attemptId, q.questionId);
        localStorage.removeItem(qk.FILES_KEY);
        localStorage.removeItem(qk.ACTIVE_FILE_KEY);
        localStorage.removeItem(qk.TERMINAL_KEY);
        localStorage.removeItem(qk.EDITOR_TAB_SWITCHES_KEY);
        localStorage.removeItem(qk.RUN_CACHE_KEY);
        localStorage.removeItem(qk.OUTPUT_TAB_KEY);
      }
    } catch {}

    setDraftByQ({});
    setActiveIndex(0);
    setTabSwitches(0);
    setEditorTabSwitches(0);
    setTerminalLogs([]);
    setRunResultRaw(null);
    setSubmittedOnce(false);
    setFinalScore(null);
    setLockedByTime(false);
    setMcqSelected([]);
    setOutputTab("results");
    setToast("Practice reset ✓");
  }, [attemptId, questions]);

  const onRetakeClick = useCallback(async () => {
    if (onRetake) {
      try {
        await onRetake();
        return;
      } catch {
        // fallback
      }
    }
    resetLocalAttempt();
  }, [onRetake, resetLocalAttempt]);

  /* -------------------------
     Guard
  ------------------------- */
  if (!questions.length || !activeQ) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-300 bg-[#05070b]">
        No questions found for this practice test.
      </div>
    );
  }

  const requiredLangUI =
    activeQ.type === "CODING" ? (activeQ.requiredLanguage ? normalizeLang(activeQ.requiredLanguage) : null) : null;
  const languageLocked = !!requiredLangUI;

  const allowedLangsUI =
    activeQ.type === "CODING" && Array.isArray(activeQ.allowedLanguages) && activeQ.allowedLanguages.length > 0
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

  const runDisabled = locked || runLoading || tabSwitches >= MAX_TAB_SWITCHES || activeQ.type !== "CODING";

  return (
    <div
      className={`h-full rounded-lg overflow-hidden p-0 shadow-2xl flex flex-col ${
        isLight ? "bg-white text-slate-800" : "bg-[#0a0e14] text-white"
      }`}
      style={{ minHeight: `calc(100vh - ${pageOffset}px)` }}
    >
      {/* Tab Switch Alert */}
      {tabSwitchAlert && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 flex items-center gap-3 shadow-lg animate-pulse">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold text-sm">{tabSwitchAlert}</span>
        </div>
      )}

      {/* Top toolbar */}
      <div
        className={`${isLight ? "bg-white border-slate-200" : "bg-[#16191e] border-[#2d3139]"} px-6 py-4 flex items-center justify-between border-b shadow-sm`}
      >
        <div className="flex items-center gap-6 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white shadow-md">
            <Code2 className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
              {payload?.test?.title ?? "Simple Test"}{" "}
              <span className={isLight ? "text-slate-500" : "text-slate-400"}>• Practice</span>
            </div>
            <div className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"} truncate`}>
              Q{activeIndex + 1}/{questions.length} • {activeQ.type}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Timer pill */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              isLight ? "bg-slate-100 border border-slate-200" : "bg-white/8 border border-white/12"
            }`}
          >
            <Timer className="w-4 h-4 text-cyan-400" />
            <span className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-white"}`}>
              {timeLeftMs !== null ? msToClock(timeLeftMs) : "—"}
            </span>
          </div>

          {/* Status badge pill */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm transition-all ${
              locked
                ? isLight
                  ? "bg-rose-50 border border-rose-200"
                  : "bg-rose-500/10 border border-rose-400/20"
                : isLight
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-emerald-500/10 border border-emerald-400/20"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span
              className={`text-xs font-semibold ${
                locked ? (isLight ? "text-rose-700" : "text-rose-200") : isLight ? "text-emerald-700" : "text-emerald-200"
              }`}
            >
              {locked ? "LOCKED" : "PRACTICE"}
            </span>
          </div>

          {!locked && (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              <span>
                {tabSwitches}/{MAX_TAB_SWITCHES}
              </span>
            </div>
          )}

          <div className={`w-px h-6 ${isLight ? "bg-slate-200" : "bg-slate-700"}`} />

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                runDisabled
                  ? "opacity-50 bg-slate-600 cursor-not-allowed text-white"
                  : "bg-emerald-500 hover:bg-emerald-600 hover:shadow-lg hover:scale-105 active:scale-95 text-white"
              }`}
              onClick={() => onRunCodingNow()}
              disabled={runDisabled}
              style={{
                boxShadow: !runDisabled ? "0 4px 12px rgba(16, 185, 129, 0.3)" : "none",
              }}
              aria-label="Run code"
              title={activeQ.type !== "CODING" ? "Run is available for coding questions only" : "Run code"}
            >
              {runLoading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              ) : null}
              {runLoading ? "Running" : "Run Code"}
            </button>

            <button
              onClick={onSubmitClick}
              disabled={locked || !!isSubmitting}
              className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                locked || isSubmitting
                  ? "opacity-50 bg-slate-600 cursor-not-allowed text-white"
                  : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:scale-105 active:scale-95 text-white"
              }`}
              style={{ boxShadow: !locked && !isSubmitting ? "0 4px 12px rgba(37, 99, 235, 0.3)" : "none" }}
              aria-label="Submit practice"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Submit
            </button>

            <button
              onClick={onRetakeClick}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-white/10 hover:bg-white/15 text-white/90"
              }`}
              title="Reset practice (does not affect real assessment)"
            >
              <RotateCcw className="w-4 h-4" />
              Retake
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
              className={`p-2 rounded-md transition-all duration-200 ${
                isLight ? "text-slate-600 hover:bg-slate-100" : "text-slate-400 hover:bg-white/8"
              }`}
              onClick={() => setPrefs({ ...prefs, theme: isLight ? "dark" : "light" })}
              aria-label="Toggle theme"
            >
              {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <button
              title="Settings"
              className={`p-2 rounded-md transition-all duration-200 ${
                isLight ? "text-slate-600 hover:bg-slate-100" : "text-slate-400 hover:bg-white/8"
              }`}
              onClick={() => setShowSettings(true)}
              aria-label="Open settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Score banner */}
      {submittedOnce && finalScore !== null && (
        <div className="px-6 pt-4">
          <div
            className={`rounded-xl border p-4 flex items-center justify-between ${
              isLight
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-emerald-500/10 border-emerald-400/20 text-emerald-200"
            }`}
          >
            <div className="font-semibold">✅ Practice completed (score visible only to you)</div>
            <div className="text-xl font-bold">{finalScore}%</div>
          </div>
        </div>
      )}

      {/* Locked banner */}
      {locked && (
        <div className="px-6 pt-4">
          <div
            className={`rounded-xl p-3 text-sm flex items-start gap-2 ${
              isLight
                ? "bg-amber-50 border border-amber-200 text-amber-700"
                : "bg-amber-500/10 border border-amber-400/20 text-amber-200"
            }`}
          >
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            This practice attempt is locked (time expired). You can still click <b>Retake</b> to try again.
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 h-full flex items-stretch gap-0 ${isLight ? "bg-slate-50" : "bg-[#0a0e14]"}`}>
        {/* Left Sidebar - Question Panel */}
        {showQuestionPanel && (
          <div className={`h-full w-96 flex flex-col ${isLight ? "border-slate-200 bg-white" : "border-[#2d3139] bg-[#16191e]"} border-r overflow-hidden`}>
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
                <span
                  className={`inline-block text-xs px-2 py-1 rounded-full font-semibold border ${
                    isLight ? "border-slate-200 bg-slate-100 text-slate-700" : "border-white/10 bg-white/8 text-white/80"
                  }`}
                >
                  {activeQ.type}
                </span>

                {activeQ.type === "CODING" && languageLocked && requiredLangUI && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold border ${
                      isLight ? "border-amber-200 bg-amber-50 text-amber-700" : "border-amber-400/20 bg-amber-500/10 text-amber-200"
                    }`}
                    title="Language locked by question"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {requiredLangUI}
                  </span>
                )}

                {activeQ.type === "CODING" && !languageLocked && allowedLangsUI?.length ? (
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold border ${
                      isLight ? "border-slate-200 bg-slate-50 text-slate-600" : "border-white/10 bg-white/5 text-white/60"
                    }`}
                    title="Allowed languages"
                  >
                    {allowedLangsUI.join(", ")}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 min-h-0" style={{ scrollbarGutter: "stable" }}>
              {activeQ.prompt ? (
                <div>{renderMarkdownLike(activeQ.prompt, isLight)}</div>
              ) : (
                <div className={`${isLight ? "text-slate-500" : "text-white/50"} text-sm`}>No prompt.</div>
              )}

              {Array.isArray(activeQ.examples) && activeQ.examples.length > 0 && (
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    Examples
                  </h4>
                  <div className="space-y-2.5">
                    {activeQ.examples.slice(0, 5).map((ex, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${isLight ? "bg-slate-100 border-slate-200" : "bg-[#2d3139] border-[#3d4451]"} border text-xs space-y-1`}
                      >
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
                        {ex.explanation ? (
                          <div className={`${isLight ? "text-slate-600" : "text-slate-400"} text-[11px] pt-1`}>{ex.explanation}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ✅ show fetched testCases (input/expected) so it’s always the correct question */}
              {activeQ.type === "CODING" && activeQ.testCases?.length ? (
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    Test Cases (from fetched question)
                  </h4>
                  <div className="space-y-2.5">
                    {activeQ.testCases.slice(0, 6).map((tc, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${isLight ? "bg-slate-100 border-slate-200" : "bg-[#2d3139] border-[#3d4451]"} border text-xs space-y-1`}
                      >
                        <div className={`font-semibold ${isLight ? "text-slate-800" : "text-slate-300"}`}>
                          Case {idx + 1}{tc.isHidden ? " (hidden)" : ""}
                        </div>
                        <div className={`font-mono ${isLight ? "text-slate-700" : "text-slate-400"}`}>
                          <div>
                            <span className={isLight ? "text-slate-600" : "text-slate-500"}>Input:</span>{" "}
                            <span className={isLight ? "text-blue-600" : "text-cyan-400"}>{tc.input || "—"}</span>
                          </div>
                          <div>
                            <span className={isLight ? "text-slate-600" : "text-slate-500"}>Expected:</span>{" "}
                            <span className={isLight ? "text-emerald-600" : "text-emerald-400"}>{tc.expected || "—"}</span>
                          </div>
                        </div>
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

        {/* Middle: MCQ or Editor */}
        <div className={`flex-1 p-0 flex flex-col ${isLight ? "bg-white" : "bg-[#16191e]"} relative`}>
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
                    Multiple answers
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
                            ? isLight
                              ? "border-blue-300 bg-blue-50"
                              : "border-cyan-300/40 bg-cyan-500/10"
                            : isLight
                              ? "border-slate-200 bg-white hover:bg-slate-50"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center ${
                              selected
                                ? isLight
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-cyan-400 bg-cyan-400"
                                : isLight
                                  ? "border-slate-300"
                                  : "border-white/20"
                            }`}
                          >
                            {selected && <div className={`h-2 w-2 rounded ${isLight ? "bg-white" : "bg-black"}`} />}
                          </div>
                          <div className={`text-sm ${isLight ? "text-slate-800" : "text-white/90"}`}>{c.text}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!activeQ.choices?.length && <div className={`text-sm ${isLight ? "text-slate-500" : "text-white/60"}`}>No choices found.</div>}
              </div>
            </div>
          ) : (
            <>
              {/* Editor top bar */}
              <div className={`${isLight ? "bg-white border-slate-300" : "bg-[#16191e] border-[#2d3139]"} border-b px-6 py-3 flex items-center gap-3`}>
                <div className="flex gap-2 items-center flex-wrap" role="tablist" aria-label="Files">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-t-lg transition border-b-2 cursor-pointer ${
                        activeFile === f.id
                          ? `border-b-blue-500 ${isLight ? "bg-white text-slate-900 font-medium" : "bg-[#16191e] text-white font-medium"}`
                          : `border-b-transparent ${isLight ? "bg-transparent text-slate-600 hover:text-slate-900" : "bg-transparent text-slate-500 hover:text-slate-300"}`
                      }`}
                      role="tab"
                      aria-selected={activeFile === f.id}
                      tabIndex={0}
                      onClick={() => {
                        if (locked) return;
                        if (activeFile !== f.id && editorTabSwitches >= MAX_TAB_SWITCHES) {
                          setToast(`⚠️ Tab switch limit reached (${MAX_TAB_SWITCHES}). You cannot switch files.`);
                          return;
                        }
                        if (activeFile !== f.id) {
                          setActiveFile(f.id);
                          setEditorTabSwitches((prev) => prev + 1);
                        }
                      }}
                    >
                      <button className="text-xs font-medium truncate max-w-[8rem]">{f.name}</button>

                      {files.length > 1 && !locked && (
                        <>
                          <button
                            title="Duplicate file"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateFile(f.id);
                            }}
                            className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                            aria-label={`Duplicate ${f.name}`}
                          >
                            <FilesIcon className="w-3 h-3" />
                          </button>

                          <button
                            title="Delete file"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFile(f.id);
                            }}
                            className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition"
                            aria-label={`Delete ${f.name}`}
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
                      title="Create file"
                      aria-label="Create file"
                    >
                      <Plus className="w-4 h-4 inline -mt-0.5 mr-1" />
                      New File
                    </button>
                  )}
                </div>

                <div className="ml-auto flex gap-2 items-center">
                  {/* Language selector */}
                  <div className={`flex items-center gap-2 rounded px-2 py-1 border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#2d3139] border-[#3d4451]"}`}>
                    <label className={`text-xs mr-1 font-medium ${isLight ? "text-slate-600" : "text-slate-500"}`}>Language</label>

                    {languageLocked && <Lock className="w-3.5 h-3.5 text-amber-500" />}

                    <select
                      value={languageLocked && requiredLangUI ? requiredLangUI : (activeFileObj?.language || "python")}
                      onChange={(e) => {
                        if (locked) return;
                        if (languageLocked) return;
                        changeLanguage(activeFileObj.id, e.target.value);
                      }}
                      disabled={locked || languageLocked}
                      className={`bg-transparent text-sm outline-none font-medium disabled:opacity-60 ${isLight ? "text-slate-800" : "text-slate-300"}`}
                    >
                      {languageOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
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

              {/* Monaco */}
              <div className={`flex-1 rounded-none overflow-hidden min-h-0 relative ${isLight ? "bg-white" : "bg-[#16191e]"}`}>
                <MonacoEditor
                  key={activeFile}
                  height="100%"
                  language={languageLocked && requiredLangUI ? requiredLangUI : (activeFileObj?.language || "python")}
                  defaultLanguage={languageLocked && requiredLangUI ? requiredLangUI : (activeFileObj?.language || "python")}
                  value={activeFileObj?.code || ""}
                  onChange={(v) => {
                    if (locked) return;
                    updateActiveCode(v || "");
                  }}
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

        {/* Right panel */}
        <div className={`w-full sm:w-96 flex flex-col border-l ${isLight ? "border-slate-200 bg-white text-slate-900" : "border-[#2d3139] bg-[#0a0e14] text-slate-100"}`}>
          {/* Tabs */}
          <div className={`${isLight ? "bg-slate-100 border-slate-200" : "bg-[#1a1f2e] border-[#2d3139]"} border-b px-0 flex items-center gap-0`}>
            <button
              onClick={() => setOutputTab("results")}
              className={`px-5 py-3 text-sm font-semibold border-b-3 transition-all ${
                outputTab === "results"
                  ? `border-b-green-500 ${isLight ? "text-slate-900 bg-white" : "text-cyan-400 bg-[#16191e]"}`
                  : `${isLight ? "border-b-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50" : "border-b-transparent text-slate-400 hover:text-slate-200 hover:bg-[#242a38]"}`
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Results
              </span>
            </button>

            <button
              onClick={() => setOutputTab("terminal")}
              className={`px-5 py-3 text-sm font-semibold border-b-3 transition-all ${
                outputTab === "terminal"
                  ? `border-b-green-500 ${isLight ? "text-slate-900 bg-white" : "text-cyan-400 bg-[#16191e]"}`
                  : `${isLight ? "border-b-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50" : "border-b-transparent text-slate-400 hover:text-slate-200 hover:bg-[#242a38]"}`
              }`}
            >
              <span className="flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                Terminal
              </span>
            </button>

            <div className="ml-auto flex items-center gap-2 pr-4">
              {locked && (
                <div className="text-xs text-rose-500 flex items-center gap-1 px-3 py-1 rounded-full bg-rose-900/20 border border-rose-700/50 font-semibold">
                  <Lock className="w-3 h-3" />
                  Locked
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div
            className={`flex-1 overflow-auto text-xs min-h-0 font-mono p-0 ${isLight ? "bg-white text-slate-900" : "bg-[#0a0e14] text-slate-100"}`}
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          >
            {/* Results */}
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
                      <div className={`text-xs ${isLight ? "text-slate-500" : "text-slate-500"}`}>Use Run Code or type `run` in Terminal.</div>
                    </div>
                  </div>
                ) : runLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <div className="flex gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${isLight ? "bg-blue-500" : "bg-blue-400"} animate-pulse`}></div>
                      <div className={`w-1.5 h-1.5 rounded-full ${isLight ? "bg-blue-500" : "bg-blue-400"} animate-pulse`} style={{ animationDelay: "150ms" }}></div>
                      <div className={`w-1.5 h-1.5 rounded-full ${isLight ? "bg-blue-500" : "bg-blue-400"} animate-pulse`} style={{ animationDelay: "300ms" }}></div>
                    </div>
                    <div className={`text-sm font-medium ${isLight ? "text-slate-600" : "text-slate-400"}`}>Executing code...</div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto flex flex-col">
                    {/* Metrics */}
                    <div className={`${isLight ? "bg-slate-50 border-b border-slate-200" : "bg-slate-900 border-b border-slate-800"} px-6 py-4 flex items-center justify-center gap-12`}>
                      <div>
                        <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isLight ? "text-slate-600" : "text-slate-500"}`}>Score</div>
                        <div className={`text-2xl font-bold ${(runResult?.score === 100) ? "text-blue-500" : (runResult?.score ?? 0) >= 50 ? "text-amber-500" : "text-red-500"}`}>
                          {runResult?.score ?? 0}%
                        </div>
                      </div>
                      <div>
                        <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isLight ? "text-slate-600" : "text-slate-500"}`}>Runtime</div>
                        <div className={`text-2xl font-bold ${isLight ? "text-slate-900" : "text-slate-300"}`}>
                          {runResult?.runtimeMs ?? runResult?.results?.reduce((a, t) => a + (t.durationMs || 0), 0) ?? 0}ms
                        </div>
                      </div>
                      <div>
                        <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isLight ? "text-slate-600" : "text-slate-500"}`}>Memory</div>
                        <div className={`text-2xl font-bold ${isLight ? "text-slate-900" : "text-slate-300"}`}>
                          {runResult?.memoryKb ?? 0}KB
                        </div>
                      </div>
                    </div>

                    {/* Test cards */}
                    <div className={`flex-1 px-6 py-6 overflow-y-auto space-y-4`}>
                      {(runResult?.results || []).length === 0 ? (
                        <div className={`text-center py-12 ${isLight ? "text-slate-500" : "text-slate-500"}`}>
                          <div className="text-sm">No test results</div>
                        </div>
                      ) : (
                        (runResult?.results || []).map((t, i) => (
                          <div
                            key={i}
                            className={`border rounded-lg p-4 ${
                              t.passed
                                ? (isLight ? "bg-white border-green-200" : "bg-slate-900 border-green-900/40")
                                : (isLight ? "bg-white border-red-200" : "bg-slate-900 border-red-900/40")
                            }`}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>Test {i + 1}</div>
                              <div
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${
                                  t.passed
                                    ? (isLight ? "bg-green-100 text-green-700" : "bg-green-900/30 text-green-400")
                                    : (isLight ? "bg-red-100 text-red-700" : "bg-red-900/30 text-red-400")
                                }`}
                              >
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
                                <div
                                  className={`text-sm font-mono p-2 rounded ${
                                    !t.passed
                                      ? isLight
                                        ? "bg-red-50 text-red-700"
                                        : "bg-red-900/30 text-red-400"
                                      : isLight
                                        ? "bg-slate-50 text-slate-700"
                                        : "bg-slate-800 text-slate-300"
                                  }`}
                                >
                                  {(t.actual ?? t.output) ? String(t.actual ?? t.output).substring(0, 120) : "—"}
                                </div>
                              </div>
                            </div>

                            {/* ✅ small hint if we have question testcases */}
                            {activeQ.testCases?.length ? (
                              <div className={`mt-3 text-[11px] ${isLight ? "text-slate-500" : "text-slate-500"}`}>
                                Note: Input/Expected are aligned with the <b>fetched question</b> testCases when runner fields are missing.
                              </div>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Terminal */}
            {outputTab === "terminal" && (
              <div
                className="h-full flex flex-col bg-black"
                onClick={() => {
                  const input = document.querySelector("#terminal-input") as HTMLInputElement;
                  if (input) input.focus();
                }}
              >
                <div className="flex-1 overflow-y-auto px-4 py-4 font-mono text-sm bg-black text-slate-300" style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace", lineHeight: "1.5" }}>
                  {terminalLogs.length === 0 ? (
                    <div className="text-slate-500 text-xs">Ready. Type 'help' to see options.</div>
                  ) : (
                    <div className="space-y-0">
                      {terminalLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={
                            log.type === "command"
                              ? "text-blue-400"
                              : log.type === "error"
                                ? "text-red-400"
                                : log.type === "info"
                                  ? "text-cyan-400"
                                  : "text-slate-300"
                          }
                        >
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
                      placeholder={locked ? "Locked" : "Enter command... (help/run/status/clear)"}
                      className="flex-1 bg-black text-emerald-500 text-sm outline-none placeholder:text-slate-600 caret-emerald-500 disabled:opacity-60"
                      style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
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

      {/* Submit Preview Modal */}
      {showPreview && (
        <SubmitPreviewModalSimpleTest
          questions={questions}
          draftByQ={draftByQ}
          onClose={() => setShowPreview(false)}
          onConfirm={confirmSubmit}
          loading={!!isSubmitting}
          theme={prefs.theme}
          hasMcq={hasMcq}
          attemptId={attemptId}
        />
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-1 rounded hover:bg-slate-100" aria-label="Close settings">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2 text-slate-700">Theme</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPrefs({ ...prefs, theme: "dark" })}
                    className={`px-4 py-2 rounded-lg font-medium transition ${prefs.theme === "dark" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                  >
                    <Moon className="w-4 h-4 inline mr-2" /> Dark
                  </button>
                  <button
                    onClick={() => setPrefs({ ...prefs, theme: "light" })}
                    className={`px-4 py-2 rounded-lg font-medium transition ${prefs.theme === "light" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                  >
                    <Sun className="w-4 h-4 inline mr-2" /> Light
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2 text-slate-700">Font Size</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={12}
                    max={20}
                    value={prefs.fontSize || 14}
                    onChange={(e) => setPrefs({ ...prefs, fontSize: Number(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-slate-700 w-10">{prefs.fontSize || 14}px</span>
                </div>
              </div>

              <div className="text-xs text-slate-500">Tip: Ctrl/Cmd+K • Ctrl/Cmd+Enter to Run (coding). Esc to close modals.</div>
            </div>
          </div>
        </div>
      )}

      {/* Command palette */}
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
                  if (v.includes("submit")) onSubmitClick();
                  setShowCommandPalette(false);
                }}
              />
              <button className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm" onClick={() => setShowCommandPalette(false)}>
                Close
              </button>
            </div>
            <div className="text-xs text-white/50 px-1">Ctrl/Cmd+K • Ctrl/Cmd+Enter: run • Esc: close</div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded shadow z-50">{toast}</div>}
    </div>
  );
}

/* ================================
   Submit Preview Modal (Simple Test)
================================ */

function SubmitPreviewModalSimpleTest({
  questions,
  draftByQ,
  onClose,
  onConfirm,
  loading,
  theme,
  hasMcq,
  attemptId,
}: {
  questions: UiQuestion[];
  draftByQ: Record<string, any>;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  theme: "light" | "dark";
  hasMcq: boolean;
  attemptId: string;
}) {
  const isLight = theme === "light";

  const answeredCount = useMemo(() => {
    return questions.filter((q) => {
      const d = draftByQ[q.questionId];
      if (!d) return false;

      if (q.type === "MCQ") {
        const arr = Array.isArray(d?.selectedOptionIds) ? d.selectedOptionIds : [];
        return arr.length > 0;
      }
      if (q.type === "CODING") return typeof d.code === "string" && d.code.trim().length > 0;
      return false;
    }).length;
  }, [questions, draftByQ]);

  const codingSnapshot = useCallback(
    (q: UiQuestion) => {
      const d = draftByQ[q.questionId];
      const requiredLang = q.requiredLanguage ? normalizeLang(q.requiredLanguage) : null;

      if (q.type !== "CODING") return { lang: "", code: "" };

      if (d && typeof d.code === "string") {
        const lang = requiredLang || normalizeLang(d.language) || "";
        return { lang, code: String(d.code || "") };
      }

      if (typeof window !== "undefined") {
        const qk = questionKeys(attemptId, q.questionId);
        const storedFiles = safeJsonParse<CodeFile[]>(localStorage.getItem(qk.FILES_KEY), []);
        const storedActive = localStorage.getItem(qk.ACTIVE_FILE_KEY) || "";
        const picked = (storedActive && storedFiles.find((f) => f.id === storedActive)) || storedFiles[0] || null;

        if (picked) {
          const lang = requiredLang || normalizeLang(picked.language) || "";
          return { lang, code: String(picked.code || "") };
        }
      }

      return { lang: requiredLang || "", code: "" };
    },
    [attemptId, draftByQ],
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
      <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#0b0f16] border-white/10"}`}>
        <div className={`p-5 border-b flex items-center justify-between ${isLight ? "border-slate-200" : "border-white/10"}`}>
          <div>
            <div className="text-lg font-bold">Submission Preview</div>
            <div className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-white/60"}`}>Answered {answeredCount}/{questions.length}</div>
          </div>
          <button onClick={onClose} className={`px-3 py-2 rounded-xl border ${isLight ? "border-slate-200 bg-slate-50 hover:bg-slate-100" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
            Close
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-auto space-y-3">
          {!hasMcq && (
            <div className={`rounded-xl border p-3 text-sm ${isLight ? "border-slate-200 bg-slate-50 text-slate-700" : "border-white/10 bg-white/5 text-white/70"}`}>
              This simple test has no MCQ questions (only what exists in the question bank was attached).
            </div>
          )}

          {questions.map((q, idx) => {
            const d = draftByQ[q.questionId];

            const selectedArr = q.type === "MCQ" ? (Array.isArray(d?.selectedOptionIds) ? d.selectedOptionIds : []) : [];
            const snap = q.type === "CODING" ? codingSnapshot(q) : { lang: "", code: "" };

            const saved = q.type === "MCQ" ? selectedArr.length > 0 : snap.code.trim().length > 0;

            return (
              <div key={q.questionId} className={`rounded-xl border p-4 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold">
                      Q{idx + 1}. {q.title}
                    </div>
                    <div className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-white/60"}`}>{q.type}</div>
                  </div>
                  <div className={`text-xs font-bold px-3 py-1 rounded-full border ${isLight ? "border-slate-200 bg-white text-slate-500" : "border-white/10 bg-white/5 text-white/60"}`}>
                    {saved ? "READY" : "EMPTY"}
                  </div>
                </div>

                {q.type === "MCQ" ? (
                  <div className={`mt-3 text-sm ${isLight ? "text-slate-700" : "text-white/80"}`}>
                    Selected optionIds: <span className="font-mono text-xs">{selectedArr.length ? selectedArr.join(", ") : "—"}</span>
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className={`text-xs ${isLight ? "text-slate-600" : "text-white/60"}`}>Language: {snap.lang || "—"}</div>
                    <pre className={`mt-2 text-xs rounded-xl p-3 overflow-auto border ${isLight ? "bg-white border-slate-200" : "bg-black/40 border-white/10"}`}>
                      {snap.code.slice(0, 1800) || "—"}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className={`p-5 border-t flex items-center justify-end gap-3 ${isLight ? "border-slate-200" : "border-white/10"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl border font-semibold ${isLight ? "border-slate-200 bg-slate-50 hover:bg-slate-100" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
            Keep working
          </button>
          <button onClick={onConfirm} disabled={loading} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 font-bold text-white">
            {loading ? "Submitting…" : "Confirm Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
