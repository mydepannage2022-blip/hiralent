// src/services/verification.service.ts
import type { PrismaClient, VerificationDecision } from "@prisma/client";
import { HttpError } from "../utils/errors";

type SubjectType = "COMPANY" | "AGENCY";

export class VerificationService {
  enqueueRun(arg: { runId: string; subject: SubjectType; subjectId: string }) {
    // Hook your queue here (BullMQ, SQS, etc.)
    return;
  }

  constructor(private prisma: PrismaClient) {}

  /** Upsert draft for company or agency verification */
  async saveDraft(
    subject: SubjectType,
    subjectId: string,
    payload: { documents?: any[]; details?: any }
  ) {
    if (subject === "COMPANY") {
      const existing = await this.prisma.companyVerification.findFirst({
        where: { company_id: subjectId },
      });

      if (!existing) {
        return this.prisma.companyVerification.create({
          data: {
            company_id: subjectId,
            status: "DRAFT",
            // Store whatever frontend sends as details into documents JSON for now
            documents: payload?.details ?? {},
          },
        });
      }

      if (["IN_REVIEW", "APPROVED", "AUTO_APPROVED"].includes(existing.status)) {
        throw new HttpError(409, "Verification already submitted/locked");
      }

      return this.prisma.companyVerification.update({
        where: { verification_id: existing.verification_id },
        data: {
          status: "DRAFT",
          documents: payload?.details ?? existing.documents,
        },
      });
    }

    // AGENCY
    const existing = await this.prisma.agencyVerification.findFirst({
      where: { agency_id: subjectId },
    });

    if (!existing) {
      return this.prisma.agencyVerification.create({
        data: {
          agency_id: subjectId,
          status: "DRAFT",
          verification_documents: payload?.details ?? {},
          // required by your schema (non-null String)
          license_status: "UNKNOWN",
        },
      });
    }

    if (["IN_REVIEW", "APPROVED", "AUTO_APPROVED"].includes(existing.status)) {
      throw new HttpError(409, "Verification already submitted/locked");
    }

    return this.prisma.agencyVerification.update({
      where: { verification_id: existing.verification_id },
      data: {
        status: "DRAFT",
        verification_documents:
          payload?.details ?? existing.verification_documents,
      },
    });
  }

  /** Submit verification: lock inputs, snapshot, create run, set IN_REVIEW */
  async submit(subject: SubjectType, subjectId: string) {
    return this.prisma.$transaction(async (tx) => {
      if (subject === "COMPANY") {
        // lock or create the case to prevent further edits
        const existing = await tx.companyVerification.findFirst({
          where: { company_id: subjectId },
          select: { verification_id: true, documents: true },
        });

        let cv;
        if (!existing) {
          cv = await tx.companyVerification.create({
            data: {
              company_id: subjectId,
              status: "IN_REVIEW",
              documents: {},
            },
          });
        } else {
          cv = await tx.companyVerification.update({
            where: { verification_id: existing.verification_id },
            data: { status: "IN_REVIEW" },
          });
        }

        const profile = await tx.companyProfile.findUnique({
          where: { company_id: subjectId },
        });

        // FIX: no docs table yet — use the JSON you saved in draft or an empty array
        const docsFromDraft = existing?.documents ?? {};
        const docs = Array.isArray(docsFromDraft) ? docsFromDraft : []; // normalize to array

        // Create run first, then create snapshot connected to that run
        const run = await tx.verificationRun.create({
          data: {
            subject_type: "COMPANY",
            subject_id: subjectId,
            status: "QUEUED",
          },
        });

        await tx.verificationSnapshot.create({
          data: {
            run: { connect: { run_id: run.run_id } },
            profile: profile ?? {},
            documents: docs, // if you later add an UploadedDocument table, replace here
          },
        });

        await tx.companyVerification.update({
          where: { verification_id: cv.verification_id },
          data: { latest_run_id: run.run_id },
        });

        this.enqueueRun({ runId: run.run_id, subject: "COMPANY", subjectId });
        return { runId: run.run_id, verificationId: cv.verification_id };
      }

      // AGENCY flow
      const existing = await tx.agencyVerification.findFirst({
        where: { agency_id: subjectId },
        select: { verification_id: true, verification_documents: true },
      });

      let av;
      if (!existing) {
        av = await tx.agencyVerification.create({
          data: {
            agency_id: subjectId,
            status: "IN_REVIEW",
            verification_documents: {},
            license_status: "UNKNOWN",
          },
        });
      } else {
        av = await tx.agencyVerification.update({
          where: { verification_id: existing.verification_id },
          data: { status: "IN_REVIEW" },
        });
      }

      const agency = await tx.agency.findUnique({
        where: { agency_id: subjectId },
      });

      // FIX: no docs table yet — use the JSON you saved in draft or empty array
      const docsFromDraft = existing?.verification_documents ?? {};
      const docs = Array.isArray(docsFromDraft) ? docsFromDraft : [];

      const run = await tx.verificationRun.create({
        data: {
          subject_type: "AGENCY",
          subject_id: subjectId,
          status: "QUEUED",
        },
      });

      await tx.verificationSnapshot.create({
        data: {
          run: { connect: { run_id: run.run_id } },
          profile: agency ?? {},
          documents: docs,
        },
      });

      await tx.agencyVerification.update({
        where: { verification_id: av.verification_id },
        data: { latest_run_id: run.run_id },
      });

      this.enqueueRun({ runId: run.run_id, subject: "AGENCY", subjectId });
      return { runId: run.run_id, verificationId: av.verification_id };
    });
  }

