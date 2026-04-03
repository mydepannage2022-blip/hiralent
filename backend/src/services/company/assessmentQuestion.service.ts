// src/services/company/assessmentQuestion.service.ts
import { PrismaClient, DifficultyLevel } from "@prisma/client";

const prisma = new PrismaClient();

// ── AI fallback config (mirrors seed-assessment-templates.ts) ─────────────────
const AI_FALLBACK_BASE_URL = process.env.APP_URL || "http://localhost:5000";
const MAX_QUESTIONS_PER_BATCH_CALL = 3;  // keeps Gemini from timing out
const BATCH_CALL_TIMEOUT_MS = 300_000;   // 5 min — same as ai-question-generation.service.ts fix
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 5_000;
// ─────────────────────────────────────────────────────────────────────────────

function mapDifficultyToQuestionDifficulty(d: DifficultyLevel): string {
  switch (d) {
    case "BEGINNER":  return "easy";
    case "INTERMEDIATE": return "medium";
    case "ADVANCED":
    case "EXPERT":    return "hard";
    default:          return "medium";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Small DTO for frontend
export interface AttachedQuestionDTO {
  id: string;
  title: string;
  description: string;
  problemStatement?: string;
  difficulty: string;
  type: string;
  skillTags: string[];
  order: number;
  points: number;
  isReserve: boolean;
  override?: any | null;
}

// ── AI fallback helpers ───────────────────────────────────────────────────────

/**
 * Build a clean topic string for Gemini that will NOT bleed into skillTags.
 * Format: "<skill_category> — <skills joined by comma>"
 * Example: "Security — security, auth, jwt, vulnerability"
 *
 * Deliberately simple — Gemini uses this as a context hint, not as a tag list.
 */
function buildAITopic(
  skillCategory: string,
  skills: string[],
  difficulty: string
): string {
  const skillHint = skills.slice(0, 4).join(", ");
  // Use em-dash so Gemini clearly separates category from skills
  return `${skillCategory} — ${skillHint} (${difficulty})`;
}

async function callGenerateBatch(
  topic: string,
  difficulty: "easy" | "medium" | "hard",
  count: number,
  attempt: number,
  authToken: string,
  excludeTitles: string[] = []  // ← NEW: Add this parameter
): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BATCH_CALL_TIMEOUT_MS);

  try {
    // ← NEW: Add exclusion instruction to the request
    const excludeInstruction = excludeTitles.length 
      ? `\nIMPORTANT: Do NOT generate questions with these titles (already generated): ${excludeTitles.join(", ")}`
      : "";

    const response = await fetch(
      `${AI_FALLBACK_BASE_URL}/api/questions/generate-batch`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          topics: [topic],
          difficulty,
          countPerTopic: count,
          excludeTitles: excludeTitles,  // ← NEW: Send to backend
          excludeInstruction: excludeInstruction,  // ← Optional: Add to prompt
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timer);

    if (!response.ok) {
      const err = await response.text();
      console.error(
        `    ❌ [AI FALLBACK attempt ${attempt}] HTTP ${response.status}: ${err}`
      );
      return [];
    }

    const data = (await response.json()) as {
      success: boolean;
      questions?: Array<{ id: string }>;
      error?: string;
    };

    if (!data.success || !data.questions?.length) {
      console.error(
        `    ❌ [AI FALLBACK attempt ${attempt}] No questions. Error: ${data.error ?? "unknown"}`
      );
      return [];
    }

    const ids = data.questions.map((q) => q.id);

    // Approve so they're immediately usable in the assessment
    await prisma.question.updateMany({
      where: { id: { in: ids } },
      data: { status: "approved" },
    });

    return ids;
  } catch (err: any) {
    clearTimeout(timer);
    const reason = err?.name === "AbortError" ? "TIMEOUT" : err?.message;
    console.error(`    ❌ [AI FALLBACK attempt ${attempt}] Failed: ${reason}`);
    return [];
  }
}

/**
 * Generate `needed` questions via the existing /generate-batch endpoint,
 * splitting into chunks of MAX_QUESTIONS_PER_BATCH_CALL with retries.
 * 
 * FIX: Track generated titles and pass exclusion list to Gemini
 * so each chunk knows what titles to avoid.
 */
