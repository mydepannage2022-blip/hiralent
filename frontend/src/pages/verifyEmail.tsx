// frontend/src/pages/verifyEmail.tsx
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { verifyEmail as verifyEmailApi } from '../lib/auth/auth.api';

const VerifyEmail = () => {
  const router = useRouter();

  useEffect(() => {
    const tokenFromQuery = typeof router.query?.token === 'string' ? router.query.token : null;
    const tokenFromLocation = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') : null;
    const token = tokenFromQuery || tokenFromLocation;

    const verifyToken = async () => {
      if (!token) {
        console.warn('No token provided for email verification');
        router.push('/auth/login');
        return;
      }

      try {
        const result = await verifyEmailApi(token);
        // If backend returns user/token, redirect to appropriate dashboard
        if (result?.user) {
          const role = result.user.role;
          if (role === 'company' || role === 'company_admin') router.push('/company/dashboard');
          else if (role === 'candidate') router.push('/candidate/dashboard');
          else router.push('/');
        } else {
          // Fallback: go to login
          router.push('/auth/login');
        }
      } catch (err) {
        console.error('Verification error:', err);
        router.push('/auth/login');
      }
    };

    verifyToken();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Verifying your email...</h1>
        <p>Please wait while we verify your email address.</p>
      </div>
    </div>
  );
};

export default VerifyEmail;