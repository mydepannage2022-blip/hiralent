import { Worker } from 'bullmq';
import { getRedis } from '../lib/redis';
import prisma from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { normalizeLang } from '../services/i18n';
import { fetchWebsiteText } from '../services/signals/website';
import { fetchDomainAgeMonths } from '../services/signals/whois';
import { fetchLinkedInSnippet } from '../services/signals/linkedin';
import { guessTags } from '../services/skills/roleTags';

/* ----- enum types (compatible Prisma v4/v5) ----- */
type CategoryT = Prisma.BusinessInsightCreateInput['category'];
type TypeT     = Prisma.BusinessInsightCreateInput['insight_type'];

const EC = {
  business_model: 'business_model' as CategoryT,
  performance:   'performance'   as CategoryT,
  market:        'market'        as CategoryT,
  finance:       'finance'       as CategoryT,
  growth:        'growth'        as CategoryT,
  hiring:        'hiring'        as CategoryT,
};
const ET = {
  recommendation: 'recommendation' as TypeT,
  prediction:     'prediction'     as TypeT,
  trend:          'trend'          as TypeT,
  alert:          'alert'          as TypeT,
  opportunity:    'opportunity'    as TypeT,
};

/* ----- Zod schema (inclut hiralent_skill_tags) ----- */
const InsightSchema = z.object({
  business_model: z.object({
    label: z.string(),
    summary: z.string(),
    revenue_streams: z.array(z.string()).default([]),
  }),
  market_position: z.object({
    stage: z.enum(['pre-seed','seed','series-a','growth','mature']).optional(),
    geography: z.array(z.string()).default([]),
    domain_age_months: z.number().nullable().optional(),
    competitors: z.array(z.string()).default([]),
    summary: z.string(),
  }),
  early_hiring_plan: z.object({
    recommended_teams: z.array(z.string()).default([]),
    priorities: z.array(z.object({
      role: z.string(),
      reason: z.string(),
      seniority: z.enum(['junior','mid','senior']).optional(),
    })).default([]),
  }),
  suggested_roles: z.array(z.object({
    title: z.string(),
    rationale: z.string(),
    example_requirements: z.array(z.string()).default([]),
    hiralent_skill_tags: z.array(z.string()).length(5), // <— demandé par manager
  })),
  meta: z.object({
    ai_model: z.string().default('gemini'),
    confidence: z.number().min(0).max(1).optional(),
    language: z.enum(['en','ar','fr']).default('en'),
  }),
});

/* ----- LLM ----- */
// --- helper: nettoie les fences ```json et extrait le 1er objet JSON équilibré ---
function extractJsonObject(s: string): string {
  // supprime d'éventuelles fences ```json ... ```
  let t = s.replace(/```json/gi, '```').replace(/```/g, '').trim();

  // extrait le 1er objet JSON équilibré { ... }
  let depth = 0, start = -1;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}') { depth--; if (depth === 0 && start !== -1) return t.slice(start, i + 1); }
  }
  return t; // fallback si déjà propre
}

async function callLLM(prompt: string): Promise<z.infer<typeof InsightSchema>> {
  //********* */
  if (process.env.AI_FAKE === '1') {
  return {
    business_model: {
      label: "SaaS B2B",
      summary: "Abonnement mensuel pour PME; offre core + add-ons.",
      revenue_streams: ["Subscriptions", "Professional Services"]
    },
    market_position: {
      stage: "seed",
      geography: ["MENA", "EU"],
      domain_age_months: 18,
      competitors: ["Comp A", "Comp B"],
      summary: "Positionnement niche avec traction early adopters."
    },
    early_hiring_plan: {
      recommended_teams: ["Engineering", "Product", "Sales"],
      priorities: [
        { role: "Full-Stack Developer", reason: "Accélérer roadmap", seniority: "mid" },
        { role: "Product Manager",      reason: "Cadrer discovery et delivery" }
      ]
    },
    suggested_roles: [
      {
        title: "Senior Full-Stack Developer",
        rationale: "Livrer features client critiques",
        example_requirements: ["React", "Node", "PostgreSQL"],
        hiralent_skill_tags: ["React","Node.js","PostgreSQL","Docker","CI/CD"]
      },
      {
        title: "Sales Development Representative",
        rationale: "Générer pipeline initial",
        example_requirements: ["Outbound","CRM"],
        hiralent_skill_tags: ["Prospection","CRM","Cold Email","Discovery"]
      }
    ],
    meta: { ai_model: "fake", confidence: 0.7, language: "fr" }
  } as any;
}
//******* **/
  const provider = (process.env.AI_MODEL_PROVIDER || 'gemini').toLowerCase();

  if (provider === 'gemini') {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const res = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: {
    responseMimeType: 'application/json', // ← force JSON pur (pas de ```json)
    temperature: 0.1,
  },
});

