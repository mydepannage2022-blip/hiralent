/** 
 * Purpose: list templates, preview one template (with questions), create EmployerAssessment from template + copy questions.

Functions inside:

listTemplates(filters)
getTemplateById(template_id) (include template questions)
createAssessmentFromTemplate(company_id, job_id, template_id)
creates EmployerAssessment row (new UUID)
copies template questions into AssessmentQuestion
sets template_id in EmployerAssessment
returns created assessment (with questions)
 * **/

import { PrismaClient, AssessmentTemplateStatus } from "@prisma/client";
import { randomUUID } from "crypto";

import type {
  AssessmentTemplateListFilters,
  AssessmentTemplateDetailsDTO,
  AssessmentTemplateListItemDTO,
  PaginatedTemplatesDTO,
  CreateEmployerAssessmentFromTemplateResponse,
} from "../../types/assessmentTemplate.types";

const prisma = new PrismaClient();

/**
 * Simple pagination helper
 */
function normalizePagination(filters?: AssessmentTemplateListFilters) {
  const limit = Math.min(Math.max(filters?.limit ?? 20, 1), 100);
  const page = Math.max(filters?.page ?? 1, 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

/**
 * Map Prisma template row -> list item DTO
 */
function mapTemplateListItem(row: any): AssessmentTemplateListItemDTO {
  return {
    template_id: row.template_id,
    title: row.title,
    description: row.description,

    assessment_type: row.assessment_type,
    skill_category: row.skill_category,
    difficulty: row.difficulty,

    time_limit: row.time_limit,
    total_questions: row.total_questions,
    passing_score: row.passing_score,

    extracted_skills: row.extracted_skills ?? [],
    tags: row.tags ?? [],
    provider: row.provider,
    status: row.status,

    created_at: row.created_at,
    updated_at: row.updated_at,

    questions_count: row._count?.questions ?? 0,
  };
}

function mapTemplateDetails(row: any): AssessmentTemplateDetailsDTO {
  return {
    ...mapTemplateListItem(row),
    settings: row.settings ?? undefined,
    enhanced_data: row.enhanced_data ?? undefined,
    created_by: row.created_by ?? null,
    questions: (row.questions ?? []).map((tq: any) => ({
      order: tq.order ?? undefined,
      points: tq.points,
      section: tq.section ?? null,
      isReserve: tq.isReserve,
      question: {
        id: tq.question.id,
        title: tq.question.title,
        description: tq.question.description,
        problemStatement: tq.question.problemStatement,
        difficulty: tq.question.difficulty,
        type: tq.question.type,
        skillTags: tq.question.skillTags ?? [],
      },
    })),
  };
}

/**
 * Ensure company exists (user row)
 */
async function assertCompanyExists(company_id: string) {
  const user = await prisma.user.findUnique({ where: { user_id: company_id } });
  if (!user) throw new Error("Company user not found");
  return user;
}

/**
 * Ensure company owns the job
 */
async function assertCompanyOwnsJob(company_id: string, job_id: string) {
  const job = await prisma.companyJob.findUnique({ where: { job_id } });
  if (!job) throw new Error("Job not found");
  if (job.company_id !== company_id) throw new Error("Forbidden: job does not belong to this company");
  return job;
}

/**
 * listTemplates(filters)
 * - supports search + filters
 * - returns paginated list
 */
export async function listTemplates(
  filters?: AssessmentTemplateListFilters,
): Promise<PaginatedTemplatesDTO> {
  const { limit, page, skip } = normalizePagination(filters);

  const q = filters?.q?.trim();
  const status = filters?.status ?? AssessmentTemplateStatus.PUBLISHED;

  const where: any = {
    status,
    ...(filters?.provider ? { provider: filters.provider } : {}),
    ...(filters?.assessment_type ? { assessment_type: filters.assessment_type } : {}),
    ...(filters?.difficulty ? { difficulty: filters.difficulty } : {}),
    ...(filters?.skill_category ? { skill_category: filters.skill_category } : {}),
    ...(filters?.tag
      ? {
          tags: {
            has: filters.tag,
          },
        }
      : {}),
    ...(filters?.skill
      ? {
          extracted_skills: {
            has: filters.skill,
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            // optional: search tags too
            { tags: { has: q } },
          ],
        }
      : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.assessmentTemplate.count({ where }),
    prisma.assessmentTemplate.findMany({
      where,
      orderBy: { updated_at: "desc" },
      skip,
      take: limit,
      include: {
        _count: { select: { questions: true } },
      },
    }),
  ]);

  return {
    items: rows.map(mapTemplateListItem),
    page,
    limit,
    total,
  };
}

/**
 * getTemplateById(template_id)
 * - includes template questions + underlying Question row
 */
export async function getTemplateById(
  template_id: string,
): Promise<AssessmentTemplateDetailsDTO> {
  const row = await prisma.assessmentTemplate.findUnique({
    where: { template_id },
    include: {
      _count: { select: { questions: true } },
      questions: {
        orderBy: { order: "asc" },
        include: { question: true },
      },
    },
  });

  if (!row) throw new Error("Template not found");

  return mapTemplateDetails(row);
}

/**
 * createAssessmentFromTemplate(company_id, job_id, template_id)
 * - creates EmployerAssessment row (new UUID)
 * - copies template questions into AssessmentQuestion
 * - sets EmployerAssessment.template_id
 * - returns created assessment (with questions)
 */
export async function createAssessmentFromTemplate(args: {
  company_id: string;
  job_id: string;
  template_id: string;
  title?: string;
  description?: string;
}): Promise<CreateEmployerAssessmentFromTemplateResponse> {
  const { company_id, job_id, template_id } = args;

  await assertCompanyExists(company_id);
  await assertCompanyOwnsJob(company_id, job_id);

  const template = await prisma.assessmentTemplate.findUnique({
    where: { template_id },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!template) throw new Error("Template not found");

  if (template.status !== "PUBLISHED") {
    // you can relax this if you want admins to use DRAFT
    throw new Error("Template is not published");
  }

  const assessment_id = randomUUID();

  // Build the assessmentQuestions rows from template questions
  const templateQuestions = template.questions ?? [];

  // Safety: if template has 0 questions, still allow creation, but it’s probably useless
  const questionIds = templateQuestions.map((tq) => tq.question_id);

  const created = await prisma.$transaction(async (tx) => {
    // 1) Create EmployerAssessment instance
    const a = await tx.employerAssessment.create({
      data: {
        assessment_id,
        company_id,
        job_id,

        template_id: template.template_id,

        title: args.title ?? template.title,
        description: args.description ?? template.description,

        status: "DRAFT",

        assessment_type: template.assessment_type,
        skill_category: template.skill_category,
        difficulty: template.difficulty,

        time_limit: template.time_limit ?? 60,
        total_questions: template.total_questions ?? templateQuestions.length ?? 20,
        passing_score: template.passing_score ?? 70,

        // keep also question_ids array updated (your schema has it)
        question_ids: questionIds,

        settings: template.settings ?? {},
        extracted_skills: template.extracted_skills ?? [],
        enhanced_data: (template.enhanced_data as any) ?? undefined,

        auto_generated: false,
        creation_method: "TEMPLATE", // it’s not AI-generated; it’s template-based instance
      },
      include: {
        job: true,
        _count: { select: { candidateAssessments: true } },
      },
    });

    // 2) Copy question join rows into AssessmentQuestion
    if (templateQuestions.length) {
      await tx.assessmentQuestion.createMany({
        data: templateQuestions.map((tq) => ({
          id: randomUUID(),
          assessment_id,
          question_id: tq.question_id,
          order: tq.order ?? null,
          points: tq.points ?? 1,
          section: tq.section ?? null,
          isReserve: tq.isReserve ?? false,
          override: null, // critical: customization lives here
        })),
      });
    }

    // 3) Reload with questions joined for UI (same style as your getById includes)
    const full = await tx.employerAssessment.findUnique({
      where: { assessment_id },
      include: {
        job: true,
        _count: { select: { candidateAssessments: true } },
        questions: {
          orderBy: { order: "asc" },
          include: { question: true },
        },
      },
    });

    if (!full) throw new Error("Failed to load created assessment");
    return full;
  });

  return {
    assessment_id,
    template_id,
    job_id,
    company_id,
    assessment: created,
  };
}
