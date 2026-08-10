import {
  PrismaClient,
  NotificationAudience,
  NotificationType,
  CandidateAssessmentInviteStatus,
  SimpleTestInviteStatus,
  JobApplicationStatus,
} from "@prisma/client";

export class CompanyHiringFlowService {
  constructor(private prisma: PrismaClient) {}

  async notifyNewApplicant(args: { applicationId: string }) {
    const app = await this.prisma.jobApplication.findUnique({
      where: { application_id: args.applicationId },
      select: {
        application_id: true,
        candidate_id: true,
        job_id: true,
        job: { select: { title: true, company_id: true } },
        candidate: { select: { full_name: true } },
      },
    });
    if (!app) throw new Error("APPLICATION_NOT_FOUND");

    await this.prisma.notification.create({
      data: {
        audience: NotificationAudience.COMPANY,
        recipient_id: app.job.company_id,
        type: NotificationType.JOB_APPLICATION_RECEIVED,
        title: `New application: ${app.job.title}`,
        message: `${app.candidate.full_name ?? "A candidate"} applied to your "${app.job.title}" position.`,
        action_url: `/company/dashboard/jobs/${app.job_id}/applicants`,
        data: {
          applicationId: app.application_id,
          jobId: app.job_id,
          candidateId: app.candidate_id,
        },
        sent_via: "in_app",
      },
    });

    return { ok: true };
  }

  async rejectApplication(args: {
    companyId: string;
    applicationId: string;
    reason?: string;
  }) {
    const app = await this.prisma.jobApplication.findUnique({
      where: { application_id: args.applicationId },
      select: {
        application_id: true,
        candidate_id: true,
        job_id: true,
        job: { select: { title: true, company_id: true } },
      },
    });
    if (!app) throw new Error("APPLICATION_NOT_FOUND");
    if (app.job.company_id !== args.companyId) throw new Error("FORBIDDEN");

    await this.prisma.$transaction(async (tx) => {
      await tx.jobApplication.update({
        where: { application_id: app.application_id },
        data: {
          status: JobApplicationStatus.REJECTED,
          rejection_reason: args.reason ?? null,
        },
      });

      await tx.notification.create({
        data: {
          audience: NotificationAudience.CANDIDATE,
          recipient_id: app.candidate_id,
          type: NotificationType.JOB_APPLICATION_REJECTED,
          title: "Application update",
          message: `Your application for "${app.job.title}" was rejected.${
            args.reason ? ` Reason: ${args.reason}` : ""
          }`,
          action_url: "/candidate/dashboard/applications",
          data: {
            applicationId: app.application_id,
            jobId: app.job_id,
            status: "REJECTED",
          },
          sent_via: "in_app",
        },
      });
    });

    return { ok: true };
  }

