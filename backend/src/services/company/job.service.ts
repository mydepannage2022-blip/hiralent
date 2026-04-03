import {
  PrismaClient,
  JobStatus,
  Prisma,
  MatchingEventType,
  MatchingEntityType,
} from "@prisma/client";
import {
  Job,
  CreateJobRequest,
  JobListFilters,
  JobListResponse,
} from "../../types/job.types";

import { MatchingOutboxService } from "../matching/outbox.service";

const prisma = new PrismaClient();
const outbox = new MatchingOutboxService(prisma);

const makeJobDedupeKey = (jobId: string) => `JOB_UPDATED:${jobId}`;

// --- Simple Test constants
const SIMPLE_TEST_TITLE = "Quick Platform Check";
const SIMPLE_TEST_DESC =
  "A short test to confirm you can use the platform (1 coding + 1 MCQ, easy).";

/**
 * Build a Prisma WHERE clause to find easy questions for the sample test.
 *
 * Priority 1 (skill-matched):
 *   difficulty=easy AND skillTags overlaps job.required_skills AND status=approved
 *
 * Priority 2 (fallback — called with requiredSkills=[]):
 *   difficulty=easy AND status=approved  (any easy question from the full bank)
 *
 * NO assessments:none / templateAssessments:none filter —
 *    those filters were shrinking the pool to near-zero,
 *    causing the same question to repeat every time.
 *    Sample tests are practice-only, so reusing questions is fine.
 */
function simpleTestQuestionBaseWhere(requiredSkills: string[]) {
  return {
    difficulty: "easy",
    status: "approved",
    ...(requiredSkills.length > 0
      ? { skillTags: { hasSome: requiredSkills } }
      : {}),
  };
}

/**
 * Pick ONE random approved question of a given type from the full matching pool.
 *
 * Strategy:
 *   1. COUNT how many questions match the WHERE
 *   2. Pick a random offset (0 → count-1)
 *   3. Fetch exactly that one row using skip + findFirst
 *
 * This guarantees true randomness across the ENTIRE question bank,
 * not just the first 30 rows returned by insertion order.
 *
 * Note: status:"approved" is already included in simpleTestQuestionBaseWhere,
 * but we keep it here too as a safety net.
 */
async function pickOneQuestion(
  tx: Prisma.TransactionClient,
  where: ReturnType<typeof simpleTestQuestionBaseWhere>,
  type: "coding" | "mcq"
): Promise<string | null> {
  const fullWhere = { ...where, type, status: "approved" };

  // Step 1 — count the full pool
  const total = await tx.question.count({ where: fullWhere });

  if (total === 0) return null;

  // Step 2 — random offset across the FULL pool
  const randomSkip = Math.floor(Math.random() * total);

  // Step 3 — fetch exactly that one record
  const row = await tx.question.findFirst({
    where: fullWhere,
    orderBy: { id: "asc" }, // stable order so skip is deterministic
    skip: randomSkip,
    select: { id: true },
  });

  return row?.id ?? null;
}

async function ensureJobSimpleTest(
  tx: Prisma.TransactionClient,
  args: { jobId: string; companyId: string; requiredSkills: string[] }
) {
  // already exists?
  const existing = await tx.jobSimpleTest.findUnique({
    where: { job_id: args.jobId },
    select: { test_id: true, is_system: true, version: true },
  });

  // If exists => keep
  if (existing) return existing.test_id;

  // 1) prefer skill-tagged easy questions
  const baseWhere = simpleTestQuestionBaseWhere(args.requiredSkills);

  let codingId = await pickOneQuestion(tx, baseWhere, "coding");
  let mcqId = await pickOneQuestion(tx, baseWhere, "mcq");

  // 2) fallback: random EASY (no skillTags required)
  if (!codingId) {
    codingId = await pickOneQuestion(
      tx,
      simpleTestQuestionBaseWhere([]),
      "coding"
    );
  }
  if (!mcqId) {
    mcqId = await pickOneQuestion(
      tx,
      simpleTestQuestionBaseWhere([]),
      "mcq"
    );
  }

  // If still missing coding → we cannot build the test
  if (!codingId) {
    throw new Error("SIMPLE_TEST_NO_EASY_CODING_QUESTION_FOUND");
  }

  const createdTest = await tx.jobSimpleTest.create({
    data: {
      job_id: args.jobId,
      company_id: args.companyId,
      title: SIMPLE_TEST_TITLE,
      description: SIMPLE_TEST_DESC,
      time_limit_min: 10,

      // ✅ REMOVED: passing_score (does not exist in Prisma model)
      // passing_score: 60,

      is_system: true,
      version: 1,
    },
    select: { test_id: true },
  });

  // attach questions (order: coding then mcq)
  const links: Prisma.JobSimpleTestQuestionCreateManyInput[] = [
    {
      test_id: createdTest.test_id,
      question_id: codingId,
      kind: "CODING",
      order: 1,
    },
  ];

  if (mcqId) {
    links.push({
      test_id: createdTest.test_id,
      question_id: mcqId,
      kind: "MCQ",
      order: 2,
    });
  }

  await tx.jobSimpleTestQuestion.createMany({ data: links });

  return createdTest.test_id;
}

/**
 * Crée un job appartenant à une company (user avec rôle company/company_admin)
 */
