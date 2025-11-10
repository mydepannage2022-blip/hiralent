import { AdminAuthService } from './admin-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

class AdminAPIClient {
  private async request(endpoint: string, options: RequestInit = {}) {
    const token = AdminAuthService.getSessionToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      AdminAuthService.logout();
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return await response.json();
  }

  // Verification Stats
  async getVerificationStats() {
    return this.request('/admin/verifications/stats');
  }

  // Pending Verifications
  async getPendingVerifications() {
    return this.request('/verifications/pending');
  }

  // Company Details
  async getCompanyDetails(companyId: string) {
    return this.request(`/verifications/${companyId}`);
  }

  // Approve Verification
  async approveVerification(companyId: string, notes?: string) {
    return this.request(`/verifications/approve/${companyId}`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  // Reject Verification
  async rejectVerification(companyId: string, reason: string) {
    return this.request(`/verifications/reject/${companyId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
}

export const adminAPI = new AdminAPIClient();