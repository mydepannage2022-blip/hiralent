// src/lib/auth/auth.queries.ts
import { useMutation } from '@tanstack/react-query';
import { signup } from '@/src/lib/auth/auth.api';

type Role = 'candidate' | 'company_admin' | 'admin' | 'agency_admin';

export interface SignupData {
  email?: string;
  password?: string;
  full_name?: string; // API style
  fullName?: string;  // UI style
  role?: string;      // might be "company" or missing
}

export interface AuthUser {
  user_id: string;
  email: string;
  role: Role;
  agency_id?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

const ALLOWED_ROLES: Role[] = ['candidate', 'company_admin', 'admin', 'agency_admin'];

/** Safely normalize a role coming from the UI */
function normalizeRole(input?: string): Role {
  if (!input) return 'company_admin';              // default for your current flow
  if (input === 'company') return 'company_admin'; // map UI term to backend enum
  // fallback if someone passes junk
  return (ALLOWED_ROLES as string[]).includes(input) ? (input as Role) : 'company_admin';
}

export const useSignup = () => {
  return useMutation<AuthResponse, any, SignupData>({
    mutationFn: async (form: SignupData) => {
      // Build a bullet-proof payload (never read from undefined)
      const email = (form && typeof form.email === 'string')
        ? form.email.toLowerCase().trim()
        : '';

      const password = (form && typeof form.password === 'string')
        ? form.password
        : '';

      const full_name = form?.full_name ?? form?.fullName ?? '';

      const role = normalizeRole(form?.role);

      // Quick client-side validation to avoid weird server messages
      if (!email || !password || !full_name) {
        throw new Error('Missing required fields: email, password, full_name');
      }

      const payload = { email, password, full_name, role };

      // Helpful log in dev to confirm what we send
      // console.log('[signup] payload:', payload);

      // Call backend – expected { user, token }
      const response = await signup(payload);

      // Ensure the response matches AuthResponse
      if (!response || !response.user || !response.token) {
        throw new Error('Invalid signup response: missing user or token');
      }

      return response as AuthResponse;
    },

    // keep success actions (login + redirect) in the page if you want
    onSuccess: () => {},

    onError: (error: any) => {
      // Print a full debug object (won’t throw if fields are missing)
      try {
        console.log('[signup DEBUG] status:', error?.response?.status);
        console.log('[signup DEBUG] data:', error?.response?.data);
        console.log('[signup DEBUG] message:', error?.message);
      } catch {}

      // Never assume a particular error shape
      const errorMessage =
        (error && error.response && error.response.data && (error.response.data.message || error.response.data.error)) ||
        error?.message ||
        'Signup failed';

      console.error('Signup failed:', errorMessage);
      // toast.error?.(errorMessage); // enable if you have a toast system
    },
  });
};
