import React, { createContext, useState, useEffect, useContext } from 'react';
import { User } from '../types';
import { storage } from '../utils/storage';
import { authService } from '../services/api';
import { mockDataService } from '../services/mockData';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await storage.getToken();
      const userData = await storage.getUser();
      if (token && userData) {
        setUser(userData);
        // Sync with mock data service
        mockDataService.setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    await storage.setToken(response.token);
    await storage.setUser(response.user);
    mockDataService.setCurrentUser(response.user);
    setUser(response.user);
  };

  const register = async (email: string, password: string, username: string) => {
    const response = await authService.register(email, password, username);
    await storage.setToken(response.token);
    await storage.setUser(response.user);
    mockDataService.setCurrentUser(response.user);
    setUser(response.user);
  };

  const logout = async () => {
    await storage.clearAll();
    mockDataService.setCurrentUser(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
