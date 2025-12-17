import type {
  SkillsAnalysis,
  ChatbotSession,
} from "../types/employerAssessment.types";

// ---------------- BASE URL ----------------
const AI_BASE_URL =
  process.env.AI_SERVICE_BASE_URL || "http://localhost:8001";

const BASE = `${AI_BASE_URL}/api/v1`;

// ============ JD PARSE TYPES (match FastAPI) ============

export interface JDParseApiRequest {
  job_description: string;
  job_title?: string;
}

export interface JDParseApiResponse {
  analysis: SkillsAnalysis;
  requirements: Record<string, any>; // v2 has structured object
}

// ============ CHATBOT TYPES (match FastAPI) ============

export interface ChatbotStartApiRequest {
  company_id: string;
  job_id?: string;
  initial_data?: Record<string, any>;
}

export interface ChatbotApiResponse {
  session: ChatbotSession;
  reply: string;
  is_completed: boolean;
}

// -------------- Helper: typed fetch wrapper ----------------
async function safeFetch<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, options);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI Service Error ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

// -------------- 1. CALL JD PARSER ----------------
export async function callJDParse(
  payload: JDParseApiRequest
): Promise<JDParseApiResponse> {
  return safeFetch<JDParseApiResponse>(`${BASE}/jd/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// -------------- 2. START CHATBOT SESSION --------------
export async function startChatbotSession(
  payload: ChatbotStartApiRequest
): Promise<ChatbotApiResponse> {
  return safeFetch<ChatbotApiResponse>(`${BASE}/chatbot/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// -------------- 3. SEND CHATBOT MESSAGE --------------
export async function sendChatbotMessage(
  payload: { session_id: string; message: string }
): Promise<ChatbotApiResponse> {
  return safeFetch<ChatbotApiResponse>(`${BASE}/chatbot/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
