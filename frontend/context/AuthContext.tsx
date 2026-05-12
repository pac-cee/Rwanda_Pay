import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi, clearToken, getToken, storeToken, type ApiUser } from "@/lib/api";

interface AuthContextType {
  user: ApiUser | null;
  isAuthChecked: boolean;
  isSigningIn: boolean;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        try {
          const { user: u } = await authApi.me();
          setUser(u);
        } catch {
          await clearToken();
        }
      }
      setIsAuthChecked(true);
    })();
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, phone?: string) => {
    setIsSigningIn(true);
    try {
      const { user: u, token } = await authApi.register({ email, password, name, phone });
      if (token && typeof token === "string") await storeToken(token);
      setUser(u);
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsSigningIn(true);
    try {
      const { user: u, token } = await authApi.login({ email, password });
      if (token && typeof token === "string") await storeToken(token);
      setUser(u);
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signInDemo = useCallback(async () => {
    setIsSigningIn(true);
    const demoEmail = "demo@rwandapay.rw";
    const demoPass = "demo1234";
    try {
      try {
        const { user: u, token } = await authApi.login({ email: demoEmail, password: demoPass });
        if (token && typeof token === "string") await storeToken(token);
        setUser(u);
        return;
      } catch {
        const { user: u, token } = await authApi.register({
          email: demoEmail, password: demoPass,
          name: "Alex Mugisha", phone: "+250788555999",
        });
        if (token && typeof token === "string") await storeToken(token);
        setUser(u);
        return;
      }
    } catch {
      // Backend unreachable — offline demo
      setUser({
        id: "demo", email: demoEmail, name: "Alex Mugisha",
        phone: "+250788555999", initials: "AM",
        is_verified: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try { await authApi.logout(); } catch {}
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthChecked, isSigningIn, signUp, signIn, signInDemo, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
