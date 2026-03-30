import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { signup, updateLocation, updateSalary, login as loginapi, uploadResume, verifyEmail, resendVerificationEmail, uploadProfilePicture, createCompanyProfile, uploadCompanyDocument, resetPassword, forgotPassword, deleteAccount, getUserSessions, terminateAllOtherSessions, terminateSession } from './auth.api';
import { setup2FAAPI, setupWithTokenAPI, enable2FAAPI, disable2FAAPI, verifyLogin2FAAPI, verifyRecoveryCodeAPI } from './twoFactor.api';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from "next/navigation";
import { useProfile } from '../../context/ProfileContext';


export const useSignup = () => {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: signup,
    onSuccess: (data) => {
      if (data.error === true || data.success === false) {
        const errorMessage = data.message || 'Login failed';
        toast.error(errorMessage);
        console.error('Signup failed:', errorMessage);
        return;
      }

      toast.success('Account created successfully!');
      login(data.user, data.token);

      if (data.user.role === 'company_admin') {
        router.push('/auth/companyRegister/info');
      } else if (data.user.role === 'candidate') {
        router.push('/auth/signup/location');
      } else if (data.user.role === 'agency') {
        router.push('/agency/setup');
      } else {
        router.push('/');
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Signup failed';
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
      const d = data as any;

      // MFA required — let the login page handle the 2FA step
      if (d.requiresMFA || d.requiresMFASetup) {
        return;
      }

      // Error response (returned as 200 with error flag)
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
      login(d.user, d.token);
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
      const errorMessage = error?.response?.data?.message || error.message || 'Login failed';
      console.error('Login failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};

export const useSetup2FA = () => {
  return useMutation({
    mutationFn: setup2FAAPI,
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to set up 2FA');
    },
  });
};

export const useSetupWithToken = () => {
  return useMutation({
    mutationFn: setupWithTokenAPI,
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to generate QR code');
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
      toast.error(error?.response?.data?.message || 'Invalid code. Please try again.');
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
      toast.error(error?.response?.data?.message || 'Invalid code. Please try again.');
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
      if (data?.error || !data?.user) {
        toast.error(data?.message || 'Verification failed');
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      login(data.user, data.token);
      if (data.profile) setProfileData(data.profile);

      // If recovery codes are present this is first-time setup — let the login page show them
      if (data.recoveryCodes?.length > 0) return;

      toast.success('Login successful!');
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callbackUrl');
      if (callbackUrl && callbackUrl.startsWith('/')) {
        router.push(callbackUrl);
        return;
      }

      const role = data.user?.role;
      if (role === 'candidate') router.push('/candidate/dashboard');
      else if (role === 'company_admin') router.push('/company/dashboard');
      else if (role === 'agency_admin') router.push('/agency/dashboard');
      else router.push('/');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error.message || 'Verification failed';
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
      if (data?.error || !data?.user) {
        toast.error(data?.message || 'Verification failed');
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      toast.success('Login successful!');
      login(data.user, data.token);
      if (data.profile) setProfileData(data.profile);

      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callbackUrl');
      if (callbackUrl && callbackUrl.startsWith('/')) {
        router.push(callbackUrl);
        return;
      }

      const role = data.user?.role;
      if (role === 'candidate') router.push('/candidate/dashboard');
      else if (role === 'company_admin') router.push('/company/dashboard');
      else if (role === 'agency_admin') router.push('/agency/dashboard');
      else router.push('/');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error.message || 'Recovery code verification failed';
      toast.error(msg);
    },
  });
};
export const useUpdateLocation = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { location: string; postalCode: number }) => {
      return updateLocation({
        location: data.location,
        postalCode: Number(data.postalCode),
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
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: verifyEmail,
    onSuccess: (data) => {
      console.log("Email verified successfully:", data);
      toast.success('Email verified successfully!');

      if (data.success && data.user && data.token) {
        login(data.user, data.token);
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