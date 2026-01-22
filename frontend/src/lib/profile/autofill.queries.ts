// src/lib/profile/autofill.queries.ts
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// FIXED: Create axios instance with correct config
const api = axios.create({
  baseURL: `${API_ORIGIN}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

//  FIXED: Add auth interceptor
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken");

  console.log("🚀 AUTOFILL REQUEST", {
    url: `${config.baseURL}${config.url}`,
    hasAuth: !!token,
    data: config.data,
  });

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface AutofillSkill {
  skill_name: string;
  skill_category: string;
  proficiency: string;
  years_experience: number;
  source: string;
}

export interface AutofillExperience {
  job_title: string;
  company: string;
  duration: string;
  description: string;
}

export interface AutofillProject {
  name: string;
  description: string;
  technologies: string[];
}

export interface AutofillEducation {
  degree: string;
  institution: string;
  year: string;
  field: string;
  currently_studying?: boolean;
  honors?: string;
}

export interface AutofillCertification {
  name: string;
  issuer: string;
}

export interface AutofillLanguage {
  language: string;
  proficiency: string;
}

export interface AutofillPersonalInfo {
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  website: string;
  location: string;
}

export interface AutofillData {
  skills: AutofillSkill[];
  experience: AutofillExperience[];
  projects: AutofillProject[];
  education: AutofillEducation[];
  certifications: AutofillCertification[];
  languages: AutofillLanguage[];
  personal_info: AutofillPersonalInfo;
  headline: string;
  about_me: string;
}

export interface AutofillMapping {
  mapping_id: string;
  field_name: string;
  extracted_value: any;
  confidence: number;
  is_confirmed: boolean;
}

export interface AutofillPreviewResponse {
  success: boolean;
  data: {
    session_id: string;
    status: 'preview' | 'applied' | 'pending';
    parsed_data: AutofillData;
    mappings: AutofillMapping[];
    confidence_scores: Record<string, number>;
  };
  message: string;
}

//  FIXED: Correct endpoint

export const useAutofillPreview = (documentId: string | null, enabled: boolean = true) => {
  return useQuery<AutofillPreviewResponse>({
    queryKey: ['autofill-preview', documentId],
    queryFn: async () => {
      if (!documentId) {
        throw new Error('Document ID is required');
      }

      console.log('📤 [Attempt] Requesting autofill preview for document:', documentId);

      try {
        const response = await api.post('/candidates/profile/autofill/preview', {
          document_id: documentId
        });

        console.log('✅ [Success] Autofill preview loaded:', {
          skills: response.data?.data?.parsed_data?.skills?.length || 0,
          experience: response.data?.data?.parsed_data?.experience?.length || 0,
          education: response.data?.data?.parsed_data?.education?.length || 0,
        });

        return response.data;
      } catch (error: any) {
        const status = error?.response?.status;
        const message = error?.response?.data?.message;

        if (status === 409) {
          console.log('⏳ [Processing] CV still being analyzed, will retry...', message);
        } else {
          console.error('❌ [Error] Failed to get autofill preview:', {
            status,
            message,
            error: error?.response?.data?.error
          });
        }

        throw error;
      }
    },
    enabled: enabled && !!documentId,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      
      // Retry on 409 (still processing) up to 15 times (more attempts)
      if (status === 409 && failureCount < 15) {
        console.log(`🔄 [Retry ${failureCount + 1}/15] Waiting for CV processing...`);
        return true;
      }
      
      console.log(`⛔ [Stop] Max retries reached or different error (status: ${status})`);
      return false;
    },
    retryDelay: (attemptIndex) => {
      // Start with 2s, then 4s, 6s, 8s, max 10s
      const delay = Math.min(2000 + (attemptIndex * 2000), 10000);
      console.log(`⏱️ [Delay] Waiting ${delay/1000}s before next retry...`);
      return delay;
    },
    refetchInterval: false, // Don't auto-refetch
  });
};
// ✅ FIXED: Correct endpoint
export const useApplyAutofill = () => {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      console.log('📤 Applying autofill for session:', sessionId);
      
      const response = await api.post('/candidates/profile/autofill/apply', {
        session_id: sessionId
      });

      console.log('✅ Autofill apply response:', response.data);
      return response.data;
    },
  });
};

// Confirm specific field mapping
export const useConfirmMapping = () => {
  return useMutation({
    mutationFn: async ({ sessionId, mappingId }: { sessionId: string; mappingId: string }) => {
      const response = await api.post('/candidates/profile/autofill/confirm', {
        session_id: sessionId,
        mapping_id: mappingId
      });
      return response.data;
    },
  });
};

// Reject specific field mapping
export const useRejectMapping = () => {
  return useMutation({
    mutationFn: async ({ sessionId, mappingId }: { sessionId: string; mappingId: string }) => {
      const response = await api.post('/candidates/profile/autofill/reject', {
        session_id: sessionId,
        mapping_id: mappingId
      });
      return response.data;
    },
  });
};