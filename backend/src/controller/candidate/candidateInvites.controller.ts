import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { autoSubmitIfExpired } from "../../services/candidate/sessionDeadline.util";

export class CandidateInvitesController {
  static async listAssessmentInvites(req: Request, res: Response) {
    const candidateId = (req as any).user?.user_id as string | undefined;

    if (!candidateId) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    try {
      // ✅ expire invites (PENDING or ACCEPTED) whose expires_at passed
      await prisma.candidateAssessmentInvite.updateMany({
        where: {
          candidate_id: candidateId,
          status: { in: ["PENDING", "ACCEPTED"] },
          expires_at: { lte: new Date() },
        },
        data: { status: "EXPIRED" },
      });

      // ✅ HackerRank: if invite expired but session exists and still IN_PROGRESS => auto submit
      const expiredWithSession = await prisma.candidateAssessmentInvite.findMany({
        where: {
          candidate_id: candidateId,
          status: "EXPIRED",
          session_id: { not: null },
        },
        select: { session_id: true },
      });

      if (expiredWithSession.length > 0) {
        const sessionIds = expiredWithSession
          .map((x) => x.session_id)
          .filter(Boolean) as string[];

        const inProgressSessions = await prisma.candidateAssessmentSession.findMany({
          where: {
            session_id: { in: sessionIds },
            candidate_id: candidateId,
            status: "IN_PROGRESS",
          },
          select: { session_id: true },
        });

        for (const s of inProgressSessions) {
          await autoSubmitIfExpired({
            sessionId: s.session_id,
            candidateId,
            reason: "INVITE_DEADLINE_EXPIRED",
          });
        }
      }

      const invites = await prisma.candidateAssessmentInvite.findMany({
        where: { candidate_id: candidateId },
        orderBy: { created_at: "desc" },
        select: {
          invite_id: true,
          application_id: true,
          assessment_id: true,
          job_id: true,
          company_id: true,
          candidate_id: true,
          status: true,
          expires_at: true,
          accepted_at: true,
          declined_at: true,
          session_id: true,
          created_at: true,
          updated_at: true,

          assessment: {
            select: {
              title: true,
              time_limit: true,
              total_questions: true,
              skill_category: true,
              difficulty: true,
            },
          },

          application: {
            select: {
              job: {
                select: {
                  title: true,
                  location: true,
                },
              },
            },
          },
        },
      });

      return res.json({ ok: true, invites });
    } catch (e: any) {
      console.error("listAssessmentInvites error:", e);
      return res
        .status(500)
        .json({ ok: false, error: "INTERNAL_ERROR", message: e?.message });
    }
  }

  // POST /candidate/assessment-invites/:inviteId/accept
  static async acceptAssessmentInvite(req: Request, res: Response) {
    const candidateId = (req as any).user?.user_id as string | undefined;
    const inviteId = String(req.params.inviteId || "");

    if (!candidateId) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    if (!inviteId) return res.status(400).json({ ok: false, error: "inviteId is required" });

    try {
      const result = await prisma.$transaction(async (tx) => {
        const invite = await tx.candidateAssessmentInvite.findFirst({
          where: { invite_id: inviteId, candidate_id: candidateId },
        });

        if (!invite) return { ok: false as const, status: 404, error: "INVITE_NOT_FOUND" };

        // ✅ if expired => cannot accept
        if (invite.expires_at.getTime() <= Date.now()) {
          await tx.candidateAssessmentInvite.update({
            where: { invite_id: invite.invite_id },
            data: { status: "EXPIRED" },
          });
          return { ok: false as const, status: 410, error: "INVITE_EXPIRED" };
        }

        const updatedInvite = await tx.candidateAssessmentInvite.update({
          where: { invite_id: invite.invite_id },
          data: {
            status: "ACCEPTED",
            accepted_at: new Date(),
          },
        });

        return { ok: true as const, invite: updatedInvite };
      });

      if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });

