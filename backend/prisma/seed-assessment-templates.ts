// prisma/seed-assessment-templates.ts
import {
  PrismaClient,
  AssessmentTemplateStatus,
  DifficultyLevel,
  AssessmentType,
  AssessmentTemplateProvider,
} from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const SEED_AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTZkNDcwMmUtMTYyMC00NmVkLWFiY2EtNWU4YzJmMWVmODM0Iiwicm9sZSI6ImNvbXBhbnlfYWRtaW4iLCJzZXNzaW9uX2lkIjoiNTUyZTViNjQtY2E0ZC00OTU2LWIxNTYtOWVlNDVlMzI3MzA3IiwiY29tcGFueV9pZCI6IjU2ZDQ3MDJlLTE2MjAtNDZlZC1hYmNhLTVlOGMyZjFlZjgzNCIsImlhdCI6MTc3NDgwMzkyNSwiZXhwIjoxNzc1NDA4NzI1fQ.YU1xSCI1qDR_jW1uN2RZlQ-D_CAVlk8D-Fv7xz1GdQw";

// ── Tuning knobs ──────────────────────────────────────────────────────────────
const MAX_QUESTIONS_PER_BATCH_CALL = 3;
const BATCH_CALL_TIMEOUT_MS = 300_000; // 5 min
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 5_000;
// ─────────────────────────────────────────────────────────────────────────────

function templateDifficultyToQuestionDifficulty(d: DifficultyLevel): "easy" | "medium" | "hard" {
  switch (d) {
    case "BEGINNER":     return "easy";
    case "INTERMEDIATE": return "medium";
    case "ADVANCED":
    case "EXPERT":       return "hard";
    default:             return "medium";
  }
}

type TemplateSeed = {
  template_id: string;
  title: string;
  description: string;
  assessment_type: AssessmentType;
  skill_category: string;
  difficulty: DifficultyLevel;
  time_limit: number;
  total_questions: number;
  passing_score: number;
  extracted_skills: string[];
  tags: string[];
  provider: AssessmentTemplateProvider;
  status: AssessmentTemplateStatus;
  pick: {
    difficulty?: "easy" | "medium" | "hard";
    skills_hasSome?: string[];
    type?: string;
    limit: number;
  };
};

function clampQuestionCount(n: number) {
  return Math.max(5, Math.min(10, n));
}

/**
 * FIX — Build a clean, human-readable topic for Gemini.
 *
 * BEFORE (caused the ugly skillTag bug):
 *   topic = "React Native, mobile, React (Mobile - INTERMEDIATE)"
 *   → Gemini used the whole string as one tag: #React Native, mobile, React (Mobile - INTERMEDIATE)
 *
 * AFTER:
 *   topic = "Mid-level Mobile Developer — React Native"
 *   → Short role description → Gemini generates proper individual tags: #react-native, #mobile
 *   The skills_hasSome list stays in the DB filter only — never in the topic string.
 */
function buildTopicFromTemplate(seed: TemplateSeed): string {
  const levelLabel =
    seed.difficulty === "BEGINNER"     ? "Junior"
    : seed.difficulty === "INTERMEDIATE" ? "Mid-level"
    : "Senior";

  // Extract the role part from the title, e.g.:
  //   "Frontend Developer — React (Intermediate)"   → "React"
  //   "Mobile Developer — React Native (Intermediate)" → "React Native"
  //   "Security Engineer — AppSec Basics (Intermediate)" → "AppSec Basics"
  const titleMatch = seed.title.match(/—\s*(.+?)\s*\(/);
  const rolePart = titleMatch ? titleMatch[1].trim() : seed.skill_category;

  return `${levelLabel} ${seed.skill_category} Developer — ${rolePart}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGenerateBatch(
  topic: string,
  difficulty: "easy" | "medium" | "hard",
  count: number,
  attempt: number
): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BATCH_CALL_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/questions/generate-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SEED_AUTH_TOKEN}`,
      },
      body: JSON.stringify({ topics: [topic], difficulty, countPerTopic: count }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const err = await response.text();
      console.error(`    ❌ [BATCH attempt ${attempt}] HTTP ${response.status}: ${err}`);
      return [];
    }

    const data = (await response.json()) as {
      success: boolean;
      questions?: Array<{ id: string }>;
      error?: string;
    };

    if (!data.success || !data.questions?.length) {
      console.error(`    ❌ [BATCH attempt ${attempt}] No questions. Error: ${data.error ?? "unknown"}`);
      return [];
    }

    const ids = data.questions.map((q) => q.id);
    await prisma.question.updateMany({ where: { id: { in: ids } }, data: { status: "approved" } });
    return ids;
  } catch (err: any) {
    clearTimeout(timer);
    const reason = err?.name === "AbortError" ? "TIMEOUT" : err?.message;
    console.error(`    ❌ [BATCH attempt ${attempt}] Failed: ${reason}`);
    return [];
  }
}