  /**
   * ✅ Simple Test = warm-up only (candidate-only, unlimited attempts)
   * - Must NEVER gate or change the real hiring flow status
   * - Invite message must NOT sound required
   */
  async inviteToSimpleTest(args: {
    companyId: string;
    applicationId: string;
    expiresAt: Date;
  }) {
    const app = await this.prisma.jobApplication.findUnique({
      where: { application_id: args.applicationId },
      select: {
        application_id: true,
        candidate_id: true,
        job_id: true,
        status: true,
        job: { select: { title: true, company_id: true } },
      },
    });
    if (!app) throw new Error("APPLICATION_NOT_FOUND");
    if (app.job.company_id !== args.companyId) throw new Error("FORBIDDEN");

    const test = await this.prisma.jobSimpleTest.findUnique({
      where: { job_id: app.job_id },
      select: { test_id: true, title: true },
    });
    if (!test) throw new Error("JOB_SIMPLE_TEST_NOT_FOUND");

    const invite = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.candidateJobSimpleTestInvite.upsert({
        // NOTE: keep your existing composite unique here
        where: {
          test_id_candidate_id: {
            test_id: test.test_id,
            candidate_id: app.candidate_id,
          },
        } as any,
        update: {
          application_id: app.application_id,
          job_id: app.job_id,
          company_id: args.companyId,
          status: SimpleTestInviteStatus.PENDING,
          expires_at: args.expiresAt,
          accepted_at: null,
          declined_at: null,
        },
        create: {
          test_id: test.test_id,
          application_id: app.application_id,
          job_id: app.job_id,
          company_id: args.companyId,
          candidate_id: app.candidate_id,
          expires_at: args.expiresAt,
          status: SimpleTestInviteStatus.PENDING,
        },
      });

      // ✅ Candidate warm-up notification (NOT gating)
      await tx.notification.create({
        data: {
          audience: NotificationAudience.CANDIDATE,
          recipient_id: app.candidate_id,
          type: NotificationType.SIMPLE_TEST_INVITE,
          title: `Warm-up test for "${app.job.title}"`,
          message: `A practice test is available for the "${app.job.title}" position. It's optional and won't affect your real assessment.`,
          action_url: "/candidate/dashboard/simple-tests",
          data: {
            inviteId: inv.invite_id,
            applicationId: app.application_id,
            jobId: app.job_id,
            testId: test.test_id,
            expiresAt: args.expiresAt.toISOString(),
            warmUpOnly: true,
          },
          sent_via: "in_app",
        },
      });

      // ❌ IMPORTANT: Do NOT update job application status here (no gating)
      return inv;
    });

    return { ok: true, invite };
  }

  async inviteToAssessment(args: {
    companyId: string;
    applicationId: string;
    assessmentId: string;
    expiresAt: Date;
  }) {
    const app = await this.prisma.jobApplication.findUnique({
      where: { application_id: args.applicationId },
      select: {
        application_id: true,
        candidate_id: true,
        job_id: true,
        job: { select: { title: true, company_id: true } },
      },
    });
    if (!app) throw new Error("APPLICATION_NOT_FOUND");
    if (app.job.company_id !== args.companyId) throw new Error("FORBIDDEN");

    // ✅ Ensure a job simple test exists (system-managed)
    const test = await this.prisma.jobSimpleTest.findUnique({
      where: { job_id: app.job_id },
      select: { test_id: true, title: true },
    });
    if (!test) throw new Error("JOB_SIMPLE_TEST_NOT_FOUND");

    // ✅ Auto-create/refresh the simple test invite for this application (warm-up only)
    await this.prisma.candidateJobSimpleTestInvite.upsert({
      where: { application_id: app.application_id }, // application_id is unique in your model
      update: {
        test_id: test.test_id,
        job_id: app.job_id,
        company_id: args.companyId,
        candidate_id: app.candidate_id,
        status: SimpleTestInviteStatus.PENDING,
        expires_at: args.expiresAt,
        accepted_at: null,
        declined_at: null,
      },
      create: {
        test_id: test.test_id,
        application_id: app.application_id,
        job_id: app.job_id,
        company_id: args.companyId,
        candidate_id: app.candidate_id,
        expires_at: args.expiresAt,
        status: SimpleTestInviteStatus.PENDING,
      },
    });

    // ✅ Notify candidate about the simple test (optional warm-up, not required)
    await this.prisma.notification.create({
      data: {
        audience: NotificationAudience.CANDIDATE,
        recipient_id: app.candidate_id,
        type: NotificationType.SIMPLE_TEST_INVITE,
        title: `Practice test ready for "${app.job.title}"`,
        message: `You can warm up before your skills assessment for "${app.job.title}". Optional — results are only visible to you.`,
        action_url: "/candidate/dashboard/simple-tests",
        data: {
          applicationId: app.application_id,
          jobId: app.job_id,
          testId: test.test_id,
          expiresAt: args.expiresAt.toISOString(),
          warmUpOnly: true,
        },
        sent_via: "in_app",
      },
    });

    const assessment = await this.prisma.employerAssessment.findUnique({
      where: { assessment_id: args.assessmentId },
      select: {
        assessment_id: true,
        title: true,
        job_id: true,
        company_id: true,
        status: true,
      },
    });
    if (!assessment) throw new Error("ASSESSMENT_NOT_FOUND");
    if (assessment.company_id !== args.companyId) throw new Error("FORBIDDEN");
    if (assessment.job_id !== app.job_id) throw new Error("ASSESSMENT_NOT_FOR_JOB");
    // Guard the employer→candidate link: an assessment must be ACTIVE before it can be
    // invited. Templates (and direct creation) start as DRAFT; inviting a non-ACTIVE
    // assessment would only surface later as an ASSESSMENT_NOT_ACTIVE dead-end when the
    // candidate tries to start the session. Fail fast here so the employer activates first.
    if (assessment.status !== "ACTIVE") throw new Error("ASSESSMENT_NOT_ACTIVE");

    const invite = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.candidateAssessmentInvite.findFirst({
        where: {
          application_id: app.application_id,
          assessment_id: assessment.assessment_id,
        },
        select: { invite_id: true },
      });

      const inv = existing
        ? await tx.candidateAssessmentInvite.update({
            where: { invite_id: existing.invite_id },
            data: {
              job_id: app.job_id,
              company_id: args.companyId,
              candidate_id: app.candidate_id,
              status: CandidateAssessmentInviteStatus.PENDING,
              expires_at: args.expiresAt,
              accepted_at: null,
              declined_at: null,
              session_id: null,
            },
          })
        : await tx.candidateAssessmentInvite.create({
            data: {
              application_id: app.application_id,
              assessment_id: assessment.assessment_id,
              job_id: app.job_id,
              company_id: args.companyId,
              candidate_id: app.candidate_id,
              status: CandidateAssessmentInviteStatus.PENDING,
              expires_at: args.expiresAt,
            },
          });

      await tx.notification.create({
        data: {
          audience: NotificationAudience.CANDIDATE,
          recipient_id: app.candidate_id,
          type: NotificationType.ASSESSMENT_INVITE,
          title: `Assessment invite: ${assessment.title}`,
          message: `You've been invited to complete the "${assessment.title}" assessment for the "${app.job.title}" position. Check your Skills Assessment page.`,
          action_url: "/candidate/dashboard/skills-assessment/invites",
          data: {
            inviteId: inv.invite_id,
            assessmentId: assessment.assessment_id,
            applicationId: app.application_id,
            jobId: app.job_id,
            expiresAt: args.expiresAt.toISOString(),
          },
          sent_via: "in_app",
        },
      });

      return inv;
    });

    return { ok: true, invite };
  }
}
