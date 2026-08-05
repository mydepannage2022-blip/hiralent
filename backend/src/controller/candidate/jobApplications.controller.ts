import prisma from '../../lib/prisma';
import { JobApplicationService } from "../../services/candidate/jobApplication.service";
import { parseApplicationIdParam } from "../../validation/candidate.applications.validation";

const service = new JobApplicationService(prisma);

/**
 * =========================
 * APPLY TO JOB (A4)
 * POST /api/v1/candidate/applications/apply
 * =========================
 */
export async function applyToJob(req: any, res: any) {
  try {
    const candidateId = req.user?.user_id;
    const { job_id, cover_letter } = req.body;

    if (!candidateId) return res.status(401).json({ error: "Unauthorized" });
    if (!job_id) return res.status(400).json({ error: "job_id is required" });

    const result = await service.applyToJob({
      candidateId,
      jobId: job_id,
      coverLetter: cover_letter,
    });

    return res.json(result);
  } catch (e: any) {
    const status = e?.statusCode ?? 500;
    return res.status(status).json({
      error: String(e?.message ?? e),
      reason_codes: e?.reason_codes ?? undefined,
    });
  }
}

/**
 * =========================
 * LIST MY APPLICATIONS
 * GET /api/v1/candidate/applications
 * =========================
 */
export async function listMyApplications(req: any, res: any) {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) return res.status(401).json({ error: "Unauthorized" });

    const result = await service.listApplications({ candidateId });
    return res.json({ ok: true, ...result });
  } catch (e: any) {
    const status = e?.statusCode ?? 500;
    return res.status(status).json({ ok: false, error: String(e?.message ?? e) });
  }
}

/**
 * =========================
 * APPLICATION TIMELINE
 * GET /api/v1/candidate/applications/:id/timeline
 * =========================
 */
export async function getApplicationTimeline(req: any, res: any) {
  try {
    const candidateId = req.user?.user_id;
    const applicationId = parseApplicationIdParam(req);

    if (!candidateId) return res.status(401).json({ error: "Unauthorized" });
    if (!applicationId) return res.status(400).json({ error: "application id is required" });

    const result = await service.getTimeline({ candidateId, applicationId });
    return res.json({ ok: true, ...result });
  } catch (e: any) {
    const status = e?.statusCode ?? 500;
    return res.status(status).json({ ok: false, error: String(e?.message ?? e) });
  }
}

