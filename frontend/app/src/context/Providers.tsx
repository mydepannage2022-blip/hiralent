'use client';

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./AuthContext";
import { ProfileProvider } from "./ProfileContext";
import { NavigationLoadingProvider } from "./NavigationLoadingContext"; // Add this
import NavigationLoader from "../components/layout/NavigationLoader"; // Add this

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileProvider>
          <NavigationLoadingProvider>
            <NavigationLoader />
            
            {children}
          </NavigationLoadingProvider>
        </ProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}