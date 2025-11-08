import {
  PrismaClient,
  AssessmentType as PrismaAssessmentType,
  DifficultyLevel as PrismaDifficultyLevel,
  EmployerAssessmentStatus as PrismaEmployerAssessmentStatus,
  AssessmentCreationMethod as PrismaCreationMethod,
} from '@prisma/client';

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
  // ChatbotSession type is referenced via AssessmentCreationResponse['chatbot_session']
} from '../../types/employerAssessment.types';

const prisma = new PrismaClient();

// ================== AI MICROSERVICE (PYTHON) ==================
// All heavy AI logic lives in Python. Node just orchestrates.

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

// Shapes returned by Python (wire format)
type JDParseResponse = {
  analysis: SkillsAnalysis;
  requirements: Record<string, string[]>;
};

type ChatbotSessionDTO = {
  session_id: string;
  company_id: string;
  job_id?: string;
  messages: any[];
  current_step: string; // will be mapped to AssessmentCreationStep
  created_at: string;
  updated_at: string;
  assessment_data?: any;
  method: 'chatbot_guided';
};

type ChatbotResponseDTO = {
  session: ChatbotSessionDTO;
  reply: string;
  is_completed: boolean;
};

const AI = {
  // Used in JD-parse flow from Node
  jdParse: (payload: { job_description: string; job_title?: string }) =>
    aiFetch<JDParseResponse>('/jd/parse', payload),

  // Optional: raw skills extraction if needed elsewhere
  extractSkills: (payload: { job_description: string; job_title?: string }) =>
    aiFetch<SkillExtractionResponse>('/skills/extract', payload),

  // Start chatbot-guided config
  chatbotStart: (payload: {
    company_id: string;
    job_id?: string;
    initial_data?: any;
  }) => aiFetch<ChatbotResponseDTO>('/chatbot/start', payload),

  // Continue chatbot session (exposed for future use by a dedicated controller)
  chatbotMessage: (payload: { session_id: string; message: string }) =>
    aiFetch<ChatbotResponseDTO>('/chatbot/message', payload),
};

// ================== HELPERS ==================

const toPrismaCreation = (m: TsCreationMethod): PrismaCreationMethod => {
  switch (m) {
    case TsCreationMethod.JOB_DESCRIPTION_PARSE:
      return PrismaCreationMethod.JOB_DESCRIPTION_PARSE;
    case TsCreationMethod.CHATBOT_GUIDED:
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
    _count: a._count
      ? { candidateAssessments: a._count.candidateAssessments }
      : undefined,
  };
}

// Map Python chatbot session → TS ChatbotSession (dates + enum)
function mapChatbotSession(
  dto: ChatbotSessionDTO,
): AssessmentCreationResponse['chatbot_session'] {
  const step =
    (dto.current_step as AssessmentCreationStep) ??
    AssessmentCreationStep.WELCOME;

  return {
    session_id: dto.session_id,
    company_id: dto.company_id,
    job_id: dto.job_id,
    messages: dto.messages || [],
    current_step: step,
    created_at: new Date(dto.created_at),
    updated_at: new Date(dto.updated_at),
    assessment_data: dto.assessment_data,
    method: TsCreationMethod.CHATBOT_GUIDED,
  };
}

// ================== VALIDATION ==================

async function assertCompanyOwnsJob(company_id: string, job_id: string) {
  const job = await prisma.companyJob.findUnique({ where: { job_id } });
  if (!job) throw new Error('Job not found');
  if (job.company_id !== company_id) {
    throw new Error('Forbidden: job does not belong to this company');
  }
  return job;
}

async function assertCompanyExists(company_id: string) {
  const user = await prisma.user.findUnique({ where: { user_id: company_id } });
  if (!user) throw new Error('Company user not found');
  return user;
}

// ================== SERVICE (ORCHESTRATOR) ==================

export class EmployerAssessmentService {
  /**
   * Smart entry:
   * - JOB_DESCRIPTION_PARSE → AI.jdParse → createFromJobDescription
   * - CHATBOT_GUIDED       → AI.chatbotStart → createWithChatbot
   */
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

