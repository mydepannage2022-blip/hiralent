import {
  PrismaClient,
  AssessmentType as PrismaAssessmentType,
  DifficultyLevel as PrismaDifficultyLevel,
  EmployerAssessmentStatus as PrismaEmployerAssessmentStatus,
  AssessmentCreationMethod as PrismaCreationMethod,
  Question,
} from '@prisma/client';

import {
  AssessmentCreationMethod as TsCreationMethod,
  AssessmentCreationRequest,
  ChatbotGuidedRequest,
  CreateEmployerAssessmentRequest,
  AssessmentCreationResponse,
  EmployerAssessment,
  EnhancedAssessmentData,
  SkillsAnalysis,
  UpdateEmployerAssessmentRequest,
  DeleteEmployerAssessmentRequest,
  UpdateAssessmentResponse,
  DeleteAssessmentResponse,
  AssessmentCreationStep,
  UpdateAssessmentStatusRequest,
} from '../../types/employerAssessment.types';

import {
  callJDParse,
  startChatbotSession,
  sendChatbotMessage,
  JDParseApiResponse,
  ChatbotApiResponse,
} from '../../clients/assessment-ai-service.client';

// waffa mock
//import { generateQuestionsForAssessment } from "../../services/questionService";

import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

/* ================== TYPES FOR INTERNAL USE ================== */

/**
 * Normalized requirements structure (works with both v1 and v2 API responses)
 */
interface NormalizedRequirements {
  must_have: string[];
  nice_to_have: string[];
  must_have_skills: string[];
  nice_to_have_skills: string[];
}

/* ================== HELPERS ================== */

function toPrismaCreation(m: TsCreationMethod): PrismaCreationMethod {
  switch (m) {
    case TsCreationMethod.JOB_DESCRIPTION_PARSE:
      return PrismaCreationMethod.JOB_DESCRIPTION_PARSE;
    case TsCreationMethod.CHATBOT_GUIDED:
      return PrismaCreationMethod.CHATBOT_GUIDED;
    case TsCreationMethod.MANUAL:
      return PrismaCreationMethod.MANUAL;
    default:
      throw new Error(`Unknown creation method: ${m}`);
  }
}

function toTsCreation(m: PrismaCreationMethod): TsCreationMethod {
  switch (m) {
    case PrismaCreationMethod.JOB_DESCRIPTION_PARSE:
      return TsCreationMethod.JOB_DESCRIPTION_PARSE;
    case PrismaCreationMethod.CHATBOT_GUIDED:
      return TsCreationMethod.CHATBOT_GUIDED;
    case PrismaCreationMethod.MANUAL:
      return TsCreationMethod.MANUAL;
  }
}

/**
 * Maps SkillsAnalysis (from AI service) to EnhancedAssessmentData (for DB storage)
 *
 * Handles both v1 and v2 response formats
 */
function mapAnalysisToEnhancedData(a: SkillsAnalysis): EnhancedAssessmentData {
  return {
    // Core skills
    technical_skills: a.technical_skills || [],
    tools_platforms: a.tools_platforms || [],
    soft_skills: a.soft_skills || [], // v2 field, defaults to empty

    // Metadata
    domains: a.domains || [],
    experience_level: a.experience_level || 'mid',
    job_complexity: a.job_complexity || 'medium',

    // Derived
    question_recommendations: a.question_recommendations || [],
    key_technologies: (a.key_technologies || []).slice(0, 5), // v2 field, max 5

    // Versioning
    extractor_version: a.extractor_version || '1.0.0', // v2 field
  };
}

/**
 * Normalize requirements from API response
 *
 * Handles BOTH formats:
 * - v1: Record<string, string[]> → { must_have: ["line1", "line2"], nice_to_have: [...] }
 * - v2: { must_have: [{text, skills, type}], nice_to_have: [...], must_have_skills: [...] }
 */
