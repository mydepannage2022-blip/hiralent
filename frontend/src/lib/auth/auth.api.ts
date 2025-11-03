// src/lib/auth/auth.api.ts
import axios, { AxiosError } from 'axios';

/* ------------------------------ base url prep ------------------------------ */

function trimTrailingSlash(s?: string | null) {
  return (s ?? '').replace(/\/+$/, '');
}

/**
 * NEXT_PUBLIC_BASE_URL should be your API origin (no trailing slash), e.g.:
 *   http://localhost:4000
 *   https://api.hiralent.com
 * If it already ends with /api/vN we won't append it again.
 * We also add a dev fallback to http://localhost:4000 for convenience.
 */
function resolveBaseUrl(): string {
  // prefer NEXT_PUBLIC_BASE_URL, otherwise fall back to the local backend port used in this repo (5000)
  // If running in the browser and NEXT_PUBLIC_BASE_URL is not set, use the current origin.
  let raw = trimTrailingSlash(process.env.NEXT_PUBLIC_BASE_URL) || '';
  if (!raw && typeof window !== 'undefined') {
    raw = window.location.origin;
  }
  if (!raw) raw = 'http://localhost:5000';
  const hasVersion = /\/api\/v\d+$/i.test(raw);
  return hasVersion ? raw : `${raw}/api/v1`;
}

const BASE_WITH_VERSION = resolveBaseUrl();

/* ----------------------------- axios instance ------------------------------ */

export const api = axios.create({
  baseURL: BASE_WITH_VERSION,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // ⬅️ send/receive httpOnly cookies
});

/**
 * Optional dual-mode (Bearer + httpOnly cookie):
 * Keep Bearer during transition; remove later if you go cookie-only.
 */
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('token'); // optional
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

// Persist auth to keep Bearer working (optional)
function persistAuth(user?: any, token?: string) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
}

// Auto-persist for signup/login/verify responses (optional)
api.interceptors.response.use(
  async (response) => {
    try {
      const url = response?.config?.url ?? '';
      const method = (response?.config?.method || 'get').toLowerCase();
      const data = response?.data;

      const isAuthEndpoint =
        url.includes('/auth/signup') ||
        url.includes('/auth/login') ||
        url.includes('/auth/verify-email');

      // Normal path: backend returns { user, token } or cookie-only (user without token)
      // Persist user if present — token may be omitted when server uses httpOnly cookies.
      if (isAuthEndpoint && data?.user) {
        if (process.env.NODE_ENV !== 'production') {
          try {
            // eslint-disable-next-line no-console
            console.debug('[auth interceptor] persisting auth from', url, { user: data.user ? { user_id: data.user.user_id, email: data.user.email, role: data.user.role } : null, hasToken: !!data.token });
          } catch {}
        }
        persistAuth(data.user, data?.token);
        return response;
      }

      // Special case: signup succeeded but no token → silent login
      const isSignup = url.includes('/auth/signup') && method === 'post';
      if (isSignup && (!data?.token || !data?.user)) {
        let posted: any = {};
        try {
          posted = typeof response.config.data === 'string'
            ? JSON.parse(response.config.data)
            : response.config.data || {};
        } catch {}

        const email = (posted?.email || '').toString().trim().toLowerCase();
        const password = (posted?.password || '').toString();

        if (email && password) {
          try {
            const loginRes = await api.post('/auth/login', { email, password });
            const loginData = loginRes?.data || {};
            if (process.env.NODE_ENV !== 'production') {
              try {
                // eslint-disable-next-line no-console
                console.debug('[auth interceptor] silent-login attempt result', { hasUser: !!loginData.user, hasToken: !!loginData.token });
              } catch {}
            }
            if (loginData?.token && loginData?.user) {
              persistAuth(loginData.user, loginData.token);
            } else if (loginData?.user) {
              // server may set cookie-only session and return user
              persistAuth(loginData.user, loginData.token);
            }
          } catch (silentErr) {
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.warn('[auth interceptor] silent-login failed, ignoring to avoid logout race:', String((silentErr as any)?.message || silentErr));
            }
            // swallow error to avoid affecting the original signup response flow
          }
        }
      }
    } catch {
      // no-op
    }
    return response;
  },
  (error: AxiosError) => {
    try {
      const status = (error as any)?.response?.status;
      if (status === 401) {
        // clear local cached auth and notify the app so UI can react (redirect to login, show message)
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          } catch {}

          try {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          } catch {}
        }
        // Normalize error shape so callers can check error.code === 'UNAUTHORIZED'
        try {
          (error as any).code = 'UNAUTHORIZED';
        } catch {}
      }
    } catch {}
    // Network / CORS errors surface without a response. Normalize them so UI can react.
    try {
      if (!(error as any)?.response) {
        // mark network-level error
        (error as any).code = 'NETWORK_ERROR';
        if (typeof window !== 'undefined') {
          try { window.dispatchEvent(new CustomEvent('network:error')); } catch {}
        }
      }
    } catch {}
    return Promise.reject(error);
  }
);

// Small helper used by AuthContext to set/delete non-http cookies when needed.
// The app prefers httpOnly cookies from the server; this is a fallback for client-side cookie helpers.
export const __authCookies = {
  setCookie: (name: string, value: string, days = 7) => {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
  },
  deleteCookie: (name: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; path=/`;
  },
};

/* --------------------------------- AUTH --------------------------------- */

export const signup = async (data: {
  email: string;
  password: string;
  full_name: string;
  role: string; // e.g. "company_admin"
}) => {
  const res = await api.post('/auth/signup', data);
  return res.data as { user?: any; token?: string; [k: string]: any };
};

export const login = async (data: { email: string; password: string }) => {
  const res = await api.post('/auth/login', data);
  return res.data as { user: any; token?: string };
};

export const logout = async () => {
  await api.post('/auth/logout');      // server clears httpOnly cookie
  if (typeof window !== 'undefined') {
    if (process.env.NODE_ENV !== 'production') {
      try {
        // eslint-disable-next-line no-console
        console.warn('[auth.api.logout][DEV] logout() called — clearing localStorage and cookie. Stack:');
        // @ts-ignore
        console.trace();
      } catch (e) {}
    }
    localStorage.removeItem('token');  // optional (if using Bearer)
    localStorage.removeItem('user');
  }
};

export const verifyEmail = async (token: string) => {
  const res = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
  return res.data;
};

export const resendVerificationEmail = async () => {
  const res = await api.post('/auth/resend-verification');
  return res.data;
};

/* ------------------------------- CANDIDATE ------------------------------- */

export const updateLocation = async (data: { location: string; postalCode: number }) => {
  const res = await api.patch('/candidates/update-location', data);
  return res.data;
};

export const updateSalary = async (data: { minimumSalary: number; paymentPeriod: string }) => {
  const res = await api.patch('/candidates/update-salary', data);
  return res.data;
};

export const uploadResume = async (resume: File) => {
  const formData = new FormData();
  formData.append('cv', resume);

  const res = await api.post('/candidates/profile-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data;
};

export const uploadProfilePicture = async (image: File) => {
  const formData = new FormData();
  formData.append('profilePicture', image);
  const res = await api.post('/candidates/profile-picture-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

/* -------------------------------- COMPANY ------------------------------- */

export const createCompanyProfile = async (data: {
  company_name: string;
  industry: string;
  company_size: string;
  website?: string;
  location: string;
  description: string;
  registration_number: string;
  full_address: string;
}) => {
  const res = await api.post('/company/create-profile', data);
  return res.data;
};
