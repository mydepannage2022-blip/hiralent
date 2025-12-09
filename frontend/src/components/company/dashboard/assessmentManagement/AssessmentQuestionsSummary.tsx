"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ListChecks,
  AlertTriangle,
  Gauge,
  Code2,
  Tag,
  X,
} from "lucide-react";

// ✅ v2 imports
import { Highlight, themes } from "prism-react-renderer";
import type { Language } from "prism-react-renderer";

/* ======================= Helpers ======================= */

// Turn "\n" into real line breaks so text looks normal
function decodeText(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\\n/g, "\n");
}

// Extract ```code``` from a statement if present
function extractCode(statement: string) {
  if (!statement)
    return { cleanStatement: statement, code: null as string | null };

  const fenceStart = statement.indexOf("```");
  if (fenceStart === -1) {
    return { cleanStatement: statement, code: null as string | null };
  }

  const before = statement.slice(0, fenceStart).trim();
  const after = statement.slice(fenceStart + 3);
  const fenceEnd = after.indexOf("```");
  const inside = fenceEnd !== -1 ? after.slice(0, fenceEnd) : after;

  // Remove language prefix like "jsx\n", "js\n", "tsx\n"
  const cleanedInside = inside
    .replace(/^(jsx|js|tsx|ts|javascript|typescript)\n/, "")
    .trim();

  return {
    cleanStatement: before,
    code: cleanedInside || null,
  };
}

// Guess Prism language from tags / text
function guessLanguageFromQuestion(q: QuestionSummary): Language {
  const tags = (q.skillTags || []).map((t) => t.toLowerCase());
  const type = (q.type || "").toLowerCase();
  const text = (q.statement || "").toLowerCase();

  const haystack = `${tags.join(" ")} ${type} ${text}`;

  if (haystack.includes("typescript") || haystack.includes("tsx")) return "tsx";
  if (haystack.includes("react")) return "jsx";
  if (haystack.includes("javascript") || haystack.includes("node"))
    return "javascript";
  if (haystack.includes("python")) return "python";
  if (haystack.includes("java ")) return "java";
  if (haystack.includes("sql")) return "sql";
  if (haystack.includes("css")) return "css";
  if (haystack.includes("html")) return "markup";

  // Safe default
  return "javascript";
}

/* ======================= Types ======================= */

type QuestionSummary = {
  id: string;
  title: string;
  difficulty?: string;
  type?: string;
  skillTags?: string[];
  statement?: string;
  code?: string | null;
};

interface EmployerAssessmentLite {
  assessment_id: string;
  total_questions: number;
  question_ids?: string[];
}

interface Props {
  token: string;
  assessment: EmployerAssessmentLite;
  onAfterGenerate?: () => void;
}

const API_BASE =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

