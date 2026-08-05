import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { signup, updateLocation, updateSalary, login as loginapi, uploadResume, verifyEmail, resendVerificationEmail, uploadProfilePicture, createCompanyProfile, uploadCompanyDocument, resetPassword, forgotPassword, deleteAccount, getUserSessions, terminateAllOtherSessions, terminateSession } from './auth.api';
import { setup2FAAPI, setupWithTokenAPI, enable2FAAPI, disable2FAAPI, verifyLogin2FAAPI, verifyRecoveryCodeAPI } from './twoFactor.api';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from "next/navigation";
import { useProfile } from '../../context/ProfileContext';
import { extractApiError } from '../api/errorMessage';


export const useSignup = () => {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: signup,
    onSuccess: (data: any) => {
      // Response envelope (R-36): the payload (user/token/refreshToken) lives under `data`.
      const d = data?.data ?? data;
      if (!d?.user || !d?.token) {
        toast.error(d?.message || 'Signup failed');
        console.error('Signup failed: malformed response');
        return;
      }

      toast.success('Account created successfully!');
      login(d.user, d.token, d.refreshToken);

      if (d.user.role === 'company_admin') {
        router.push('/auth/companyRegister/info');
      } else if (d.user.role === 'candidate') {
        router.push('/auth/signup/location');
      } else if (d.user.role === 'agency') {
        router.push('/agency/setup');
      } else {
        router.push('/');
      }
    },
    onError: (error: any) => {
      const errorMessage = extractApiError(error, 'Signup failed');
      console.error('Signup failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

export const useLogin = () => {
  const { login } = useAuth();
  const { setProfileData } = useProfile();
  const router = useRouter();

  return useMutation({
    mutationFn: loginapi,
    onSuccess: (data) => {
      // Response envelope (R-36): login payload lives under `data`.
      const d = (data as any)?.data ?? (data as any);

      // MFA required — let the login page handle the 2FA step
      if (d.requiresMFA || d.requiresMFASetup) {
        return;
      }

      // Malformed / unexpected response
      if (d.error || !d.user) {
        const errorMessage = d.message || 'Login failed';
        toast.error(errorMessage);
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      toast.success('Login successful!');
      login(d.user, d.token, d.refreshToken);
      if (d.profile) {
        setProfileData(d.profile);
      }

      // Priority 1: callbackUrl query param
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callbackUrl');
      if (callbackUrl && callbackUrl.startsWith('/')) {
        router.push(callbackUrl);
        return;
      }

      // Priority 2: stored redirect path
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        localStorage.removeItem('redirectAfterLogin');
        router.push(redirectPath);
        return;
      }

      // Fallback: role-based dashboard redirect
      const role = d.user?.role;
      if (role === 'candidate') {
        router.push('/candidate/dashboard');
      } else if (role === 'company_admin') {
        router.push('/company/dashboard');
      } else if (role === 'agency_admin') {
        router.push('/agency/dashboard');
      } else {
        router.push('/');
      }
    },
    onError: (error: any) => {
      const errorMessage = extractApiError(error, 'Login failed');
      console.error('Login failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

export const useSetup2FA = () => {
  return useMutation({
    mutationFn: setup2FAAPI,
    onError: (error: any) => {
      toast.error(extractApiError(error, 'Failed to set up 2FA'));
    },
  });
};

export const useSetupWithToken = () => {
  return useMutation({
    mutationFn: setupWithTokenAPI,
    onError: (error: any) => {
      toast.error(extractApiError(error, 'Failed to generate QR code'));
    },
  });
};

export const useEnable2FA = () => {
  const { user, updateUser } = useAuth();
  return useMutation({
    mutationFn: enable2FAAPI,
    onSuccess: () => {
      toast.success('Two-factor authentication enabled!');
      if (user) updateUser({ ...user, mfa_enabled: true });
    },
    onError: (error: any) => {
      toast.error(extractApiError(error, 'Invalid code. Please try again.'));
    },
  });
};

export const useDisable2FA = () => {
  const { user, updateUser } = useAuth();
  return useMutation({
    mutationFn: disable2FAAPI,
    onSuccess: () => {
      toast.success('Two-factor authentication disabled.');
      if (user) updateUser({ ...user, mfa_enabled: false });
    },
    onError: (error: any) => {
      toast.error(extractApiError(error, 'Invalid code. Please try again.'));
    },
  });
};

export const useVerifyLogin2FA = () => {
  const { login } = useAuth();
  const { setProfileData } = useProfile();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ tempToken, mfaToken }: { tempToken: string; mfaToken: string }) =>
      verifyLogin2FAAPI(tempToken, mfaToken),
    onSuccess: (data: any) => {
      // Response envelope (R-36): verification payload lives under `data`.
      const d = data?.data ?? data;
      if (d?.error || !d?.user) {
        toast.error(d?.message || 'Verification failed');
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      login(d.user, d.token, d.refreshToken);
      if (d.profile) setProfileData(d.profile);

      // If recovery codes are present this is first-time setup — let the login page show them
      if (d.recoveryCodes?.length > 0) return;

      toast.success('Login successful!');
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callbackUrl');
      if (callbackUrl && callbackUrl.startsWith('/')) {
        router.push(callbackUrl);
        return;
      }

      const role = d.user?.role;
      if (role === 'candidate') router.push('/candidate/dashboard');
      else if (role === 'company_admin') router.push('/company/dashboard');
      else if (role === 'agency_admin') router.push('/agency/dashboard');
      else router.push('/');
    },
    onError: (error: any) => {
      const msg = extractApiError(error, 'Verification failed');
      toast.error(msg);
    },
  });
};

export const useVerifyRecoveryCode = () => {
  const { login } = useAuth();
  const { setProfileData } = useProfile();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ tempToken, recoveryCode }: { tempToken: string; recoveryCode: string }) =>
      verifyRecoveryCodeAPI(tempToken, recoveryCode),
    onSuccess: (data: any) => {
      // Response envelope (R-36): verification payload lives under `data`.
      const d = data?.data ?? data;
      if (d?.error || !d?.user) {
        toast.error(d?.message || 'Verification failed');
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      toast.success('Login successful!');
      login(d.user, d.token, d.refreshToken);
      if (d.profile) setProfileData(d.profile);

      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callbackUrl');
      if (callbackUrl && callbackUrl.startsWith('/')) {
        router.push(callbackUrl);
        return;
      }

      const role = d.user?.role;
      if (role === 'candidate') router.push('/candidate/dashboard');
      else if (role === 'company_admin') router.push('/company/dashboard');
      else if (role === 'agency_admin') router.push('/agency/dashboard');
      else router.push('/');
    },
    onError: (error: any) => {
      const msg = extractApiError(error, 'Recovery code verification failed');
      toast.error(msg);
    },
  });
};
export const useUpdateLocation = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { location: string; postalCode: string }) => {
      return updateLocation({
        location: data.location,
        postalCode: data.postalCode,
      });
    },
    onSuccess: () => {
      toast.success('Location updated successfully!');
      router.push("/auth/signup/salary");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to update location';
      console.error("Location update failed:", errorMessage);
      toast.error(errorMessage);
    },
  });
};

