// services/candidate/candidateAssessmentTelemetry.service.ts
import { PrismaClient, TelemetryEventType } from "@prisma/client";

const prisma = new PrismaClient();

const isTelemetryEventType = (val: unknown): val is TelemetryEventType => {
  return (
    typeof val === "string" &&
    (Object.values(TelemetryEventType) as string[]).includes(val)
  );
};

export class CandidateAssessmentTelemetryService {
  static async logEvents(sessionId: string, candidateId: string, events: any[]) {
    const session = await prisma.candidateAssessmentSession.findFirst({
      where: { session_id: sessionId, candidate_id: candidateId },
      select: { session_id: true },
    });
    if (!session) throw new Error("SESSION_NOT_FOUND");

    // Optionnel: ignore si rien à logger
    if (!Array.isArray(events) || events.length === 0) {
      await prisma.candidateAssessmentSession.update({
        where: { session_id: sessionId },
        data: { last_activity_at: new Date() },
      });
      return { ok: true };
    }

    const data = events
      .map((e) => {
        const rawType = e?.type;

        // Si type invalide -> on skip pour éviter crash
        if (!isTelemetryEventType(rawType)) return null;

        return {
          session_id: sessionId,
          candidate_id: candidateId,
          type: rawType, // ✅ enum TelemetryEventType
          payload: {
            questionId: e?.question_id ?? e?.questionId ?? null,
            metadata: e?.metadata ?? {},
            ts: e?.ts ?? null,
          },
          // ❌ ne pas set created_at (default now() dans Prisma)
        };
      })
      .filter(Boolean) as Array<{
      session_id: string;
      candidate_id: string;
      type: TelemetryEventType;
      payload: any;
    }>;

    if (data.length > 0) {
      await prisma.candidateAssessmentTelemetryEvent.createMany({
        data,
      });
    }

    await prisma.candidateAssessmentSession.update({
      where: { session_id: sessionId },
      data: { last_activity_at: new Date() },
    });

    return { ok: true, inserted: data.length };
  }
}
