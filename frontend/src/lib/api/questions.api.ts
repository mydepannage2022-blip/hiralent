const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Question {
  id: string;
  title: string;
  description: string;
  problemStatement: string;
  difficulty: 'easy' | 'medium' | 'hard';
  skillTags: string[];
  type: string;
  canonicalSolution: string;
  testCases: any;
  status: string;
  aiGenerated?: boolean;
  source?: string;
  createdAt: string;
  updatedAt: string;
  views?: number;
  submissions?: number;
  successRate?: number;
}

export interface QuestionFilters {
  page?: number;
  limit?: number;
  difficulty?: string;
  status?: string;
  search?: string;
}

export interface QuestionResponse {
  success: boolean;
  question?: Question;
  questions?: Question[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
}

class QuestionAPI {
  async getAll(filters: QuestionFilters = {}): Promise<QuestionResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await fetch(`${API_BASE}/questions?${params}`);
    return response.json();
  }

  async getById(id: string): Promise<QuestionResponse> {
    const response = await fetch(`${API_BASE}/questions/${id}`);
    return response.json();
  }

  async create(data: Partial<Question>): Promise<QuestionResponse> {
    const response = await fetch(`${API_BASE}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async update(id: string, data: Partial<Question>): Promise<QuestionResponse> {
    const response = await fetch(`${API_BASE}/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async delete(id: string): Promise<QuestionResponse> {
    const response = await fetch(`${API_BASE}/questions/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  }

  async approve(id: string): Promise<QuestionResponse> {
    const response = await fetch(`${API_BASE}/questions/${id}/approve`, {
      method: 'PATCH'
    });
    return response.json();
  }

  async reject(id: string): Promise<QuestionResponse> {
    const response = await fetch(`${API_BASE}/questions/${id}/reject`, {
      method: 'PATCH'
    });
    return response.json();
  }

  async generate(topic: string, difficulty: string = 'medium'): Promise<QuestionResponse> {
    const response = await fetch(`${API_BASE}/questions/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, difficulty })
    });
    return response.json();
  }

  async getStats(): Promise<any> {
    const response = await fetch(`${API_BASE}/questions/stats/overview`);
    return response.json();
  }

  async bulkApprove(ids: string[]): Promise<QuestionResponse> {
    const response = await fetch(`${API_BASE}/questions/bulk/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    return response.json();
  }

  async bulkDelete(ids: string[]): Promise<QuestionResponse> {
    const response = await fetch(`${API_BASE}/questions/bulk/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    return response.json();
  }
}

export const questionAPI = new QuestionAPI();