export const useUpdateSalary = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { minimumSalary: number; paymentPeriod: string }) =>
      updateSalary(data),
    onSuccess: () => {
      toast.success('Salary preferences updated successfully!');
      router.push("/auth/signup/profile-picture");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to update salary preferences';
      console.error("Salary update failed:", errorMessage);
      toast.error(errorMessage);
    },
  });
};

export const useUploadResume = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: uploadResume,
    onSuccess: () => {
      console.log('Resume uploaded successfully');
      toast.success('Resume uploaded successfully!');
      router.push("/auth/logout");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to upload resume';
      console.error('Upload failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

export const useVerifyEmail = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: verifyEmail,
    onSuccess: (data) => {
      console.log("Email verified successfully:", data);
      toast.success('Email verified successfully!');

      // Email is verified server-side; there is no auth token to consume here.
      // Route through /auth/logout (clears any stale local session) → login, where
      // the user signs in normally (2FA enforced). Same end-state as before, minus
      // the pointless session-less token.
      if (data.success) {
        router.push('/auth/logout');
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Email verification failed';
      console.error('Email verification failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

export const useResendVerificationEmail = () => {
  return useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: (data) => {
      console.log("Verification email sent:", data);
      if (data.success) {
        toast.success(data.message || "Verification email sent! Please check your inbox.");
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to send verification email';
      console.error('Resend verification failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

export const useUploadProfilePicture = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: uploadProfilePicture,
    onSuccess: () => {
      console.log('Profile picture uploaded successfully');
      toast.success('Profile picture uploaded successfully!');
      router.push("/auth/signup/uploadresume");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to upload profile picture';
      console.error('Upload failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};


export const useCreateCompanyProfile = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: createCompanyProfile,
    onSuccess: () => {
      toast.success('Company profile created!');
      router.push('/auth/companyRegister/verification');
    }
  });
};



export const useUploadCompanyDocument = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: uploadCompanyDocument,
    onSuccess: (data) => {
      console.log('Document processed successfully:', data);

      if (!data.ok) {
        const errorMessage = data.error || 'Document processing failed';
        toast.error(errorMessage);
        return;
      }

      // Success handling
      if (data.type === 'company_doc' && data.parsed) {
        toast.success('Document verified successfully!');

        // Optional: Auto-proceed to dashboard after success
        // setTimeout(() => {
        //   router.push('/company/dashboard');
        // }, 2000);
      } else {
        toast.success('Document processed successfully!');
      }
    },
    onError: (error: any) => {
      console.error('❌ Document upload failed:', error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error.message ||
        'Failed to process document';
      toast.error(errorMessage);
    },
  });
};



export const useForgotPassword = () => {
  return useMutation({
    mutationFn: forgotPassword,
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message || 'Failed to send reset email');
        return;
      }
      toast.success('Reset link sent to your email!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to send reset email');
    },
  });
};

export const useResetPassword = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: resetPassword,
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message || 'Password reset failed');
        return;
      }
      toast.success('Password reset successful! Please login.');
      router.push('/auth/login');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Password reset failed');
    },
  });
};



export const useDeleteAccount = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Account deleted successfully');
        // Clear auth and redirect
        localStorage.removeItem('auth_token');
        router.push('/auth/login');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete account');
    }
  });
};



export const useSessions = () => {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: getUserSessions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });
};

// Terminate specific session
export const useTerminateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: terminateSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session terminated successfully!');
    },
    onError: (error: any) => {
      console.error('Error terminating session:', error);
      toast.error('Failed to terminate session');
    }
  });
};

// Terminate all other sessions
export const useTerminateAllOtherSessions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: terminateAllOtherSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('All other sessions terminated!');
    },
    onError: (error: any) => {
      console.error('Error terminating all sessions:', error);
      toast.error('Failed to terminate all sessions');
    }
  });
}; 