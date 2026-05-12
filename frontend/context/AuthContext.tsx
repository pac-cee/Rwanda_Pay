import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi, clearToken, getToken, storeToken, type ApiUser } from "@/lib/api";
import {
  authenticateWithBiometrics,
  disableBiometricLogin,
  enableBiometricLogin,
  getBiometricType,
  isBiometricAvailable,
  isBiometricLoginEnabled,
} from "@/lib/biometric";

interface AuthContextType {
  user: ApiUser | null;
  isAuthChecked: boolean;
  isSigningIn: boolean;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  signIn: (email: string, password: string, enableBiometric?: boolean) => Promise<void>;
  signInWithBiometric: () => Promise<boolean>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricType: string;
  toggleBiometric: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState("Biometric");

  useEffect(() => {
    (async () => {
      // Check biometric availability
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      if (available) {
        const type = await getBiometricType();
        setBiometricType(type);
        const enabled = await isBiometricLoginEnabled();
        setBiometricEnabled(enabled);
      }

      // Check existing session
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

  const signIn = useCallback(async (email: string, password: string, enableBiometric = false) => {
    setIsSigningIn(true);
    try {
      const { user: u, token } = await authApi.login({ email, password });
      if (token && typeof token === "string") await storeToken(token);
      setUser(u);
      
      // Enable biometric if requested and available
      if (enableBiometric && biometricAvailable) {
        await enableBiometricLogin(email, password);
        setBiometricEnabled(true);
      }
    } finally {
      setIsSigningIn(false);
    }
  }, [biometricAvailable]);

  const signInWithBiometric = useCallback(async (): Promise<boolean> => {
    if (!biometricEnabled) return false;
    
    setIsSigningIn(true);
    try {
      const credentials = await authenticateWithBiometrics();
      if (!credentials) return false;

      const { user: u, token } = await authApi.login({
        email: credentials.email,
        password: credentials.password,
      });
      if (token && typeof token === "string") await storeToken(token);
      setUser(u);
      return true;
    } catch {
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, [biometricEnabled]);

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
    await disableBiometricLogin();
    setBiometricEnabled(false);
    setUser(null);
  }, []);

  const toggleBiometric = useCallback(async (email: string, password: string) => {
    if (biometricEnabled) {
      await disableBiometricLogin();
      setBiometricEnabled(false);
    } else {
      await enableBiometricLogin(email, password);
      setBiometricEnabled(true);
    }
  }, [biometricEnabled]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthChecked,
      isSigningIn,
      signUp,
      signIn,
      signInWithBiometric,
      signInDemo,
      signOut,
      biometricAvailable,
      biometricEnabled,
      biometricType,
      toggleBiometric,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
