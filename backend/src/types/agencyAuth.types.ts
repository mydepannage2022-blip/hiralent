export interface CreateAgencyInput {
  name: string;
  website?: string;
  billing_contact_email: string;
}

export interface InviteRecruiterInput {
  full_name: string;
  email: string;
  position?: string;
}

export interface AgencyAdminProfileInput {
  phone_number: string;
  position?: string;
  linkedin_url?: string;
  company_role?: string;
  branding_notes?: string;
}

export interface AuthContextResponse {
  user: {
    user_id: string;
    email: string;
    role: string;
    is_email_verified: boolean;
    full_name?: string;
    phone_number?: string | null;
    position?: string | null;
    linkedin_url?: string | null;
    company_role?: string | null;
    branding_notes?: string | null;
    created_at: Date;
    updated_at: Date;
    last_login_at?: Date | null;
  };
  agency: {
    agency_id: string;
    name: string;
    website?: string | null;
    billing_contact_email: string;
    logo_url?: string | null;
    status: string;
    created_at: Date;
    updated_at: Date;
  } | null;
}

export interface ApproveAgencyInput {
  approved_by: string;
  approval_notes?: string;
}
