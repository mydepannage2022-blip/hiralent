'use client';

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./AuthContext";
import { ProfileProvider } from "./ProfileContext";
const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileProvider>
        {children}
        </ProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