const raw = res.response.text() ?? '';
const cleaned = extractJsonObject(raw);
return InsightSchema.parse(JSON.parse(cleaned));

  } else {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const chat = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      messages: [
        { role: 'system', content: 'Strict JSON output only.' },
        { role: 'user', content: prompt },
      ],
    });
const txt = chat.choices[0]?.message?.content?.trim() || '{}';
const cleaned = extractJsonObject(txt);
return InsightSchema.parse(JSON.parse(cleaned));

  }
}

/* ----- Contexte + signals ----- */
async function collectCompanyContext(companyId: string) {
  const profile = await prisma.companyProfile.findUnique({
    where: { company_id: companyId },
  });
  const website_text = await fetchWebsiteText(profile?.website);
  const whois_age_months = await fetchDomainAgeMonths(profile?.website);
  const linkedin_snippet = await fetchLinkedInSnippet(profile?.linkedin_profile);

  return {
    profile,
    publicSignals: { website_text, whois_age_months, linkedin_snippet },
  };
}

/* ----- Prompt (force la langue + tags) ----- */
function buildPrompt(ctx: Awaited<ReturnType<typeof collectCompanyContext>>, lang: 'en'|'ar'|'fr') {
  const { profile, publicSignals } = ctx;

  return `
You are an onboarding analyst. Produce ONLY JSON matching this TypeScript-like shape:

{
  "business_model": { "label": string, "summary": string, "revenue_streams": string[] },
  "market_position": { "stage"?: "pre-seed"|"seed"|"series-a"|"growth"|"mature", "geography": string[], "domain_age_months"?: number|null, "competitors": string[], "summary": string },
  "early_hiring_plan": { "recommended_teams": string[], "priorities": [{ "role": string, "reason": string, "seniority"?: "junior"|"mid"|"senior" }] },
  "suggested_roles": [{ "title": string, "rationale": string, "example_requirements": string[], "hiralent_skill_tags": string[] }],
  "meta": { "ai_model": string, "confidence"?: number, "language": "${lang}" }
}

RULES:
- Output MUST be valid JSON, no markdown and no explanations.
- **Language**: Write ALL fields ("label","summary","rationale", etc.) in **${lang}**.
- For each item in "suggested_roles", include EXACTLY 5 "hiralent_skill_tags" (short, standard skills).
- Keep content concise and practical for an HR onboarding card.

COMPANY CONTEXT:
- name: ${profile?.company_name ?? ''}
- website: ${profile?.website ?? ''}
- industry: ${profile?.industry ?? ''}
- description: ${profile?.description ?? ''}

PUBLIC SIGNALS:
- website_text (truncated): ${(publicSignals.website_text || '').slice(0, 1200)}
- domain_age_months: ${publicSignals.whois_age_months ?? 'null'}
- linkedin_snippet: ${publicSignals.linkedin_snippet ?? ''}
`.trim();
}