export async function createJob(
  companyId: string,
  data: CreateJobRequest
): Promise<Job> {
  const companyUser = await prisma.user.findUnique({
    where: { user_id: companyId },
  });

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

    // ✅ AUTO attach system simple test (1 coding + 1 mcq easy)
    await ensureJobSimpleTest(tx, {
      jobId: created.job_id,
      companyId,
      requiredSkills: created.required_skills ?? [],
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

    // 2) UPDATE
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
    const changed = JSON.stringify(before) !== JSON.stringify(updated);

    // 4) Trigger SEULEMENT si: changement + job ACTIVE après update
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
 * ✅ FIXED: Supprime un job avec gestion correcte de TOUTES les FK
 */
export async function deleteJob(jobId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 0) Check if job exists and get status
    const job = await tx.companyJob.findUnique({
      where: { job_id: jobId },
      select: { job_id: true, status: true },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // 1) Enqueue deletion event FIRST (before deleting the job)
    //    Only if job was ACTIVE (so Qdrant knows to delete it)
    if (job.status === JobStatus.ACTIVE) {
      await outbox.enqueue(tx, {
        eventType: MatchingEventType.JOB_UPDATED,
        entityType: MatchingEntityType.JOB,
        entityId: job.job_id,
        payload: { deleted: true, trigger: "deleteJob" },
        dedupeKey: `JOB_DELETED:${job.job_id}`,
      });
    }

    // 2) Delete ALL child records in correct order (most dependent → least dependent)
    await tx.interviewSchedule.deleteMany({ where: { job_id: jobId } });

    const applicationIds = await tx.jobApplication.findMany({
      where: { job_id: jobId },
      select: { application_id: true },
    });

    if (applicationIds.length > 0) {
      const appIds = applicationIds.map((a) => a.application_id);

      await tx.aIInterviewResult.deleteMany({
        where: { application_id: { in: appIds } },
      });

      await tx.jobApplicationScoreHistory.deleteMany({
        where: { application_id: { in: appIds } },
      });

      await tx.jobApplicationEventOutbox.deleteMany({
        where: { application_id: { in: appIds } },
      });
    }

    await tx.skillAssessment.deleteMany({ where: { job_id: jobId } });
    await tx.employerAssessment.deleteMany({ where: { job_id: jobId } });
    await tx.candidateProgressTracker.deleteMany({ where: { job_id: jobId } });
    await tx.relocationCase.deleteMany({ where: { job_id: jobId } });

    await tx.jobApplication.deleteMany({ where: { job_id: jobId } });
    await tx.jobRecommendation.deleteMany({ where: { job_id: jobId } });
    await tx.jobVector.deleteMany({ where: { job_id: jobId } });

    // 3) Finally, delete the job itself
    await tx.companyJob.delete({ where: { job_id: jobId } });
  });
}

/**
 * Met à jour uniquement le status d'un job
 */
export async function patchJobStatus(
  jobId: string,
  status: JobStatus
): Promise<Job> {
  const job = await prisma.$transaction(async (tx) => {
    const before = await tx.companyJob.findUnique({
      where: { job_id: jobId },
      select: { job_id: true, status: true },
    });

    if (!before) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updated = await tx.companyJob.update({
      where: { job_id: jobId },
      data: { status },
      select: { job_id: true, status: true },
    });

    const becameActive =
      before.status !== JobStatus.ACTIVE && updated.status === JobStatus.ACTIVE;

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
 * Liste les jobs d'une company (dashboard interne)
 */
export async function getCompanyJobs(companyId: string): Promise<Job[]> {
  const rows = await prisma.companyJob.findMany({
    where: { company_id: companyId },
    orderBy: { created_at: "desc" },
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
  onlyActive = false
): Promise<Job[]> {
  const rows = await prisma.companyJob.findMany({
    where: {
      company_id: companyId,
      ...(onlyActive ? { status: JobStatus.ACTIVE } : {}),
    },
    orderBy: { created_at: "desc" },
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
export async function listJobs(filters: JobListFilters): Promise<JobListResponse> {
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
    sort_by = "created_at",
    sort_order = "desc",
  } = filters;

  const where: Prisma.CompanyJobWhereInput = {
    ...(company_id ? { company_id } : {}),
    ...(department ? { department } : {}),
    ...(job_type ? { job_type } : {}),
    ...(experience_level ? { experience_level } : {}),
    ...(remote_option ? { remote_option } : {}),
    ...(urgency_level ? { urgency_level } : {}),
    ...(status && status !== "ALL"
      ? Array.isArray(status)
        ? { status: { in: status } }
        : { status }
      : {}),
    ...(search_term
      ? {
          OR: [
            { title: { contains: search_term, mode: "insensitive" } },
            { description: { contains: search_term, mode: "insensitive" } },
            { location: { contains: search_term, mode: "insensitive" } },
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
    has_previous: page > total_pages,
  };
}

/**
 * Fetch applicants for a given job
 */
export async function getJobApplicantsForJob(jobId: string) {
  const applications = await prisma.jobApplication.findMany({
    where: { job_id: jobId },
    orderBy: { applied_at: "desc" },
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

  return applications.map((a) => {
    const fullName = (a.candidate.full_name ?? "").trim();

    return {
      application_id: a.application_id,
      candidate_id: a.candidate_id,
      job_id: a.job_id,
      status: a.status,
      stage: a.status ?? "RECEIVED",
      score: a.assessment_score ?? null,
      match_score: null,
      applied_at: a.applied_at,
      created_at: a.applied_at,
      candidate_name: fullName || "Unnamed candidate",
      candidate_email: a.candidate.email ?? "",
      headline: a.candidate.candidateProfile?.headline ?? null,
      location: a.candidate.candidateProfile?.location ?? null,
    };
  });
}

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
