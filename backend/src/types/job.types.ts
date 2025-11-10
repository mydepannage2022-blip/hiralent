import { JobStatus } from '@prisma/client';
import type { Request } from 'express';
import type { AuthUser } from '../types/express';
import type { ParamsDictionary } from 'express-serve-static-core';

export type JobType = 'full_time' | 'part_time' | 'contract' | 'internship';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'executive';
export type EducationLevel = 'high_school' | 'bachelor' | 'master' | 'phd';
export type RemoteOption = 'fully_remote' | 'hybrid' | 'office_only';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface Job {
  job_id: string;
  company_id: string;
  title: string;
  location: string;
  description: string;
  salary_range?: string | null;
  required_skills: string[];
  status: JobStatus;

  job_type?: JobType | null;
  experience_level?: ExperienceLevel | null;
  education_level?: EducationLevel | null;
  remote_option?: RemoteOption | null;
  urgency_level?: UrgencyLevel | null;
  department?: string | null;
  reporting_to?: string | null;
  team_size?: number | null;

  application_deadline?: Date | null;
  max_applications?: number | null;
  auto_reject_after?: number | null;
  screening_questions?: string[];
  visa_sponsored?: boolean | null;
  relocation_assistance?: boolean | null;

  created_at: Date;
  updated_at: Date;
}

export interface CreateJobRequest {
  title: string;
  location: string;
  description: string;

  salary_range?: string;
  required_skills?: string[];

  job_type?: JobType;
  experience_level?: ExperienceLevel;
  education_level?: EducationLevel;
  remote_option?: RemoteOption;
  urgency_level?: UrgencyLevel;
  department?: string;
  reporting_to?: string;
  team_size?: number;

  application_deadline?: string | Date;
  max_applications?: number;
  auto_reject_after?: number;
  screening_questions?: string[];

  visa_sponsored?: boolean;
  relocation_assistance?: boolean;
}

export interface UpdateJobRequest extends Partial<CreateJobRequest> {
  status?: JobStatus;
}

export interface JobListFilters {
  company_id?: string;
  status?: JobStatus | JobStatus[] | 'ALL';
  department?: string;
  job_type?: string;
  experience_level?: string;
  remote_option?: string;
  urgency_level?: string;
  created_from?: string;
  created_to?: string;
  search_term?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'status';
  sort_order?: 'asc' | 'desc';
}

export interface JobListResponse {
  jobs: Job[];
  total_count: number;
  page: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// Express Request with authenticated user
export type ReqWithUser<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> = Request<P, ResBody, ReqBody, ReqQuery> & { user: AuthUser };

// ===== Roles & Helpers =====

export const Roles = {
  CANDIDATE: 'candidate',
  COMPANY_ADMIN: 'company_admin',
  RECRUITER: 'recruiter', // recruiter is treated as internal/company user
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const;

export const isSuperadmin = (u?: AuthUser) => u?.role === Roles.SUPERADMIN;

export const isAdminLike = (u?: AuthUser) =>
  u?.role === Roles.ADMIN || u?.role === Roles.SUPERADMIN;

// Company users = company admin + recruiter + platform admins
export const isCompanyUser = (u?: AuthUser) =>
  u?.role === Roles.COMPANY_ADMIN ||
  u?.role === Roles.RECRUITER ||
  isAdminLike(u);

// Params
export type IdParam = ParamsDictionary & { id: string };
export type CompanyIdParam = ParamsDictionary & { companyId: string };
