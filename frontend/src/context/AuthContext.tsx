// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { __authCookies } from '@/src/lib/auth/auth.api'; // cookie helpers (set/delete)

interface User {
  user_id: string;
  email: string;
  role: string;
  agency_id?: string;
  name?: string;
  full_name?: string;
  phone_number?: string;
  is_email_verified?: boolean;
  // Minimal profile shape used by various UI pages. We keep it loose to
  // avoid needing to replicate the entire backend model here.
  profile?: {
    about_me?: string;
    [key: string]: any;
  };
}

interface AuthContextType {
  user: User | null;
  login: (userData: User, token?: string) => void;
  logout: () => void;
  isLoading: boolean;
  updateUser?: (userData: Partial<User> | null) => void;
  // Backwards-compatible aliases used across the app
  token?: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenState, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        const savedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
          try {
            const parsedUser: User = JSON.parse(savedUser);
            if (parsedUser && parsedUser.user_id && parsedUser.email) {
              setUser(parsedUser);
              if (savedToken) setTokenState(savedToken);
            } else {
              // Don't aggressively remove the saved user here — it's safer to
              // keep the stored value intact and only update in-memory state.
              // Automatic removal during initialization can cause races where
              // other parts of the app observe a cleared storage and treat the
              // session as logged out immediately after signup.
              console.warn('[AuthContext] Ignoring invalid saved user during init; leaving localStorage intact.');
              setUser(null);
            }
          } catch (err) {
            // If parsing failed, avoid removing the stored value which may be
            // transiently malformed; just set in-memory state to null and log
            // for diagnostics. Explicit cleanup should be done by logout or
            // through a dedicated migration/cleanup UX.
            console.warn('[AuthContext] Failed to parse saved user during init:', err);
            setUser(null);
          }
        } else {
          if (savedUser === 'undefined' || savedUser === 'null') {
              // Don't auto-remove; just treat as not-logged-in. Keep this
              // non-destructive in case something else relies on the stored
              // value for migration or debugging.
              console.warn('[AuthContext] Saved user is string "undefined" or "null"; treating as not logged in.');
              setUser(null);
            }
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen to storage events (other tabs or code may update localStorage)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'user') {
        try {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.debug('[AuthContext] storage event for user:', { newValue: e.newValue, oldValue: e.oldValue });
          }
          if (e.newValue) {
            const parsed: User = JSON.parse(e.newValue);
            setUser(parsed);
          } else {
            // cleared
            setUser(null);
          }
        } catch (err) {
          // ignore
        }
      }
    };
    if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);

    // DEV-only instrumentation: wrap localStorage.removeItem/clear to log stack traces
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      const originalRemove = localStorage.removeItem.bind(localStorage);
      const originalClear = localStorage.clear.bind(localStorage);

      localStorage.removeItem = (key: string) => {
        try {
          if (key === 'user') {
            // eslint-disable-next-line no-console
            console.warn('[AuthContext][DEV] localStorage.removeItem("user") called. Stack:');
            // capture stack
            // @ts-ignore
            console.trace();
          }
        } catch (err) {}
        return originalRemove(key);
      };

      localStorage.clear = () => {
        try {
          // eslint-disable-next-line no-console
          console.warn('[AuthContext][DEV] localStorage.clear() called. Stack:');
          // @ts-ignore
          console.trace();
        } catch (err) {}
        return originalClear();
      };
    }

    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
    };
  }, []);

  const login = (userData: User, token?: string) => {
    // Basic guard for user shape (token is optional because server may use httpOnly cookies)
    if (!userData || !userData.user_id || !userData.email) {
      console.warn('⚠️ Invalid user data passed to login:', { userData });
      return;
    }

    // Set in-memory state immediately so UI reflects auth
    setUser(userData);
    if (process.env.NODE_ENV !== 'production') {
      try {
        // eslint-disable-next-line no-console
        console.debug('[AuthContext.login] setting user in state and localStorage', { user_id: userData.user_id, email: userData.email, hasToken: !!token });
      } catch {}
    }

    if (typeof window !== 'undefined') {
      // Persist user to localStorage; token only if provided (cookie-only flows won't provide it)
      try {
        localStorage.setItem('user', JSON.stringify(userData));
        if (token) {
          localStorage.setItem('token', token);
          setTokenState(token);
          // Also set a cookie so middleware/route guards see auth immediately (fallback)
          try {
            __authCookies?.setCookie?.('token', token);
          } catch {
            // ignore cookie errors
          }
        }
      } catch (e) {
        // ignore storage errors
      }
    }
  };

  const updateUser = (userData: Partial<User> | null) => {
    if (!userData) {
      setUser(null);
      if (typeof window !== 'undefined') localStorage.removeItem('user');
      return;
    }
    setUser((prev) => {
      const merged = { ...(prev || {}), ...(userData || {}) } as User;
      try {
        if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(merged));
      } catch {}
      return merged;
    });
  };

  const logout = () => {
    // If no user is present, logout is a no-op (avoid redundant clears / stack traces)
    if (!user && typeof window !== 'undefined') {
      if (process.env.NODE_ENV !== 'production') {
        try {
          // eslint-disable-next-line no-console
          console.warn('[AuthContext.logout][DEV] logout() called but no user in-memory; skipping clears. Stack:');
          // @ts-ignore
          console.trace();
        } catch (e) {}
      }
      return;
    }

    setUser(null);
    setTokenState(null);

    if (typeof window !== 'undefined') {
      if (process.env.NODE_ENV !== 'production') {
        try {
          // eslint-disable-next-line no-console
          console.warn('[AuthContext.logout][DEV] logout() called. Stack:');
          // @ts-ignore
          console.trace();
        } catch (e) {}
      }
      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      // Clear cookie so middleware/route guards stop seeing auth
      try {
        __authCookies?.deleteCookie?.('token');
      } catch {
        // ignore cookie errors
      }
    }

    console.log('User logged out');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading, token: tokenState, loading: isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
