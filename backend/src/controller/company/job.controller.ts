import { Request, Response } from 'express';
import { JobStatus } from '@prisma/client';
import { jobService } from '../../services/company/job.service';
import {
  CreateJobRequest,
  JobListFilters,
  IdParam,
  CompanyIdParam,
  isCompanyUser,
  isSuperadmin,
} from '../../types/job.types';
import type { AuthUser } from '../../types/express';

// ====================================================
// ========== AUTH HELPERS ============================
// ====================================================
const getAuthUser = (req: Request) => (req as any).user as AuthUser | undefined;
const getCompanyId = (req: Request) => getAuthUser(req)?.company_id ?? null;

// ====================================================
// ========== JOB CONTROLLER (NO AGENCIES) ============
// ====================================================

class JobController {
  // POST /jobs
  async createJob(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      if (!isCompanyUser(user)) {
        return res.status(403).json({ success: false, message: 'Forbidden: company role required' });
      }

      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, message: 'Missing company_id in auth token' });
      }

      const data: CreateJobRequest = req.body;
      const job = await jobService.createJob(companyId, data);

      return res.status(201).json({
        success: true,
        data: job,
        message: 'Job created successfully',
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create job',
        error: err?.message ?? String(err),
      });
    }
  }

  // GET /jobs
  async listJobs(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      const q = req.query;

      const filters: JobListFilters = {
        company_id: undefined,
        status: (q.status as any) || 'ALL',
        department: (q.department as string) || undefined,
        job_type: (q.job_type as string) || undefined,
        experience_level: (q.experience_level as string) || undefined,
        remote_option: (q.remote_option as string) || undefined,
        urgency_level: (q.urgency_level as string) || undefined,
        created_from: (q.created_from as string) || undefined,
        created_to: (q.created_to as string) || undefined,
        search_term: (q.q as string) || undefined,
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 20,
        sort_by: (q.sort_by as any) || 'created_at',
        sort_order: (q.sort_order as any) || 'desc',
      };

      // 🔹 Company users see their company jobs
      if (isCompanyUser(user)) {
        filters.company_id = getCompanyId(req) ?? undefined;
        if (isSuperadmin(user) && q.company_id) filters.company_id = String(q.company_id);
      } else {
        // 🔹 Public users see only active jobs
        filters.status = JobStatus.ACTIVE;
        if (q.company_id) filters.company_id = String(q.company_id);
      }

      const result = await jobService.listJobs(filters);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch jobs',
        error: err?.message ?? String(err),
      });
    }
  }

  // GET /jobs/:id
  async getJobById(req: Request<IdParam>, res: Response) {
    try {
      const user = getAuthUser(req);
      const job = await jobService.getById(req.params.id);
      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

      if (!isSuperadmin(user)) {
        if (isCompanyUser(user)) {
          if (job.company_id !== getCompanyId(req)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
          }
        } else {
          if (job.status !== JobStatus.ACTIVE) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
          }
        }
      }

      return res.json({ success: true, data: job });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch job',
        error: err?.message ?? String(err),
      });
    }
  }

  // PUT /jobs/:id
  async updateJob(req: Request<IdParam>, res: Response) {
    try {
      const user = getAuthUser(req);
      const job = await jobService.getById(req.params.id);
      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

      if (!isSuperadmin(user)) {
        if (!isCompanyUser(user) || job.company_id !== getCompanyId(req)) {
          return res.status(403).json({ success: false, message: 'Forbidden' });
        }
      }

      const updated = await jobService.update(req.params.id, req.body);
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update job',
        error: err?.message ?? String(err),
      });
    }
  }

  // DELETE /jobs/:id
  async deleteJob(req: Request<IdParam>, res: Response) {
    try {
      const user = getAuthUser(req);
      const job = await jobService.getById(req.params.id);
      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

      if (!isSuperadmin(user)) {
        if (!isCompanyUser(user) || job.company_id !== getCompanyId(req)) {
          return res.status(403).json({ success: false, message: 'Forbidden' });
        }
      }

      await jobService.delete(req.params.id);
      return res.json({
        success: true,
        data: { job_id: req.params.id, deleted: true },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete job',
        error: err?.message ?? String(err),
      });
    }
  }

  // PATCH /jobs/:id/status
  async patchJobStatus(req: Request<IdParam>, res: Response) {
    try {
      const user = getAuthUser(req);
      const job = await jobService.getById(req.params.id);
      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

      if (!isSuperadmin(user)) {
        if (!isCompanyUser(user) || job.company_id !== getCompanyId(req)) {
          return res.status(403).json({ success: false, message: 'Forbidden' });
        }
      }

      const { status } = req.body as { status: JobStatus };
      if (!status) return res.status(400).json({ success: false, message: 'status is required' });

      const updated = await jobService.patchStatus(req.params.id, status);
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update job status',
        error: err?.message ?? String(err),
      });
    }
  }

  // GET /jobs/company/my-jobs
  async getMyCompanyJobs(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      if (!isCompanyUser(user)) {
        return res.status(403).json({ success: false, message: 'Forbidden: company role required' });
      }

      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ success: false, message: 'Missing company_id in auth token' });
      }

      const jobs = await jobService.getCompanyJobs(companyId);
      return res.json({ success: true, data: jobs });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch jobs',
        error: err?.message ?? String(err),
      });
    }
  }

  // GET /jobs/company/:companyId/jobs
  async getCompanyJobsById(req: Request<CompanyIdParam>, res: Response) {
    try {
      const user = getAuthUser(req);
      const onlyActive = !isCompanyUser(user) && !isSuperadmin(user);
      const jobs = await jobService.getCompanyJobsById(req.params.companyId, onlyActive);
      return res.json({ success: true, data: jobs });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch company jobs',
        error: err?.message ?? String(err),
      });
    }
  }
}

export const jobController = new JobController();
