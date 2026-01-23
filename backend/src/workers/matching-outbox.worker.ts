import { PrismaClient, OutboxStatus } from "@prisma/client";
import { createMatchingAIServiceClient } from "../clients/matching-ai-service.client";

export class MatchingOutboxWorker {
  constructor(
    private prisma: PrismaClient,
    private matchingClient: ReturnType<typeof createMatchingAIServiceClient>
  ) {}

  async tick(batchSize = 20, maxAttempts = 5) {
    const events = await this.prisma.matchingOutboxEvent.findMany({
      where: {
        OR: [
          { status: OutboxStatus.PENDING },
          { status: OutboxStatus.FAILED, attempts: { lt: maxAttempts } },
        ],
      },
      orderBy: { created_at: "asc" },
      take: batchSize,
    });

    for (const ev of events) {
      try {
        await this.matchingClient.triggerMatching({
          event_id: ev.event_id,
          event_type: ev.event_type,
          entity_type: ev.entity_type,
          entity_id: ev.entity_id,
          // ✅ important: pass payload to matching
          payload: ev.payload ?? {},
        });

        await this.prisma.matchingOutboxEvent.update({
          where: { event_id: ev.event_id },
          data: { status: OutboxStatus.SENT, last_error: null },
        });
      } catch (e: any) {
        await this.prisma.matchingOutboxEvent.update({
          where: { event_id: ev.event_id },
          data: {
            status: OutboxStatus.FAILED,
            attempts: { increment: 1 },
            last_error: String(e?.message ?? e),
          },
        });
      }
    }
  }
}
