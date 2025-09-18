// src/types/profile.ts

export interface ResumeQualityData {
  completionPercentage: number;
  suggestions: QualitySuggestion[];
}

export interface QualitySuggestion {
  id: string;
  text: string;
  percentage: number;
  completed: boolean;
}

export interface ResumeLink {
  url: string;
  qrCodeData: string;
}

export interface PersonalInformation {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | '';
  city: string;
  yearOfBirth: number;
  gender: 'male' | 'female' | 'other' | '';
}

export interface AboutMe {
  description: string;
}

export interface ProfessionalSkill {
  id: string;
  name: string;
  category: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface WorkExperience {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string | null;
  isCurrentJob: boolean;
  description: string;
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  startYear: number;
  endYear: number | null;
  isCurrentlyStudying: boolean;
  gpa?: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

export interface Language {
  id: string;
  name: string;
  proficiency: 'basic' | 'conversational' | 'business' | 'native';
}

export interface JobPreference {
  id: string;
  preferredRole: string;
  preferredIndustry: string;
  preferredLocation: string;
  salaryExpectation: {
    min: number;
    max: number;
    currency: string;
  };
  jobType: 'full_time' | 'part_time' | 'contract' | 'freelance';
  remotePreference: 'remote' | 'hybrid' | 'onsite';
}

export interface JobBenefit {
  id: string;
  benefit: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CandidateProfile {
  personalInfo: PersonalInformation;
  aboutMe: AboutMe;
  skills: ProfessionalSkill[];
  workExperience: WorkExperience[];
  education: Education[];
  languages: Language[];
  socialLinks: SocialLink[];
  jobPreferences: JobPreference;
  preferredBenefits: JobBenefit[];
}

export interface ResumeUploadData {
  file: File | null;
  uploadProgress: number;
  isUploading: boolean;
  uploadType: 'profile_building' | 'application_specific';
}