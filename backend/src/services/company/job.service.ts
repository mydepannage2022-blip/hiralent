import { PrismaClient, JobStatus, Prisma } from '@prisma/client';
import {
  Job,
  CreateJobRequest,
  JobListFilters,
  JobListResponse,
} from '../../types/job.types';

const prisma = new PrismaClient();

export class JobService {
  async createJob(companyId: string, data: CreateJobRequest): Promise<Job> {
    // Verify the company user exists
    const companyUser = await prisma.user.findUnique({
      where: { user_id: companyId },
    });

    if (!companyUser) {
      throw new Error(`Company user with ID ${companyId} not found`);
    }

    // Verify the user has company role
    if (!['company', 'company_admin'].includes(companyUser.role)) {
      throw new Error(`User ${companyId} is not a company user`);
    }

    // Create job strictly owned by the company (no agency)
    return prisma.companyJob.create({
      data: {
        company_id: companyId,
        title: data.title,
        location: data.location,
        description: data.description,
        salary_range: data.salary_range ?? null,
        required_skills: data.required_skills ?? [],
        status: JobStatus.DRAFT,

        // Enhanced fields
        job_type: data.job_type,
        experience_level: data.experience_level,
        education_level: data.education_level,
        remote_option: data.remote_option,
        urgency_level: data.urgency_level,
        department: data.department,
        reporting_to: data.reporting_to ?? null,
        team_size: data.team_size ?? null,

        // Application settings
        application_deadline: data.application_deadline
          ? new Date(data.application_deadline)
          : null,
        max_applications: data.max_applications ?? null,
        auto_reject_after: data.auto_reject_after ?? null,
        screening_questions: data.screening_questions ?? [],

        visa_sponsored: data.visa_sponsored ?? null,
        relocation_assistance: data.relocation_assistance ?? null,
      },
    }) as unknown as Job;
  }

  async getById(jobId: string): Promise<Job | null> {
    return prisma.companyJob.findUnique({
      where: { job_id: jobId },
    }) as unknown as Job | null;
  }

  async update(
    jobId: string,
    data: Partial<CreateJobRequest & { status?: JobStatus }>
  ): Promise<Job> {
    const updateData: Prisma.CompanyJobUpdateInput = {
      ...data,
      application_deadline:
        data.application_deadline === null
          ? null
          : data.application_deadline
          ? new Date(data.application_deadline as any)
          : undefined,
    };

    // Remove undefined values so Prisma doesn't complain
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof Prisma.CompanyJobUpdateInput] === undefined) {
        delete updateData[key as keyof Prisma.CompanyJobUpdateInput];
      }
    });

    return prisma.companyJob.update({
      where: { job_id: jobId },
      data: updateData,
    }) as unknown as Job;
  }

  async delete(jobId: string): Promise<void> {
    await prisma.companyJob.delete({ where: { job_id: jobId } });
  }

  async patchStatus(jobId: string, status: JobStatus): Promise<Job> {
    return prisma.companyJob.update({
      where: { job_id: jobId },
      data: { status },
    }) as unknown as Job;
  }

  /** List jobs for a specific company (company dashboard) */
  async getCompanyJobs(companyId: string): Promise<Job[]> {
    return prisma.companyJob.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    }) as unknown as Job[];
  }

  /** Public/company-specific listing by companyId */
  async getCompanyJobsById(
    companyId: string,
    onlyActive = false
  ): Promise<Job[]> {
    return prisma.companyJob.findMany({
      where: {
        company_id: companyId,
        ...(onlyActive ? { status: JobStatus.ACTIVE } : {}),
      },
      orderBy: { created_at: 'desc' },
    }) as unknown as Job[];
  }

  /** Generic filtered listing (no agencies) */
  async listJobs(filters: JobListFilters): Promise<JobListResponse> {
    const {
      company_id,
      status,
      department,
      job_type,
      experience_level,
      remote_option,
      urgency_level,
      created_from,
      created_to,
      search_term,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = filters;

    const where: Prisma.CompanyJobWhereInput = {
      ...(company_id ? { company_id } : {}),
      ...(department ? { department } : {}),
      ...(job_type ? { job_type } : {}),
      ...(experience_level ? { experience_level } : {}),
      ...(remote_option ? { remote_option } : {}),
      ...(urgency_level ? { urgency_level } : {}),
      ...(status && status !== 'ALL'
        ? Array.isArray(status)
          ? { status: { in: status } }
          : { status }
        : {}),
      ...(search_term
        ? {
            OR: [
              { title: { contains: search_term, mode: 'insensitive' } },
              { description: { contains: search_term, mode: 'insensitive' } },
              { location: { contains: search_term, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(created_from || created_to
        ? {
            created_at: {
              ...(created_from ? { gte: new Date(created_from) } : {}),
              ...(created_to ? { lte: new Date(created_to) } : {}),
            },
          }
        : {}),
    };

    const [total_count, rows] = await Promise.all([
      prisma.companyJob.count({ where }),
      prisma.companyJob.findMany({
        where,
        orderBy: { [sort_by]: sort_order },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const total_pages = Math.max(1, Math.ceil(total_count / limit));

    return {
      jobs: rows as unknown as Job[],
      total_count,
      page,
      total_pages,
      has_next: page < total_pages,
      has_previous: page > 1,
    };
  }
}

export const jobService = new JobService();