async function generateQuestionsViaAI(args: {
  skillCategory: string;
  skills: string[];
  difficulty: "easy" | "medium" | "hard";
  needed: number;
  authToken: string;
}): Promise<string[]> {
  const { skillCategory, skills, difficulty, needed, authToken } = args;

  const topic = buildAITopic(skillCategory, skills, difficulty);

  console.log(
    `  🤖 [AI FALLBACK] Generating ${needed} question(s) — topic: "${topic}"`
  );
  console.log(
    `         Chunks of ≤${MAX_QUESTIONS_PER_BATCH_CALL}, ${MAX_RETRIES} retries each`
  );

  const collected: string[] = [];
  const generatedTitles: string[] = []; // ← NEW: Track titles to avoid duplicates
  let remaining = needed;
  let chunkIndex = 0;

  while (remaining > 0 && collected.length < needed) {
    const chunkSize = Math.min(remaining, MAX_QUESTIONS_PER_BATCH_CALL);
    chunkIndex++;

    console.log(
      `    📦 Chunk ${chunkIndex}: requesting ${chunkSize} question(s) (${remaining} remaining)`
    );

    let chunkIds: string[] = [];
    let success = false;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      // ← NEW: Pass exclusion list to callGenerateBatch
      chunkIds = await callGenerateBatch(
        topic, 
        difficulty, 
        chunkSize, 
        attempt, 
        authToken,
        generatedTitles  // ← Pass what we already generated
      );

      if (chunkIds.length > 0) {
        success = true;
        break;
      }

      if (attempt <= MAX_RETRIES) {
        console.log(
          `    🔄 Retrying chunk ${chunkIndex} in ${RETRY_DELAY_MS / 1000}s... (attempt ${attempt + 1}/${MAX_RETRIES + 1})`
        );
        await sleep(RETRY_DELAY_MS);
      }
    }

    if (!success) {
      console.warn(
        `    ⚠️  Chunk ${chunkIndex} failed after all retries — continuing with what we have`
      );
    } else {
      collected.push(...chunkIds);
      
      // ← NEW: After successful chunk, fetch titles and add to exclusion list
      const newQuestions = await prisma.question.findMany({
        where: { id: { in: chunkIds } },
        select: { title: true },
      });
      generatedTitles.push(...newQuestions.map((q) => q.title));
      
      console.log(
        `    ✅ Chunk ${chunkIndex}: got ${chunkIds.length} (total so far: ${collected.length})`
      );
    }

    remaining -= chunkSize;
    if (remaining > 0) await sleep(2_000);
  }

  const finalIds = Array.from(new Set(collected)).slice(0, needed);
  console.log(
    `  ${finalIds.length >= needed ? "✅" : "⚠️ "} [AI FALLBACK] Generated ${finalIds.length}/${needed} question(s)`
  );

  return finalIds;
}

// ── Public service functions ──────────────────────────────────────────────────

/**
 * Generate + attach questions from the Question bank.
 * Falls back to AI generation (chunked, with retries) when the bank
 * doesn't have enough questions for the assessment's skills + difficulty.
 *
 * Pass `authToken` (the company user's JWT) so the internal
 * /generate-batch call can pass the checkAuth middleware.
 */
export async function attachQuestionsToAssessment(
  assessmentId: string,
  authToken?: string  // ← NEW: pass req.headers.authorization token here
): Promise<{
  assessment_id: string;
  question_count: number;
  questions: AttachedQuestionDTO[];
}> {
  // 1) Load assessment
  const assessment = await prisma.employerAssessment.findUnique({
    where: { assessment_id: assessmentId },
  });

  if (!assessment) throw new Error("Assessment not found");

  const skills = assessment.extracted_skills ?? [];
  const totalQuestions = assessment.total_questions || 20;
  const difficultyStr = mapDifficultyToQuestionDifficulty(
    assessment.difficulty
  ) as "easy" | "medium" | "hard";

  // 2) Fetch candidates from DB
  const candidateQuestions = await prisma.question.findMany({
    where: {
      difficulty: difficultyStr,
      status: "approved",
      ...(skills.length ? { skillTags: { hasSome: skills } } : {}),
    },
    take: totalQuestions * 4,
  });

  // 3) Fisher–Yates shuffle
  const pool = [...candidateQuestions];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  let selectedIds = pool.slice(0, totalQuestions).map((q) => q.id);

  // 4) AI fallback when DB doesn't have enough ─────────────────────────────
  if (selectedIds.length < totalQuestions && authToken) {
    const needed = totalQuestions - selectedIds.length;

    console.log(
      `  ⚠️  Only ${selectedIds.length}/${totalQuestions} questions in DB for assessment ${assessmentId}. Requesting ${needed} from AI...`
    );

    // Derive a readable skill_category from the assessment's skill_category field
    // (falls back to first skill tag if not set)
    const skillCategory =
      (assessment as any).skill_category ||
      (skills.length > 0 ? skills[0] : "General");

    const aiIds = await generateQuestionsViaAI({
      skillCategory,
      skills,
      difficulty: difficultyStr,
      needed,
      authToken: authToken.replace(/^Bearer\s+/i, ""), // strip "Bearer " prefix if present
    });

    selectedIds = Array.from(new Set([...selectedIds, ...aiIds]));

    if (selectedIds.length < totalQuestions) {
      console.warn(
        `  ⚠️  After AI fallback: ${selectedIds.length}/${totalQuestions} questions available for assessment ${assessmentId}.`
      );
    }
  } else if (selectedIds.length < totalQuestions && !authToken) {
    console.warn(
      `  ⚠️  Only ${selectedIds.length}/${totalQuestions} questions found and no authToken provided — skipping AI fallback.`
    );
  }

  // 5) Load full question objects for the selected IDs
  const selectedQuestions = await prisma.question.findMany({
    where: { id: { in: selectedIds } },
  });

  // Preserve the order of selectedIds
  const orderedQuestions = selectedIds
    .map((id) => selectedQuestions.find((q) => q.id === id))
    .filter(Boolean) as typeof selectedQuestions;

  const questionsPayload: AttachedQuestionDTO[] = orderedQuestions.map(
    (q, index) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      problemStatement: q.problemStatement ?? undefined,
      difficulty: q.difficulty,
      type: q.type,
      skillTags: q.skillTags,
      order: index + 1,
      points: 1,
      isReserve: false,
      override: null,
    })
  );

  // 6) Persist in transaction
  await prisma.$transaction(async (tx) => {
    await tx.assessmentQuestion.deleteMany({
      where: { assessment_id: assessmentId },
    });

    await tx.assessmentQuestion.createMany({
      data: questionsPayload.map((q) => ({
        assessment_id: assessmentId,
        question_id: q.id,
        order: q.order,
        points: q.points,
        isReserve: q.isReserve,
        override: null,
      })),
    });

    await tx.employerAssessment.update({
      where: { assessment_id: assessmentId },
      data: {
        question_ids: orderedQuestions.map((q) => q.id),
        auto_generated: true,
      },
    });
  });

  return {
    assessment_id: assessmentId,
    question_count: questionsPayload.length,
    questions: questionsPayload,
  };
}

/**
 * Load already attached questions (no generation, just select + join).
 * Applies override fallback so UI can display customized text directly.
 */
export async function getQuestionsForAssessment(
  assessmentId: string
): Promise<AttachedQuestionDTO[]> {
  const rows = await prisma.assessmentQuestion.findMany({
    where: { assessment_id: assessmentId },
    orderBy: { order: "asc" },
    include: { question: true },
  });

  return rows.map((row, index) => {
    const o: any = row.override ?? {};
    return {
      id: row.question.id,
      title: o.title ?? row.question.title,
      description: o.description ?? row.question.description,
      problemStatement:
        o.problemStatement ?? row.question.problemStatement ?? undefined,
      difficulty: row.question.difficulty,
      type: row.question.type,
      skillTags: row.question.skillTags,
      order: row.order ?? index + 1,
      points: row.points,
      isReserve: row.isReserve,
      override: row.override ?? null,
    };
  });
}

/**
 * Update per-assessment question override (does NOT modify global Question bank).
 * Used by: PATCH /api/employer-assessments/:assessment_id/questions/:question_id/override
 */
export async function updateAssessmentQuestionOverride(args: {
  company_id: string;
  assessment_id: string;
  question_id: string;
  override: any;
}) {
  const { company_id, assessment_id, question_id, override } = args;

  const assessment = await prisma.employerAssessment.findFirst({
    where: { assessment_id, company_id },
    select: { assessment_id: true },
  });
  if (!assessment) throw new Error("Assessment not found or forbidden");

  const row = await prisma.assessmentQuestion.findFirst({
    where: { assessment_id, question_id },
    select: { id: true },
  });
  if (!row) throw new Error("Question not attached to this assessment");

  return prisma.assessmentQuestion.update({
    where: { id: row.id },
    data: { override: override ?? null },
  });
}

/**
 * Attach questions by explicit IDs (append or replace mode).
 */
