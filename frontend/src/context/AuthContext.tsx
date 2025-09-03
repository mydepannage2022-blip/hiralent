"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import Loader from '../components/layout/Loader';

interface AuthContextType {
  user: any;
  token: string | null;
  login: (userData: any, token: string) => void;
  logout: () => void;
  updateUser: (userData: any) => void;
  updateToken: (token: string) => void; 
  loading: boolean;
  isHydrated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('authToken');
      const savedUser = localStorage.getItem('authUser');

      console.log('Saved Token:', savedToken); // Debug
      console.log('Saved User:', savedUser); // Debug

      if (savedToken) {
        setToken(savedToken);
        console.log('Token set:', savedToken); // Debug
      }
      
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          console.log('User set:', parsedUser); // Debug
        } catch (error) {
          console.error('Error parsing saved user:', error);
          localStorage.removeItem('authUser'); // Remove corrupted data
        }
      }

      setIsHydrated(true); // Mark as hydrated
      setLoading(false);
    }
  }, []);

  const login = (userData: any, token: string) => {
    console.log('Login called with:', { userData, token }); // Debug
    
    setUser(userData);
    setToken(token);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
      localStorage.setItem('authUser', JSON.stringify(userData));
    }
  };

  // ✅ NEW: Only update user data
  const updateUser = (userData: any) => {
    console.log('✅ Updating user only:', userData);
    setUser(userData);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('authUser', JSON.stringify(userData));
    }
  };

  // ✅ NEW: Only update token
  const updateToken = (newToken: string) => {
    console.log('✅ Updating token only:', newToken);
    setToken(newToken);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', newToken);
    }
  };

  const logout = () => {
    console.log('Logout called'); // Debug
    
    setUser(null);
    setToken(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    }
  };

  // Don't render children until hydrated to avoid mismatch
  if (!isHydrated) {
    return <Loader/>; // Or your loading component
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      updateUser,   // ✅ NEW
      updateToken,  // ✅ NEW
      loading, 
      isHydrated 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};