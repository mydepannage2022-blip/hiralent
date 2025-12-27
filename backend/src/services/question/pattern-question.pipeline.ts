// src/services/question/pattern-question.pipeline.ts
import { PrismaClient } from "@prisma/client";
import { AIServiceClient } from "../ai/ai-service.client";
import { QuestionService } from "./Question.service";
import { vectorEngineService } from "./vectorEngine.service"; 

const prisma = new PrismaClient();

const SYSTEM_CREATOR_ID = process.env.SYSTEM_CREATOR_ID || "system";

const DIFFICULTY_VARIANTS = ["easy", "medium", "hard"] as const;
type DifficultyVariant = (typeof DIFFICULTY_VARIANTS)[number];

function uniqTags(tags: string[]) {
  const clean = (tags || [])
    .filter(Boolean)
    .map((t) => String(t).trim().toLowerCase())
    .filter((t) => t.length > 0);
  return Array.from(new Set(clean));
}

/**
 * Expand tags so your frontend category routing works better.
 * - "java-fundamentals" -> "java", "fundamentals"
 * - "sql-queries" -> "sql", "queries"
 * - "node_js" -> "node", "js"
 */
function expandTags(tags: string[]): string[] {
  const out: string[] = [];
  for (const t of tags || []) {
    const s = String(t || "").toLowerCase();
    if (!s) continue;
    out.push(s);
    for (const part of s.split(/[-_/ ]+/g)) {
      if (part && part.length >= 2) out.push(part);
    }
  }
  return uniqTags(out);
}

function buildPatternKey(source: string, sourceId: string) {
  return `${source}:${sourceId}`;
}

export class PatternQuestionPipeline {
  private aiClient = new AIServiceClient();
  private questionService = new QuestionService();

  /**
   * Generate library questions from AlgorithmPattern rows.
   * - supports difficulty variants
   * - supports concurrency
   * - uses vector similarity to skip duplicates
   * - stores vectors so vectorId is NOT NULL
   */
  async generateFromPatterns(params: {
    source?: string;
    limit?: number;
    difficulties?: DifficultyVariant[];
    concurrency?: number;
    fast?: boolean;
  }) {
    const limit = params.limit ?? 10;

    // ✅ respect caller difficulties
    const difficulties: DifficultyVariant[] =
      params.difficulties && params.difficulties.length
        ? (params.difficulties as DifficultyVariant[])
        : [...DIFFICULTY_VARIANTS];

    const concurrency = Math.max(1, Math.min(5, Number(params.concurrency ?? 2)));
    const fast = Boolean(params.fast ?? true);

    // 1) Load patterns from DB
    const patterns = await prisma.algorithmPattern.findMany({
      where: params.source ? { source: params.source } : {},
      orderBy: { extractedAt: "desc" },
      take: limit,
    });

    let created = 0;
    let skipped = 0;
    let failed = 0;

    // Build jobs queue: (pattern × difficulty)
    const jobs: Array<() => Promise<void>> = [];

    for (const p of patterns) {
      for (const diff of difficulties) {
        jobs.push(async () => {
          const patternKey = buildPatternKey(p.source, p.sourceId);

          // 2) Dedupe: if we already generated this pattern+diff, skip
          // (No schema change needed; metadata key is enough)
          const existing = await prisma.question.findFirst({
            where: {
              AND: [
                { metadata: { path: ["patternKey"], equals: patternKey } },
                { metadata: { path: ["patternDifficultyVariant"], equals: diff } },
              ],
            },
            select: { id: true },
          });

          if (existing) {
            skipped++;
            return;
          }

          // 3) Call AI service to generate a question from the pattern
          const aiRes = await this.aiClient.generateQuestionFromPattern({
            source: p.source,
            sourceId: p.sourceId,
            difficulty: diff,
            pattern: p.pattern,
            domain: p.domain,
            tags: p.tags ?? [],
            constraints: p.constraints,
            inputStructure: p.inputStructure,
            fast,
          });

          if (!aiRes.success || !aiRes.question) {
            failed++;
            return;
          }

          const q = aiRes.question;

          // 4) IMPORTANT: Enrich skillTags so frontend categorization is not always DSA
          // Merge:
          // - AI tags
          // - Pattern tags
          // - Domain
          // Then EXPAND (split) for better routing: sql-queries -> sql
          const mergedSkillTags = uniqTags([
            ...expandTags(q.skillTags ?? []),
            ...expandTags([...(p.tags ?? []), p.domain]),
          ]);

          // Optional title dedupe (cheap)
          const titleDup = await this.questionService.findByTitle(q.title);
          if (titleDup) {
            skipped++;
            return;
          }

          // 5) Vector similarity dedupe (strong)
          // Use vector engine BEFORE creating the question.
          // If high duplication risk => skip
          const sim = await vectorEngineService.checkSimilarityFlexible({
            title: q.title,
            description: q.description ?? "",
            problemStatement: q.problemStatement ?? "",
            difficulty: diff,
            type: q.type ?? "coding",
            skillTags: mergedSkillTags,
            canonicalSolution: q.canonicalSolution ?? "",
            testCases: q.testCases ?? {},
            source: "web_scraped",
          });

          if (sim?.success && (sim.duplication_risk === "high" || sim.duplication_risk === "medium")) {
            skipped++;
            return;
          }

          // 6) Create question in DB
          const createdQuestion = await this.questionService.createQuestion({
            title: q.title,
            description: q.description ?? "",
            problemStatement: q.problemStatement,
            difficulty: q.difficulty ?? diff,
            skillTags: mergedSkillTags,
            type: q.type ?? "coding",

            canonicalSolution: q.canonicalSolution ?? "",
            testCases: q.testCases ?? {},

            options: q.options ?? undefined,
            correctAnswer: q.correctAnswer ?? undefined,
            explanation: q.explanation ?? "",

            metadata: {
              ...(q.metadata ?? {}),
              patternKey,
              patternSource: p.source,
              patternSourceId: p.sourceId,
              patternDomain: p.domain,
              patternTags: p.tags ?? [],
              patternDifficultyVariant: diff,
            },
            generatedFromPattern: true,
            patternKey,
            patternDifficultyVariant: diff,

            createdBy: SYSTEM_CREATOR_ID, //  not null
            status: "approved",           //  appears in library UI (your frontend filters approved)
            aiGenerated: true,
            source: "web_scraped",
            isLibraryQuestion: true,
          });

          // 7) Store in vector DB so vectorId is not null
          // This calls your AI-service vector endpoint: /vector-search/store-question
          const storeRes = await vectorEngineService.storeQuestion(createdQuestion);

          // If vector store succeeded, mark fields (at minimum vectorStored=true)
          // (If your vector service returns only question_id, keep vectorId = createdQuestion.id or question_id)
          if (storeRes?.success) {
            await prisma.question.update({
              where: { id: createdQuestion.id },
              data: {
                vectorStored: true,
                vectorId: storeRes.question_id || createdQuestion.id,
              },
            });
          } else {
            await prisma.question.update({
              where: { id: createdQuestion.id },
              data: { vectorStored: false },
            });
          }

          created++;
        });
      }
    }

    // Run worker pool
    let idx = 0;
    const workers = Array.from({ length: concurrency }).map(async () => {
      while (idx < jobs.length) {
        const job = jobs[idx++];
        await job();
      }
    });

    await Promise.all(workers);

    return {
      success: true,
      created,
      skipped,
      failed,
      processedPatterns: patterns.length,
      difficultyVariants: difficulties,
      concurrency,
      fast,
    };
  }
}
