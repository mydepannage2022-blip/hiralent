import { PrismaClient, JobStatus, Prisma, MatchingEventType,  MatchingEntityType} from '@prisma/client';
import {
  Job,
  CreateJobRequest,
  JobListFilters,
  JobListResponse,
} from '../../types/job.types';

import { MatchingOutboxService } from "../matching/outbox.service"; 


const prisma = new PrismaClient();
const outbox = new MatchingOutboxService(prisma);

const makeJobDedupeKey = (jobId: string) => `JOB_UPDATED:${jobId}`;


/**
 * Crée un job appartenant à une company (user avec rôle company/company_admin)
 */
export async function createJob(companyId: string, data: CreateJobRequest): Promise<Job> {
  const companyUser = await prisma.user.findUnique({ where: { user_id: companyId } });

  if (!companyUser) throw new Error(`Company user with ID ${companyId} not found`);
  if (!["company", "company_admin"].includes(companyUser.role)) {
    throw new Error(`User ${companyId} is not a company user`);
  }

  const job = await prisma.$transaction(async (tx) => {
    const created = await tx.companyJob.create({
      data: {
        company_id: companyId,
        title: data.title,
        location: data.location,
        description: data.description,
        salary_range: data.salary_range ?? null,
        required_skills: data.required_skills ?? [],
        status: data.status ?? JobStatus.DRAFT, 

        job_type: data.job_type,
        experience_level: data.experience_level,
        education_level: data.education_level,
        remote_option: data.remote_option,
        urgency_level: data.urgency_level,
        department: data.department,
        reporting_to: data.reporting_to ?? null,
        team_size: data.team_size ?? null,

        application_deadline: data.application_deadline ? new Date(data.application_deadline) : null,
        max_applications: data.max_applications ?? null,
        auto_reject_after: data.auto_reject_after ?? null,
        screening_questions: data.screening_questions ?? [],

        visa_sponsored: data.visa_sponsored ?? null,
        relocation_assistance: data.relocation_assistance ?? null,
      },
    });

    // ✅ Trigger matching ONLY if the job is created ACTIVE
    if (created.status === JobStatus.ACTIVE) {
      await outbox.enqueue(tx, {
        eventType: MatchingEventType.JOB_UPDATED,
        entityType: MatchingEntityType.JOB,
        entityId: created.job_id,
        payload: { trigger: "createJob" },
        dedupeKey: makeJobDedupeKey(created.job_id),
      });
    }

    return created;
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

  // remove undefined fields
  Object.keys(updateData).forEach((key) => {
    const k = key as keyof Prisma.CompanyJobUpdateInput;
    if (updateData[k] === undefined) delete updateData[k];
  });

  const job = await prisma.$transaction(async (tx) => {
    // 1) BEFORE: lire les champs qui influencent la reco
    const before = await tx.companyJob.findUnique({
      where: { job_id: jobId },
      select: {
        job_id: true,
        status: true,

        title: true,
        description: true,
        location: true,
        required_skills: true,

        job_type: true,
        experience_level: true,
        education_level: true,
        remote_option: true,
        urgency_level: true,

        department: true,
        visa_sponsored: true,
        relocation_assistance: true,
        salary_range: true,

        screening_questions: true,

        min_profile_score: true,
        required_fields: true,

        application_deadline: true,
        max_applications: true,
      },
    });

    if (!before) {
      throw new Error(`Job ${jobId} not found`);
    }

    // 2) UPDATE (mêmes champs + après update)
    const updated = await tx.companyJob.update({
      where: { job_id: jobId },
      data: updateData,
      select: {
        job_id: true,
        status: true,

        title: true,
        description: true,
        location: true,
        required_skills: true,

        job_type: true,
        experience_level: true,
        education_level: true,
        remote_option: true,
        urgency_level: true,

        department: true,
        visa_sponsored: true,
        relocation_assistance: true,
        salary_range: true,

        screening_questions: true,

        min_profile_score: true,
        required_fields: true,

        application_deadline: true,
        max_applications: true,
      },
    });

    // 3) Detecter si au moins un champ "reco" a changé
    const changed =
      JSON.stringify(before) !== JSON.stringify(updated);

    // 4) Trigger SEULEMENT si:
    //    - il y a un changement
    //    - ET le job est ACTIVE après update
    if (changed && updated.status === JobStatus.ACTIVE) {
      await outbox.enqueue(tx, {
        eventType: MatchingEventType.JOB_UPDATED,
        entityType: MatchingEntityType.JOB,
        entityId: updated.job_id,
        payload: { trigger: "updateJob" },
        dedupeKey: makeJobDedupeKey(updated.job_id),
      });
    }

    return updated;
  });

  return job as unknown as Job;
}

/**
 * Supprime un job
 */
export async function deleteJob(jobId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1) Hard delete the job
    const deleted = await tx.companyJob.delete({
      where: { job_id: jobId },
      select: { job_id: true },
    });

    // 2) Enqueue outbox event so matching service can delete from Qdrant
    await outbox.enqueue(tx, {
      eventType: MatchingEventType.JOB_UPDATED,       // since JOB_DELETED doesn't exist in your enum
      entityType: MatchingEntityType.JOB,
      entityId: deleted.job_id,
      payload: { deleted: true, trigger: "deleteJob" },
      dedupeKey: `JOB_DELETED:${deleted.job_id}`,     // stable key (good dedupe)
    });
  });
}


/**
 * Met à jour uniquement le status d’un job
 */
export async function patchJobStatus(
  jobId: string,
  status: JobStatus
): Promise<Job> {
  const job = await prisma.$transaction(async (tx) => {
    // 1) Lire le statut AVANT
    const before = await tx.companyJob.findUnique({
      where: { job_id: jobId },
      select: { job_id: true, status: true },
    });

    if (!before) {
      throw new Error(`Job ${jobId} not found`);
    }

    // 2) Mettre à jour le statut
    const updated = await tx.companyJob.update({
      where: { job_id: jobId },
      data: { status },
      select: { job_id: true, status: true },
    });

    // 3) Trigger UNIQUEMENT si NON ACTIVE → ACTIVE
    const becameActive =
      before.status !== JobStatus.ACTIVE &&
      updated.status === JobStatus.ACTIVE;

    if (becameActive) {
      await outbox.enqueue(tx, {
        eventType: MatchingEventType.JOB_UPDATED,
        entityType: MatchingEntityType.JOB,
        entityId: updated.job_id,
        payload: { trigger: "patchJobStatus", status: updated.status },
        dedupeKey: makeJobDedupeKey(updated.job_id),
      });
    }

    return updated;
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
