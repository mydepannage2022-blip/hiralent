import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Simple interceptor - just add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Profile Completeness Response Type
export interface ProfileCompletenessResponse {
  success: boolean;
  data: any;
  message: string;
}

// Simple API call for profile completeness
export const getProfileCompleteness = async (): Promise<ProfileCompletenessResponse> => {
  const response = await api.get('/candidates/completeness');
  return response.data;
};

// ✅ NEW: Get candidate profile (same structure as login response)
export const getCandidateProfile = async (): Promise<APIResponse> => {
  const response = await api.get('/candidates/profile');
  return response.data;
};


// ✅ Get public profile (no auth required)
export const getPublicProfile = async (candidateId: string): Promise<APIResponse> => {
  console.log('🚀 API Call - candidateId:', candidateId);
  console.log('🌐 Base URL:', process.env.NEXT_PUBLIC_BASE_URL);
  
  // Create separate axios instance without auth interceptor for public calls
  const publicApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000',
    headers: { 'Content-Type': 'application/json' },
  });
  
  const url = `/candidates/public-profile/${candidateId}`;
  console.log('📡 Request URL:', `${publicApi.defaults.baseURL}${url}`);
  
  try {
    const response = await publicApi.get(url);
    console.log('✅ Success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('❌ Status:', error.response?.status);
    console.error('❌ Data:', error.response?.data);
    throw error;
  }
};


// ==================== TYPE DEFINITIONS ====================

export interface BasicInfoData {
  full_name?: string;
  phone_number?: string;
  about_me?: string;
  location?: string;
}

export interface SkillData {
  skill_id?: string;       
  skill_name: string;
  skill_category: 'technical' | 'soft' | 'language' | 'certification';
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience?: number;
  source_type?: string;   
  is_verified?: boolean;
}

export interface ExperienceData {
  job_title: string;
  company: string;
  duration: string;
  years: number;
  description: string;
  currently_working: boolean;
  start_date?: string;
  end_date?: string;
}

export interface EducationData {
  degree: string;
  institution: string;
  year: string;
  field: string;
  grade?: string;
  currently_studying: boolean;
}

export interface SocialLinkData {
  platform: string;
  url: string;
  display_name: string;
}

export interface JobBenefitData {
  benefit_type: string;
  importance: string;
  notes?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  error: string | null;
}

// ==================== BASIC INFO APIs ====================

export const updateBasicInfo = async (data: BasicInfoData): Promise<APIResponse> => {
  const response = await api.put('/candidates/profile/basic-info', data);
  return response.data;
};

// ==================== SKILLS APIs ====================

export const updateSkills = async (skills: SkillData[]): Promise<APIResponse> => {
  const response = await api.put('/candidates/profile/skills', { skills });
  return response.data;
};

export const addSkill = async (skill: SkillData): Promise<APIResponse> => {
  const response = await api.post('/candidates/profile/skills', skill);
  return response.data;
};

export const deleteSkill = async (skillId: string): Promise<APIResponse> => {
  const response = await api.delete(`/candidates/profile/skills/${skillId}`);
  return response.data;
};

// ==================== EXPERIENCE APIs ====================

export const updateExperience = async (experiences: ExperienceData[]): Promise<APIResponse> => {
  const response = await api.put('/candidates/profile/experience', { experiences });
  return response.data;
};

export const addExperience = async (experience: ExperienceData): Promise<APIResponse> => {
  const response = await api.post('/candidates/profile/experience', experience);
  return response.data;
};

// ==================== EDUCATION APIs ====================

export const updateEducation = async (education: EducationData[]): Promise<APIResponse> => {
  const response = await api.put('/candidates/profile/education', { education });
  return response.data;
};

export const addEducation = async (education: EducationData): Promise<APIResponse> => {
  const response = await api.post('/candidates/profile/education', education);
  return response.data;
};

// ==================== SOCIAL LINKS APIs ====================

export const updateLinks = async (links: SocialLinkData[]): Promise<APIResponse> => {
  const response = await api.put('/candidates/profile/links', { links });
  return response.data;
};

export const addLink = async (link: SocialLinkData): Promise<APIResponse> => {
  const response = await api.post('/candidates/profile/links', link);
  return response.data;
};

export const deleteLink = async (linkIndex: number): Promise<APIResponse> => {
  const response = await api.delete(`/candidates/profile/links/${linkIndex}`);
  return response.data;
};

// ==================== JOB BENEFITS APIs ====================

export const updateJobBenefits = async (jobBenefits: JobBenefitData[]): Promise<APIResponse> => {
  const response = await api.put('/candidates/profile/job-benefits', { job_benefits: jobBenefits });
  return response.data;
};

// ==================== PROFILE PICTURE API ====================

export const uploadProfilePicture = async (image: File): Promise<APIResponse> => {
  const formData = new FormData();
  formData.append('profilePicture', image);
  
  const response = await api.post('/candidates/profile-picture-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// ==================== BULK UPDATE API ====================

export const bulkUpdateProfile = async (data: {
  basic_info?: BasicInfoData;
  skills?: SkillData[];
  experience?: ExperienceData[];
  education?: EducationData[];
  links?: SocialLinkData[];
  job_benefits?: JobBenefitData[];
}): Promise<APIResponse> => {
  const response = await api.put('/candidates/profile/bulk', data);
  return response.data;
};

export const uploadApplicationResume = async (resume: File) => {
  const formData = new FormData();
  formData.append('cv', resume); // ✅ Same field name as profile-upload ('cv')

  const response = await api.post('/candidates/application-resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};