function normalizeRequirements(requirements: any): NormalizedRequirements {
  // Default empty result
  const result: NormalizedRequirements = {
    must_have: [],
    nice_to_have: [],
    must_have_skills: [],
    nice_to_have_skills: [],
  };

  if (!requirements) {
    return result;
  }

  // Check if it's v2 format (has must_have_skills array)
  const isV2 =
    Array.isArray(requirements.must_have_skills) ||
    (Array.isArray(requirements.must_have) &&
      requirements.must_have.length > 0 &&
      typeof requirements.must_have[0] === 'object' &&
      'text' in requirements.must_have[0]);

  if (isV2) {
    // v2 format: atomic requirements with skills
    result.must_have_skills = requirements.must_have_skills || [];
    result.nice_to_have_skills = requirements.nice_to_have_skills || [];

    // Extract text from atomic requirements
    if (Array.isArray(requirements.must_have)) {
      result.must_have = requirements.must_have
        .map((r: any) => (typeof r === 'string' ? r : r.text || ''))
        .filter(Boolean);
    }

    if (Array.isArray(requirements.nice_to_have)) {
      result.nice_to_have = requirements.nice_to_have
        .map((r: any) => (typeof r === 'string' ? r : r.text || ''))
        .filter(Boolean);
    }
  } else {
    // v1 format: simple string arrays
    result.must_have = requirements.must_have || [];
    result.nice_to_have = requirements.nice_to_have || [];

    // v1 doesn't have skills extraction, so we leave them empty
    result.must_have_skills = [];
    result.nice_to_have_skills = [];
  }

  return result;
}

/**
 * Extract skills from normalized requirements
 */
function extractSkillsFromRequirements(
  requirements: NormalizedRequirements,
): string[] {
  const allSkills = new Set<string>();

  requirements.must_have_skills?.forEach((s) => allSkills.add(s));
  requirements.nice_to_have_skills?.forEach((s) => allSkills.add(s));

  return Array.from(allSkills);
}

/**
 * Get aligned difficulty based on experience level
 *
 * Rule:
 * - entry → BEGINNER
 * - mid → INTERMEDIATE
 * - senior → ADVANCED
 * - executive → EXPERT
 */
function getAlignedDifficulty(
  experience_level: string,
  primary_domain: string,
): PrismaDifficultyLevel {
  const level = experience_level?.toLowerCase() || 'mid';
  const domain = primary_domain?.toLowerCase() || 'general';

  const hardcoreDomains = ['backend', 'devops', 'cloud', 'security', 'ml', 'ai'];
  const softDomains = ['data', 'bi', 'analytics', 'marketing', 'sales', 'product'];

  let mapping: Record<string, PrismaDifficultyLevel>;

  if (hardcoreDomains.includes(domain)) {
    mapping = {
      entry: PrismaDifficultyLevel.BEGINNER,
      mid: PrismaDifficultyLevel.INTERMEDIATE,
      senior: PrismaDifficultyLevel.ADVANCED,
      executive: PrismaDifficultyLevel.EXPERT,
    };
  } else if (softDomains.includes(domain)) {
    mapping = {
      entry: PrismaDifficultyLevel.BEGINNER,
      mid: PrismaDifficultyLevel.INTERMEDIATE,
      senior: PrismaDifficultyLevel.ADVANCED,
      executive: PrismaDifficultyLevel.ADVANCED, // capped
    };
  } else {
    mapping = {
      entry: PrismaDifficultyLevel.BEGINNER,
      mid: PrismaDifficultyLevel.INTERMEDIATE,
      senior: PrismaDifficultyLevel.ADVANCED,
      executive: PrismaDifficultyLevel.ADVANCED,
    };
  }

  return mapping[level] ?? PrismaDifficultyLevel.INTERMEDIATE;
}

