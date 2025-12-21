import { PrismaClient, Prisma } from "@prisma/client";
import type { PatternDTO } from "../ai/ai-service.client";

const prisma = new PrismaClient();

export class PatternService {
  /**
   * Save patterns into AlgorithmPattern table.
   * Uses upsert to avoid duplicates (source+sourceId unique).
   */
  async upsertMany(patterns: PatternDTO[]) {
    console.log("📥 [SERVICE] upsertMany patterns called:", patterns?.length ?? 0);

    let upserted = 0;

    for (const p of patterns ?? []) {
      // Defensive checks
      if (!p?.source || !p?.source_id) {
        console.warn("⚠️ [SERVICE] Skipping invalid pattern (missing source/source_id):", p);
        continue;
      }

      const extractedAt = p.extracted_at ? new Date(p.extracted_at * 1000) : new Date();

      try {
        await prisma.algorithmPattern.upsert({
          where: {
            // Compound unique key created from @@unique([source, sourceId])
            source_sourceId: {
              source: p.source,
              sourceId: p.source_id,
            },
          },
          create: {
            source: p.source,
            sourceId: p.source_id,
            difficulty: p.difficulty ?? "medium",
            pattern: p.pattern ?? "general_algorithm",
            domain: p.domain ?? "algorithms",
            tags: (p.tags ?? []).slice(0, 8),
            constraints: p.constraints ?? {},
            inputStructure: p.input_structure ?? {},
            extractedAt,
          },
          update: {
            difficulty: p.difficulty ?? "medium",
            pattern: p.pattern ?? "general_algorithm",
            domain: p.domain ?? "algorithms",
            tags: (p.tags ?? []).slice(0, 8),
            constraints: p.constraints ?? {},
            inputStructure: p.input_structure ?? {},
            extractedAt,
          },
        });

        upserted++;
      } catch (error: any) {
        console.error("❌ [SERVICE] upsert pattern ERROR:", error?.message || error);

        // Optional: handle Prisma errors in a consistent way
        // if (error?.code) console.error("Prisma code:", error.code);
      }
    }

    console.log("✅ [SERVICE] upsertMany done. Upserted:", upserted);
    return { upserted };
  }

  /**
   * Optional helper: get latest patterns
   */
  async getLatest(limit = 50) {
    const take = Math.min(Math.max(limit, 1), 200);

    const data = await prisma.algorithmPattern.findMany({
      take,
      orderBy: { createdAt: "desc" },
    });

    return data;
  }

  /**
   * Optional helper: count patterns by source
   */
  async countBySource(source: string) {
    return prisma.algorithmPattern.count({ where: { source } });
  }
}
