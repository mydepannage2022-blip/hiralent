// backend/src/workers/assessmentInviteSweeper.worker.ts
import { PrismaClient } from "@prisma/client";
import { setTimeout as wait } from "node:timers/promises";
import { autoSubmitIfExpired } from "../services/candidate/sessionDeadline.util";

const prisma = new PrismaClient();

/**
 * Every 30s:
 * - expire invites where expires_at passed
 * - if invite has session IN_PROGRESS => auto submit (HackerRank behavior)
 */
async function sweepOnce() {
  const now = new Date();

  // 1) mark invites expired
  await prisma.candidateAssessmentInvite.updateMany({
    where: {
      status: { in: ["PENDING", "ACCEPTED"] },
      expires_at: { lte: now },
    },
    data: { status: "EXPIRED" },
  });

  // 2) find sessions to auto-submit (invite expired + session in progress)
  const expiredInvites = await prisma.candidateAssessmentInvite.findMany({
    where: {
      status: "EXPIRED",
      session_id: { not: null },
    },
    select: {
      session_id: true,
      candidate_id: true,
    },
    take: 200, // safe batch
  });

  if (expiredInvites.length === 0) return;

  const sessionIds = expiredInvites.map((x) => x.session_id!).filter(Boolean);

  const sessions = await prisma.candidateAssessmentSession.findMany({
    where: {
      session_id: { in: sessionIds },
      status: "IN_PROGRESS",
    },
    select: { session_id: true, candidate_id: true },
  });

  const candidateBySession = new Map(
    expiredInvites
      .filter((x) => x.session_id && x.candidate_id)
      .map((x) => [x.session_id as string, x.candidate_id as string])
  );

  for (const s of sessions) {
    const candidateId = candidateBySession.get(s.session_id) ?? s.candidate_id;

    await autoSubmitIfExpired({
      sessionId: s.session_id,
      candidateId,
      reason: "INVITE_DEADLINE_EXPIRED",
    });
  }
}

async function main() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await sweepOnce();
    } catch (e) {
      console.error("assessmentInviteSweeper error:", e);
    }
    await wait(30_000);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { main };
