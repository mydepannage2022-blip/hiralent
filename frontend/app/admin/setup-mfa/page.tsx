'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AuthLayout from '@/src/components/layout/AuthLayout';
import { getAuthPageConfig } from '@/config/authPagesConfig';

export default function SetupMFA() {
  const router = useRouter();
  const pageConfig = getAuthPageConfig('login'); // same background/testimonials theme

  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setupMFA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupMFA = async () => {
    const tempToken = sessionStorage.getItem('tempToken');
    if (!tempToken) {
      router.push('/admin/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/v1/admin/auth/setup-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken }),
      });
      const data = await response.json();

      if (data.ok && data.success) {
        setQrCode(data.qrCode);
        setSecret(data.secret);
      } else {
        setError(data.error || 'Failed to setup MFA');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up MFA...</p>
        </div>
      </div>
    );
  }

  const card = 'p-4 bg-blue-50 rounded-lg border border-blue-200';

  return (
    <AuthLayout
      backgroundImage={pageConfig.backgroundImage}
      testimonials={pageConfig.testimonials}
      title="Setup Two-Factor Authentication"
      subtitle="Secure your admin account with 2FA"
      showTabs={false}
      activeTab="candidate"
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Step 1 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className={card}>
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">1</span>
            Install Google Authenticator
          </h3>
          <p className="text-sm text-gray-700 mb-3 ml-8">
            Download the app from your device&apos;s app store
          </p>
          <div className="flex gap-3 ml-8">
            <a
              href="https://apps.apple.com/app/google-authenticator/id388497605"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              📱 App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              🤖 Play Store
            </a>
          </div>
        </motion.div>

        {/* Step 2 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className={card}>
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">2</span>
            Scan QR Code
          </h3>
          <p className="text-sm text-gray-700 mb-4 ml-8">Open Google Authenticator and scan this code</p>

          {qrCode && (
            <div className="bg-white p-6 rounded-lg border-2 border-gray-300 ml-8">
              <div className="flex flex-col items-center">
                <img src={qrCode} alt="QR Code" className="w-64 h-64 mb-4" />
                <div className="w-full">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Can&apos;t scan? Enter this code manually:
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm break-all">
                      {secret}
                    </div>
                    <button
                      onClick={copySecret}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition"
                    >
                      {copied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Warning */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="p-4 bg-amber-50 rounded-lg border border-amber-200"
        >
          <div className="flex gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-amber-900 mb-1">Important</p>
              <p className="text-sm text-amber-800">
                Save your secret key in a secure location. You&apos;ll need it to recover access if you lose your device.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.button
        onClick={() => router.push('/admin/verify-mfa')}
        className="w-full mt-6 bg-[#1B73E8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1557B0] transition-colors duration-200 text-sm"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        Continue to Verification →
      </motion.button>
    </AuthLayout>
  );
}
