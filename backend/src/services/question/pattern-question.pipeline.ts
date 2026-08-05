// src/services/question/pattern-question.pipeline.ts
import prisma from '../../lib/prisma';
import { AIServiceClient } from "../ai/ai-service.client";
import { QuestionService } from "./Question.service";
import { vectorEngineService } from "./vectorEngine.service";
import { categorizeQuestion } from "../../utils/categoryMapping";


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

  async generateFromPatterns(params: {
    source?: string;
    limit?: number;
    difficulties?: DifficultyVariant[];
    concurrency?: number;
    fast?: boolean;
  }) {
    const limit = params.limit ?? 10;

    const difficulties: DifficultyVariant[] =
      params.difficulties && params.difficulties.length
        ? (params.difficulties as DifficultyVariant[])
        : [...DIFFICULTY_VARIANTS];

    const concurrency = Math.max(1, Math.min(5, Number(params.concurrency ?? 2)));
    const fast = Boolean(params.fast ?? true);

    // ✅ CRITICAL FIX: ONLY load patterns that haven't been generated yet
    const patterns = await prisma.algorithmPattern.findMany({
      where: {
        ...(params.source ? { source: params.source } : {}),
        questionsGenerated: false, // ✅ ONLY unprocessed patterns
      },
      orderBy: { extractedAt: "desc" },
      take: limit,
    });

    console.log(`\n🔍 Loaded ${patterns.length} unprocessed patterns (questionsGenerated=false)`);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    const successfulPatternIds = new Set<string>();

    const jobs: Array<() => Promise<void>> = [];

    for (const p of patterns) {
      for (const diff of difficulties) {
        jobs.push(async () => {
          const patternKey = buildPatternKey(p.source, p.sourceId);

          // Check if question already exists
          const existing = await prisma.question.findFirst({
            where: {
              patternKey: patternKey,
              patternDifficultyVariant: diff,
            },
            select: { id: true },
          });

          if (existing) {
            skipped++;
            successfulPatternIds.add(p.id);
            return;
          }

          // Generate question
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

          // Categorize
          const categories = categorizeQuestion(p.domain, p.tags ?? []);
          const categoryTags = categories.map(c => `category:${c}`);

          const mergedSkillTags = uniqTags([
            ...expandTags(q.skillTags ?? []),
            ...expandTags([...(p.tags ?? []), p.domain]),
            ...categoryTags,
          ]);

          // Title dedupe
          const titleDup = await this.questionService.findByTitle(q.title);
          if (titleDup) {
            skipped++;
            return;
          }

          // Vector similarity
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

          // Create question
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

            generatedFromPattern: true,
            patternKey: patternKey,
            patternDifficultyVariant: diff,

            metadata: {
              ...(q.metadata ?? {}),
              patternKey,
              patternSource: p.source,
              patternSourceId: p.sourceId,
              patternDomain: p.domain,
              patternTags: p.tags ?? [],
              patternDifficultyVariant: diff,
              categories,
            },

            createdBy: SYSTEM_CREATOR_ID,
            status: "approved",
            aiGenerated: true,
            source: "web_scraped",
            isLibraryQuestion: true,
          });

          // Store in vector DB
          const storeRes = await vectorEngineService.storeQuestion(createdQuestion);

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

          successfulPatternIds.add(p.id);
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

    // Mark patterns as generated
    if (successfulPatternIds.size > 0) {
      await prisma.algorithmPattern.updateMany({
        where: {
          id: { in: Array.from(successfulPatternIds) },
        },
        data: {
          questionsGenerated: true,
        },
      });
    }

    return {
      success: true,
      created,
      skipped,
      failed,
      processedPatterns: patterns.length,
      patternsMarkedGenerated: successfulPatternIds.size,
      difficultyVariants: difficulties,
      concurrency,
      fast,
    };
  }
}