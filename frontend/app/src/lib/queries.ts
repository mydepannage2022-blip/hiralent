// lib/queries.ts
import { useMutation } from '@tanstack/react-query';
import { signup } from './api';
import { useAuth } from '../context/AuthContext';
import { useRouter } from "next/navigation";

export const useSignup = () => {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: signup,
    onSuccess: (data) => {
      login(data.user, data.token);
      router.push('/signup/location');
    },
    onError: (error: any) => {
      console.error('Signup failed:', error?.response?.data?.message || error.message);
      // Show toast or error state
    },
  });
};