function mapPrismaAssessment(a: any): EmployerAssessment {
  // If `questions` are included in the Prisma query, they look like:
  // a.questions: { order, points, isReserve, question: Question }[]
  let questions;
  if (Array.isArray(a.questions)) {
    questions = a.questions.map((aq: { order: number | null; points: number; isReserve: boolean; question: Question }) => ({
      id: aq.question.id,
      title: aq.question.title,
      description: aq.question.description,
      problemStatement: aq.question.problemStatement,
      difficulty: aq.question.difficulty,
      type: aq.question.type,
      skillTags: aq.question.skillTags,
      order: aq.order ?? undefined,
      points: aq.points,
      isReserve: aq.isReserve,
    }));
  }

  return {
    assessment_id: a.assessment_id,
    company_id: a.company_id,
    job_id: a.job_id,
    template_id: a.template_id ?? undefined, // ✅ NEW
    title: a.title,
    description: a.description,
    status: a.status,
    assessment_type: a.assessment_type,
    skill_category: a.skill_category,
    difficulty: a.difficulty,
    time_limit: a.time_limit,
    total_questions: a.total_questions,
    passing_score: a.passing_score ?? undefined,
    question_ids: a.question_ids,
    created_at: a.created_at,
    updated_at: a.updated_at,
    enhanced_data: a.enhanced_data ?? undefined,
    auto_generated: a.auto_generated ?? undefined,
    creation_method: toTsCreation(a.creation_method),
    extracted_skills: a.extracted_skills ?? [],
    questions, // 👈 NEW

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

function mapChatbotSession(
  session: ChatbotApiResponse['session'],
): AssessmentCreationResponse['chatbot_session'] {
  const step =
    (session.current_step as AssessmentCreationStep) ??
    AssessmentCreationStep.WELCOME;

  return {
    session_id: session.session_id,
    company_id: session.company_id,
    job_id: session.job_id,
    messages: session.messages || [],
    current_step: step,
    created_at: new Date(session.created_at),
    updated_at: new Date(session.updated_at),
    // now aligning with ChatbotAssessmentData-ish structure
    assessment_data: session.assessment_data,
    method: TsCreationMethod.CHATBOT_GUIDED,
  };
}

/* ================== VALIDATION ================== */

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

/* ================== SERVICE FUNCTIONS ================== */

export async function createEmployerAssessmentFromRequest(
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
    return createEmployerAssessmentFromJobDescription(company_id, {
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

  // CHATBOT_GUIDED → only start chatbot session, no DB row yet
  const guided = request as ChatbotGuidedRequest;
  return createEmployerAssessmentWithChatbot(company_id, {
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

export async function createEmployerAssessment(
  company_id: string,
  payload: CreateEmployerAssessmentRequest,
): Promise<AssessmentCreationResponse> {
  await assertCompanyExists(company_id);
  await assertCompanyOwnsJob(company_id, payload.job_id);

  const created = await prisma.employerAssessment.create({
    data: {
      assessment_id: randomUUID(),
      company_id,
      job_id: payload.job_id,
      title: payload.title,
      description: payload.description,
      status: payload.status || PrismaEmployerAssessmentStatus.DRAFT,
      assessment_type: payload.assessment_type as PrismaAssessmentType,
      skill_category: payload.skill_category,
      difficulty: payload.difficulty as PrismaDifficultyLevel,
      time_limit: payload.time_limit ?? 60,
      total_questions: payload.total_questions ?? 20,
      passing_score: payload.passing_score ?? 70,
      question_ids: payload.question_ids ?? [],
      settings: payload.settings ?? {},
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
 * Create assessment from Job Description using AI parsing
 *
 * Compatible with both v1 and v2 API responses
 */
export async function createEmployerAssessmentFromJobDescription(
  company_id: string,
  args: {
    job_id: string;
    title: string;
    description: string;
    job_title?: string;
    job_description: string;
    assessment_type: PrismaAssessmentType;
    difficulty?: PrismaDifficultyLevel;
    auto_generate?: boolean;
    total_questions?: number;
    time_limit?: number;
  },
): Promise<AssessmentCreationResponse> {
  await assertCompanyExists(company_id);
  const job = await assertCompanyOwnsJob(company_id, args.job_id);

  // 1️⃣ Call AI microservice (FastAPI)
  const jd: JDParseApiResponse = await callJDParse({
    job_description: args.job_description,
    job_title: args.job_title ?? job.title,
  });

  const analysis = jd.analysis;
  const enhanced = mapAnalysisToEnhancedData(analysis);

  // 2️⃣ Normalize requirements (handles both v1 and v2 formats)
  const requirements = normalizeRequirements(jd.requirements);

  // 3️⃣ Align difficulty with experience level
  const alignedDifficulty =
    args.difficulty ||
    getAlignedDifficulty(analysis.experience_level, analysis.primary_domain);

  // 4️⃣ Combine skills: technical + tools + requirements
  const allExtractedSkills = [
    ...enhanced.technical_skills,
    ...enhanced.tools_platforms,
    ...extractSkillsFromRequirements(requirements),
  ];

  // Deduplicate (case-insensitive)
  const seenLower = new Set<string>();
  const uniqueSkills: string[] = [];
  for (const skill of allExtractedSkills) {
    const lower = skill.toLowerCase();
    if (!seenLower.has(lower)) {
      seenLower.add(lower);
      uniqueSkills.push(skill);
    }
  }

  // 5️⃣ Calculate total questions from recommendations
  const totalFromRecommendations =
    analysis.question_recommendations?.reduce(
      (sum, rec) => sum + rec.count,
      0,
    ) || 20;

  const created = await prisma.employerAssessment.create({
    data: {
      assessment_id: randomUUID(),
      company_id,
      job_id: args.job_id,
      title: args.title,
      description: args.description,
      status: PrismaEmployerAssessmentStatus.DRAFT,
      assessment_type: args.assessment_type,
      skill_category: (analysis.primary_domain ?? 'general').toLowerCase(),
      difficulty: alignedDifficulty,
      time_limit: args.time_limit ?? 60,
      total_questions: args.total_questions ?? totalFromRecommendations,
      passing_score: 70,
      question_ids: [],
      settings: {
        // Store requirements breakdown
        requirements_summary: {
          must_have_count: requirements.must_have.length,
          nice_to_have_count: requirements.nice_to_have.length,
          must_have_skills: requirements.must_have_skills,
          nice_to_have_skills: requirements.nice_to_have_skills,
        },
        // Store key technologies for question generation
        key_technologies: enhanced.key_technologies,
        // Store confidence for debugging
        confidence_score: analysis.confidence_score,
        extractor_version: enhanced.extractor_version,
      },
      creation_method: PrismaCreationMethod.JOB_DESCRIPTION_PARSE,
      extracted_skills: uniqueSkills,
      enhanced_data: enhanced as any,
      auto_generated: true,
    },
    include: { job: true, _count: { select: { candidateAssessments: true } } },
  });

  // Log for monitoring
  console.log(
    `[EmployerAssessment] Created from JD v${enhanced.extractor_version}:`,
    {
      assessment_id: created.assessment_id,
      experience_level: analysis.experience_level,
      difficulty: alignedDifficulty,
      skills_count: uniqueSkills.length,
      confidence: analysis.confidence_score,
    },
  );

  return {
    assessment: mapPrismaAssessment(created),
    creation_method: TsCreationMethod.JOB_DESCRIPTION_PARSE,
    generated_questions_count: totalFromRecommendations,
    next_steps: [
      `Use ${enhanced.key_technologies.length} key technologies to prioritize questions`,
      `${requirements.must_have.length} must-have requirements identified`,
      'Review and activate assessment',
    ],
  };
}

/**
 * Start chatbot-guided creation WITHOUT creating a DB assessment row.
 *
 * - Generates a future assessment_id (UUID)
 * - Starts Redis-backed chatbot session in AI microservice
 * - Returns:
 *    • chatbot_session (for UI)
 *    • a "virtual" assessment object (not persisted), using that same ID
 */
export async function createEmployerAssessmentWithChatbot(
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
  const job = await assertCompanyOwnsJob(company_id, args.job_id);

  // FUTURE assessment id (not yet persisted)
  const assessmentId = randomUUID();
  const now = new Date();

  // Start chatbot session in AI microservice
  const chatbot: ChatbotApiResponse = await startChatbotSession({
    company_id,
    job_id: job.job_id,
    initial_data: {
      // let chatbot know the future assessment id, so it can echo it in assessment_data
      assessment_id: assessmentId,
      job_title: args.initial?.job_title ?? job.title,
      job_description: args.initial?.job_description ?? job.description,
      specific_requirements:
        args.initial?.specific_requirements ??
        job.required_skills?.slice(0, 6) ??
        [],
    },
  });

  const chatbot_session = mapChatbotSession(chatbot.session);

  // "Virtual" assessment sent to frontend (NOT stored in DB yet)
  const virtualAssessment: EmployerAssessment = {
    assessment_id: assessmentId,
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
    created_at: now,
    updated_at: now,
    enhanced_data: undefined,
    auto_generated: false,
    creation_method: TsCreationMethod.CHATBOT_GUIDED,
    extracted_skills: [],
    job: {
      title: job.title,
      location: job.location,
      status: job.status,
      experience_level: job.experience_level ?? undefined,
      job_type: job.job_type ?? undefined,
      department: job.department ?? undefined,
    },
    _count: {
      candidateAssessments: 0,
    },
  };

  return {
    assessment: virtualAssessment,
    creation_method: TsCreationMethod.CHATBOT_GUIDED,
    chatbot_session,
    next_steps: ['Chat with the assistant and type "confirm" to finalize'],
  };
}

/* =============== CHATBOT MESSAGE SERVICE =============== */

/**
 * Proxy a message to the AI chatbot.
 *
 * IMPORTANT (Option A):
 * - No assessment row exists at start.
 * - When AI marks `is_completed = true`, we:
 *    1) Read `session.assessment_data` (chatbot output)
 *    2) Create/Upsert EmployerAssessment in Prisma using that config
 *    3) Attach `assessment` to the response payload (extra field)
 */
export async function sendChatbotMessageService(
  company_id: string,
  payload: { session_id: string; message: string },
): Promise<ChatbotApiResponse> {
  await assertCompanyExists(company_id);

  if (!payload.session_id) throw new Error('session_id is required');
  if (!payload.message) throw new Error('message is required');

  // 1️⃣ Send message to the AI microservice
  const aiResponse = await sendChatbotMessage({
    session_id: payload.session_id,
    message: payload.message,
  });

  // If conversation not done, return the raw AI response
  if (!aiResponse.is_completed) {
    return aiResponse;
  }

  // 2️⃣ Chatbot completed → convert session into real DB assessment
  const session = aiResponse.session;
  const data: any = session.assessment_data || {};

  // assessment_id is the one generated when starting chatbot-guided creation
  const assessmentId: string = data.assessment_id || randomUUID();

  // Get job_id from session or data
  const jobId: string =
    session.job_id ||
    data.job_id ||
    (() => {
      throw new Error('Missing job_id in chatbot session');
    })();

  const job = await assertCompanyOwnsJob(company_id, jobId);

  // 3️⃣ CORE CONFIG
  const assessmentType: PrismaAssessmentType =
    (data.assessment_type as PrismaAssessmentType) ||
    PrismaAssessmentType.COMPREHENSIVE;

  const difficulty: PrismaDifficultyLevel =
    (data.difficulty as PrismaDifficultyLevel) ||
    PrismaDifficultyLevel.INTERMEDIATE;

  const questionRecs: any[] = Array.isArray(data.question_recommendations)
    ? data.question_recommendations
    : [];

  const totalFromRecs =
    questionRecs.reduce(
      (sum: number, rec: any) =>
        sum + (typeof rec.count === 'number' ? rec.count : 0),
      0,
    ) || undefined;

  const totalQuestions: number =
    typeof data.total_questions === 'number'
      ? data.total_questions
      : totalFromRecs ?? 20;

  const timeLimit: number = data.time_limit ?? 60;
  const passingScore: number = data.passing_score ?? 70;

  // 4️⃣ Domains + skill_category
  let domains: string[] = Array.isArray(data.domains) ? [...data.domains] : [];
  const skillCategory: string =
    data.skill_category || (domains[0] ?? 'general');

  if (
    skillCategory &&
    !domains.some(
      (d) => d && d.toLowerCase() === String(skillCategory).toLowerCase(),
    )
  ) {
    domains.push(skillCategory);
  }

  // 5️⃣ Skills
  const technicalSkills: string[] = Array.isArray(data.technical_skills)
    ? data.technical_skills
    : [];

  const toolsPlatforms: string[] = Array.isArray(data.tools_platforms)
    ? data.tools_platforms
    : [];

  const softSkills: string[] = Array.isArray(data.soft_skills)
    ? data.soft_skills
    : [];

  const keyTechnologies: string[] = Array.isArray(data.key_technologies)
    ? data.key_technologies
    : [];

  // Build extracted_skills (union)
  const extractedSkillsSet = new Set<string>();

  (Array.isArray(data.extracted_skills) ? data.extracted_skills : []).forEach(
    (s: string) => s && extractedSkillsSet.add(s),
  );
  technicalSkills.forEach((s) => s && extractedSkillsSet.add(s));
  toolsPlatforms.forEach((s) => s && extractedSkillsSet.add(s));

  const extractedSkills = Array.from(extractedSkillsSet);

  const extractorVersion: string = data.extractor_version || 'chatbot-1.0.0';

  // 6️⃣ Enhanced data object for Prisma
  const experienceLevel =
    data.experience_level || ('mid' as 'entry' | 'mid' | 'senior' | 'executive');

  const jobComplexity =
    data.job_complexity || ('medium' as 'low' | 'medium' | 'high');

  const enhancedFromChatbot: EnhancedAssessmentData = {
    technical_skills: technicalSkills,
    tools_platforms: toolsPlatforms,
    soft_skills: softSkills,
    domains,
    experience_level: experienceLevel,
    job_complexity: jobComplexity,
    question_recommendations: questionRecs,
    key_technologies: keyTechnologies.slice(0, 5),
    extractor_version: extractorVersion,
  };
  const GENERATED_DESCRIPTION =
  "Assessment auto-generated from the chat with the AI assistant. Please review and customize as needed.";

  // 7️⃣ Additional settings
  const settings: any = {
    question_categories: Array.isArray(data.question_categories)
      ? data.question_categories
      : [],
    question_recommendations: questionRecs,
    specific_focus_areas: data.specific_focus_areas || [],
    exclude_categories: data.exclude_categories || [],
    role_context: data.role_context,
    role_details: data.role_details,
  };

  // 8️⃣ Create or update DB row (idempotent)
  const created = await prisma.employerAssessment.upsert({
    where: { assessment_id: assessmentId },
    update: {
      title: data.job_title || job.title,
      description: GENERATED_DESCRIPTION,
      status: PrismaEmployerAssessmentStatus.DRAFT,
      assessment_type: assessmentType,
      skill_category: skillCategory,
      difficulty,
      time_limit: timeLimit,
      total_questions: totalQuestions,
      passing_score: passingScore,
      question_ids: [],
      settings,
      creation_method: PrismaCreationMethod.CHATBOT_GUIDED,
      extracted_skills: extractedSkills,
      enhanced_data: enhancedFromChatbot as any,
      auto_generated: true,
    },
    create: {
      assessment_id: assessmentId,
      company_id,
      job_id: job.job_id,
      title: data.job_title || job.title,
      description: GENERATED_DESCRIPTION,
      status: PrismaEmployerAssessmentStatus.DRAFT,
      assessment_type: assessmentType,
      skill_category: skillCategory,
      difficulty,
      time_limit: timeLimit,
      total_questions: totalQuestions,
      passing_score: passingScore,
      question_ids: [],
      settings,
      creation_method: PrismaCreationMethod.CHATBOT_GUIDED,
      extracted_skills: extractedSkills,
      enhanced_data: enhancedFromChatbot as any,
      auto_generated: true,
    },
    include: { job: true, _count: { select: { candidateAssessments: true } } },
  });

  // 9️⃣ Attach created assessment to AI response
  (aiResponse as any).assessment = mapPrismaAssessment(created);

  return aiResponse;
}




/* ================== CRUD ================== */

export async function getEmployerAssessmentById(
  company_id: string,
  assessment_id: string,
): Promise<EmployerAssessment> {
  await assertCompanyExists(company_id);

  const found = await prisma.employerAssessment.findFirst({
    where: { assessment_id, company_id },
    include: {
      job: true,
      _count: { select: { candidateAssessments: true } },
      // 👇 include attached questions + underlying Question row
      questions: {
        orderBy: { order: 'asc' },
        include: { question: true },
      },
    },
  });

  if (!found) throw new Error('Assessment not found');
  return mapPrismaAssessment(found);
}


export async function listEmployerAssessments(
  company_id: string,
  filters?: { status?: PrismaEmployerAssessmentStatus; job_id?: string },
): Promise<EmployerAssessment[]> {
  await assertCompanyExists(company_id);

  const list = await prisma.employerAssessment.findMany({
    where: {
      company_id,
      status: filters?.status,
      job_id: filters?.job_id,
    },
    orderBy: { created_at: 'desc' },
    include: {
      job: true,
      _count: { select: { candidateAssessments: true } },
      // ✅ fetch sessions to compute the 3 counts
      sessions: {
        select: {
          status: true,
          total_score: true,
        },
      },
    },
  });

  return list.map((a) => {
    const sessions = (a as any).sessions ?? [];

    // Total = any session exists (invited + started)
    const candidate_count = sessions.length;

    // Completed = submitted (done, regardless of score)
    const completed_count = sessions.filter(
      (s: any) => s.status === 'SUBMITTED'
    ).length;

    // To Evaluate = submitted BUT score not yet computed
    // (HackerRank style: needs review by company or scoring worker)
    const to_evaluate_count = sessions.filter(
      (s: any) =>
        s.status === 'SUBMITTED' &&
        (s.total_score === null || s.total_score === undefined)
    ).length;

    const mapped = mapPrismaAssessment(a);
    return {
      ...mapped,
      candidate_count,
      completed_count,
      to_evaluate_count,
    };
  });
}

export async function updateEmployerAssessment(
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
      status: payload.status ?? undefined,
      job_id: payload.job_id ?? undefined,
      assessment_type: payload.assessment_type ?? undefined,
      skill_category: payload.skill_category ?? undefined,
      difficulty: payload.difficulty ?? undefined,
      time_limit: payload.time_limit ?? undefined,
      total_questions: payload.total_questions ?? undefined,
      passing_score: payload.passing_score ?? undefined,
      extracted_skills: payload.extracted_skills ?? undefined,
      settings: payload.settings ?? undefined,
    },
    include: { job: true, _count: { select: { candidateAssessments: true } } },
  });

  let chatbot_session: AssessmentCreationResponse['chatbot_session'] | undefined;

  if (payload.regenerate_with_chatbot) {
    const chatbot: ChatbotApiResponse = await startChatbotSession({
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

export async function updateEmployerAssessmentStatus(
  company_id: string,
  payload: UpdateAssessmentStatusRequest,
): Promise<EmployerAssessment> {
  await assertCompanyExists(company_id);

  const existing = await prisma.employerAssessment.findFirst({
    where: { assessment_id: payload.assessment_id, company_id },
  });
  if (!existing) throw new Error('Assessment not found');

  const updated = await prisma.employerAssessment.update({
    where: { assessment_id: payload.assessment_id },
    data: {
      status: payload.status,
    },
    include: { job: true, _count: { select: { candidateAssessments: true } } },
  });

  return mapPrismaAssessment(updated);
}

export async function removeEmployerAssessment(
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

export const EmployerAssessmentService = {
  createFromRequest: createEmployerAssessmentFromRequest,
  create: createEmployerAssessment,
  createFromJobDescription: createEmployerAssessmentFromJobDescription,
  createWithChatbot: createEmployerAssessmentWithChatbot,
  sendChatbotMessageService,
  getById: getEmployerAssessmentById,
  list: listEmployerAssessments,
  update: updateEmployerAssessment,
  updateStatus: updateEmployerAssessmentStatus,
  remove: removeEmployerAssessment,
};

export default EmployerAssessmentService;