'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserSession {
  email: string;
  role: 'BUYER' | 'SELLER';
  brandName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string; // ADDED PHONE SO COMPILER STAYS HEALTHY
}

interface AuthContextType {
  user: UserSession | null;
  login: (brandData: UserSession) => void;
  logout: () => void;
  mounted: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load the seller's session from browser cache on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('oaklahome_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse auth user:', e);
      }
    }
    setMounted(true);
  }, []);

  const login = (brandData: UserSession) => {
    setUser(brandData);
    localStorage.setItem('oaklahome_user', JSON.stringify(brandData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('oaklahome_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, mounted }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}