export type AgencyType = "VISA" | "RELOCATION" | "INTEGRATION";

export interface Candidate {
  user_id: string;
  email: string;
  full_name: string;
  phone_number?: string;
}

export interface ValidationSignal {
  signal_type: string;
  passed: boolean;
  score: number;
  details: string;
}

export interface ValidationIssue {
  type: string;
  severity: "warning" | "error";
  message: string;
}

export interface Document {
  is_active: boolean;
  document_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: string;
  notes?: string;
  review_feedback?: string;
  created_at: string;

  ai_validation_status?: "valid" | "invalid" | "needs_review" | null;
  ai_confidence_score?: number | null;
  ai_extracted_data?: Record<string, any> | null;
  ai_validation_signals?: ValidationSignal[] | null;
  ai_validation_issues?: ValidationIssue[] | null;
  ai_validated_at?: string | null;
}

export interface EmbassySubmission {
  submission_id: string;
  embassy_name: string;
  embassy_location: string;
  submission_date: string;
  tracking_number?: string;
  expected_response?: string;
  receipt_url?: string;
  status: string;
  interview_date?: string;
  interview_location?: string;
  interview_notes?: string;
  decision_date?: string;
  decision_notes?: string;
}

export interface IntegrationService {
  service_id: string;
  case_id: string;
  service_type: string;
  status: string;
  service_date?: string | null;
  proof_document?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Case {
  case_id: string;
  case_number: string;
  service_type: string;
  serviceTypeForAgency?: string;
  priority_level: string;
  status: string;
  statusForAgency?: string;
  activeForAgency?: boolean;
  completedForAgency?: boolean;
  origin_country: string;
  destination_country: string;
  destination_city?: string;
  estimated_completion?: string;
  estimated_cost?: number;
  notes?: string;
  created_at: string;
  candidate: Candidate;
  documents: Document[];
  embassy_submission?: EmbassySubmission;
  agency?: {
    agency_id: string;
    name: string;
    type: AgencyType;
  };
  viewing_agency_type?: AgencyType | null;

  // Integration fields
  integration_agency_id?: string | null;
  integrationAgency?: {
    agency_id: string;
    name: string;
    email?: string;
    phone?: string;
    type: AgencyType;
  } | null;
  integrationServices?: IntegrationService[];

  // RELOCATION fields
  housing_type?: string;
  housing_address?: string;
  monthly_rent_mad?: number;
  agency_fee_amount?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  housing_contract_url?: string;
  utility_water?: string;
  utility_electricity?: string;
  utility_internet?: string;
  arrival_date?: string;
  flight_number?: string;
  airport_pickup_required?: boolean;
  arrival_notes?: string;
}
