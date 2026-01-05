import { PrismaClient, JobStatus, Prisma } from '@prisma/client';
import {
  Job,
  CreateJobRequest,
  JobListFilters,
  JobListResponse,
} from '../../types/job.types';

const prisma = new PrismaClient();

/**
 * Crée un job appartenant à une company (user avec rôle company/company_admin)
 */
export async function createJob(
  companyId: string,
  data: CreateJobRequest,
): Promise<Job> {
  const companyUser = await prisma.user.findUnique({
    where: { user_id: companyId },
  });

  if (!companyUser) {
    throw new Error(`Company user with ID ${companyId} not found`);
  }

  if (!['company', 'company_admin'].includes(companyUser.role)) {
    throw new Error(`User ${companyId} is not a company user`);
  }

  const job = await prisma.companyJob.create({
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
  });

  return job as unknown as Job;
}

/**
 * Récupère un job par ID
 */
export async function getJobById(jobId: string): Promise<Job | null> {
  const job = await prisma.companyJob.findUnique({
    where: { job_id: jobId },
  });
  return job as unknown as Job | null;
}

/**
 * Met à jour un job existant
 */
export async function updateJob(
  jobId: string,
  data: Partial<CreateJobRequest & { status?: JobStatus }>,
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

  // Nettoyer les undefined pour éviter d'écraser des champs par erreur
  Object.keys(updateData).forEach((key) => {
    const k = key as keyof Prisma.CompanyJobUpdateInput;
    if (updateData[k] === undefined) {
      delete updateData[k];
    }
  });

  const job = await prisma.companyJob.update({
    where: { job_id: jobId },
    data: updateData,
  });

  return job as unknown as Job;
}

/**
 * Supprime un job
 */
export async function deleteJob(jobId: string): Promise<void> {
  await prisma.companyJob.delete({ where: { job_id: jobId } });
}

/**
 * Met à jour uniquement le status d’un job
 */
export async function patchJobStatus(
  jobId: string,
  status: JobStatus,
): Promise<Job> {
  const job = await prisma.companyJob.update({
    where: { job_id: jobId },
    data: { status },
  });

  return job as unknown as Job;
}

/**
 * Liste les jobs d’une company (dashboard interne)
 */
export async function getCompanyJobs(companyId: string): Promise<Job[]> {
  const rows = await prisma.companyJob.findMany({
    where: { company_id: companyId },
    orderBy: { created_at: 'desc' },
    include: {
      _count: {
        select: { applications: true },
      },
    },
  });

  const jobs = rows.map((j) => ({
    ...j,
    applications_count: j._count.applications,
  }));

  return jobs as unknown as Job[];
}


/**
 * Listing public / company-specific par companyId
 */
export async function getCompanyJobsById(
  companyId: string,
  onlyActive = false,
): Promise<Job[]> {
  const rows = await prisma.companyJob.findMany({
    where: {
      company_id: companyId,
      ...(onlyActive ? { status: JobStatus.ACTIVE } : {}),
    },
    orderBy: { created_at: 'desc' },
    include: {
      _count: {
        select: { applications: true },
      },
    },
  });

  const jobs = rows.map((j) => ({
    ...j,
    applications_count: j._count.applications,
  }));

  return jobs as unknown as Job[];
}


/**
 * Listing filtré + pagination
 */
export async function listJobs(
  filters: JobListFilters,
): Promise<JobListResponse> {
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
    location,    
    salary_min,    
    salary_max,   
    skills,     
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
    ...(location ? { 
      location: { 
        contains: location, 
        mode: 'insensitive' 
      } 
    } : {}),
    ...(salary_min || salary_max ? {
      salary_range: {
        contains: '',
      }
    } : {}),
    ...(status && status !== 'ALL'
      ? Array.isArray(status)
        ? { status: { in: status } }
        : { status }
      : {}),
    ...(search_term
      ? {
          OR: [
            {
              title: {
                contains: search_term,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: search_term,
                mode: 'insensitive',
              },
            },
            {
              location: {
                contains: search_term,
                mode: 'insensitive',
              },
            },
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

// NEW: fetch applicants for a given job
export async function getJobApplicantsForJob(jobId: string) {
  const applications = await prisma.jobApplication.findMany({
    where: { job_id: jobId },
    orderBy: { applied_at: 'desc' },
    include: {
      candidate: {
        select: {
          user_id: true,
          full_name: true,
          email: true,
          candidateProfile: {
            select: {
              headline: true,
              location: true,
            },
          },
        },
      },
    },
  });

  // Shape that fits your frontend (JobApplicantsModal)
  return applications.map((a) => {
    const fullName = (a.candidate.full_name ?? '').trim();

    return {
      application_id: a.application_id,
      candidate_id: a.candidate_id,
      job_id: a.job_id,

      // status / stage
      status: a.status,
      stage: a.status ?? 'RECEIVED',

      // scores (you can adapt later)
      score: a.assessment_score ?? null,
      match_score: null,

      applied_at: a.applied_at,
      created_at: a.applied_at,

      candidate_name:
        fullName || 'Unnamed candidate',
      candidate_email: a.candidate.email ?? '',
      headline: a.candidate.candidateProfile?.headline ?? null,
      location: a.candidate.candidateProfile?.location ?? null,
    };
  });
}

/**
 * Optionnel : pour garder la même ergonomie qu’avant (`jobService.method`)
 */
export const jobService = {
  createJob,
  getJobById,
  updateJob,
  deleteJob,
  patchJobStatus,
  getCompanyJobs,
  getCompanyJobsById,
  listJobs,
  getJobApplicantsForJob,
};

export default jobService;