const AssessmentQuestionsSummary: React.FC<Props> = ({
  token,
  assessment,
  onAfterGenerate,
}) => {
  const plannedCount = assessment.total_questions || 0;
  const [attachedCount, setAttachedCount] = useState(
    Array.isArray(assessment.question_ids)
      ? assessment.question_ids.length
      : 0,
  );

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  /* ============ API CALLS ============ */

  const generateQuestions = async () => {
    if (!token) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/employer-assessments/${assessment.assessment_id}/generate-questions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }

      const json = await res.json();
      const count =
        json?.result?.question_count ??
        json?.result?.questions?.length ??
        attachedCount;

      setAttachedCount(count);

      if (onAfterGenerate) {
        await onAfterGenerate();
      }
    } catch (err) {
      console.error("Generate questions failed:", err);
      setError("Failed to generate questions. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const openQuestionsModal = async () => {
    if (!token) return;
    setModalOpen(true);
    setLoadingList(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/employer-assessments/${assessment.assessment_id}/questions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }

      const data = await res.json();
      const rawQuestions: any[] = data?.result?.questions ?? [];

      const mapped: QuestionSummary[] = rawQuestions.map(
        (q: any, index: number) => {
          const difficulty = q.difficulty ?? q.level ?? "medium";
          const type = q.type ?? q.category ?? "GENERAL";
          const skillTags = q.skillTags ?? q.skills ?? [];

          const statement: string =
            q.statement ||
            q.problemStatement ||
            q.description ||
            q.body ||
            q.prompt ||
            q.text ||
            "";

          const code: string | null =
            q.code_snippet ||
            q.starter_code ||
            q.initial_code ||
            q.template ||
            q.boilerplate ||
            null;

          return {
            id: q.id ?? q.question_id ?? String(index),
            title: q.title ?? q.name ?? "Untitled question",
            difficulty,
            type,
            skillTags,
            statement,
            code,
          };
        },
      );

      setQuestions(mapped);
    } catch (err) {
      console.error("Load questions failed:", err);
      setError("Failed to load attached questions.");
    } finally {
      setLoadingList(false);
    }
  };

  /* ============ RENDER ============ */

  return (
    <>
      {/* Right panel summary (button + stats) */}
      <div className="space-y-3">
        {/* Generate button */}
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          disabled={generating}
          onClick={generateQuestions}
          className="w-full rounded-2xl bg-gradient-to-r from-[#1B73E8] to-[#1557B0] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {generating ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
            />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>Generate & attach AI questions</span>
        </motion.button>

        {/* Planned / attached summary – click opens modal */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={openQuestionsModal}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
            <ListChecks className="h-4 w-4 text-[#1B73E8]" />
          </div>
          <div className="text-xs text-gray-700">
            <div>
              Planned:{" "}
              <span className="font-semibold text-gray-900">
                {plannedCount} questions
              </span>
            </div>
            <div>
              Attached now:{" "}
              <span
                className={`font-semibold ${
                  attachedCount > 0 ? "text-emerald-600" : "text-gray-900"
                }`}
              >
                {attachedCount}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-blue-600">
              Click to view all attached questions
            </div>
          </div>
        </motion.button>

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Modal with full statements & code */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
            />

            {/* Card */}
            <motion.div
              initial={{ scale: 0.9, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 24, opacity: 0 }}
              transition={{ type: "spring", damping: 24 }}
              className="relative w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-3xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.55)] border border-slate-200/80"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] px-7 py-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 shadow-inner"
                      animate={{ rotate: [0, 3, -3, 0] }}
                      transition={{ duration: 6, repeat: Infinity }}
                    >
                      <Code2 className="h-4 w-4" />
                    </motion.div>
                    <div>
                      <h2 className="text-sm font-semibold tracking-wide">
                        Attached questions
                      </h2>
                      <p className="text-[11px] text-blue-100/90">
                        {attachedCount} attached · Planned {plannedCount}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="rounded-full p-2 hover:bg-white/15 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="max-h-[78vh] overflow-y-auto px-6 py-5 bg-slate-50/60 custom-scrollbar">
                {loadingList ? (
                  <div className="flex items-center justify-center py-10 text-sm text-gray-600">
                    Loading questions...
                  </div>
                ) : questions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-600">
                    No questions attached yet. Use{" "}
                    <span className="font-semibold text-[#1B73E8]">
                      “Generate & attach AI questions”
                    </span>{" "}
                    to populate this assessment.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q, index) => {
                      const diff = (q.difficulty || "medium").toLowerCase();
                      const diffLabel =
                        diff === "easy"
                          ? "Easy"
                          : diff === "hard"
                          ? "Hard"
                          : "Medium";

                      const diffColor =
                        diff === "easy"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : diff === "hard"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-sky-50 text-sky-700 border-sky-200";

                      // ----- Clean text + code for display -----
                      const decodedStatement = decodeText(q.statement);
                      const { cleanStatement, code: fencedCode } =
                        extractCode(decodedStatement);
                      const finalCodeRaw =
                        q.code && q.code.trim().length > 0
                          ? q.code
                          : fencedCode;
                      const finalCode = decodeText(finalCodeRaw || "");

                      // remove "Starter code:" first line if present
                      let cleanedStatement = (cleanStatement || "").trim();
                      if (cleanedStatement) {
                        const lines = cleanedStatement.split("\n");
                        if (
                          lines.length >= 1 &&
                          /^starter code:?$/i.test(lines[0].trim())
                        ) {
                          cleanedStatement = lines.slice(1).join("\n").trim();
                        }
                      }

                      const hasStatement =
                        cleanedStatement && cleanedStatement.trim().length > 0;
                      const hasCode =
                        finalCode && finalCode.trim().length > 0;

                      const language = guessLanguageFromQuestion(q);

                      return (
                        <motion.div
                          key={q.id}
                          whileHover={{
                            y: -4,
                            scale: 1.01,
                            boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
                          }}
                          whileTap={{ scale: 0.99 }}
                          transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 18,
                          }}
                          className="rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm"
                        >
                          {/* Top row: index, title, chips */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-[#1B73E8]">
                                #{index + 1}
                              </div>
                              <div className="text-[14px] font-semibold text-slate-900">
                                {q.title}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {q.type && (
                                <span className="inline-flex items-center rounded-full border border-gray-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                  {q.type}
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${diffColor}`}
                              >
                                <Gauge className="h-3 w-3" />
                                {diffLabel}
                              </span>
                            </div>
                          </div>

                          {/* Statement + Code */}
                          <div className="mt-3 space-y-3">
                            {hasStatement && (
                              <div className="text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {cleanedStatement}
                              </div>
                            )}

                            {hasCode && (
                              <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950 shadow-inner">
                                <Highlight
                                  code={finalCode}
                                  language={language}
                                  theme={themes.nightOwl}
                                >
                                  {({
                                    className,
                                    style,
                                    tokens,
                                    getLineProps,
                                    getTokenProps,
                                  }) => (
                                    <pre
                                      className={`${className} text-[13px] px-4 py-3 overflow-x-auto`}
                                      style={style}
                                    >
                                      {tokens.map((line, i) => (
                                        <div
                                          key={i}
                                          {...getLineProps({ line, key: i })}
                                        >
                                          {line.map((token, key) => (
                                            <span
                                              key={key}
                                              {...getTokenProps({
                                                token,
                                                key,
                                              })}
                                            />
                                          ))}
                                        </div>
                                      ))}
                                    </pre>
                                  )}
                                </Highlight>
                              </div>
                            )}

                            {!hasStatement && !hasCode && (
                              <div className="text-[13px] text-slate-500 italic">
                                No statement available for this question.
                              </div>
                            )}
                          </div>

                          {/* Tags (skills) */}
                          {q.skillTags && q.skillTags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {q.skillTags.map((t) => (
                                <span
                                  key={t}
                                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] text-gray-600"
                                >
                                  <Tag className="h-3 w-3 text-gray-400" />
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AssessmentQuestionsSummary;
