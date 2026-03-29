import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

if (!apiKey) {
  console.warn("⚠️ GEMINI_API_KEY is missing. Insight generation will fail.");
}

export type RadarPointAI = {
  label: string;
  score: number; // 0-100
  evidenceQuestionIds: string[];
  note?: string;
};

export type GeminiInsightOutput = {
  summary: string;
  kpis: {
    overallScore?: number;
    passProbability?: number;
    reliabilityScore?: number;
    riskLevel?: "low" | "medium" | "high";
    anomalies?: string[];
    timeManagement?: "good" | "average" | "poor";
  };
  radar_categories: RadarPointAI[];
  radar_ai?: RadarPointAI[];
  strengths: Array<{ skill: string; evidenceQuestionIds: string[]; note?: string }>;
  weaknesses: Array<{ skill: string; evidenceQuestionIds: string[]; note?: string }>;
  recommendations: Array<{ skill: string; evidenceQuestionIds: string[]; note?: string }>;
  evidence_by_skill?: Record<string, Array<{ questionId: string; note?: string }>>;
  confidence?: number;
};

/* ─────────────────────────── ID anonymization ─────────────────────────── */

/**
 * Builds a stable mapping: real questionId → "Q1", "Q2", etc.
 * Used to anonymize IDs before sending to Gemini AND to re-map them back.
 */
function buildIdMap(payload: any): Map<string, string> {
  const map = new Map<string, string>();
  let counter = 1;

  function collect(v: any) {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) { v.forEach(collect); return; }

    // Common ID field names used in your payload
    const idFields = ["questionId", "question_id", "id", "sessionQuestionId"];
    for (const field of idFields) {
      if (typeof v[field] === "string" && v[field].length > 8) {
        const real = v[field];
        if (!map.has(real)) {
          map.set(real, `Q${counter++}`);
        }
      }
    }
    Object.values(v).forEach(collect);
  }

  collect(payload);
  return map;
}

/**
 * Deep-replaces all real IDs in a plain object/string with their aliases.
 */
function anonymize(value: any, map: Map<string, string>): any {
  if (typeof value === "string") {
    let result = value;
    map.forEach((alias, realId) => {
      result = result.split(realId).join(alias);
    });
    return result;
  }
  if (Array.isArray(value)) return value.map((v) => anonymize(v, map));
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = anonymize(v, map);
    }
    return out;
  }
  return value;
}

/**
 * Deep-replaces all aliases back to real IDs in Gemini's output.
 * Used to restore evidenceQuestionIds so the frontend still works.
 */
function deanonymize(value: any, reverseMap: Map<string, string>): any {
  if (typeof value === "string") {
    let result = value;
    reverseMap.forEach((realId, alias) => {
      result = result.split(alias).join(realId);
    });
    return result;
  }
  if (Array.isArray(value)) return value.map((v) => deanonymize(v, reverseMap));
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = deanonymize(v, reverseMap);
    }
    return out;
  }
  return value;
}

/* ─────────────────────────── helpers ─────────────────────────── */

