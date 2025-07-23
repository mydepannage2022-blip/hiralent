// lib/queries.ts
import { useMutation } from '@tanstack/react-query';
import { signup , updateLocation, updateSalary} from './api';
import { useAuth } from '../context/AuthContext';
import { useRouter } from "next/navigation";
import { login } from './api';

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
  const router = useRouter();

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      // Token localStorage mein store karo
      localStorage.setItem('token', data.token);

      toast.success('Login successful');
      router.push('/dashboard'); // ya jahan redirect karna ho
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Login failed');
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


// 🟢 Salary Mutation with redirect
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