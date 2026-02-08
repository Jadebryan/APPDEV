import React, { createContext, useState, useEffect, useContext } from 'react';
import { User } from '../types';
import { storage } from '../utils/storage';
import { authService } from '../services/api';

export type RegisterResult = void | { needsVerification: true; email: string };

interface AuthContextType {
  user: User | null;
  /** Set when user signs in with Facebook (for trail events, etc.). Cleared on logout. */
  facebookAccessToken: string | null;
  setFacebookAccessToken: (token: string | null) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (params: { idToken?: string; accessToken?: string }) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<RegisterResult>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [facebookAccessToken, setFacebookAccessTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const [token, userData, fbToken] = await Promise.all([
        storage.getToken(),
        storage.getUser(),
        storage.getFacebookToken(),
      ]);
      if (token && userData) {
        setUser(userData);
      }
      if (fbToken) setFacebookAccessTokenState(fbToken);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const setFacebookAccessToken = async (token: string | null) => {
    await storage.setFacebookToken(token);
    setFacebookAccessTokenState(token);
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    await storage.setToken(response.token);
    await storage.setUser(response.user);
    setUser(response.user);
  };

  const loginWithGoogle = async (params: { idToken?: string; accessToken?: string }) => {
    const response = await authService.loginWithGoogle(params);
    await storage.setToken(response.token);
    await storage.setUser(response.user);
    setUser(response.user);
  };

  const register = async (email: string, password: string, username: string): Promise<RegisterResult> => {
    const response = await authService.register(email, password, username);
    if ('token' in response && response.token && 'user' in response && response.user) {
      await storage.setToken(response.token);
      await storage.setUser(response.user);
      setUser(response.user);
      return;
    }
    if ('email' in response && response.email) {
      return { needsVerification: true, email: response.email };
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    const response = await authService.verifyEmail(email, code);
    await storage.setToken(response.token);
    await storage.setUser(response.user);
    setUser(response.user);
  };

  const logout = async () => {
    await storage.clearAll();
    setFacebookAccessTokenState(null);
    setUser(null);
  };

  const updateUser = async (updated: User) => {
    await storage.setUser(updated);
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, facebookAccessToken, setFacebookAccessToken, login, loginWithGoogle, register, verifyEmail, logout, updateUser, loading }}>
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
