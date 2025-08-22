import { useMutation } from '@tanstack/react-query';
import { signup , updateLocation, updateSalary , login as loginapi , uploadResume ,verifyEmail , resendVerificationEmail , uploadProfilePicture} from './auth.api';
import { useAuth } from '../context/AuthContext';
import { useRouter } from "next/navigation";
import { useProfile } from '../context/ProfileContext';

export const useSignup = () => {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: signup,
    onSuccess: (data) => {
      // console.log("✅ Signup response:", data); 
      login(data.user, data.token);
      router.push('/auth/signup/location');
    },
    onError: (error: any) => {
      console.error('Signup failed:', error?.response?.data?.message || error.message);
 
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
      login(data.user, data.token);
      
      if (data.profile) {
        setProfileData(data.profile); 
        
        console.log('✅ Profile data set in context:', data.profile);
      }

      console.log('User:', data.user);
      console.log('Profile:', data.profile);
      console.log('Token:', data.token);

      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        localStorage.removeItem('redirectAfterLogin');
        router.push(redirectPath);
      } else {
        if (data.user.role === 'candidate') {
          router.push('/candidate/dashboard');
        } else if (data.user.role === 'company') {
          router.push('/company/dashboard');
        } else if (data.user.role === 'agency') {
          router.push('/agency/dashboard');
        } else {
          router.push('/');
        }
      }
    },
    onError: (error: any) => {
      console.error('Login failed:', error?.response?.data?.message || error.message);
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
      router.push("/auth/signup/salary");
    },
    onError: (err) => {
      console.error("Location update failed:", err);
    },
  });
};

export const useUpdateSalary = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { minimumSalary: number; paymentPeriod: string }) =>
      updateSalary(data),
    onSuccess: () => {
      router.push("/auth/signup/profile-picture");
    },
    onError: (err) => {
      console.error("Salary update failed:", err);
    },
  });
};


export const useUploadResume = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: uploadResume,
    onSuccess: () => {
      console.log('Resume uploaded successfully');
      router.push("/auth/logout");
    },
    onError: (error: any) => {
      console.error('Upload failed:', error);
      console.error('Error details:', error?.response?.data);
      console.error('Status:', error?.response?.status);
      // Show user-friendly error message
      alert(`Upload failed: ${error?.response?.data?.message || error.message}`);
    },
  });
};

export const useVerifyEmail = () => {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: verifyEmail,
    onSuccess: (data) => {
      console.log("✅ Email verified successfully:", data);
      
      if (data.success && data.user && data.token) {
        login(data.user, data.token);
        router.push('/auth/logout');
      }
    },
    onError: (error: any) => {
      console.error('Email verification failed:', error?.response?.data?.message || error.message);
    },
  });
};

export const useResendVerificationEmail = () => {
  return useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: (data) => {
      console.log("✅ Verification email sent:", data);
      if (data.success) {
        alert(data.message || "Verification email sent! Please check your inbox.");
      }
    },
    onError: (error: any) => {
      console.error('Resend verification failed:', error?.response?.data?.message || error.message);
      const message = error?.response?.data?.message || error.message;
      alert(`Failed to send email: ${message}`);
    },
  });
};


export const useUploadProfilePicture = () => {
  const router = useRouter();
  
  return useMutation({
    mutationFn: uploadProfilePicture,
    onSuccess: () => {
      console.log('Profile picture uploaded successfully');
      router.push("/auth/signup/uploadresume"); // ya jahan jana ho
    },
    onError: (error: any) => {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error?.response?.data?.message || error.message}`);
    },
  });
};