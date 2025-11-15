// src/lib/api/admin.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface LoginResponse {
  ok: boolean;
  success: boolean;
  tempToken?: string;
  requiresMFA?: boolean;
  mfaSetup?: boolean;
  error?: string;
}

interface SetupMFAResponse {
  ok: boolean;
  success: boolean;
  qrCode?: string;
  secret?: string;
  manualEntryKey?: string;
  error?: string;
}

interface VerifyMFAResponse {
  ok: boolean;
  success: boolean;
  sessionToken?: string;
  admin?: {
    user_id: string;
    email: string;
    full_name: string;
  };
  error?: string;
}

interface VerificationStats {
  totalPending: number;
  totalVerified: number;
  totalRejected: number;
  pendingOlderThan7Days: number;
  totalCompanies: number;
}

interface PendingCompany {
  company_id: string;
  company_name: string;
  display_name: string;
  industry: string;
  company_size: string;
  website: string;
  headquarters: string;
  registration_number: string;
  full_address: string;
  verification_status: string;
  verification_submitted_at: string;
  verification_notes: string | null;
  verified: boolean;
  user: {
    user_id: string;
    email: string;
    full_name: string;
    is_email_verified: boolean;
  };
}

class AdminAPI {
  // Step 1: Admin Login
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return await response.json();
    } catch (error) {
      return { ok: false, success: false, error: 'Connection failed' };
    }
  }

  // Step 2: Setup MFA
  async setupMFA(tempToken: string): Promise<SetupMFAResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/auth/setup-mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken }),
      });
      return await response.json();
    } catch (error) {
      return { ok: false, success: false, error: 'Connection failed' };
    }
  }

  // Step 3: Verify MFA
  async verifyMFA(tempToken: string, mfaToken: string): Promise<VerifyMFAResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/auth/verify-mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, mfaToken }),
      });
      return await response.json();
    } catch (error) {
      return { ok: false, success: false, error: 'Connection failed' };
    }
  }

  // Get Verification Statistics
  async getStats(sessionToken: string): Promise<{ ok: boolean; data?: VerificationStats; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/verifications/stats`, {
        headers: { 
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
      });
      return await response.json();
    } catch (error) {
      return { ok: false, error: 'Connection failed' };
    }
  }

  // Get Pending Verifications
  async getPendingVerifications(sessionToken: string): Promise<{ ok: boolean; data?: PendingCompany[]; count?: number; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/verifications/pending`, {
        headers: { 
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
      });
      return await response.json();
    } catch (error) {
      return { ok: false, error: 'Connection failed' };
    }
  }

  // Get Company Details
  async getCompanyDetails(sessionToken: string, companyId: string): Promise<{ ok: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/verifications/${companyId}`, {
        headers: { 
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
      });
      return await response.json();
    } catch (error) {
      return { ok: false, error: 'Connection failed' };
    }
  }

  // Approve Verification
  async approveVerification(sessionToken: string, companyId: string, notes?: string): Promise<{ ok: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/verifications/approve/${companyId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes }),
      });
      return await response.json();
    } catch (error) {
      return { ok: false, error: 'Connection failed' };
    }
  }

  // Reject Verification
  async rejectVerification(sessionToken: string, companyId: string, reason: string): Promise<{ ok: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/verifications/reject/${companyId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason }),
      });
      return await response.json();
    } catch (error) {
      return { ok: false, error: 'Connection failed' };
    }
  }
}

export const adminAPI = new AdminAPI();