/* ----- helpers ----- */
function toDayBucketUTC(ms: number): Date {
  const d = new Date(ms);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function upsertDailyInsight(args: {
  companyId: string;
  category: CategoryT;
  type: TypeT;
  title: string;
  description: string;
  payload?: any;
  aiModel: string;
  confidence?: number | null;
  stamp: number;
  suggestedActions?: string[];
  evidence?: any;
}) {
  const {
    companyId, category, type, title, description,
    payload, aiModel, confidence, stamp,
    suggestedActions = [], evidence
  } = args;

  const dayBucket = toDayBucketUTC(stamp);

  await prisma.businessInsight.upsert({
    where: {
      target_type_target_id_category_day_bucket: {
        target_type: 'company',
        target_id: companyId,
        category,
        day_bucket: dayBucket,
      },
    },
    create: {
      target_type: 'company',
      target_id: companyId,
      category,
      insight_type: type,
      title,
      description,
      detailed_analysis: null,
      ai_model: aiModel,
      confidence: confidence ?? null,
      evidence: evidence ?? null,
      payload: payload ?? null,
      suggested_actions: suggestedActions.length ? suggestedActions : ['Review and confirm next steps'],
      created_at: new Date(stamp),
      day_bucket: dayBucket,
    },
    update: {
      insight_type: type,
      title,
      description,
      ai_model: aiModel,
      confidence: confidence ?? null,
      evidence: evidence ?? null,
      payload: payload ?? null,
      suggested_actions: suggestedActions.length ? suggestedActions : ['Review and confirm next steps'],
      created_at: new Date(stamp),
    },
  });
}

/* ----- Worker ----- */
const connection = getRedis();

type JobData = { companyId: string; version?: number; reason?: 'approval'|'recompute' };

export const worker = new Worker(
  'ai-company-setup',
  async (job) => {
    const { companyId, version } = job.data as JobData;
    const stamp = version ?? Date.now();

    const company = await prisma.companyProfile.findUnique({
      where: { company_id: companyId },
      select: { verified: true, preferred_language: true },
    });
    if (!company?.verified) {
      console.warn(`[AI_SETUP] Skipped (not verified) company=${companyId}`);
      return;
    }

    const lang = normalizeLang(company.preferred_language);
    const ctx = await collectCompanyContext(companyId);
    const prompt = buildPrompt(ctx, lang);

    let data = await callLLM(prompt);

    // fallback: si un rôle n'a pas de tags, on estime
    data = {
      ...data,
      suggested_roles: data.suggested_roles.map(r => ({
        ...r,
        hiralent_skill_tags: (r.hiralent_skill_tags?.length ? r.hiralent_skill_tags : guessTags(r.title)).slice(0,5),
      })),
      meta: { ...data.meta, language: lang, ai_model: data.meta.ai_model || (process.env.AI_MODEL_PROVIDER ?? 'gemini') },
    };

    // 4 insights
    await upsertDailyInsight({
      companyId,
      category: EC.business_model,
      type: ET.opportunity,
      title: data.business_model.label,
      description: data.business_model.summary,
      payload: data.business_model,
      aiModel: data.meta.ai_model,
      confidence: data.meta.confidence ?? null,
      stamp,
      suggestedActions: [
        lang === 'fr' ? 'Valider les hypothèses de pricing avec 3 clients' :
        lang === 'ar' ? 'تحقق من افتراضات التسعير مع 3 عملاء' :
        'Validate pricing assumptions with 3 customers',
      ],
    });

    await upsertDailyInsight({
      companyId,
      category: EC.market,
      type: ET.trend,
      title: lang === 'fr' ? 'Positionnement marché' : lang === 'ar' ? 'الوضع في السوق' : 'Market Position',
      description: data.market_position.summary,
      payload: data.market_position,
      aiModel: data.meta.ai_model,
      confidence: data.meta.confidence ?? null,
      stamp,
      suggestedActions: [
        lang === 'fr' ? 'Lister 3 concurrents principaux' :
        lang === 'ar' ? 'سجّل 3 منافسين رئيسيين' :
        'List top 3 competitors',
      ],
    });

    await upsertDailyInsight({
      companyId,
      category: EC.hiring,
      type: ET.recommendation,
      title: lang === 'fr' ? 'Plan de recrutement initial' : lang === 'ar' ? 'خطة التوظيف الأولية' : 'Early Hiring Plan',
      description: data.early_hiring_plan.priorities.map(p => `• ${p.role}: ${p.reason}`).join('\n'),
      payload: data.early_hiring_plan,
      aiModel: data.meta.ai_model,
      confidence: data.meta.confidence ?? null,
      stamp,
      suggestedActions: [
        lang === 'fr' ? 'Ouvrir les 2 rôles prioritaires' :
        lang === 'ar' ? 'افتح أهم وظيفتين' :
        'Open the top 2 priority roles',
      ],
    });

    await upsertDailyInsight({
      companyId,
      category: EC.growth,
      type: ET.recommendation,
      title: lang === 'fr' ? 'Rôles suggérés (croissance)' : lang === 'ar' ? 'أدوار مقترحة (النمو)' : 'Suggested Roles (Growth)',
      description: data.suggested_roles.map(r => `• ${r.title}: ${r.rationale}`).join('\n'),
      payload: data.suggested_roles, // contient hiralent_skill_tags
      aiModel: data.meta.ai_model,
      confidence: data.meta.confidence ?? null,
      stamp,
      suggestedActions: [
        lang === 'fr' ? 'Rédiger des JDs avec tags' :
        lang === 'ar' ? 'اكتب وصف وظائف مع الوسوم' :
        'Draft JDs with tags',
      ],
    });
  },
  { connection, concurrency: 2 }
);

worker.on('completed', (job) =>
  console.log(`[AI_SETUP] OK company=${(job.data as JobData).companyId}`)
);
worker.on('failed', (job, err) =>
  console.error(`[AI_SETUP] FAIL company=${(job?.data as JobData)?.companyId}`, err)
);
