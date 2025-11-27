// src/lib/hooks/useAdminAuth.ts
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
}

export function useAdminAuth() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const adminUser = localStorage.getItem('adminUser');

      if (sessionToken && adminUser) {
        setAdmin(JSON.parse(adminUser));
        setIsAuthenticated(true);
      } else {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('adminUser');
    sessionStorage.removeItem('tempToken');
    router.push('/admin/login');
  };

  const getToken = (): string | null => {
    return localStorage.getItem('sessionToken');
  };

  return {
    isAuthenticated,
    admin,
    loading,
    logout,
    getToken,
  };
}