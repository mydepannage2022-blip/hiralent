import { PrismaClient, AssessmentType as PrismaAssessmentType, DifficultyLevel as PrismaDifficultyLevel, EmployerAssessmentStatus as PrismaEmployerAssessmentStatus, AssessmentCreationMethod as PrismaCreationMethod } from '@prisma/client';
import {
  AssessmentCreationMethod as TsCreationMethod,
  AssessmentCreationRequest,
  ChatbotGuidedRequest,
  CreateEmployerAssessmentRequest,
  AssessmentCreationResponse,
  EmployerAssessment,
  EnhancedAssessmentData,
  SkillExtractionResponse,
  SkillsAnalysis,
  UpdateEmployerAssessmentRequest,
  DeleteEmployerAssessmentRequest,
  UpdateAssessmentResponse,
  DeleteAssessmentResponse,
  AssessmentCreationStep,
} from '../../types/employerAssessment.types';

// -------------------- Prisma --------------------
const prisma = new PrismaClient();

// -------------------- AI Microservice Client (stubs) --------------------
// The real AI work will live in your Python microservice.
// Here we keep tiny HTTP helpers that you can flesh out later.
const AI_BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

async function aiFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${AI_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI service error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// Placeholder endpoints — implement them in Python soon incha'Allah
const AI = {
  extractSkills: (payload: { job_description: string; job_title?: string }) =>
    aiFetch<SkillExtractionResponse>('/skills/extract', payload),
  generateQuestions: (payload: {
    technical_skills: string[];
    domains: string[];
    tools_platforms: string[];
    job_title: string;
    job_description: string;
    experience_level: 'entry' | 'mid' | 'senior' | 'executive';
    assessment_type: PrismaAssessmentType;
    difficulty: PrismaDifficultyLevel;
    question_categories: string[];
    time_limit: number;
    total_questions: number;
    company_domain?: string;
    specific_requirements?: string[];
    custom_weights?: Record<string, number>;
    exclude_categories?: string[];
  }) => aiFetch<{ question_ids: string[]; generated_count: number }>('/questions/generate', payload),
};

// -------------------- Enum mapping helpers --------------------
const toPrismaCreation = (m: TsCreationMethod): PrismaCreationMethod => {
  switch (m) {
    case 'job_description_parse':
      return PrismaCreationMethod.JOB_DESCRIPTION_PARSE;
    case 'chatbot_guided':
      return PrismaCreationMethod.CHATBOT_GUIDED;
    default:
      throw new Error(`Unknown creation method: ${m as never}`);
  }
};

const toTsCreation = (m: PrismaCreationMethod): TsCreationMethod => {
  switch (m) {
    case PrismaCreationMethod.JOB_DESCRIPTION_PARSE:
      return TsCreationMethod.JOB_DESCRIPTION_PARSE;
    case PrismaCreationMethod.CHATBOT_GUIDED:
      return TsCreationMethod.CHATBOT_GUIDED;
  }
};

// -------------------- Type guards / mappers --------------------
function mapAnalysisToEnhancedData(a: SkillsAnalysis): EnhancedAssessmentData {
  return {
    technical_skills: a.technical_skills,
    domains: a.domains,
    tools_platforms: a.tools_platforms,
    experience_level: a.experience_level,
    job_complexity: a.job_complexity,
    question_recommendations: a.question_recommendations,
  };
}

// Prisma -> TypeScript model mapper (minimal)
function mapPrismaAssessment(a: any): EmployerAssessment {
  return {
    assessment_id: a.assessment_id,
    company_id: a.company_id,
    job_id: a.job_id,
    title: a.title,
    description: a.description,
    status: a.status,
    assessment_type: a.assessment_type,
    skill_category: a.skill_category,
    difficulty: a.difficulty,
    time_limit: a.time_limit,
    total_questions: a.total_questions,
    question_ids: a.question_ids,
    created_at: a.created_at,
    updated_at: a.updated_at,
    enhanced_data: a.enhanced_data ?? undefined,
    auto_generated: a.auto_generated ?? undefined,
    creation_method: toTsCreation(a.creation_method),
    job: a.job
      ? {
          title: a.job.title,
          location: a.job.location,
          status: a.job.status,
          experience_level: a.job.experience_level ?? undefined,
          job_type: a.job.job_type ?? undefined,
          department: a.job.department ?? undefined,
        }
      : undefined,
    _count: a._count ? { candidateAssessments: a._count.candidateAssessments } : undefined,
  };
}

// -------------------- Validation helpers --------------------
async function assertCompanyOwnsJob(company_id: string, job_id: string) {
  const job = await prisma.companyJob.findUnique({ where: { job_id } });
  if (!job) throw new Error('Job not found');
  if (job.company_id !== company_id) throw new Error('Forbidden: job does not belong to this company');
  return job;
}

async function assertCompanyExists(company_id: string) {
  const user = await prisma.user.findUnique({ where: { user_id: company_id } });
  if (!user) throw new Error('Company user not found');
  return user;
}

// -------------------- Service --------------------
export class EmployerAssessmentService {
  /**
   * Create an assessment directly from a prepared request (no AI calls here).
   * Ensures job & company consistency, stores extracted skills & enhanced data as provided.
   */

  // Accept the union request and dispatch to the correct flow.
// NOTE: This uses both AssessmentCreationRequest and ChatbotGuidedRequest.
static async createFromRequest(
  company_id: string,
  base: {
    job_id: string;
    title: string;
    description: string;
    assessment_type: PrismaAssessmentType;
    difficulty: PrismaDifficultyLevel;
    total_questions?: number;
    time_limit?: number;
  },
  request: AssessmentCreationRequest,
): Promise<AssessmentCreationResponse> {
  if (request.method === TsCreationMethod.JOB_DESCRIPTION_PARSE) {
    // Route to your existing JD-parse method
    return this.createFromJobDescription(company_id, {
      job_id: base.job_id,
      title: base.title,
      description: base.description,
      job_title: request.job_title,
      job_description: request.job_description,
      assessment_type: base.assessment_type,
      difficulty: base.difficulty,
      auto_generate: request.auto_generate,
      total_questions: base.total_questions,
      time_limit: base.time_limit,
    });
  }

  // Route to your existing chatbot method.
  // We only MAP the name `initial_data` -> your `initial` arg (no changes to your method).
  const guided = request as ChatbotGuidedRequest;
  return this.createWithChatbot(company_id, {
    job_id: base.job_id,
    title: base.title,
    description: base.description,
    initial: {
      job_title: guided.initial_data?.job_title,
      job_description: guided.initial_data?.job_description,
      specific_requirements: guided.initial_data?.specific_requirements,
    },
  });
}
  static async create(
    company_id: string,
    payload: CreateEmployerAssessmentRequest,
  ): Promise<AssessmentCreationResponse> {
    await assertCompanyExists(company_id);
    await assertCompanyOwnsJob(company_id, payload.job_id);

    const created = await prisma.employerAssessment.create({
      data: {
        assessment_id: crypto.randomUUID(),
        company_id,
        job_id: payload.job_id,
        title: payload.title,
        description: payload.description,
        status: PrismaEmployerAssessmentStatus.DRAFT,
        assessment_type: payload.assessment_type as unknown as PrismaAssessmentType,
        skill_category: payload.skill_category,
        difficulty: payload.difficulty as unknown as PrismaDifficultyLevel,
        time_limit: payload.time_limit ?? 60,
        total_questions: payload.total_questions ?? 20,
        passing_score: 70,
        question_ids: [],
        settings: {},
        creation_method: toPrismaCreation(payload.creation_method),
        extracted_skills: payload.extracted_skills ?? [],
        enhanced_data: payload.enhanced_data ? (payload.enhanced_data as unknown as any) : undefined,
        auto_generated: payload.auto_generated ?? false,
      },
      include: { job: true, _count: { select: { candidateAssessments: true } } },
    });

    return {
      assessment: mapPrismaAssessment(created),
      creation_method: payload.creation_method,
      next_steps: ['Attach questions (optional)', 'Activate assessment when ready'],
    };
  }

  /**
   * Create via Job Description Parse method (calls AI to extract skills, optionally generate questions).
   */
  static async createFromJobDescription(
    company_id: string,
    args: {
      job_id: string;
      title: string;
      description: string;
      job_title?: string;
      job_description: string;
      assessment_type: PrismaAssessmentType;
      difficulty: PrismaDifficultyLevel;
      auto_generate?: boolean;
      total_questions?: number;
      time_limit?: number;
    },
  ): Promise<AssessmentCreationResponse> {
    await assertCompanyExists(company_id);
    const job = await assertCompanyOwnsJob(company_id, args.job_id);

    // 1) AI: extract skills
    const analysis = await AI.extractSkills({
      job_description: args.job_description,
      job_title: args.job_title ?? job.title,
    });

    const enhanced: EnhancedAssessmentData = mapAnalysisToEnhancedData(analysis);

    // 2) Create assessment (empty questions for now)
    const created = await prisma.employerAssessment.create({
      data: {
        assessment_id: crypto.randomUUID(),
        company_id,
        job_id: args.job_id,
        title: args.title,
        description: args.description,
        status: PrismaEmployerAssessmentStatus.DRAFT,
        assessment_type: args.assessment_type,
        skill_category: (enhanced.domains?.[0] ?? 'general').toLowerCase(),
        difficulty: args.difficulty,
        time_limit: args.time_limit ?? 60,
        total_questions: args.total_questions ?? 20,
        passing_score: 70,
        question_ids: [],
        settings: {},
        creation_method: PrismaCreationMethod.JOB_DESCRIPTION_PARSE,
        extracted_skills: enhanced.technical_skills ?? [],
        enhanced_data: enhanced as unknown as any,
        auto_generated: Boolean(args.auto_generate),
      },
      include: { job: true, _count: { select: { candidateAssessments: true } } },
    });

    let generatedQuestionsCount = 0;

    // 3) Optionally ask AI to generate question IDs and attach them
    if (args.auto_generate) {
      try {
        const gq = await AI.generateQuestions({
          technical_skills: enhanced.technical_skills ?? [],
          domains: enhanced.domains ?? [],
          tools_platforms: enhanced.tools_platforms ?? [],
          job_title: args.job_title ?? job.title,
          job_description: args.job_description,
          experience_level: enhanced.experience_level,
          assessment_type: args.assessment_type,
          difficulty: args.difficulty,
          question_categories: enhanced.question_recommendations?.map(q => q.category) ?? [],
          time_limit: created.time_limit,
          total_questions: created.total_questions,
        });

        if (Array.isArray(gq.question_ids) && gq.question_ids.length > 0) {
          const updated = await prisma.employerAssessment.update({
            where: { assessment_id: created.assessment_id },
            data: { question_ids: gq.question_ids },
            include: { job: true, _count: { select: { candidateAssessments: true } } },
          });
          generatedQuestionsCount = gq.generated_count ?? gq.question_ids.length;
          return {
            assessment: mapPrismaAssessment(updated),
            creation_method: TsCreationMethod.JOB_DESCRIPTION_PARSE,
            generated_questions_count: generatedQuestionsCount,
            next_steps: ['Review and activate assessment'],
          };
        }
      } catch (err) {
        // If AI question generation fails, keep assessment as-is
        console.warn('Question generation failed:', err);
      }
    }

    return {
      assessment: mapPrismaAssessment(created),
      creation_method: TsCreationMethod.JOB_DESCRIPTION_PARSE,
      generated_questions_count: generatedQuestionsCount,
      next_steps: ['Add or import questions', 'Activate assessment when ready'],
    };
  }

  /**
   * Create via Chatbot Guided flow.
   * Note: no DB model for chatbot session here; we return a lightweight in-memory descriptor.
   */
  static async createWithChatbot(
    company_id: string,
    args: {
      job_id: string;
      title: string;
      description: string;
      initial?: Partial<{
        job_title: string;
        job_description: string;
        specific_requirements: string[];
      }>;
    },
  ): Promise<AssessmentCreationResponse> {
    await assertCompanyExists(company_id);
    await assertCompanyOwnsJob(company_id, args.job_id);

    const created = await prisma.employerAssessment.create({
      data: {
        assessment_id: crypto.randomUUID(),
        company_id,
        job_id: args.job_id,
        title: args.title,
        description: args.description,
        status: PrismaEmployerAssessmentStatus.DRAFT,
        assessment_type: PrismaAssessmentType.COMPREHENSIVE,
        skill_category: 'general',
        difficulty: PrismaDifficultyLevel.INTERMEDIATE,
        time_limit: 60,
        total_questions: 20,
        passing_score: 70,
        question_ids: [],
        settings: {},
        creation_method: PrismaCreationMethod.CHATBOT_GUIDED,
        extracted_skills: [],
        enhanced_data: undefined,
        auto_generated: false,
      },
      include: { job: true, _count: { select: { candidateAssessments: true } } },
    });

    // Return a lightweight session descriptor for UI to continue the flow
    const chatbot_session = {
      session_id: `chatbot_${created.assessment_id}`,
      company_id,
      job_id: created.job_id,
      messages: [],
      current_step: AssessmentCreationStep.WELCOME as const,
      created_at: new Date(),
      updated_at: new Date(),
      assessment_data: {
        job_title: args.initial?.job_title,
        job_description: args.initial?.job_description,
        extracted_skills: [],
        question_categories: [],
      },
      method: TsCreationMethod.CHATBOT_GUIDED as const,
    };

    return {
      assessment: mapPrismaAssessment(created),
      creation_method: TsCreationMethod.CHATBOT_GUIDED,
      chatbot_session,
      next_steps: ['Continue in the chatbot to refine settings and generate questions'],
    };
  }

  static async getById(company_id: string, assessment_id: string): Promise<EmployerAssessment> {
    await assertCompanyExists(company_id);
    const found = await prisma.employerAssessment.findFirst({
      where: { assessment_id, company_id },
      include: { job: true, _count: { select: { candidateAssessments: true } } },
    });
    if (!found) throw new Error('Assessment not found');
    return mapPrismaAssessment(found);
  }

  static async list(company_id: string, filters?: { status?: PrismaEmployerAssessmentStatus; job_id?: string }) {
    await assertCompanyExists(company_id);
    const list = await prisma.employerAssessment.findMany({
      where: {
        company_id,
        status: filters?.status,
        job_id: filters?.job_id,
      },
      orderBy: { created_at: 'desc' },
      include: { job: true, _count: { select: { candidateAssessments: true } } },
    });
    return list.map(mapPrismaAssessment);
  }

  static async update(company_id: string, payload: UpdateEmployerAssessmentRequest): Promise<UpdateAssessmentResponse> {
    await assertCompanyExists(company_id);

    const existing = await prisma.employerAssessment.findFirst({
      where: { assessment_id: payload.assessment_id, company_id },
    });
    if (!existing) throw new Error('Assessment not found');

    // If job changes, ensure ownership
    if (payload.job_id && payload.job_id !== existing.job_id) {
      await assertCompanyOwnsJob(company_id, payload.job_id);
    }

    const updated = await prisma.employerAssessment.update({
      where: { assessment_id: payload.assessment_id },
      data: {
        title: payload.title ?? undefined,
        description: payload.description ?? undefined,
        status: (payload.status as PrismaEmployerAssessmentStatus) ?? undefined,
        job_id: payload.job_id ?? undefined,
      },
      include: { job: true, _count: { select: { candidateAssessments: true } } },
    });

    // Optionally kick off chatbot regeneration — here just return a session descriptor
    let chatbot_session: AssessmentCreationResponse['chatbot_session'] | undefined;
    if (payload.regenerate_with_chatbot) {
      chatbot_session = {
        session_id: `chatbot_${updated.assessment_id}_${Date.now()}`,
        company_id,
        job_id: updated.job_id,
        messages: [],
        current_step: 'welcome',
        created_at: new Date(),
        updated_at: new Date(),
        assessment_data: { extracted_skills: [], question_categories: [] },
        method: 'chatbot_guided',
      } as any;
    }

    return {
      assessment: mapPrismaAssessment(updated),
      regenerated: Boolean(payload.regenerate_with_chatbot),
      chatbot_session,
    };
  }

  static async remove(company_id: string, payload: DeleteEmployerAssessmentRequest): Promise<DeleteAssessmentResponse> {
    await assertCompanyExists(company_id);
    const found = await prisma.employerAssessment.findFirst({
      where: { assessment_id: payload.assessment_id, company_id },
    });
    if (!found) throw new Error('Assessment not found');

    await prisma.employerAssessment.delete({ where: { assessment_id: payload.assessment_id } });
    return {
      assessment_id: payload.assessment_id,
      deleted: true,
      message: 'Assessment deleted',
    };
  }
}

// -------------------- Default export --------------------
export default EmployerAssessmentService;