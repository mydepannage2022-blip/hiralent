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

// ─────────────────────────────────────────────────────────────────────────────
//  Simple Test constants
// ─────────────────────────────────────────────────────────────────────────────
const SIMPLE_TEST_TITLE = "Quick Platform Check";
const SIMPLE_TEST_DESC =
  "A short test to confirm you can use the platform (1 coding + 1 MCQ, easy).";

const API_BASE_URL = process.env.APP_URL || "http://localhost:5000";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "";

// ─────────────────────────────────────────────────────────────────────────────
//  Step 1 — DB lookup: easy + skill-matched ONLY
//  Returns null immediately if no matching question exists (no random fallback)
// ─────────────────────────────────────────────────────────────────────────────
async function findSkillMatchedQuestion(
  tx: Prisma.TransactionClient,
  type: "coding" | "mcq",
  requiredSkills: string[]
): Promise<string | null> {
  // No skills on the job → skip DB entirely, go straight to AI
  if (requiredSkills.length === 0) return null;

  const total = await tx.question.count({
    where: {
      status: "approved",
      difficulty: "easy",
      type,
      skillTags: { hasSome: requiredSkills },
    },
  });

  if (total === 0) return null;

  // Random pick within the SKILL-MATCHED pool only
  const randomSkip = Math.floor(Math.random() * total);
  const row = await tx.question.findFirst({
    where: {
      status: "approved",
      difficulty: "easy",
      type,
      skillTags: { hasSome: requiredSkills },
    },
    orderBy: { id: "asc" },
    skip: randomSkip,
    select: { id: true },
  });

  return row?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Step 3 — AI generation: generates a question on-the-fly matching the job
//  Topic is built from jobTitle + requiredSkills so the question is relevant
// ─────────────────────────────────────────────────────────────────────────────
async function generateQuestionViaAI(
  type: "coding" | "mcq",
  requiredSkills: string[],
  jobTitle: string
): Promise<string | null> {
  try {
    // Build a clean, focused topic — e.g. "Junior Frontend Developer — React, TypeScript"
    const skillsLabel =
      requiredSkills.length > 0
        ? requiredSkills.slice(0, 3).join(", ") // max 3 skills to keep prompt focused
        : jobTitle;

    const topic = `Junior ${jobTitle} — ${skillsLabel}`;

    console.log(
      `[SimpleTest] No skill-matched ${type} in DB → AI generating — topic: "${topic}"`
    );

    const response = await fetch(
      `${API_BASE_URL}/api/questions/generate-batch`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-key": INTERNAL_SERVICE_KEY,
        },
        body: JSON.stringify({
          topics: [topic],
          difficulty: "easy",
          countPerTopic: 1,
          questionType: type, // tells the generator which type to produce
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.warn(
        `[SimpleTest] AI generate-batch HTTP ${response.status}: ${err}`
      );
      return null;
    }

    const data = (await response.json()) as {
      success: boolean;
      questions?: Array<{ id: string }>;
      error?: string;
    };

    if (!data.success || !data.questions?.length) {
      console.warn(
        `[SimpleTest] AI returned no questions: ${data.error ?? "unknown"}`
      );
      return null;
    }

    const questionId = data.questions[0].id;

    // Auto-approve so it's immediately usable
    await prisma.question.update({
      where: { id: questionId },
      data: { status: "approved" },
    });

    console.log(
      `[SimpleTest] AI generated ${type} question ${questionId} for topic "${topic}"`
    );

    return questionId;
  } catch (err: any) {
    console.error(
      `[SimpleTest] AI generation failed for ${type}:`,
      err?.message ?? err
    );
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  resolveQuestion — Step 1 then Step 3, nothing in between
//
//  Step 1: DB — easy + skill-matched → return immediately if found
//  Step 3: AI — generate matching the job's skills → return if succeeded
//  null  : if both fail (very rare edge case)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
//  resolveQuestionIds — runs OUTSIDE the transaction (AI calls can take 30s+)
//  Returns { codingId, mcqId } before the transaction opens.
// ─────────────────────────────────────────────────────────────────────────────
async function resolveQuestionIds(
  requiredSkills: string[],
  jobTitle: string
): Promise<{ codingId: string | null; mcqId: string | null }> {
  // Step 1 — DB lookup using plain prisma (no tx needed for reads)
  const [dbCoding, dbMcq] = await Promise.all([
    findSkillMatchedQuestion(prisma as unknown as Prisma.TransactionClient, "coding", requiredSkills),
    findSkillMatchedQuestion(prisma as unknown as Prisma.TransactionClient, "mcq", requiredSkills),
  ]);

  // Step 3 — AI fallback only for missing types
  const [codingId, mcqId] = await Promise.all([
    dbCoding
      ? (console.log(`[SimpleTest] DB found skill-matched coding: ${dbCoding}`), Promise.resolve(dbCoding))
      : (console.log(`[SimpleTest] DB has no skill-matched easy coding for skills [${requiredSkills.join(", ")}] → calling AI`),
         generateQuestionViaAI("coding", requiredSkills, jobTitle)),
    dbMcq
      ? (console.log(`[SimpleTest] DB found skill-matched mcq: ${dbMcq}`), Promise.resolve(dbMcq))
      : (console.log(`[SimpleTest] DB has no skill-matched easy mcq for skills [${requiredSkills.join(", ")}] → calling AI`),
         generateQuestionViaAI("mcq", requiredSkills, jobTitle)),
  ]);

  return { codingId, mcqId };
}

// ─────────────────────────────────────────────────────────────────────────────
//  ensureJobSimpleTest — fast DB-only writes, receives pre-resolved question IDs
// ─────────────────────────────────────────────────────────────────────────────
async function ensureJobSimpleTest(
  tx: Prisma.TransactionClient,
  args: {
    jobId: string;
    companyId: string;
    jobTitle: string;
    codingId: string | null;
    mcqId: string | null;
  }
) {
  // Already exists — keep it
  const existing = await tx.jobSimpleTest.findUnique({
    where: { job_id: args.jobId },
    select: { test_id: true },
  });
  if (existing) return existing.test_id;

  // coding is required — mcq is optional
  if (!args.codingId) {
    throw new Error(
      `SIMPLE_TEST_NO_CODING_QUESTION — DB empty + AI failed for job: "${args.jobTitle}"`
    );
  }

  // Create the test
  const createdTest = await tx.jobSimpleTest.create({
    data: {
      job_id: args.jobId,
      company_id: args.companyId,
      title: SIMPLE_TEST_TITLE,
      description: SIMPLE_TEST_DESC,
      time_limit_min: 10,
      is_system: true,
      version: 1,
    },
    select: { test_id: true },
  });

  // Attach questions
  const links: Prisma.JobSimpleTestQuestionCreateManyInput[] = [
    { test_id: createdTest.test_id, question_id: args.codingId, kind: "CODING", order: 1 },
  ];
  if (args.mcqId) {
    links.push({ test_id: createdTest.test_id, question_id: args.mcqId, kind: "MCQ", order: 2 });
  }

  await tx.jobSimpleTestQuestion.createMany({ data: links });

  console.log(
    `[SimpleTest] Created test ${createdTest.test_id} for job "${args.jobTitle}" — coding: ${args.codingId} | mcq: ${args.mcqId ?? "none (AI failed)"}`
  );

  return createdTest.test_id;
}

// ─────────────────────────────────────────────────────────────────────────────
//  createJob
// ─────────────────────────────────────────────────────────────────────────────
export async function createJob(
  companyId: string,
  data: CreateJobRequest
): Promise<Job> {
  const companyUser = await prisma.user.findUnique({
    where: { user_id: companyId },
  });

  if (!companyUser)
    throw new Error(`Company user with ID ${companyId} not found`);
  if (!["company", "company_admin"].includes(companyUser.role)) {
    throw new Error(`User ${companyId} is not a company user`);
  }

  // Create the job immediately — no AI blocking
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

  // Fire-and-forget: resolve questions via DB/AI then attach the SimpleTest
  // Runs entirely in the background — does not block the API response
  resolveQuestionIds(data.required_skills ?? [], job.title)
    .then(({ codingId, mcqId }) =>
      ensureJobSimpleTest(prisma as unknown as Prisma.TransactionClient, {
        jobId: job.job_id,
        companyId,
        jobTitle: job.title,
        codingId,
        mcqId,
      })
    )
    .catch((err) =>
      console.error(`[SimpleTest] Background creation failed for job ${job.job_id}:`, err?.message ?? err)
    );

  return job as unknown as Job;
}

// ─────────────────────────────────────────────────────────────────────────────
//  getJobById
// ─────────────────────────────────────────────────────────────────────────────
export async function getJobById(jobId: string): Promise<Job | null> {
  const job = await prisma.companyJob.findUnique({ where: { job_id: jobId } });
  return job as unknown as Job | null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  updateJob
// ─────────────────────────────────────────────────────────────────────────────
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

  Object.keys(updateData).forEach((key) => {
    const k = key as keyof Prisma.CompanyJobUpdateInput;
    if (updateData[k] === undefined) delete updateData[k];
  });

  const job = await prisma.$transaction(async (tx) => {
    const before = await tx.companyJob.findUnique({
      where: { job_id: jobId },
      select: {
        job_id: true, status: true, title: true, description: true,
        location: true, required_skills: true, job_type: true,
        experience_level: true, education_level: true, remote_option: true,
        urgency_level: true, department: true, visa_sponsored: true,
        relocation_assistance: true, salary_range: true,
        screening_questions: true, min_profile_score: true,
        required_fields: true, application_deadline: true,
        max_applications: true,
      },
    });

    if (!before) throw new Error(`Job ${jobId} not found`);

    const updated = await tx.companyJob.update({
      where: { job_id: jobId },
      data: updateData,
      select: {
        job_id: true, status: true, title: true, description: true,
        location: true, required_skills: true, job_type: true,
        experience_level: true, education_level: true, remote_option: true,
        urgency_level: true, department: true, visa_sponsored: true,
        relocation_assistance: true, salary_range: true,
        screening_questions: true, min_profile_score: true,
        required_fields: true, application_deadline: true,
        max_applications: true,
      },
    });

    const changed = JSON.stringify(before) !== JSON.stringify(updated);

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

// ─────────────────────────────────────────────────────────────────────────────
//  deleteJob
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteJob(jobId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const job = await tx.companyJob.findUnique({
      where: { job_id: jobId },
      select: { job_id: true, status: true },
    });

    if (!job) throw new Error(`Job ${jobId} not found`);

    if (job.status === JobStatus.ACTIVE) {
      await outbox.enqueue(tx, {
        eventType: MatchingEventType.JOB_UPDATED,
        entityType: MatchingEntityType.JOB,
        entityId: job.job_id,
        payload: { deleted: true, trigger: "deleteJob" },
        dedupeKey: `JOB_DELETED:${job.job_id}`,
      });
    }

    await tx.interviewSchedule.deleteMany({ where: { job_id: jobId } });

    const applicationIds = await tx.jobApplication.findMany({
      where: { job_id: jobId },
      select: { application_id: true },
    });

    if (applicationIds.length > 0) {
      const appIds = applicationIds.map((a) => a.application_id);
      await tx.aIInterviewResult.deleteMany({ where: { application_id: { in: appIds } } });
      await tx.jobApplicationScoreHistory.deleteMany({ where: { application_id: { in: appIds } } });
      await tx.jobApplicationEventOutbox.deleteMany({ where: { application_id: { in: appIds } } });
    }

    await tx.skillAssessment.deleteMany({ where: { job_id: jobId } });
    await tx.employerAssessment.deleteMany({ where: { job_id: jobId } });
    await tx.candidateProgressTracker.deleteMany({ where: { job_id: jobId } });
    await tx.relocationCase.deleteMany({ where: { job_id: jobId } });
    await tx.jobApplication.deleteMany({ where: { job_id: jobId } });
    await tx.jobRecommendation.deleteMany({ where: { job_id: jobId } });
    await tx.jobVector.deleteMany({ where: { job_id: jobId } });
    await tx.companyJob.delete({ where: { job_id: jobId } });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  patchJobStatus
// ─────────────────────────────────────────────────────────────────────────────
export async function patchJobStatus(
  jobId: string,
  status: JobStatus
): Promise<Job> {
  const job = await prisma.$transaction(async (tx) => {
    const before = await tx.companyJob.findUnique({
      where: { job_id: jobId },
      select: { job_id: true, status: true },
    });

    if (!before) throw new Error(`Job ${jobId} not found`);

    const updated = await tx.companyJob.update({
      where: { job_id: jobId },
      data: { status },
      select: { job_id: true, status: true },
    });

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

// ─────────────────────────────────────────────────────────────────────────────
//  getCompanyJobs
// ─────────────────────────────────────────────────────────────────────────────
export async function getCompanyJobs(companyId: string): Promise<Job[]> {
  const rows = await prisma.companyJob.findMany({
    where: { company_id: companyId },
    orderBy: { created_at: "desc" },
    include: { _count: { select: { applications: true } } },
  });

  return rows.map((j) => ({
    ...j,
    applications_count: j._count.applications,
  })) as unknown as Job[];
}

// ─────────────────────────────────────────────────────────────────────────────
//  getCompanyJobsById
// ─────────────────────────────────────────────────────────────────────────────
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
    include: { _count: { select: { applications: true } } },
  });

  return rows.map((j) => ({
    ...j,
    applications_count: j._count.applications,
  })) as unknown as Job[];
}

// ─────────────────────────────────────────────────────────────────────────────
//  listJobs
// ─────────────────────────────────────────────────────────────────────────────
export async function listJobs(
  filters: JobListFilters
): Promise<JobListResponse> {
  const {
    company_id, status, department, job_type, experience_level,
    remote_option, urgency_level, created_from, created_to,
    search_term, page = 1, limit = 20,
    sort_by = "created_at", sort_order = "desc",
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

// ─────────────────────────────────────────────────────────────────────────────
//  getJobApplicantsForJob
// ─────────────────────────────────────────────────────────────────────────────
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
            select: { headline: true, location: true },
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