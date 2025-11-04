import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { loginUser } from '@/src/lib/auth/auth.api';

export function useLogin() {
  const router = useRouter();
  const { login } = useAuth(); //  Important: obtenir la fonction login

  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      console.log("✅ Login successful, data:", data);

      //  CRITIQUE: Vérifier que data contient token ET user
      if (!data.token) {
        console.error("❌ No token in response!");
        throw new Error("No authentication token received");
      }

      if (!data.user) {
        console.error("❌ No user in response!");
        throw new Error("No user data received");
      }

      console.log("✅ Calling login() with token and user");
      
      //  APPELER LA FONCTION login du context
      login(data.user, data.token);

      // Vérifier immédiatement après
      const savedToken = localStorage.getItem("authToken");
      console.log("✅ Token in localStorage after login:", savedToken ? "YES" : "NO");

      // ✅Redirection selon le rôle
      console.log("No stored redirect, checking role:", data.user.role);
      
      switch (data.user.role) {
        case 'company_admin':
        case 'company':
          router.push('/company/profile');
          break;
        case 'candidate':
          router.push('/candidate/dashboard');
          break;
        case 'agency_admin':
        case 'agency':
          router.push('/agency/dashboard');
          break;
        case 'super_admin':
          router.push('/admin/dashboard');
          break;
        default:
          router.push('/');
      }
    },
    onError: (error: any) => {
      console.error("❌ Login failed:", error);
      alert(error.message || 'Login failed. Please try again.');
    },
  });
}
