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

  /**
   * ✅ FIX: Use upsert instead of create to handle duplicate dedupe_key
   * - If dedupe_key exists: reset status to PENDING, update payload
   * - If dedupe_key doesn't exist: create new event
   */
  async enqueue(tx: Prisma.TransactionClient, args: EnqueueArgs) {
    const dedupeKey = args.dedupeKey ?? null;

    // If no dedupe_key, just create (no risk of collision)
    if (!dedupeKey) {
      return tx.matchingOutboxEvent.create({
        data: {
          event_type: args.eventType,
          entity_type: args.entityType,
          entity_id: args.entityId,
          payload: args.payload ?? {},
          status: OutboxStatus.PENDING,
          dedupe_key: null,
        },
      });
    }

    // ✅ With dedupe_key: upsert to avoid unique constraint violation
    return tx.matchingOutboxEvent.upsert({
      where: { dedupe_key: dedupeKey },
      
      // If exists: reset to PENDING and update payload
      update: {
        status: OutboxStatus.PENDING,
        payload: args.payload ?? {},
        attempts: 0,           // Reset attempts
        last_error: null,      // Clear previous error
        updated_at: new Date(),
      },
      
      // If doesn't exist: create new
      create: {
        event_type: args.eventType,
        entity_type: args.entityType,
        entity_id: args.entityId,
        payload: args.payload ?? {},
        status: OutboxStatus.PENDING,
        dedupe_key: dedupeKey,
      },
    });
  }
}