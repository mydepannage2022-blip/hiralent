'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useVerifyEmail, useResendVerificationEmail } from '../../../src/lib/auth/auth.queries';
import { useAuth } from '../../../src/context/AuthContext';
import { useRouter } from 'next/navigation';

// Custom Alert Component
const Alert = ({ type, message, onClose }: { 
  type: 'success' | 'error' | 'info'; 
  message: string; 
  onClose: () => void;
}) => {
  const bgColor = type === 'success' ? 'bg-green-50 border-green-200' : 
                  type === 'error' ? 'bg-red-50 border-red-200' : 
                  'bg-blue-50 border-blue-200';
  
  const textColor = type === 'success' ? 'text-green-800' : 
                   type === 'error' ? 'text-red-800' : 
                   'text-blue-800';
  
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

  return (
    <div className={`${bgColor} border rounded-lg p-4 mb-4 relative`}>
      <div className="flex items-start">
        <span className="text-lg mr-3">{icon}</span>
        <div className="flex-1">
          <p className={`${textColor} font-medium`}>{message}</p>
        </div>
        <button 
          onClick={onClose}
          className={`${textColor} hover:opacity-70 ml-2 text-xl leading-none`}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? null;
  const { user } = useAuth();
  const router = useRouter();
  
  // Timer states
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  
  // Alert states
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  
  const { mutate: verifyEmail, isPending: isVerifying, isError: verifyError, error: verifyErrorDetails } = useVerifyEmail();
  const { mutate: resendEmail, isPending: isResending, isError: resendError, error: resendErrorDetails } = useResendVerificationEmail();

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown]);

  // Auto-hide alert after 5 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Handle resend with timer
  const handleResendEmail = () => {
    if (!canResend || isResending) return;
    
    resendEmail(undefined, {
      onSuccess: (data) => {
        if (data.success) {
          // Start 60 second countdown
          setCountdown(60);
          setCanResend(false);
          
          setAlert({
            type: 'success',
            message: 'Verification email sent successfully! Please check your inbox.'
          });
        } else {
          setAlert({
            type: 'error',
            message: data.message || 'Failed to send verification email'
          });
        }
      },
      onError: (error: any) => {
        const message = error?.response?.data?.message || error.message || 'Failed to send verification email';
        setAlert({
          type: 'error',
          message: message
        });
      }
    });
  };

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token, verifyEmail]);

  // Format countdown time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Agar token nahi hai aur user logged in nahi hai
  if (!token && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-red-500 text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You need to be logged in to access this page.
          </p>
          <button 
            onClick={() => router.push('/auth/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Agar token nahi hai but user logged in hai aur email verified hai
  if (!token && user && user.is_email_verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-green-600 text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Email Already Verified!</h1>
          <p className="text-gray-600 mb-4">
            Your email is already verified. You can access your dashboard.
          </p>
          <button 
            onClick={() => {
              if (user.role === 'candidate') {
                router.push('/candidate/dashboard');
              } else if (user.role === 'company'|| user.role === 'company_admin') {
                router.push('/company/dashboard');
              } else if (user.role === 'agency') {
                router.push('/agency/dashboard');
              } else {
                router.push('/');
              }
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Token verification in progress
  if (token && isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Verifying Email</h1>
          <p className="text-gray-600">
            Please wait while we verify your email address...
          </p>
        </div>
      </div>
    );
  }

  // Token verification failed
  if (token && verifyError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Verification Failed</h1>
          <p className="text-gray-600 mb-4">
            {verifyErrorDetails?.response?.data?.message || 'Something went wrong during verification.'}
          </p>
          
          {alert && (
            <Alert 
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          )}
          
          <div className="space-y-3">
            <button 
              onClick={handleResendEmail}
              disabled={!canResend || isResending}
              className={`w-full px-6 py-2 rounded-md transition-colors ${
                canResend && !isResending
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isResending ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </div>
              ) : !canResend ? (
                `Resend in ${formatTime(countdown)}`
              ) : (
                'Resend Verification Email'
              )}
            </button>
            <button 
              onClick={() => router.push('/auth/login')}
              className="w-full bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User logged in but email not verified - show resend option
  if (!token && user && !user.is_email_verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-yellow-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Email Not Verified</h1>
          <p className="text-gray-600 mb-4">
            Your email <strong className="text-blue-600">{user.email}</strong> needs to be verified to access all features.
          </p>
          
          {alert && (
            <Alert 
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          )}
          
          <button 
            onClick={handleResendEmail}
            disabled={!canResend || isResending}
            className={`w-full px-6 py-2 rounded-md transition-colors mb-3 ${
              canResend && !isResending
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isResending ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </div>
            ) : !canResend ? (
              `Resend in ${formatTime(countdown)}`
            ) : (
              'Send Verification Email'
            )}
          </button>
          
          {!canResend && (
            <p className="text-sm text-gray-500 mb-2">
              Please wait before requesting another email.
            </p>
          )}
          
          <p className="text-sm text-gray-500">
            Check your email and click the verification link.
          </p>
        </div>
      </div>
    );
  }

  // Success state (handled by redirect in useVerifyEmail hook)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <div className="text-green-600 text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Email Verified!</h1>
        <p className="text-gray-600">
          Redirecting to your dashboard...
        </p>
      </div>
    </div>
  );
}