async function generateQuestionsViaAPI(seed: TemplateSeed, needed: number): Promise<string[]> {
  if (!SEED_AUTH_TOKEN) {
    console.warn("  ⚠️  SEED_AUTH_TOKEN not set — skipping AI generation.");
    return [];
  }

  const difficulty = seed.pick.difficulty ?? templateDifficultyToQuestionDifficulty(seed.difficulty);
  const topic = buildTopicFromTemplate(seed); // ← clean topic, no skill list bleed

  console.log(`  🤖 [AI] Generating ${needed} question(s) — topic: "${topic}" (difficulty: ${difficulty})`);
  console.log(`         Chunks of ≤${MAX_QUESTIONS_PER_BATCH_CALL}, ${MAX_RETRIES} retries each`);

  const collectedIds: string[] = [];
  let remaining = needed;
  let chunkIndex = 0;

  while (remaining > 0 && collectedIds.length < needed) {
    const chunkSize = Math.min(remaining, MAX_QUESTIONS_PER_BATCH_CALL);
    chunkIndex++;

    console.log(`    📦 Chunk ${chunkIndex}: requesting ${chunkSize} question(s) (${remaining} remaining)`);

    let chunkIds: string[] = [];
    let success = false;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      chunkIds = await callGenerateBatch(topic, difficulty, chunkSize, attempt);
      if (chunkIds.length > 0) { success = true; break; }

      if (attempt <= MAX_RETRIES) {
        console.log(`    🔄 Retrying chunk ${chunkIndex} in ${RETRY_DELAY_MS / 1000}s... (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
        await sleep(RETRY_DELAY_MS);
      }
    }

    if (!success) {
      console.warn(`    ⚠️  Chunk ${chunkIndex} failed after all retries — continuing with what we have`);
    } else {
      collectedIds.push(...chunkIds);
      console.log(`    ✅ Chunk ${chunkIndex}: got ${chunkIds.length} (total so far: ${collectedIds.length})`);
    }

    remaining -= chunkSize;
    if (remaining > 0) await sleep(2_000);
  }

  const finalIds = Array.from(new Set(collectedIds)).slice(0, needed);
  console.log(`  ${finalIds.length >= needed ? "✅" : "⚠️ "} [AI] Generated ${finalIds.length}/${needed} for "${seed.template_id}"`);
  return finalIds;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATES: TemplateSeed[] = [
  { template_id: "tpl_frontend_js_beginner", title: "Frontend Developer — JavaScript Fundamentals (Beginner)", description: "Core JS basics: functions, arrays, objects, DOM essentials.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Frontend", difficulty: "BEGINNER", time_limit: 30, total_questions: 8, passing_score: 70, extracted_skills: ["JavaScript", "DOM", "Arrays", "Objects"], tags: ["frontend", "javascript", "junior"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "easy", skills_hasSome: ["JavaScript", "DOM", "arrays", "objects", "string"], limit: 8 } },
  { template_id: "tpl_frontend_react_beginner", title: "Frontend Developer — React (Beginner)", description: "Core React + JSX + state basics. Great for junior frontend roles.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Frontend", difficulty: "BEGINNER", time_limit: 30, total_questions: 8, passing_score: 70, extracted_skills: ["React", "JavaScript", "JSX", "Hooks"], tags: ["frontend", "react", "junior", "ui"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "easy", skills_hasSome: ["React", "JSX", "useState", "hooks", "JavaScript"], limit: 8 } },
  { template_id: "tpl_frontend_react_intermediate", title: "Frontend Developer — React (Intermediate)", description: "React patterns, state management thinking, async UI, components.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Frontend", difficulty: "INTERMEDIATE", time_limit: 40, total_questions: 10, passing_score: 70, extracted_skills: ["React", "Hooks", "Async", "State management"], tags: ["frontend", "react", "intermediate"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["React", "hooks", "useEffect", "state", "async"], limit: 10 } },
  { template_id: "tpl_frontend_typescript_intermediate", title: "Frontend Developer — TypeScript (Intermediate)", description: "Types, interfaces, generics, component typing, safer frontends.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Frontend", difficulty: "INTERMEDIATE", time_limit: 40, total_questions: 9, passing_score: 70, extracted_skills: ["TypeScript", "Types", "Interfaces", "Generics"], tags: ["frontend", "typescript"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["TypeScript", "interfaces", "types", "generics"], limit: 9 } },
  { template_id: "tpl_frontend_css_ui_intermediate", title: "Frontend Developer — UI/CSS (Intermediate)", description: "Layout, responsiveness, UI fundamentals.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Frontend", difficulty: "INTERMEDIATE", time_limit: 30, total_questions: 7, passing_score: 70, extracted_skills: ["CSS", "HTML", "Responsive UI"], tags: ["frontend", "css", "ui"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["CSS", "HTML", "responsive", "layout"], limit: 7 } },
  { template_id: "tpl_backend_node_beginner", title: "Backend Developer — Node.js Basics (Beginner)", description: "Node fundamentals, simple logic, basic APIs.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Backend", difficulty: "BEGINNER", time_limit: 30, total_questions: 8, passing_score: 70, extracted_skills: ["Node.js", "JavaScript", "APIs"], tags: ["backend", "node", "junior"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "easy", skills_hasSome: ["Node", "JavaScript", "API", "http"], limit: 8 } },
  { template_id: "tpl_backend_node_intermediate", title: "Backend Developer — Node.js / APIs (Intermediate)", description: "API design, async patterns, validation, error handling.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Backend", difficulty: "INTERMEDIATE", time_limit: 40, total_questions: 10, passing_score: 70, extracted_skills: ["Node.js", "JavaScript", "APIs", "Async", "Error handling"], tags: ["backend", "node", "api", "express"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["error handling", "async", "promises", "http", "api", "Node"], limit: 10 } },
  { template_id: "tpl_backend_express_intermediate", title: "Backend Developer — Express.js (Intermediate)", description: "Routes, middleware, validation, REST conventions.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Backend", difficulty: "INTERMEDIATE", time_limit: 40, total_questions: 9, passing_score: 70, extracted_skills: ["Express", "REST", "Middleware", "APIs"], tags: ["backend", "express", "rest"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["Express", "REST", "middleware", "api", "http"], limit: 9 } },
  { template_id: "tpl_backend_python_beginner", title: "Backend Developer — Python Fundamentals (Beginner)", description: "Python basics: strings, lists, dicts, simple logic.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Backend", difficulty: "BEGINNER", time_limit: 30, total_questions: 8, passing_score: 70, extracted_skills: ["Python", "Data structures", "Functions"], tags: ["backend", "python", "junior"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "easy", skills_hasSome: ["python", "data structures", "list", "dictionary"], limit: 8 } },
  { template_id: "tpl_backend_python_fastapi_intermediate", title: "Backend Developer — FastAPI (Intermediate)", description: "API design, async, validation, request/response patterns.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Backend", difficulty: "INTERMEDIATE", time_limit: 40, total_questions: 9, passing_score: 70, extracted_skills: ["Python", "FastAPI", "APIs", "Async"], tags: ["backend", "python", "fastapi"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["FastAPI", "api", "async", "validation", "python"], limit: 9 } },
  { template_id: "tpl_backend_java_intermediate", title: "Backend Developer — Java (Intermediate)", description: "OOP, collections, exceptions, backend logic.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Backend", difficulty: "INTERMEDIATE", time_limit: 45, total_questions: 9, passing_score: 70, extracted_skills: ["Java", "OOP", "Collections", "Exceptions"], tags: ["backend", "java"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["Java", "OOP", "collections", "exceptions"], limit: 9 } },
  { template_id: "tpl_backend_dotnet_intermediate", title: "Backend Developer — .NET/C# (Intermediate)", description: "C# fundamentals, OOP, backend patterns.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Backend", difficulty: "INTERMEDIATE", time_limit: 45, total_questions: 9, passing_score: 70, extracted_skills: ["C#", ".NET", "OOP"], tags: ["backend", "dotnet", "csharp"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["C#", ".NET", "OOP", "csharp"], limit: 9 } },
  { template_id: "tpl_fullstack_js_intermediate", title: "Full-Stack JavaScript (Intermediate)", description: "JS + APIs + async + some architecture thinking.", assessment_type: AssessmentType.COMPREHENSIVE, skill_category: "Fullstack", difficulty: "INTERMEDIATE", time_limit: 45, total_questions: 10, passing_score: 70, extracted_skills: ["JavaScript", "APIs", "Async", "Architecture"], tags: ["fullstack", "javascript"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["JavaScript", "api", "async", "error handling", "promises"], limit: 10 } },
  { template_id: "tpl_fullstack_js_advanced", title: "Full-Stack JavaScript (Advanced)", description: "Harder problems: architecture thinking + tricky JS/TS patterns.", assessment_type: AssessmentType.COMPREHENSIVE, skill_category: "Fullstack", difficulty: "ADVANCED", time_limit: 45, total_questions: 8, passing_score: 75, extracted_skills: ["TypeScript", "JavaScript", "Architecture", "OOP"], tags: ["fullstack", "advanced", "typescript", "architecture"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "hard", skills_hasSome: ["TypeScript", "Object-Oriented", "architecture", "design"], limit: 8 } },
  { template_id: "tpl_data_sql_beginner", title: "Data Analyst — SQL Basics (Beginner)", description: "Basic SQL queries, filtering, grouping.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Data", difficulty: "BEGINNER", time_limit: 30, total_questions: 8, passing_score: 70, extracted_skills: ["SQL", "SELECT", "WHERE", "GROUP BY"], tags: ["data", "sql", "junior"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "easy", skills_hasSome: ["SQL", "select", "where", "group by"], limit: 8 } },
  { template_id: "tpl_data_sql_intermediate", title: "Data Analyst — SQL (Intermediate)", description: "Joins, aggregations, window thinking.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Data", difficulty: "INTERMEDIATE", time_limit: 40, total_questions: 9, passing_score: 70, extracted_skills: ["SQL", "JOIN", "Aggregation"], tags: ["data", "sql"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["SQL", "join", "aggregation", "group by"], limit: 9 } },
  { template_id: "tpl_ml_python_intermediate", title: "Machine Learning Engineer — Python (Intermediate)", description: "Python + data manipulation + ML basics.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "AI/ML", difficulty: "INTERMEDIATE", time_limit: 45, total_questions: 9, passing_score: 70, extracted_skills: ["Python", "Machine Learning", "Data Processing"], tags: ["ml", "python", "data"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["machine learning", "python", "pandas", "data processing"], limit: 9 } },
  { template_id: "tpl_ml_deep_learning_advanced", title: "Machine Learning Engineer — Deep Learning (Advanced)", description: "Hard ML/DL topics (PyTorch, losses, optimization).", assessment_type: AssessmentType.COMPREHENSIVE, skill_category: "AI/ML", difficulty: "ADVANCED", time_limit: 45, total_questions: 8, passing_score: 75, extracted_skills: ["Deep Learning", "PyTorch", "Optimization"], tags: ["ml", "deep-learning", "pytorch", "advanced"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "hard", skills_hasSome: ["pytorch", "deep learning", "loss", "optimization"], limit: 8 } },
  { template_id: "tpl_devops_docker_beginner", title: "DevOps Engineer — Docker Basics (Beginner)", description: "Containers, images, basics.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "DevOps", difficulty: "BEGINNER", time_limit: 30, total_questions: 8, passing_score: 70, extracted_skills: ["Docker", "Containers"], tags: ["devops", "docker", "junior"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "easy", skills_hasSome: ["docker", "containers", "image", "compose"], limit: 8 } },
  { template_id: "tpl_devops_kubernetes_intermediate", title: "DevOps Engineer — Kubernetes (Intermediate)", description: "K8s basics, deployments, services.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "DevOps", difficulty: "INTERMEDIATE", time_limit: 45, total_questions: 9, passing_score: 70, extracted_skills: ["Kubernetes", "Deployments", "Services"], tags: ["devops", "kubernetes"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["kubernetes", "k8s", "deployment", "service"], limit: 9 } },
  { template_id: "tpl_cloud_aws_intermediate", title: "Cloud Engineer — AWS (Intermediate)", description: "AWS basics and cloud patterns.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Cloud", difficulty: "INTERMEDIATE", time_limit: 45, total_questions: 9, passing_score: 70, extracted_skills: ["AWS", "Cloud", "Networking"], tags: ["cloud", "aws"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["aws", "cloud", "iam", "network"], limit: 9 } },
  { template_id: "tpl_qa_testing_beginner", title: "QA Engineer — Testing Fundamentals (Beginner)", description: "Basic testing concepts and simple test cases.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "QA", difficulty: "BEGINNER", time_limit: 30, total_questions: 8, passing_score: 70, extracted_skills: ["Testing", "Test cases", "Quality"], tags: ["qa", "testing", "junior"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "easy", skills_hasSome: ["testing", "test cases", "quality"], limit: 8 } },
  { template_id: "tpl_qa_automation_intermediate", title: "QA Engineer — Test Automation (Intermediate)", description: "Automation mindset, assertions, scenarios.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "QA", difficulty: "INTERMEDIATE", time_limit: 40, total_questions: 9, passing_score: 70, extracted_skills: ["Automation", "Testing", "Assertions"], tags: ["qa", "automation"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["automation", "testing", "assert", "pytest", "jest"], limit: 9 } },
  { template_id: "tpl_security_appsec_intermediate", title: "Security Engineer — AppSec Basics (Intermediate)", description: "Secure coding, auth, common vulnerabilities.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Security", difficulty: "INTERMEDIATE", time_limit: 45, total_questions: 9, passing_score: 70, extracted_skills: ["Security", "Auth", "Vulnerabilities"], tags: ["security", "appsec"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["security", "auth", "jwt", "vulnerability"], limit: 9 } },
  { template_id: "tpl_mobile_react_native_intermediate", title: "Mobile Developer — React Native (Intermediate)", description: "React Native fundamentals.", assessment_type: AssessmentType.QUICK_CHECK, skill_category: "Mobile", difficulty: "INTERMEDIATE", time_limit: 45, total_questions: 9, passing_score: 70, extracted_skills: ["React Native", "React", "Mobile"], tags: ["mobile", "react-native"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["React Native", "mobile", "React"], limit: 9 } },
  { template_id: "tpl_algorithms_ds_intermediate", title: "Software Engineer — Data Structures & Algorithms (Intermediate)", description: "Classic DS&A screening.", assessment_type: AssessmentType.COMPREHENSIVE, skill_category: "Algorithms", difficulty: "INTERMEDIATE", time_limit: 45, total_questions: 10, passing_score: 70, extracted_skills: ["Algorithms", "Data Structures", "Problem Solving"], tags: ["dsa", "algorithms", "screening"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "medium", skills_hasSome: ["algorithms", "data structures", "hash table", "sorting"], limit: 10 } },
  { template_id: "tpl_algorithms_ds_advanced", title: "Software Engineer — Data Structures & Algorithms (Advanced)", description: "Harder DS&A questions for strong candidates.", assessment_type: AssessmentType.COMPREHENSIVE, skill_category: "Algorithms", difficulty: "ADVANCED", time_limit: 45, total_questions: 8, passing_score: 75, extracted_skills: ["Algorithms", "Data Structures", "Optimization"], tags: ["dsa", "algorithms", "advanced"], provider: AssessmentTemplateProvider.INTERNAL, status: "PUBLISHED", pick: { difficulty: "hard", skills_hasSome: ["algorithms", "optimization", "graph", "dynamic programming"], limit: 8 } },
];

// ─────────────────────────────────────────────────────────────────────────────
// PICK QUESTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function pickQuestions(seed: TemplateSeed): Promise<string[]> {
  const difficulty = seed.pick.difficulty ?? templateDifficultyToQuestionDifficulty(seed.difficulty);
  const attachCount = clampQuestionCount(seed.pick.limit);

  const rows = await prisma.question.findMany({
    where: {
      status: "approved",
      difficulty,
      ...(seed.pick.type ? { type: seed.pick.type } : {}),
      ...(seed.pick.skills_hasSome?.length ? { skillTags: { hasSome: seed.pick.skills_hasSome } } : {}),
    },
    take: attachCount * 4,
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  let ids = Array.from(new Set(rows.map((r) => r.id)));

  if (ids.length < attachCount) {
    const missing = attachCount - ids.length;
    console.log(`  ⚠️  Only ${ids.length}/${attachCount} in DB for "${seed.template_id}". Requesting ${missing} from AI...`);
    const aiIds = await generateQuestionsViaAPI(seed, missing);
    ids = Array.from(new Set([...ids, ...aiIds]));
    if (ids.length < attachCount) {
      console.warn(`  ⚠️  After AI fallback: ${ids.length}/${attachCount} for "${seed.template_id}".`);
    }
  }

  return ids.slice(0, attachCount);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  // OPT-IN standalone seed — NOT part of the prod-safe `prisma db seed` bootstrap.
  // It needs a running backend API (API_BASE_URL), a valid SEED_AUTH_TOKEN, and/or an
  // existing approved-question bank. When those are absent it degrades gracefully:
  // templates with no available questions are skipped and the script still exits 0
  // (it never crashes a bootstrap). Run it deliberately via `pnpm seed:assessment-templates`.
  console.log("Seeding assessment templates (opt-in)...\n");

  let seeded = 0;
  let skipped = 0;
  for (const seed of TEMPLATES) {
    const questionIds = await pickQuestions(seed);

    if (!questionIds.length) {
      console.warn(`⚠️  No questions available (DB + AI) for template "${seed.template_id}". Skipping.\n`);
      skipped++;
      continue;
    }

    const attachCount = questionIds.length;

    await prisma.$transaction(async (tx) => {
      await tx.assessmentTemplate.upsert({
        where: { template_id: seed.template_id },
        create: {
          template_id: seed.template_id, title: seed.title, description: seed.description,
          assessment_type: seed.assessment_type, skill_category: seed.skill_category,
          difficulty: seed.difficulty, time_limit: seed.time_limit, total_questions: attachCount,
          passing_score: seed.passing_score, extracted_skills: seed.extracted_skills, tags: seed.tags,
          provider: seed.provider, status: seed.status, settings: {}, enhanced_data: {}, created_by: null,
        },
        update: {
          title: seed.title, description: seed.description, assessment_type: seed.assessment_type,
          skill_category: seed.skill_category, difficulty: seed.difficulty, time_limit: seed.time_limit,
          total_questions: attachCount, passing_score: seed.passing_score,
          extracted_skills: seed.extracted_skills, tags: seed.tags, provider: seed.provider, status: seed.status,
        },
      });

      await tx.assessmentTemplateQuestion.deleteMany({ where: { template_id: seed.template_id } });

      await tx.assessmentTemplateQuestion.createMany({
        data: questionIds.map((qid, idx) => ({
          id: randomUUID(), template_id: seed.template_id, question_id: qid,
          order: idx + 1, points: 1, section: null, isReserve: false,
        })),
      });
    });

    console.log(`✅ Seeded "${seed.template_id}" with ${attachCount} question(s)\n`);
    seeded++;
  }

  console.log(`Done ✅ — ${seeded} template(s) seeded, ${skipped} skipped (of ${TEMPLATES.length}).`);
  if (seeded === 0) {
    console.log(
      "ℹ️  Nothing seeded. This is expected without a running API (API_BASE_URL) + valid " +
      "SEED_AUTH_TOKEN + an approved-question bank. Assessment templates are opt-in, not part " +
      "of the core bootstrap seed."
    );
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });