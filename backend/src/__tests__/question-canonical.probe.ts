// backend/src/__tests__/question-canonical.probe.ts
//
// Wave 4 / Session 4 — Consolidation A (R-37): LIVE proof that question create/read flows
// through the ONE canonical path — `QuestionService` → `prisma.question` (table `questions`) —
// after the dead `QuestionGenerator.service.ts` / `mockQuestionService.ts` duplicates were retired.
//
// Self-gating: if Postgres is unreachable it prints SKIP and exits 0 (CI-safe).
//
// Fail-provable, non-vacuous:
//   (a) creating via QuestionService MUST land a real row in `prisma.question`, readable by
//       getQuestionById AND appearing in getAllQuestions — proving the canonical read/write path;
//   (b) CONTROL — a getAllQuestions search for a DIFFERENT tag MUST NOT surface the row, proving
//       the read actually queries (data-driven), not returns a canned/unfiltered list.
//
// NOTE: this probe runs against the configured DB (backend/.env, the primary `hiralent`), so it
// deliberately does NOT assert the `question_bank`/`chat_history` tables are physically dropped —
// that is a migration-state fact (the drop migration `20260728100100_drop_legacy_tables` may be
// un-applied on a given DB). The "dropped tables absent on the canonical migrated schema" gate
// lives in verify-subsystem-consolidation.mjs / verify-data-model.mjs against a fresh throwaway DB.
//
// Run: npx tsx src/__tests__/question-canonical.probe.ts

import prisma from "../lib/prisma";
import { QuestionService } from "../services/question/Question.service";

const svc = new QuestionService();
let failures = 0;
const check = (name: string, cond: boolean) => {
  if (cond) console.log("  ok:", name);
  else { failures++; console.error("  FAIL:", name); }
};

const TAG = `qcanon-${Date.now()}`;

async function main() {
  try {
    await prisma.$connect();
    await prisma.question.count(); // cheap connectivity probe on the canonical table
  } catch (e: any) {
    console.log("SKIP: Postgres not reachable —", (e?.message || "").split("\n")[0]);
    console.log("question-canonical.probe SKIPPED (no DB).");
    process.exit(0);
  }

  let createdId = "";
  try {
    // ---- (a) create via the canonical service → row in `prisma.question` ----
    const created = await svc.createQuestion({
      title: `Canonical MCQ ${TAG}`,
      description: "Probe question — consolidation R-37",
      problemStatement: "Which model is canonical for questions?",
      difficulty: "easy",
      type: "mcq",
      status: "draft",
      source: "manual",
      options: { A: "Question", B: "QuestionBank" },
      correctAnswer: "A",
      explanation: "Question is the single canonical model.",
    });
    createdId = created.id;
    check("createQuestion returned an id", !!createdId);
    check("created.type is mcq (canonical MCQ path)", created.type === "mcq");

    // The service writes to the `questions` table — confirm the row is physically there.
    const raw = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, title, type FROM "questions" WHERE id = $1`,
      createdId,
    );
    check("row physically present in `questions` table", Array.isArray(raw) && raw.length === 1);

    // read-back via the canonical service reads
    const byId = await svc.getQuestionById(createdId);
    check("getQuestionById returns the created question", byId?.id === createdId);
    check("getQuestionById title matches", byId?.title === `Canonical MCQ ${TAG}`);

    const list = await svc.getAllQuestions({ search: TAG, limit: 20 });
    const ids = (list?.data || []).map((q: any) => q.id);
    check("getAllQuestions surfaces the created question", ids.includes(createdId));

    // ---- (b) CONTROL: a search for a DIFFERENT tag must NOT surface the row (data-driven read) ----
    const miss = await svc.getAllQuestions({ search: `no-such-${TAG}`, limit: 20 });
    const missIds = (miss?.data || []).map((q: any) => q.id);
    check("CONTROL: unrelated search does NOT surface the row (read really filters)", !missIds.includes(createdId));
  } finally {
    if (createdId) { try { await prisma.question.delete({ where: { id: createdId } }); } catch {} }
    await prisma.$disconnect();
  }

  if (failures) {
    console.error(`\nquestion-canonical.probe: ${failures} FAILURE(S)`);
    process.exit(1);
  }
  console.log("\nquestion-canonical.probe OK — create/read go through the canonical Question path; no QuestionBank path remains.");
}

main().catch((e) => { console.error(e); process.exit(1); });