  /** Latest status endpoint payload */
  async getStatus(subject: SubjectType, subjectId: string) {
    if (subject === "COMPANY") {
      const cv = await this.prisma.companyVerification.findFirst({
        where: { company_id: subjectId },
        include: { latest_run: true },
      });
      if (!cv) throw new HttpError(404, "Company verification not found");

      return {
        status: cv.status,
        risk_score: cv.risk_score ?? null,
        reason_codes: cv.reason_codes ?? [],
        run: cv.latest_run
          ? {
              id: cv.latest_run.run_id,
              status: cv.latest_run.status,
              decision: cv.latest_run.decision,
              started_at: cv.latest_run.started_at,
              ended_at: cv.latest_run.ended_at,
              risk_score: cv.latest_run.risk_score,
              reason_codes: cv.latest_run.reason_codes,
            }
          : null,
      };
    }

    const av = await this.prisma.agencyVerification.findFirst({
      where: { agency_id: subjectId },
      include: { latest_run: true },
    });
    if (!av) throw new HttpError(404, "Agency verification not found");

    return {
      status: av.status,
      risk_score: av.risk_score ?? null,
      reason_codes: av.reason_codes ?? [],
      run: av.latest_run
        ? {
            id: av.latest_run.run_id,
            status: av.latest_run.status,
            decision: av.latest_run.decision,
            started_at: av.latest_run.started_at,
            ended_at: av.latest_run.ended_at,
            risk_score: av.latest_run.risk_score,
            reason_codes: av.latest_run.reason_codes,
          }
        : null,
    };
  }

  /** Called by worker when finishing a run */
  async finalizeRun(
    runId: string,
    decision: VerificationDecision,
    risk: number,
    reasons: string[]
  ) {
    const run = await this.prisma.verificationRun.update({
      where: { run_id: runId },
      data: {
        status: "COMPLETED",
        ended_at: new Date(),
        decision,
        risk_score: risk,
        reason_codes: reasons,
      },
    });

    if (run.subject_type === "COMPANY") {
      await this.prisma.companyVerification.updateMany({
        where: { latest_run_id: runId },
        data: {
          status:
            decision === "APPROVE"
              ? "AUTO_APPROVED"
              : decision === "REJECT"
              ? "AUTO_REJECTED"
              : "IN_REVIEW",
          risk_score: risk,
          reason_codes: reasons,
          verification_date: decision === "APPROVE" ? new Date() : undefined,
        },
      });
    } else {
      await this.prisma.agencyVerification.updateMany({
        where: { latest_run_id: runId },
        data: {
          status:
            decision === "APPROVE"
              ? "AUTO_APPROVED"
              : decision === "REJECT"
              ? "AUTO_REJECTED"
              : "IN_REVIEW",
          risk_score: risk,
          reason_codes: reasons,
          verification_date: decision === "APPROVE" ? new Date() : undefined,
        },
      });
    }

    return run;
  }
}
