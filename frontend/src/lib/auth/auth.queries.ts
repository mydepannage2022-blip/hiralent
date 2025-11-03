import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { signup , updateLocation, updateSalary , login as loginapi , uploadResume ,verifyEmail , resendVerificationEmail , uploadProfilePicture , createCompanyProfile} from './auth.api';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from "next/navigation";
import { useProfile } from '../../context/ProfileContext';


export const useSignup = () => {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: signup,
  onSuccess: (data: any) => {
      if (data.error === true || data.success === false) {
        const errorMessage = data.message || 'Login failed';
        toast.error(errorMessage);
        console.error('Signup failed:', errorMessage);
        return;
      }

      toast.success('Account created successfully!');
      if (process.env.NODE_ENV !== 'production') {
        try {
          // eslint-disable-next-line no-console
          console.debug('[useSignup.onSuccess] signup response', { user: data.user ? { user_id: data.user.user_id, email: data.user.email, role: data.user.role } : null, hasToken: !!data.token });
        } catch {}
      }
      login(data.user, data.token);

      // Small delay to allow browser to accept httpOnly cookies in cookie-only flows
      // This mitigates a race where immediate background requests (profile, completeness)
      // run before the cookie is accepted, causing 401s and potential logout redirects.
      const redirect = () => {
        const role = (data.user.role || '').toString().toLowerCase();
        if (role === 'company' || role === 'company_admin') {
            router.push('/auth/companyRegister/info');
        } else if (role === 'candidate') {
            router.push('/auth/signup/location'); 
        } else if (role === 'agency') {
            router.push('/agency/setup'); 
        } else {
            router.push('/'); 
        }
      };

      // Delay is intentionally small — long enough for the browser to store cookies, short for UX.
      setTimeout(redirect, 75);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Signup failed';
      console.error('Signup failed:', errorMessage);
      toast.error(errorMessage);
    },
  });
};


// export const useLogin = () => {
//   const { login } = useAuth();
//   const { setProfileData } = useProfile(); 
//   const router = useRouter();

//   return useMutation({
//     mutationFn: loginapi,
//     onSuccess: (data) => {
//       if (data.error === true || data.success === false) {
//         const errorMessage = data.message || 'Login failed';
//         toast.error(errorMessage);
//         return;
//       }
//       toast.success('Login successful!');
//       login(data.user, data.token);
      
//       if (data.profile) {
//         setProfileData(data.profile); 
//         console.log('Profile data set in context:', data.profile);
//       }

//       console.log('User:', data.user);
//       console.log('Profile:', data.profile);
//       console.log('Token:', data.token);

//       const redirectPath = localStorage.getItem('redirectAfterLogin');
//       if (redirectPath) {
//         localStorage.removeItem('redirectAfterLogin');
//         router.push(redirectPath);
//       } else {
//         if (data.user.role === 'candidate') {
//           router.push('/candidate/dashboard');
//         } else if (data.user.role === 'company_admin') {
//           router.push('/company/dashboard');
//         } else if (data.user.role === 'agency') {
//           router.push('/agency/dashboard');
//         } else {
//           router.push('/');
//         }
//       }
//     },
//     onError: (error: any) => {
//       const errorMessage = error?.response?.data?.message || error.message || 'Login failed';
//       console.error('Login failed:', errorMessage);
//       toast.error(errorMessage);
//     },
//   });
// };
export const useLogin = () => {
  const { login } = useAuth();
  const { setProfileData } = useProfile();
  const router = useRouter();

  
  return useMutation({
    mutationFn: loginapi,
  onSuccess: (data: any) => {

      // Do not clear all localStorage/sessionStorage here — that can remove
      // the persisted user set by the auth interceptor and cause a race
      // where ProtectedRoute redirects to login immediately. Keep login
      // atomic: call login(...) which will persist user/token as needed.

      if (data.error === true || data.success === false) {
        const errorMessage = data.message || 'Login failed';
        toast.error(errorMessage);
        return;
      }
      
      toast.success('Login successful!');
      login(data.user, data.token);
      if (data.profile) {
        setProfileData(data.profile);
        console.log('Profile data set in context:', data.profile);
      }

      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        localStorage.removeItem('redirectAfterLogin');
        console.log('Redirecting to stored path:', redirectPath);
        router.push(redirectPath);
      } else {
        // YEH BHI LOG KARO
        console.log('No stored redirect, checking role:', data.user.role);
        
        const role = (data.user.role || '').toString().toLowerCase();
        if (role === 'candidate') {
          console.log('Redirecting to candidate dashboard');
          router.push('/candidate/dashboard');
        } else if (role === 'company' || role === 'company_admin') {
          console.log('Redirecting to company dashboard');
          router.push('/company/dashboard');
        } else if (role === 'agency') {
          console.log('Redirecting to agency dashboard');
          router.push('/agency/dashboard');
        } else {
          console.log('Unknown role, redirecting to home');
          router.push('/');
        }
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Login failed';
      console.error('Login failed:', errorMessage);
      toast.error(errorMessage);
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: uploadResume,
    onSuccess: () => {
      console.log('Resume uploaded successfully');
      toast.success('Resume uploaded successfully!');
      // Keep the user signed in — redirect them to their dashboard instead of logging out
      if (user?.role === 'candidate') {
        router.push('/candidate/dashboard');
      } else {
        router.push('/');
      }
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
  onSuccess: (data: any) => {
      console.log("Email verified successfully:", data);
      toast.success('Email verified successfully!');
      
      // Backend may return { user, token } or only { user } for cookie-only sessions.
      if (data?.user) {
        login(data.user, data.token);
        const role = (data.user.role || '').toString().toLowerCase();
        if (role === 'candidate') {
          router.push('/candidate/dashboard');
        } else if (role === 'company' || role === 'company_admin') {
          router.push('/company/dashboard');
        } else {
          router.push('/');
        }
        return;
      }

      // Old behavior: backend might return a simple success flag without user payload.
      if (data?.success) {
        // Just navigate to home — the user likely needs to sign in again or a cookie was set.
        router.push('/');
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
      // Keep company signed in and send them to their dashboard
      router.push('/company/dashboard');
    }
  });
};