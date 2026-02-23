export interface Document {
  document_id: string;
  file_name: string;
  document_type: string;
  status: string;
  created_at: string;
}

export interface Case {
  case_id: string;
  case_number: string;
  candidate_id: string;
  service_type: string;
  serviceTypeForAgency?: string;
  viewing_agency_type?: "VISA" | "RELOCATION" | "INTEGRATION";
  status: string;
  statusForAgency?: string;
  completedForAgency?: boolean;
  activeForAgency?: boolean;
  priority_level: string;
  origin_country: string;
  destination_country: string;
  destination_city: string | null;
  estimated_completion: string | null;
  estimated_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  candidate: {
    user_id: string;
    email: string;
    full_name: string;
    phone_number: string | null;
  };
  documents?: Document[];

  // Housing fields (flattened by backend for housing agencies)
  housing_type?: string;
  housing_address?: string;
  monthly_rent_mad?: number;
  agency_fee_amount?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  utility_water?: string;
  utility_electricity?: string;
  utility_internet?: string;
  arrival_date?: string;
  flight_number?: string;
}

export type AgencyType = "VISA" | "RELOCATION" | "INTEGRATION";

export type UpdateEditedCase = (patch: Partial<Case>) => void;

export function getAssignedAndUpdated(createdAt: string, updatedAt: string) {
  const assigned = new Date(createdAt);
  const updated = new Date(updatedAt);
  const hasMeaningfulUpdate = updated.getTime() - assigned.getTime() > 60 * 1000;
  return {
    assigned,
    updated: hasMeaningfulUpdate ? updated : assigned,
  };
}
