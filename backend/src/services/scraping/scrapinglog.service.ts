import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type ScrapingJobStatus = "success" | "failed";

export class ScrapingLogService {
  async createLog(params: {
    source: string;
    status: ScrapingJobStatus;
    count: number;
    durationMs: number;
    error?: string | null;
  }) {
    return prisma.scrapingJobLog.create({
      data: {
        source: params.source,
        status: params.status,
        count: params.count,
        durationMs: params.durationMs,
        error: params.error ?? null,
      },
    });
  }
}
