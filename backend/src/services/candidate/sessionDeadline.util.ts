// backend/src/services/candidate/sessionDeadline.util.ts
import prisma from '../../lib/prisma';
import { CandidateAssessmentSubmissionService } from "./candidateAssessmentSubmission.service";


/**
 * effective deadline = min(session.expires_at (time limit), invite.expires_at (invite deadline))
 * -> si l'invite expire pendant IN_PROGRESS => on coupe (HackerRank style)
 */
export async function getEffectiveDeadline(session: {
  session_id: string;
  candidate_id: string;
  assessment_id: string;
  started_at: Date;
  expires_at: Date | null;
}) {
  const sessionDeadline = session.expires_at;

  const inv = await prisma.candidateAssessmentInvite.findFirst({
    where: {
      candidate_id: session.candidate_id,
      assessment_id: session.assessment_id,
    },
    select: { expires_at: true, status: true },
  });

  const inviteDeadline = inv?.expires_at ?? null;

  if (sessionDeadline && inviteDeadline) {
    return sessionDeadline.getTime() < inviteDeadline.getTime()
      ? sessionDeadline
      : inviteDeadline;
  }
  return sessionDeadline ?? inviteDeadline;
}

/**
 * HackerRank behavior:
 * If expired => AUTO SUBMIT (so scoring + insight + company results)
 */
export async function autoSubmitIfExpired(args: {
  sessionId: string;
  candidateId: string;
  reason: "TIME_EXPIRED" | "INVITE_DEADLINE_EXPIRED" | "INVITE_OR_TIME_DEADLINE";
}) {
  // idempotent submit (your submitSession already is idempotent)
  await CandidateAssessmentSubmissionService.submitSession(
    args.sessionId,
    args.candidateId,
    args.reason
  );

  // optional: telemetry event (if you want)
  // await prisma.candidateAssessmentTelemetryEvent.create({
  //   data: { session_id: args.sessionId, candidate_id: args.candidateId, type: "AUTO_SUBMIT", payload: { reason: args.reason } as any },
  // });
}