  // Manual create (no AI)
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
        assessment_type: payload.assessment_type as PrismaAssessmentType,
        skill_category: payload.skill_category,
        difficulty: payload.difficulty as PrismaDifficultyLevel,
        time_limit: payload.time_limit ?? 60,
        total_questions: payload.total_questions ?? 20,
        passing_score: 70,
        question_ids: [],
        settings: {},
        creation_method: toPrismaCreation(payload.creation_method),
        extracted_skills: payload.extracted_skills ?? [],
        enhanced_data: (payload.enhanced_data as any) ?? undefined,
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
   * JD parse flow: call Python /jd/parse and persist SkillsAnalysis snapshot.
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
      auto_generate?: boolean; // only used to flag auto_generated
      total_questions?: number;
      time_limit?: number;
    },
  ): Promise<AssessmentCreationResponse> {
    await assertCompanyExists(company_id);
    const job = await assertCompanyOwnsJob(company_id, args.job_id);

    const jd = await AI.jdParse({
      job_description: args.job_description,
      job_title: args.job_title ?? job.title,
    });

    const analysis = jd.analysis;
    const enhanced = mapAnalysisToEnhancedData(analysis);

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
        question_ids: [], // questions added later by Wafaa / question service
        settings: {},
        creation_method: PrismaCreationMethod.JOB_DESCRIPTION_PARSE,
        extracted_skills: enhanced.technical_skills ?? [],
        enhanced_data: enhanced as any,
        auto_generated: Boolean(args.auto_generate),
      },
      include: { job: true, _count: { select: { candidateAssessments: true } } },
    });

    return {
      assessment: mapPrismaAssessment(created),
      creation_method: TsCreationMethod.JOB_DESCRIPTION_PARSE,
      next_steps: [
        'Use extracted skills to select/generate questions (separate service)',
        'Review and activate assessment',
      ],
    };
  }

  /**
   * Chatbot-guided: create draft assessment, start Python chatbot session.
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

    const chatbot = await AI.chatbotStart({
      company_id,
      job_id: created.job_id,
      initial_data: {
        assessment_id: created.assessment_id,
        job_title: args.initial?.job_title ?? created.title,
        job_description: args.initial?.job_description ?? created.description,
        specific_requirements: args.initial?.specific_requirements ?? [],
      },
    });

    const chatbot_session = mapChatbotSession(chatbot.session);

    return {
      assessment: mapPrismaAssessment(created),
      creation_method: TsCreationMethod.CHATBOT_GUIDED,
      chatbot_session,
      next_steps: ['Continue in chatbot to finalize requirements and link questions'],
    };
  }

  static async getById(
    company_id: string,
    assessment_id: string,
  ): Promise<EmployerAssessment> {
    await assertCompanyExists(company_id);
    const found = await prisma.employerAssessment.findFirst({
      where: { assessment_id, company_id },
      include: { job: true, _count: { select: { candidateAssessments: true } } },
    });
    if (!found) throw new Error('Assessment not found');
    return mapPrismaAssessment(found);
  }

  static async list(
    company_id: string,
    filters?: { status?: PrismaEmployerAssessmentStatus; job_id?: string },
  ) {
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

  static async update(
    company_id: string,
    payload: UpdateEmployerAssessmentRequest,
  ): Promise<UpdateAssessmentResponse> {
    await assertCompanyExists(company_id);

    const existing = await prisma.employerAssessment.findFirst({
      where: { assessment_id: payload.assessment_id, company_id },
    });
    if (!existing) throw new Error('Assessment not found');

    if (payload.job_id && payload.job_id !== existing.job_id) {
      await assertCompanyOwnsJob(company_id, payload.job_id);
    }

    const updated = await prisma.employerAssessment.update({
      where: { assessment_id: payload.assessment_id },
      data: {
        title: payload.title ?? undefined,
        description: payload.description ?? undefined,
        status:
          (payload.status as PrismaEmployerAssessmentStatus) ?? undefined,
        job_id: payload.job_id ?? undefined,
      },
      include: { job: true, _count: { select: { candidateAssessments: true } } },
    });

    let chatbot_session: AssessmentCreationResponse['chatbot_session'] | undefined;

    // Optional: restart chatbot flow for regeneration
    if (payload.regenerate_with_chatbot) {
      const chatbot = await AI.chatbotStart({
        company_id,
        job_id: updated.job_id,
        initial_data: {
          assessment_id: updated.assessment_id,
          job_title: updated.title,
          job_description: updated.description,
        },
      });
      chatbot_session = mapChatbotSession(chatbot.session);
    }

    return {
      assessment: mapPrismaAssessment(updated),
      regenerated: Boolean(payload.regenerate_with_chatbot),
      chatbot_session,
    };
  }

  static async remove(
    company_id: string,
    payload: DeleteEmployerAssessmentRequest,
  ): Promise<DeleteAssessmentResponse> {
    await assertCompanyExists(company_id);
    const found = await prisma.employerAssessment.findFirst({
      where: { assessment_id: payload.assessment_id, company_id },
    });
    if (!found) throw new Error('Assessment not found');

    await prisma.employerAssessment.delete({
      where: { assessment_id: payload.assessment_id },
    });

    return {
      assessment_id: payload.assessment_id,
      deleted: true,
      message: 'Assessment deleted',
    };
  }
}

export default EmployerAssessmentService;