      return res.json({
        ok: true,
        data: {
          inviteId,
          status: result.invite.status,
          expiresAt: result.invite.expires_at.toISOString(),
        },
      });
    } catch (e: any) {
      console.error("acceptAssessmentInvite error:", e);
      return res.status(500).json({ ok: false, error: "INTERNAL_ERROR", message: e?.message });
    }
  }

  /**
   * GET /api/v1/candidate/simple-test-invites
   * List simple test invites for the authenticated candidate
   */
  static async listSimpleTestInvites(req: Request, res: Response) {
    const candidateId = (req as any).user?.user_id as string | undefined;

    if (!candidateId) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    try {
      const invites = await prisma.candidateJobSimpleTestInvite.findMany({
        where: { candidate_id: candidateId },
        orderBy: { created_at: "desc" },
        select: {
          invite_id: true,
          test_id: true,
          job_id: true,
          application_id: true,
          candidate_id: true,
          company_id: true,
          status: true,
          expires_at: true,
          accepted_at: true,
          declined_at: true,
          created_at: true,
          updated_at: true,

          test: {
            select: {
              title: true,
              time_limit_min: true,
              // ❌ passing_score removed (doesn't exist in Prisma model)
            },
          },
          application: {
            select: {
              job: {
                select: {
                  title: true,
                  location: true,
                },
              },
            },
          },
        },
      });

      return res.json({ ok: true, invites });
    } catch (e: any) {
      console.error("listSimpleTestInvites error:", e);
      return res
        .status(500)
        .json({ ok: false, error: "INTERNAL_ERROR", message: e?.message });
    }
  }

  /**
   * POST /api/v1/candidate/simple-test-invites/:inviteId/accept
   * ✅ NEW LOGIC:
   * - warm-up only => NEVER blocks (do not fail if expired)
   * - accept is just UX (mark accepted). Attempts are created by /candidate/simple-tests/start (unlimited)
   */
  static async acceptSimpleTestInvite(req: Request, res: Response) {
    const candidateId = (req as any).user?.user_id as string | undefined;
    const inviteId = String(req.params.inviteId || "");

    if (!candidateId) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    if (!inviteId) {
      return res.status(400).json({ ok: false, error: "inviteId is required" });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const invite = await tx.candidateJobSimpleTestInvite.findFirst({
          where: { invite_id: inviteId, candidate_id: candidateId },
          select: {
            invite_id: true,
            status: true,
            expires_at: true,
            accepted_at: true,
          },
        });

        if (!invite) {
          return { ok: false as const, status: 404, error: "INVITE_NOT_FOUND" };
        }

        // ✅ Warm-up only: do NOT block if expired
        // (Optional: you may mark EXPIRED for UI, but still allow startAttempt)
        // if (invite.expires_at && invite.expires_at.getTime() < Date.now()) {
        //   await tx.candidateJobSimpleTestInvite.update({
        //     where: { invite_id: invite.invite_id },
        //     data: { status: "EXPIRED" },
        //   });
        // }

        // If already accepted/expired/declined, keep status as-is (accept is UX only)
        if (invite.status === "PENDING") {
          const updated = await tx.candidateJobSimpleTestInvite.update({
            where: { invite_id: invite.invite_id },
            data: {
              status: "ACCEPTED",
              accepted_at: new Date(),
            },
            select: { invite_id: true, status: true, expires_at: true, accepted_at: true },
          });

          return { ok: true as const, invite: updated };
        }

        // already accepted/expired/declined => return as-is
        return { ok: true as const, invite };
      });

      if (!result.ok) {
        return res.status(result.status).json({ ok: false, error: result.error });
      }

      return res.json({
        ok: true,
        data: {
          inviteId,
          status: result.invite.status,
          expiresAt: result.invite.expires_at,
          acceptedAt: (result.invite as any).accepted_at ?? null,
          // ✅ NOTE: no attemptId here. Attempts are created by POST /candidate/simple-tests/start
        },
      });
    } catch (e: any) {
      console.error("acceptSimpleTestInvite error:", e);
      return res
        .status(500)
        .json({ ok: false, error: "INTERNAL_ERROR", message: e?.message });
    }
  }
}