// src/services/matching/candidate-outbox.service.ts
import { MatchingEventType, MatchingEntityType } from "@prisma/client";
import prisma from '../../lib/prisma';
import { MatchingOutboxService } from "./outbox.service";

const outbox = new MatchingOutboxService(prisma);

const makeCandidateDedupeKey = (candidateId: string) => `CANDIDATE_UPDATED:${candidateId}`;

/**
 * Trigger matching event when candidate profile changes
 * Called after: skills update, experience update, education update, resume upload, etc.
 */
export async function triggerCandidateMatching(candidateId: string, trigger: string) {
  await prisma.$transaction(async (tx) => {
    await outbox.enqueue(tx, {
      eventType: MatchingEventType.CANDIDATE_UPDATED,
      entityType: MatchingEntityType.CANDIDATE,
      entityId: candidateId,
      payload: { trigger },
      dedupeKey: makeCandidateDedupeKey(candidateId),
    });
  });
}

export const candidateMatchingService = {
  triggerCandidateMatching,
};