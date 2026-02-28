/**Track C4 + Track D trigger:

submitSession(sessionId)

compute timeTaken, attempts, compile errors, etc.

write final answers snapshot

emit outbox event: "assessment.completed" */
import { PrismaClient } from "@prisma/client";
import { enqueueAssessmentOutbox } from "../../workers/assessmentQueue";

const prisma = new PrismaClient();

export class CandidateAssessmentSubmissionService {
  static async submitSession(
    sessionId: string,
    candidateId: string,
    reason?: string
  ) {
    const session = await prisma.candidateAssessmentSession.findFirst({
      where: { session_id: sessionId, candidate_id: candidateId },
      include: { assessment: { select: { assessment_id: true } } },
    });

    if (!session) throw new Error("SESSION_NOT_FOUND");
    if (session.status !== "IN_PROGRESS") {
      return { ok: true, status: session.status }; // idempotent
    }

    const now = new Date();

    // lock session
    await prisma.candidateAssessmentSession.update({
      where: { session_id: sessionId },
      data: {
        status: "SUBMITTED",
        submitted_at: now,
        submission_reason: reason ?? "USER_SUBMIT",
      } as any,
    });

    // finalize drafts
    await prisma.candidateAssessmentAnswer.updateMany({
      where: { session_id: sessionId, state: "DRAFT" },
      data: { state: "FINAL" },
    });

    // Track D/E via outbox queue (async)
    await enqueueAssessmentOutbox({ sessionId });

    return { ok: true, status: "SUBMITTED" };
  }
}
