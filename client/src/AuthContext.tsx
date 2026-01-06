import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { api, setAuthState } from "./api";

const API_BASE_URL = "http://localhost:3000";

interface User {
  id: number;
  email: string;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On initial mount, try to restore auth state from refreshToken + userId
  useEffect(() => {
    const init = async () => {
      const storedRefresh = localStorage.getItem("refreshToken");
      const storedUserId = localStorage.getItem("userId");

      if (!storedRefresh || !storedUserId) {
        setIsLoading(false);
        return;
      }

      try {
        const uid = parseInt(storedUserId, 10);
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          userId: uid,
          refreshToken: storedRefresh,
        });

        const { accessToken, refreshToken, user } = res.data;

        setAuthState(accessToken, user.id);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("userId", String(user.id));
        setUser(user);
      } catch {
        // Could not refresh; clear stored tokens
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password,
    });
    const { accessToken, refreshToken, user } = res.data;

    setAuthState(accessToken, user.id);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("userId", String(user.id));
    setUser(user);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignoring errors from logout; we still clear local state
    }

    setAuthState(null, null);
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userId");
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