export async function attachQuestionsByIdsToAssessment(args: {
  company_id: string;
  assessment_id: string;
  question_ids: string[];
  mode?: "append" | "replace";
}): Promise<{
  assessment_id: string;
  attached_count: number;
  questions: AttachedQuestionDTO[];
}> {
  const { assessment_id, mode = "append" } = args;
  const question_ids = (args.question_ids ?? []).filter(Boolean);

  if (!question_ids.length) throw new Error("question_ids is required");

  const assessment = await prisma.employerAssessment.findUnique({
    where: { assessment_id },
    select: { assessment_id: true },
  });
  if (!assessment) throw new Error("Assessment not found");

  const found = await prisma.question.findMany({
    where: { id: { in: question_ids } },
    select: { id: true },
  });
  const foundIds = new Set(found.map((q) => q.id));
  const missing = question_ids.filter((id) => !foundIds.has(id));
  if (missing.length) throw new Error(`Some questions not found: ${missing.join(", ")}`);

  await prisma.$transaction(async (tx) => {
    if (mode === "replace") {
      await tx.assessmentQuestion.deleteMany({ where: { assessment_id } });

      await tx.assessmentQuestion.createMany({
        data: question_ids.map((qid, idx) => ({
          id: crypto.randomUUID(),
          assessment_id,
          question_id: qid,
          order: idx + 1,
          points: 1,
          isReserve: false,
          override: null,
        })),
      });

      await tx.employerAssessment.update({
        where: { assessment_id },
        data: { question_ids, auto_generated: false },
      });
      return;
    }

    // mode === "append"
    const existingRows = await tx.assessmentQuestion.findMany({
      where: { assessment_id },
      orderBy: { order: "asc" },
      select: { question_id: true, order: true },
    });

    const existingIds = new Set(existingRows.map((r) => r.question_id));
    const toAdd = question_ids.filter((id) => !existingIds.has(id));

    if (!toAdd.length) {
      await tx.employerAssessment.update({
        where: { assessment_id },
        data: {
          question_ids: existingRows.map((r) => r.question_id),
          auto_generated: false,
        },
      });
      return;
    }

    const maxOrder = existingRows.reduce(
      (m, r) => Math.max(m, r.order ?? 0),
      0
    );

    await tx.assessmentQuestion.createMany({
      data: toAdd.map((qid, i) => ({
        id: crypto.randomUUID(),
        assessment_id,
        question_id: qid,
        order: maxOrder + i + 1,
        points: 1,
        isReserve: false,
        override: null,
      })),
    });

    await tx.employerAssessment.update({
      where: { assessment_id },
      data: {
        question_ids: [...existingRows.map((r) => r.question_id), ...toAdd],
        auto_generated: false,
      },
    });
  });

  const questions = await getQuestionsForAssessment(assessment_id);
  return { assessment_id, attached_count: question_ids.length, questions };
}

/**
 * Detach a question from an assessment (does NOT delete the Question globally).
 */
export async function detachQuestionFromAssessment(args: {
  assessment_id: string;
  question_id: string;
}): Promise<{ assessment_id: string; question_id: string; deleted: boolean }> {
  const { assessment_id, question_id } = args;

  const assessment = await prisma.employerAssessment.findUnique({
    where: { assessment_id },
    select: { assessment_id: true },
  });
  if (!assessment) throw new Error("Assessment not found");

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.assessmentQuestion.deleteMany({
      where: { assessment_id, question_id },
    });
    if (!deleted.count) throw new Error("Question not attached to this assessment");

    const rows = await tx.assessmentQuestion.findMany({
      where: { assessment_id },
      orderBy: { order: "asc" },
      select: { id: true, question_id: true },
    });

    for (let i = 0; i < rows.length; i++) {
      await tx.assessmentQuestion.update({
        where: { id: rows[i].id },
        data: { order: i + 1 },
      });
    }

    await tx.employerAssessment.update({
      where: { assessment_id },
      data: {
        question_ids: rows.map((r) => r.question_id),
        auto_generated: false,
      },
    });
  });

  return { assessment_id, question_id, deleted: true };
}

/**
 * Reorder questions for an assessment.
 */
export async function reorderAssessmentQuestions(args: {
  assessment_id: string;
  ordered_question_ids: string[];
}): Promise<{ assessment_id: string; questions: AttachedQuestionDTO[] }> {
  const { assessment_id } = args;
  const ordered = (args.ordered_question_ids ?? []).filter(Boolean);
  if (!ordered.length) throw new Error("ordered_question_ids is required");

  const assessment = await prisma.employerAssessment.findUnique({
    where: { assessment_id },
    select: { assessment_id: true },
  });
  if (!assessment) throw new Error("Assessment not found");

  await prisma.$transaction(async (tx) => {
    const existing = await tx.assessmentQuestion.findMany({
      where: { assessment_id },
      select: { id: true, question_id: true },
    });

    const existingIds = new Set(existing.map((r) => r.question_id));
    const invalid = ordered.filter((qid) => !existingIds.has(qid));
    if (invalid.length) {
      throw new Error(`Some questions are not attached: ${invalid.join(", ")}`);
    }

    const missingFromOrdered = existing
      .map((r) => r.question_id)
      .filter((qid) => !ordered.includes(qid));

    const finalOrder = [...ordered, ...missingFromOrdered];
    const byQid = new Map(existing.map((r) => [r.question_id, r.id]));

    for (let i = 0; i < finalOrder.length; i++) {
      const id = byQid.get(finalOrder[i]);
      if (!id) continue;
      await tx.assessmentQuestion.update({
        where: { id },
        data: { order: i + 1 },
      });
    }

    await tx.employerAssessment.update({
      where: { assessment_id },
      data: { question_ids: finalOrder, auto_generated: false },
    });
  });

  const questions = await getQuestionsForAssessment(assessment_id);
  return { assessment_id, questions };
}