function safeJsonParse<T>(txt: string): T | null {
  try {
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

function clamp0_100(n: any) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function normalizeRadarPoint(p: any): RadarPointAI | null {
  if (!p || typeof p !== "object") return null;
  const label = String(p.label ?? "").trim();
  if (!label) return null;
  const score = clamp0_100(p.score);
  const evidence = Array.isArray(p.evidenceQuestionIds)
    ? p.evidenceQuestionIds.map(String).filter(Boolean)
    : [];
  return {
    label,
    score,
    evidenceQuestionIds: evidence,
    note: p.note ? String(p.note) : undefined,
  };
}

function normalizeOutput(raw: any): GeminiInsightOutput {
  const summary = raw?.summary ? String(raw.summary) : "";
  const kpis = raw?.kpis && typeof raw.kpis === "object" ? raw.kpis : {};
  const normalizedKpis = {
    overallScore: typeof kpis.overallScore === "number" ? clamp0_100(kpis.overallScore) : undefined,
    passProbability: typeof kpis.passProbability === "number" ? Math.max(0, Math.min(100, Math.round(kpis.passProbability))) : undefined,
    reliabilityScore: typeof kpis.reliabilityScore === "number" ? clamp0_100(kpis.reliabilityScore) : undefined,
    riskLevel: kpis.riskLevel === "low" || kpis.riskLevel === "medium" || kpis.riskLevel === "high" ? kpis.riskLevel : undefined,
    anomalies: Array.isArray(kpis.anomalies) ? kpis.anomalies.map(String) : undefined,
    timeManagement: kpis.timeManagement === "good" || kpis.timeManagement === "average" || kpis.timeManagement === "poor" ? kpis.timeManagement : undefined,
  };
  const radar_categories = Array.isArray(raw?.radar_categories)
    ? raw.radar_categories.map(normalizeRadarPoint).filter(Boolean)
    : [];
  const radar_ai = Array.isArray(raw?.radar_ai)
    ? raw.radar_ai.map(normalizeRadarPoint).filter(Boolean)
    : undefined;

  return {
    summary,
    kpis: normalizedKpis,
    radar_categories: radar_categories as RadarPointAI[],
    radar_ai: radar_ai as RadarPointAI[] | undefined,
    strengths: Array.isArray(raw?.strengths) ? raw.strengths : [],
    weaknesses: Array.isArray(raw?.weaknesses) ? raw.weaknesses : [],
    recommendations: Array.isArray(raw?.recommendations) ? raw.recommendations : [],
    evidence_by_skill: raw?.evidence_by_skill && typeof raw.evidence_by_skill === "object" ? raw.evidence_by_skill : undefined,
    confidence: typeof raw?.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : 0.65,
  };
}

/* ─────────────────────────── main export ─────────────────────────── */

export async function generateAssessmentInsightWithGemini(payload: any): Promise<GeminiInsightOutput> {
  if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");

  // 1. Build ID alias map  (real → "Q1", "Q2", ...)
  const idMap = buildIdMap(payload);
  const reverseMap = new Map<string, string>();
  idMap.forEach((alias, real) => reverseMap.set(alias, real));

  // 2. Anonymize the payload before sending to Gemini
  const anonymizedPayload = anonymize(payload, idMap);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
You are an expert technical assessment evaluator (HackerRank-style).

You receive a JSON payload containing:
- assessment info
- questions (type, difficulty, skillTags, canonicalSolution/testCases/correctAnswer)
- candidate answers (MCQ selections and coding submissions)
- execution results (tests, errors, runtime, score)
- telemetry summary (copy/paste, tab switch, focus lost, etc.)
- final scoring breakdown

Question IDs in this payload are short aliases like "Q1", "Q2", etc.

IMPORTANT — NEVER expose question IDs in human-readable text fields:
- In "anomalies", "summary", "note" fields: describe issues using skill names and patterns only.
  ✅ Good: "Significant performance variation across string manipulation tasks"
  ❌ Bad:  "Performance variation (Q3 vs Q7)"
- You MAY include question ID aliases (Q1, Q2, ...) ONLY inside the "evidenceQuestionIds" arrays.

Task:
1) Produce recruiter-friendly analytics: summary + KPIs + strengths/weaknesses/recommendations
2) Produce a SMART skill radar, clustering skillTags into 6–8 high-level categories.

Radar requirements:
- Build radar_categories by CLUSTERING the raw skillTags and question patterns into 6 to 8 high-level categories.
- Each category label MUST be short (1 to 4 words) and readable by recruiters.
- Avoid duplicate/near-duplicate labels.
- Use evidenceQuestionIds (aliases like Q1, Q2) to justify categories.
- Scores are 0–100 integers.

Output rules:
- Output MUST be valid JSON ONLY (no markdown, no commentary).

Return JSON with this schema:
{
  "summary": "string",
  "kpis": {
    "overallScore": 0,
    "passProbability": 0,
    "reliabilityScore": 0,
    "riskLevel": "low|medium|high",
    "anomalies": ["describe patterns without IDs"],
    "timeManagement": "good|average|poor"
  },
  "radar_categories": [
    { "label":"", "score":0, "evidenceQuestionIds":["Q1","Q2"], "note":"" }
  ],
  "radar_ai": [
    { "label":"", "score":0, "evidenceQuestionIds":["Q1"], "note":"" }
  ],
  "strengths": [ { "skill":"", "evidenceQuestionIds":["Q1"], "note":"" } ],
  "weaknesses": [ { "skill":"", "evidenceQuestionIds":["Q1"], "note":"" } ],
  "recommendations": [ { "skill":"", "evidenceQuestionIds":["Q1"], "note":"" } ],
  "evidence_by_skill": { "Skill":[{"questionId":"Q1","note":""}] },
  "confidence": 0.0
}

Payload:
${JSON.stringify(anonymizedPayload)}
`.trim();

  const resp = await model.generateContent(prompt);
  const text = resp.response.text().trim();

  let parsed = safeJsonParse<any>(text);

  if (!parsed) {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      parsed = safeJsonParse<any>(text.slice(firstBrace, lastBrace + 1));
    }
  }

  if (!parsed) throw new Error("GEMINI_OUTPUT_NOT_JSON");

  // 3. Restore real IDs in evidenceQuestionIds arrays (so frontend still works)
  //    but NOT in text fields — those stay clean
  const restoredParsed = restoreEvidenceIds(parsed, reverseMap);

  const normalized = normalizeOutput(restoredParsed);

  if (!Array.isArray(normalized.radar_categories) || normalized.radar_categories.length === 0) {
    normalized.radar_categories = [
      { label: "Overall", score: clamp0_100(payload?.final?.totalScore ?? payload?.final?.score ?? 0), evidenceQuestionIds: [], note: "Fallback radar" },
    ];
  }

  normalized.radar_categories = normalized.radar_categories.slice(0, 8);

  return normalized;
}

/**
 * Restores real IDs only inside evidenceQuestionIds arrays and evidence_by_skill keys,
 * leaving all human-readable text fields (anomalies, notes, summary) untouched.
 */
function restoreEvidenceIds(raw: any, reverseMap: Map<string, string>): any {
  if (!raw || typeof raw !== "object") return raw;

  function restoreIdArray(arr: any[]): string[] {
    return arr.map((id) => {
      const real = reverseMap.get(String(id));
      return real ?? String(id);
    });
  }

  function restoreItem(item: any): any {
    if (!item || typeof item !== "object") return item;
    return {
      ...item,
      evidenceQuestionIds: Array.isArray(item.evidenceQuestionIds)
        ? restoreIdArray(item.evidenceQuestionIds)
        : item.evidenceQuestionIds,
    };
  }

  const out = { ...raw };

  // radar_categories, radar_ai, strengths, weaknesses, recommendations
  for (const field of ["radar_categories", "radar_ai", "strengths", "weaknesses", "recommendations"]) {
    if (Array.isArray(out[field])) {
      out[field] = out[field].map(restoreItem);
    }
  }

  // evidence_by_skill: keys are skill names (fine), values have questionId fields
  if (out.evidence_by_skill && typeof out.evidence_by_skill === "object") {
    const restored: any = {};
    for (const [skill, entries] of Object.entries(out.evidence_by_skill)) {
      restored[skill] = Array.isArray(entries)
        ? entries.map((e: any) => ({
            ...e,
            questionId: reverseMap.get(String(e.questionId)) ?? e.questionId,
          }))
        : entries;
    }
    out.evidence_by_skill = restored;
  }

  // kpis.anomalies — keep as-is (text only, no IDs)
  return out;
}