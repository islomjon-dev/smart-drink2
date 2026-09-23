import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { apiRequest, setStoredToken, removeStoredToken, getStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginWithCredentials: (email: string, password?: string) => Promise<void>;
  googleLogin: (email: string, name?: string, rolePref?: Role) => Promise<void>;
  loginWithGoogle: (opts?: any) => Promise<void>;
  switchDemoRole: (role: Role) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  async function checkCurrentUser() {
    const token = getStoredToken();
    if (!token) {
      // Auto-login default CEO for preview convenience if no token set
      try {
        const res = await apiRequest<{ success: boolean; token: string; user: User }>('/api/auth/switch-demo', {
          method: 'POST',
          body: JSON.stringify({ targetRole: 'CEO' })
        });
        if (res.success && res.token) {
          setStoredToken(res.token);
          setUser(res.user);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; user: User }>('/api/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        removeStoredToken();
        setUser(null);
      }
    } catch (err) {
      console.warn('Auth check failed, logging in as CEO demo', err);
      try {
        const res = await apiRequest<{ success: boolean; token: string; user: User }>('/api/auth/switch-demo', {
          method: 'POST',
          body: JSON.stringify({ targetRole: 'CEO' })
        });
        if (res.success && res.token) {
          setStoredToken(res.token);
          setUser(res.user);
        }
      } catch {
        removeStoredToken();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }

  const login = async (email: string, password = 'password') => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res.success) {
        setStoredToken(res.token);
        setUser(res.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (email: string, name?: string, rolePref: Role = 'CUSTOMER') => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; token: string; user: User }>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          email,
          name: name || email.split('@')[0],
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
          rolePreference: rolePref
        })
      });
      if (res.success) {
        setStoredToken(res.token);
        setUser(res.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchDemoRole = async (targetRole: Role) => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; token: string; user: User }>('/api/auth/switch-demo', {
        method: 'POST',
        body: JSON.stringify({ targetRole })
      });
      if (res.success) {
        setStoredToken(res.token);
        setUser(res.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeStoredToken();
    setUser(null);
  };

  const loginWithGoogle = async (opts?: any) => {
    if (typeof opts === 'string') {
      return googleLogin(opts);
    }
    const email = opts?.email || 'user@example.com';
    const name = opts?.name || opts?.email?.split('@')[0];
    const role = opts?.role || 'CUSTOMER';
    return googleLogin(email, name, role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithCredentials: login,
        googleLogin,
        loginWithGoogle,
        switchDemoRole,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
