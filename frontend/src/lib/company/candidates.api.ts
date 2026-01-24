import type {
  InternalCandidateDetailsDTO,
  InternalCandidateListItemDTO,
} from "../../../src/types/company.candidates.internal.types";
import type {
  ExternalCandidateDetailsDTO,
  ExternalCandidateListItemDTO,
} from "../../../src/types/company.candidates.external.types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ✅ MOCK DATA (replace later with real API)
const MOCK_INTERNAL: InternalCandidateListItemDTO[] = [
  {
    candidate_id: "cnd_001",
    full_name: "Ihssane EL FASSIHY",
    headline: "AI Engineer • Multi-agent Systems • RAG",
    location: "Casablanca, MA",
    experience_level: "mid",
    skills: ["python", "fastapi", "docker", "qdrant", "nodejs"],
    fit_score: 92,
    applied_count: 3,
    profile_picture_url: "/images/candidate.jpg",
  },
  {
    candidate_id: "cnd_002",
    full_name: "Sara Benali",
    headline: "Data Engineer • Spark • Airflow",
    location: "Rabat, MA",
    experience_level: "junior",
    skills: ["python", "pyspark", "airflow", "postgresql"],
    fit_score: 78,
    applied_count: 1,
    profile_picture_url: "/images/candidate.jpg",
  },
];

const MOCK_EXTERNAL: ExternalCandidateListItemDTO[] = [
  {
    source_id: "src_001",
    source: "linkedin",
    full_name: "Adam El Idrissi",
    headline: "Backend Engineer (Node.js)",
    location: "Remote",
    skills: ["nodejs", "nestjs", "postgresql", "redis"],
    fit_score: 84,
    profile_url: "https://linkedin.com",
  },
  {
    source_id: "src_002",
    source: "github",
    full_name: "Yasmine A.",
    headline: "ML Engineer • NLP",
    location: "Marrakech, MA",
    skills: ["python", "pytorch", "transformers", "mlops"],
    fit_score: 81,
    profile_url: "https://github.com",
  },
];

export async function listInternalCandidates(params?: {
  q?: string;
  minScore?: number;
}): Promise<InternalCandidateListItemDTO[]> {
  await sleep(250);

  const q = (params?.q ?? "").trim().toLowerCase();
  const minScore = params?.minScore ?? 0;

  return MOCK_INTERNAL
    .filter((c) => (c.fit_score ?? 0) >= minScore)
    .filter((c) => {
      if (!q) return true;
      const hay = [
        c.full_name,
        c.headline ?? "",
        c.location ?? "",
        ...(c.skills ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0));
}

export async function getInternalCandidateDetails(
  candidateId: string
): Promise<InternalCandidateDetailsDTO | null> {
  await sleep(200);
  const base = MOCK_INTERNAL.find((x) => x.candidate_id === candidateId);
  if (!base) return null;

  return {
    ...base,
    email: "candidate@example.com",
    phone: null,
    about_me: "Motivated candidate with strong engineering mindset.",
    education: [{ school: "ENSAM Casablanca", degree: "Engineering", year: "2026" }],
    experiences: [{ company: "Fronx Solutions", role: "AI Intern", from: "2025", to: null }],
    projects: [{ title: "KnowFlow", description: "Adaptive multi-agent orchestration platform" }],
  };
}

export async function listExternalCandidates(params?: {
  q?: string;
  minScore?: number;
  source?: string;
}): Promise<ExternalCandidateListItemDTO[]> {
  await sleep(250);

  const q = (params?.q ?? "").trim().toLowerCase();
  const minScore = params?.minScore ?? 0;
  const source = (params?.source ?? "").trim().toLowerCase();

  return MOCK_EXTERNAL
    .filter((c) => (c.fit_score ?? 0) >= minScore)
    .filter((c) => (source ? c.source.toLowerCase() === source : true))
    .filter((c) => {
      if (!q) return true;
      const hay = [
        c.full_name,
        c.headline ?? "",
        c.location ?? "",
        ...(c.skills ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0));
}

export async function getExternalCandidateDetails(
  sourceId: string
): Promise<ExternalCandidateDetailsDTO | null> {
  await sleep(200);
  const base = MOCK_EXTERNAL.find((x) => x.source_id === sourceId);
  if (!base) return null;

  return {
    ...base,
    summary: "Scraped profile summary (placeholder).",
    experiences: [{ company: "Some Company", role: "Engineer", period: "2023 - 2025" }],
    education: [{ school: "University", degree: "CS" }],
    extracted_from: "linkedin_search: data engineer",
  };
}
