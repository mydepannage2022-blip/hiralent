import {
  PrismaClient,
  CandidateAssessmentInviteStatus,
  SimpleTestInviteStatus,
  NotificationAudience,
  NotificationType,
} from "@prisma/client";

export class CandidateInvitesService {
  constructor(private prisma: PrismaClient) {}

  async listAssessmentInvites(candidateId: string) {
    const items = await this.prisma.candidateAssessmentInvite.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: "desc" },
      select: {
        invite_id: true,
        assessment_id: true,
        application_id: true,
        job_id: true,
        status: true,
        expires_at: true,
        created_at: true,
        assessment: { select: { title: true, time_limit: true } },
      },
    });

    return { items };
  }

  async acceptAssessmentInvite(candidateId: string, inviteId: string) {
    const inv = await this.prisma.candidateAssessmentInvite.findUnique({
      where: { invite_id: inviteId },
      select: {
        invite_id: true,
        candidate_id: true,
        company_id: true,
        assessment_id: true,
        status: true,
        expires_at: true,
        assessment: { select: { title: true } },
      },
    });

    if (!inv) throw new Error("INVITE_NOT_FOUND");
    if (inv.candidate_id !== candidateId) throw new Error("FORBIDDEN");

    if (new Date(inv.expires_at).getTime() < Date.now()) {
      await this.prisma.candidateAssessmentInvite.update({
        where: { invite_id: inviteId },
        data: { status: CandidateAssessmentInviteStatus.EXPIRED },
      });
      throw new Error("INVITE_EXPIRED");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.candidateAssessmentInvite.update({
        where: { invite_id: inviteId },
        data: {
          status: CandidateAssessmentInviteStatus.ACCEPTED,
          accepted_at: new Date(),
        },
      });

      await tx.notification.create({
        data: {
          audience: NotificationAudience.COMPANY,
          recipient_id: inv.company_id,
          type: NotificationType.ASSESSMENT_INVITE_ACCEPTED,
          title: "Assessment invite accepted ✅",
          message: `Candidate accepted the invite for "${inv.assessment.title}".`,
          action_url: "/company/dashboard/assessments",
          data: { inviteId, assessmentId: inv.assessment_id },
          sent_via: "in_app",
        },
      });

      return u;
    });

    return { ok: true, invite: updated };
  }

  async listSimpleTestInvites(candidateId: string) {
    const items = await this.prisma.candidateJobSimpleTestInvite.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: "desc" },
      select: {
        invite_id: true,
        test_id: true,
        job_id: true,
        application_id: true,
        status: true,
        expires_at: true,
        created_at: true,
        test: { select: { title: true, time_limit_min: true } },
      },
    });
    return { items };
  }

  async acceptSimpleTestInvite(candidateId: string, inviteId: string) {
    const inv = await this.prisma.candidateJobSimpleTestInvite.findUnique({
      where: { invite_id: inviteId },
      select: {
        invite_id: true,
        candidate_id: true,
        status: true,
        expires_at: true,
      },
    });

    if (!inv) throw new Error("INVITE_NOT_FOUND");
    if (inv.candidate_id !== candidateId) throw new Error("FORBIDDEN");

    if (new Date(inv.expires_at).getTime() < Date.now()) {
      await this.prisma.candidateJobSimpleTestInvite.update({
        where: { invite_id: inviteId },
        data: { status: SimpleTestInviteStatus.EXPIRED },
      });
      throw new Error("INVITE_EXPIRED");
    }

    const updated = await this.prisma.candidateJobSimpleTestInvite.update({
      where: { invite_id: inviteId },
      data: { status: SimpleTestInviteStatus.ACCEPTED, accepted_at: new Date() },
    });

    return { ok: true, invite: updated };
  }
}
