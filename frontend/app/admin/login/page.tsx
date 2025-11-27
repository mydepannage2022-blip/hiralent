'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AuthLayout from '@/src/components/layout/AuthLayout';
import { getAuthPageConfig } from '@/config/authPagesConfig';

export default function AdminLogin() {
  const router = useRouter();
  const pageConfig = getAuthPageConfig('login'); // reuse same visuals as /auth/login

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordVisibility, setPasswordVisibility] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    };

    try {
      const response = await fetch('http://localhost:5000/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.ok && data.success && data.tempToken) {
        // Only store tempToken here – full session is created after MFA
        sessionStorage.setItem('tempToken', data.tempToken);

        // Branching based on MFA status
        if (data.mfaSetup) {
          router.push('/admin/setup-mfa');
        } else {
          router.push('/admin/verify-mfa');
        }
      } else {
        setError(data.error || 'Invalid credentials. Please check your email and password.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputBaseClass =
    'w-full px-4 py-3 border rounded-lg focus:outline-none text-xs text-[#4B5563] ' +
    'border-gray-300 focus:ring-2 focus:ring-[#063B82] focus:border-transparent bg-white';

  return (
    <AuthLayout
      backgroundImage={pageConfig.backgroundImage}
      testimonials={pageConfig.testimonials}
      title="Super Admin Console"
      subtitle="Secure access to Hiralent’s global control panel."
      showTabs={false}
      activeTab="candidate"
    >
      {/* Header chip */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center rounded-full bg-[#1B73E8]/10 px-3 py-1 font-semibold text-[#1B73E8]">
            SUPER ADMIN
          </span>
          <span className="text-[11px] text-gray-500">
            Restricted area • Zero-Trust enforced
          </span>
        </div>
      </div>

      {/* Security banner */}
      <div className="mb-4 flex gap-3 rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2.5 text-xs text-[#063B82]">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1B73E8]/10">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.7}
              d="M12 11v3m0 4h.01M5 10.5V9a7 7 0 0114 0v1.5M6.5 21h11a1.5 1.5 0 001.5-1.5v-6A1.5 1.5 0 0017.5 12h-11A1.5 1.5 0 005 13.5v6A1.5 1.5 0 006.5 21z"
            />
          </svg>
        </div>
        <div className="space-y-0.5">
          <p className="font-medium">Zero-Trust Authentication</p>
          <p className="text-[11px] leading-snug">
            Access requires valid admin credentials, device checks and a verified MFA code.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="mb-1"
        >
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-medium text-[#111827]">
              Admin Email<span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] text-gray-400">Use your dedicated super admin account</span>
          </div>
          <motion.input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="admin@hiralent.com"
            className={inputBaseClass}
            required
            autoComplete="username"
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.25 }}
          />
        </motion.div>

        {/* Password */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35 }}
          className="mb-1"
        >
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-medium text-[#111827]">
              Password<span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] text-gray-400">Do not reuse personal passwords</span>
          </div>
          <div className="relative">
            <motion.input
              type={passwordVisibility ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter your Super Admin password"
              className={`${inputBaseClass} pr-10`}
              required
              autoComplete="current-password"
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.25 }}
            />
            <motion.button
              type="button"
              onClick={() => setPasswordVisibility((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {passwordVisibility ? (
                // eye-off
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M13.875 18.825A10.05 10.05 0 0112 19C7.522 19 3.732 16.057 2.457 12 2.882 10.52 3.62 9.174 4.6 8m3.758-2.264A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.543 7-.46 1.466-1.237 2.79-2.247 3.846M9.88 9.88A3 3 0 0114.12 14.12M3 3l18 18"
                  />
                </svg>
              ) : (
                // eye
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-[#1B73E8] py-3 px-4 text-sm font-medium text-white shadow-sm 
                     hover:bg-[#1557B0] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60"
          whileHover={{ scale: loading ? 1 : 1.03 }}
          whileTap={{ scale: loading ? 1 : 0.97 }}
          transition={{ duration: 0.25 }}
        >
          {loading ? 'Authenticating…' : 'Continue to MFA'}
        </motion.button>
      </form>

      {/* Footer hint */}
      <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
        Access to this console is strictly limited to authorized Hiralent super administrators.
        All actions are logged and monitored.
      </div>
    </AuthLayout>
  );
}
