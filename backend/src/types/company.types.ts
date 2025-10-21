// Types for company profile data
export interface CreateCompanyProfileData {
  company_name: string;
  industry: string;
  company_size: string;
  website?: string;
  location: string;
  description: string;
  display_name?: string;
  headquarters?: string;
  founded_year?: number;
  contact_number?: string;
  linkedin_profile?: string;
  twitter_handle?: string;
  facebook_page?: string;
  business_type?: string;
  employee_count?: number;
  remote_policy?: string;
  registration_number: string;
  full_address: string;        
}

export interface UpdateCompanyProfileData {
  company_name?: string;
  display_name?: string;
  industry?: string;
  company_size?: string;
  website?: string;
  headquarters?: string;
  founded_year?: number;
  description?: string;
  contact_number?: string;
  linkedin_profile?: string;
  twitter_handle?: string;
  facebook_page?: string;
  business_type?: string;
  employee_count?: number;
  remote_policy?: string;
  registration_number?: string; 
  full_address?: string;        
}
