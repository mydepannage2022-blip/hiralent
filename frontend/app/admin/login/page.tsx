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

  const getInputClass = () =>
    'w-full px-4 py-3 border rounded-lg focus:outline-none text-xs text-[#757575] border-gray-300 focus:ring-2 focus:ring-[#063B82] focus:border-transparent';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.ok && data.success) {
        sessionStorage.setItem('tempToken', data.tempToken);
        if (data.mfaSetup) {
          router.push('/admin/setup-mfa');
        } else {
          router.push('/admin/verify-mfa');
        }
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      backgroundImage={pageConfig.backgroundImage}
      testimonials={pageConfig.testimonials}
      title="Super Admin Access"
      subtitle="Zero-Trust authentication required"
      showTabs={false}
      activeTab="candidate"
    >
      <div className="mb-4 p-3 rounded-lg border border-blue-200 bg-blue-50 text-xs text-[#063B82] flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Zero-Trust: device, context and MFA checks are enforced.</span>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }} className="mb-1">
          <label className="block text-[#222] font-medium text-xs mb-1">
            Admin Email<span className="text-red-500">*</span>
          </label>
          <motion.input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="admin@hiralent.com"
            className={getInputClass()}
            required
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>

        {/* Password */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }} className="mb-1">
          <label className="block text-[#222] font-medium text-xs mb-1">
            Password<span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <motion.input
              type={passwordVisibility ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter your Password"
              className={`${getInputClass()} pr-10`}
              whileFocus={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            />
            <motion.button
              type="button"
              onClick={() => setPasswordVisibility((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              {passwordVisibility ? (
                // eye-off
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                </svg>
              ) : (
                // eye
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1B73E8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1557B0] transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          whileHover={{ scale: loading ? 1 : 1.05 }}
          whileTap={{ scale: loading ? 1 : 0.95 }}
          transition={{ duration: 0.3 }}
        >
          {loading ? 'Authenticating...' : 'Continue to MFA'}
        </motion.button>
      </form>
    </AuthLayout>
  );
}
