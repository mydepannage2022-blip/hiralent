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
    reliabilityScore?: number; // based on telemetry + consistency
    riskLevel?: "low" | "medium" | "high";
    anomalies?: string[];
    timeManagement?: "good" | "average" | "poor";
  };

  /**
   * ✅ NEW: Radar categories recruiter-friendly (6–8 axes max)
   * This is what company UI should use.
   */
  radar_categories: RadarPointAI[];

  /**
   * Keep legacy radar_ai for compatibility (optional)
   * Could be same as radar_categories or more detailed.
   */
  radar_ai?: RadarPointAI[];

  strengths: Array<{ skill: string; evidenceQuestionIds: string[]; note?: string }>;
  weaknesses: Array<{ skill: string; evidenceQuestionIds: string[]; note?: string }>;
  recommendations: Array<{ skill: string; evidenceQuestionIds: string[]; note?: string }>;
  evidence_by_skill?: Record<string, Array<{ questionId: string; note?: string }>>;
  confidence?: number; // 0..1
};

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
    overallScore:
      typeof kpis.overallScore === "number" ? clamp0_100(kpis.overallScore) : undefined,
    passProbability:
      typeof kpis.passProbability === "number"
        ? Math.max(0, Math.min(100, Math.round(kpis.passProbability)))
        : undefined,
    reliabilityScore:
      typeof kpis.reliabilityScore === "number" ? clamp0_100(kpis.reliabilityScore) : undefined,
    riskLevel:
      kpis.riskLevel === "low" || kpis.riskLevel === "medium" || kpis.riskLevel === "high"
        ? kpis.riskLevel
        : undefined,
    anomalies: Array.isArray(kpis.anomalies) ? kpis.anomalies.map(String) : undefined,
    timeManagement:
      kpis.timeManagement === "good" ||
      kpis.timeManagement === "average" ||
      kpis.timeManagement === "poor"
        ? kpis.timeManagement
        : undefined,
  };

  const radar_categories = Array.isArray(raw?.radar_categories)
    ? raw.radar_categories.map(normalizeRadarPoint).filter(Boolean)
    : [];

  const radar_ai = Array.isArray(raw?.radar_ai)
    ? raw.radar_ai.map(normalizeRadarPoint).filter(Boolean)
    : undefined;

  const strengths = Array.isArray(raw?.strengths) ? raw.strengths : [];
  const weaknesses = Array.isArray(raw?.weaknesses) ? raw.weaknesses : [];
  const recommendations = Array.isArray(raw?.recommendations) ? raw.recommendations : [];

  return {
    summary,
    kpis: normalizedKpis,
    radar_categories: radar_categories as RadarPointAI[],
    radar_ai: radar_ai as RadarPointAI[] | undefined,
    strengths,
    weaknesses,
    recommendations,
    evidence_by_skill:
      raw?.evidence_by_skill && typeof raw.evidence_by_skill === "object"
        ? raw.evidence_by_skill
        : undefined,
    confidence: typeof raw?.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : 0.65,
  };
}

export async function generateAssessmentInsightWithGemini(payload: any): Promise<GeminiInsightOutput> {
  if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  /**
   * ✅ Key idea:
   * - We DO NOT hardcode categories.
   * - Gemini must cluster skillTags into 6–8 recruiter-friendly categories.
   * - Labels must be SHORT and readable.
   */
  const prompt = `
You are an expert technical assessment evaluator (HackerRank-style).

You receive a JSON payload containing:
- assessment info
- questions (type, difficulty, skillTags, canonicalSolution/testCases/correctAnswer)
- candidate answers (MCQ selections and coding submissions)
- execution results (tests, errors, runtime, score)
- telemetry summary (copy/paste, tab switch, focus lost, etc.)
- final scoring breakdown

Task:
1) Produce recruiter-friendly analytics: summary + KPIs + strengths/weaknesses/recommendations
2) Produce a SMART skill radar, but NOT by listing every skill tag.

Radar requirements (VERY IMPORTANT):
- Build radar_categories by CLUSTERING the raw skillTags and question patterns into 6 to 8 high-level categories.
- Each category label MUST be short (1 to 4 words) and readable by recruiters.
- Avoid duplicate/near-duplicate labels.
- Use evidenceQuestionIds to justify categories.
- Scores are 0–100 integers.
- Do NOT invent questionIds.

Output rules:
- Output MUST be valid JSON ONLY (no markdown, no commentary).
- If you are unsure, still output radar_categories with best-effort categories.

Return JSON with this schema:
{
  "summary": "string",
  "kpis": {
    "overallScore": 0,
    "passProbability": 0,
    "reliabilityScore": 0,
    "riskLevel": "low|medium|high",
    "anomalies": ["..."],
    "timeManagement": "good|average|poor"
  },
  "radar_categories": [
    { "label":"", "score":0, "evidenceQuestionIds":["..."], "note":"" }
  ],
  "radar_ai": [
    { "label":"", "score":0, "evidenceQuestionIds":["..."], "note":"" }
  ],
  "strengths": [ { "skill":"", "evidenceQuestionIds":["..."], "note":"" } ],
  "weaknesses": [ { "skill":"", "evidenceQuestionIds":["..."], "note":"" } ],
  "recommendations": [ { "skill":"", "evidenceQuestionIds":["..."], "note":"" } ],
  "evidence_by_skill": { "Skill":[{"questionId":"...","note":""}] },
  "confidence": 0.0
}

Payload:
${JSON.stringify(payload)}
`.trim();

  const resp = await model.generateContent(prompt);
  const text = resp.response.text().trim();

  let parsed = safeJsonParse<any>(text);

  // attempt extract JSON if model adds extra text
  if (!parsed) {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const sliced = text.slice(firstBrace, lastBrace + 1);
      parsed = safeJsonParse<any>(sliced);
    }
  }

  if (!parsed) throw new Error("GEMINI_OUTPUT_NOT_JSON");

  const normalized = normalizeOutput(parsed);

  // Must have at least some radar categories
  if (!Array.isArray(normalized.radar_categories) || normalized.radar_categories.length === 0) {
    normalized.radar_categories = [
      { label: "Overall", score: clamp0_100(payload?.final?.totalScore ?? payload?.final?.score ?? 0), evidenceQuestionIds: [], note: "Fallback radar" },
    ];
  }

  // Ensure max 8 axes
  normalized.radar_categories = normalized.radar_categories.slice(0, 8);

  return normalized;
}
