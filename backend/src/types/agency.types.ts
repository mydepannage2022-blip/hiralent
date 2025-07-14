// src/types/agency.types.ts

export interface UpdateAgencyInput {
  name?: string;
  billing_contact_email?: string;
  logo_url?: string;
}

export interface AgencyDashboardResponse {
  agency: {
    agency_id: string;
    name: string;
    status: string;
    created_at: Date;
  };
  metrics: {
    total_jobs: number;
    active_jobs: number;
    total_recruiters: number;
    total_applications: number;
    recent_applications: number; // last 7 days
  };
  recent_activities: Array<{
    activity_type: string;
    description: string;
    timestamp: Date;
  }>;
}

export interface AgencyTeamResponse {
  recruiters: Array<{
    user_id: string;
    full_name: string;
    email: string;
    position?: string;
    status: string;
    joined_at: Date;
    last_active?: Date;
  }>;
  total_count: number;
  pending_invites: number;
}

export interface AgencySubscriptionResponse {
  plan: {
    plan_name: string;
    plan_type: string;
    job_posting_limit: number;
    recruiter_limit: number;
    price_per_month: number;
  };
  usage: {
    jobs_posted: number;
    recruiters_active: number;
  };
  billing: {
    next_billing_date: Date;
    payment_status: string;
  };
}

export interface Recruiter {
  user_id: string;
  full_name: string;
  email: string;
  position?: string;
  status: string;
  joined_at: Date;
  last_active?: Date;
}

export interface RecentActivity {
  activity_type: string;
  description: string;
  timestamp: Date;
}