import jwtDecode from 'jwt-decode';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface AdminTokenPayload {
  user_id: string;
  email: string;
  role: string;
  authenticated: boolean;
  full_name: string;
  exp: number;
}

export class AdminAuthService {
  private static TEMP_TOKEN_KEY = 'admin_temp_token';
  private static SESSION_TOKEN_KEY = 'admin_session_token';

  // Step 1: Login
  static async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    
    // Store temp token
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TEMP_TOKEN_KEY, data.tempToken);
    }

    return data;
  }

  // Step 2: Setup MFA
  static async setupMFA(tempToken: string) {
    const response = await fetch(`${API_BASE_URL}/auth/setup-mfa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'MFA setup failed');
    }

    return await response.json();
  }

  // Step 3: Verify MFA
  static async verifyMFA(tempToken: string, mfaToken: string) {
    const response = await fetch(`${API_BASE_URL}/auth/verify-mfa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken, mfaToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'MFA verification failed');
    }

    const data = await response.json();
    
    // Store session token
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SESSION_TOKEN_KEY, data.sessionToken);
      localStorage.removeItem(this.TEMP_TOKEN_KEY);
    }

    return data;
  }

  // Get stored tokens
  static getTempToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TEMP_TOKEN_KEY);
  }

  static getSessionToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.SESSION_TOKEN_KEY);
  }

  // Verify session token validity
  static isSessionValid(): boolean {
    const token = this.getSessionToken();
    if (!token) return false;

    try {
      const decoded = jwtDecode<AdminTokenPayload>(token);
      const now = Date.now() / 1000;
      return decoded.exp > now && decoded.role === 'superadmin';
    } catch {
      return false;
    }
  }

  // Get admin info from token
  static getAdminInfo(): AdminTokenPayload | null {
    const token = this.getSessionToken();
    if (!token) return null;

    try {
      return jwtDecode<AdminTokenPayload>(token);
    } catch {
      return null;
    }
  }

  // Logout
  static logout() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.SESSION_TOKEN_KEY);
    localStorage.removeItem(this.TEMP_TOKEN_KEY);
    window.location.href = '/login';
  }
}