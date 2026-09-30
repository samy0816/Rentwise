"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, setToken } from "@/lib/api";
import { DEMO_EMAIL, DEMO_PASSWORD, demoUser } from "@/lib/demo";
import type { Language } from "@/lib/i18n";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, fullName?: string) => Promise<User>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("en");
  const [isDemo, setIsDemo] = useState(false);

  // Restore the session + language preference on mount.
  useEffect(() => {
    const savedLang = window.localStorage.getItem("rentwise_lang");
    if (savedLang === "de" || savedLang === "en") setLanguage(savedLang as Language);
    const token = window.localStorage.getItem("rentwise_token");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<User> {
    try {
      const res = await authApi.login({ email, password });
      setToken(res.access_token);
      const u = res.user ?? (await authApi.me());
      setUser(u);
      setIsDemo(false);
      return u;
    } catch (err) {
      // Fall back to demo account when the backend is unavailable.
      if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        setUser(demoUser);
        setIsDemo(true);
        return demoUser as User;
      }
      throw err;
    }
  }

  async function register(email: string, password: string, fullName?: string): Promise<User> {
    const res = await authApi.register({ email, password, full_name: fullName });
    setToken(res.access_token);
    setUser(res.user);
    setIsDemo(false);
    return res.user;
  }

  function signOut() {
    setToken(null);
    setUser(null);
    setIsDemo(false);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isDemo,
      language,
      setLanguage,
      login,
      register,
      signOut,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, isDemo, language],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
