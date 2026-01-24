// src/lib/profile/autofill.queries.ts
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useProfile } from '@/src/context/ProfileContext';
import { useAuth } from '@/src/context/AuthContext';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_ORIGIN}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
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

export const useAutofillPreview = (documentId: string | null, enabled: boolean = true) => {
  return useQuery<AutofillPreviewResponse>({
    queryKey: ['autofill-preview', documentId],
    queryFn: async () => {
      if (!documentId) throw new Error('Document ID is required');

      console.log('📤 Requesting autofill preview for document:', documentId);

      const response = await api.post('/candidates/profile/autofill/preview', {
        document_id: documentId
      });

      console.log('✅ Autofill preview loaded:', response.data);
      return response.data;
    },
    enabled: enabled && !!documentId,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 409 && failureCount < 15) {
        console.log(`🔄 Retry ${failureCount + 1}/15: Waiting for CV processing...`);
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(2000 + (attemptIndex * 2000), 10000),
  });
};

// ✅ FIXED: Added ProfileContext and AuthContext integration
export const useApplyAutofill = () => {
  const { refetch: refetchProfile } = useProfile();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      console.log('📤 Applying autofill for session:', sessionId);
      
      const response = await api.post('/candidates/profile/autofill/apply', {
        session_id: sessionId
      });

      console.log('✅ Autofill apply response:', response.data);
      return response.data;
    },
    onSuccess: async (data) => {
      console.log('✅ Autofill applied successfully:', data);
      toast.success('CV data applied successfully!');
      
      // ✅ Force refresh ProfileContext
      await refetchProfile();
      
      // ✅ Clear localStorage to force fresh fetch
      if (typeof window !== 'undefined') {
        localStorage.removeItem('profileData');
        localStorage.removeItem('profileCompleteness');
      }
    },
    onError: (error: any) => {
      console.error('❌ Apply autofill failed:', error);
      toast.error('Failed to apply CV data');
    }
  });
};

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