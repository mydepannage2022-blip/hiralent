// lib/api/libraryQuestions.ts
import { API_V1_BASE } from "@/src/lib/config/api";

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'coding' | 'mcq';

export interface LibraryQuestion {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty | string;
  skillTags: string[];
  type: QuestionType | string;
  status: string;
  createdAt: string;
  source?: string;
  aiGenerated?: boolean;
}

export interface LibraryResponse {
  data: LibraryQuestion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchLibraryQuestions(params: {
  page?: number;
  limit?: number;
  difficulty?: Difficulty;
  type?: QuestionType;
  search?: string;
}, token?: string | null): Promise<LibraryResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('isLibrary', 'true');          // 👈 we use the backend filter
  searchParams.set('status', 'approved');        // only approved questions

  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.difficulty) searchParams.set('difficulty', params.difficulty);
  if (params.type) searchParams.set('type', params.type);
  if (params.search) searchParams.set('search', params.search);

  const res = await fetch(
    `${API_V1_BASE}/questions?${searchParams.toString()}`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) throw new Error(`Failed to fetch library questions (${res.status})`);

  const json = await res.json();

  // Your API sometimes returns {data}, sometimes {questions}
  const data = json.data || json.questions || [];
  const pagination = json.pagination || {
    page: params.page ?? 1,
    limit: params.limit ?? data.length,
    total: data.length,
    totalPages: 1,
  };

  return { data, pagination };
}
