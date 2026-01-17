// src/services/matching/outbox.service.ts
import {
  Prisma,
  PrismaClient,
  MatchingEventType,
  MatchingEntityType,
  OutboxStatus,
} from "@prisma/client";

type EnqueueArgs = {
  eventType: MatchingEventType;
  entityType: MatchingEntityType;
  entityId: string;
  payload?: any;
  dedupeKey?: string;
};

export class MatchingOutboxService {
  constructor(private prisma: PrismaClient) {}

  // ✅ IMPORTANT: tx doit être TransactionClient (pas PrismaClient)
  async enqueue(tx: Prisma.TransactionClient, args: EnqueueArgs) {
    return tx.matchingOutboxEvent.create({
      data: {
        event_type: args.eventType,
        entity_type: args.entityType,
        entity_id: args.entityId,
        payload: args.payload ?? {},
        status: OutboxStatus.PENDING,
        dedupe_key: args.dedupeKey ?? null,
      },
    });
  }
}
