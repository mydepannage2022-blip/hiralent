export type JobStatus =
  | "ACTIVE"
  | "DRAFT"
  | "PAUSED"
  | "CLOSED"
  | "CANCELLED"
  | "ARCHIVED";

export type JobType = "full_time" | "part_time" | "contract" | "internship";

export interface CompanyJob {
  job_id: string;
  title: string;
  location: string;
  description: string;
  salary_range: string | null;
  required_skills: string[];
  status: JobStatus;
  job_type: JobType | null;
  department: string | null;
  experience_level?: "entry" | "mid" | "senior" | "executive" | null;
  education_level?: "high_school" | "bachelor" | "master" | "phd" | null;
  remote_option?: "fully_remote" | "hybrid" | "office_only" | null;
  visa_sponsored?: boolean | null;
  relocation_assistance?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export type UpdateJobInput = Partial<Omit<CompanyJob, "job_id">> & {
  job_id: string;
};
