'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AuthLayout from '@/src/components/layout/AuthLayout';
import { getAuthPageConfig } from '@/config/authPagesConfig';

export default function VerifyMFA() {
  const router = useRouter();
  const pageConfig = getAuthPageConfig('login'); // reuse same visuals as /auth/login
  const [mfaCode, setMfaCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split('');
      const next = [...mfaCode];
      pasted.forEach((c, i) => {
        if (index + i < 6) next[index + i] = c.replace(/\D/g, '');
      });
      setMfaCode(next);
      const last = Math.min(index + pasted.length, 5);
      inputRefs.current[last]?.focus();
      return;
    }
    if (!/^\d*$/.test(value)) return;
    const next = [...mfaCode];
    next[index] = value;
    setMfaCode(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !mfaCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = mfaCode.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    const tempToken = sessionStorage.getItem('tempToken');
    if (!tempToken) {
      router.push('/admin/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/v1/admin/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, mfaToken: code }),
      });
      const data = await response.json();

      if (data.ok && data.success) {
        localStorage.setItem('sessionToken', data.sessionToken);
        localStorage.setItem('adminUser', JSON.stringify(data.admin));
        sessionStorage.removeItem('tempToken');
        router.push('/admin/dashboard');
      } else {
        setError(data.error || 'Invalid verification code');
        setMfaCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const codeBox =
    'w-12 h-14 text-center text-2xl font-bold border rounded-lg focus:ring-2 transition ' +
    'border-gray-300 focus:border-[#063B82] focus:ring-[#063B82]/30';

  return (
    <AuthLayout
      backgroundImage={pageConfig.backgroundImage}
      testimonials={pageConfig.testimonials}
      title="Verify Your Identity"
      subtitle="Enter the 6-digit code from Google Authenticator"
      showTabs={false}
      activeTab="candidate"
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        {/* Code label */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <label className="block text-[#222] font-medium text-xs mb-3 text-center">
            Authentication Code<span className="text-red-500">*</span>
          </label>

          {/* 6 inputs */}
          <div className="flex gap-2 justify-center">
            {mfaCode.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={codeBox}
                disabled={loading}
              />
            ))}
          </div>

          <p className="text-xs text-gray-500 text-center mt-3">
            Code refreshes every 30 seconds
          </p>
        </motion.div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading || mfaCode.join('').length !== 6}
          className="w-full bg-[#1B73E8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1557B0] transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: loading ? 1 : 1.03 }}
          whileTap={{ scale: loading ? 1 : 0.97 }}
          transition={{ duration: 0.25 }}
        >
          {loading ? 'Verifying...' : '✓ Verify & Access Dashboard'}
        </motion.button>
      </form>

      {/* Helper block (same tone as login page tips) */}
      <div className="mt-6 p-3 rounded-lg border border-blue-200 bg-blue-50 text-xs text-[#063B82]">
        <div className="flex items-start gap-2">
          <span className="text-base">💡</span>
          <div>
            <p className="font-medium text-[#063B82] mb-0.5">Need help?</p>
            <p>Open the Google Authenticator app and find “Hiralent Admin” to see your current code.</p>
          </div>
        </div>
      </div>

      {/* Back link */}
      <div className="text-center mt-6">
        <button
          onClick={() => router.push('/admin/login')}
          className="text-xs text-[#1B73E8] hover:underline"
        >
          ← Back to login
        </button>
      </div>
    </AuthLayout>
  );
}
