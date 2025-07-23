import { useMutation } from '@tanstack/react-query';
import { signup , updateLocation, updateSalary , login as loginapi , uploadResume} from './api';
import { useAuth } from '../context/AuthContext';
import { useRouter } from "next/navigation";

export const useSignup = () => {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: signup,
    onSuccess: (data) => {
      // console.log("✅ Signup response:", data); 
      login(data.user, data.token);
      router.push('/signup/location');
    },
    onError: (error: any) => {
      console.error('Signup failed:', error?.response?.data?.message || error.message);
      // Show toast or error state
    },
  });
};

export const useLogin = () => {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: loginapi,
    onSuccess: (data) => {
      login(data.user, data.token);
      router.push('/candidate/dashboard'); // Adjust redirect path as needed
    },
    onError: (error: any) => {
      console.error('Login failed:', error?.response?.data?.message || error.message);
      // Show toast or error state
    },
  });
};

export const useUpdateLocation = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { location: string; postalCode: number }) => {
      return updateLocation({
        location: data.location,
        postalCode: Number(data.postalCode), // convert string to number
      });
    },
    onSuccess: () => {
      router.push("/signup/salary");
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
      router.push("/signup/uploadresume");
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
      router.push("/candidate/dashboard");
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