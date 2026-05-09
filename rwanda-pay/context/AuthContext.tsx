import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authApi, clearToken, getToken, storeToken, type ApiUser } from "@/lib/api";

interface AuthContextType {
  user: ApiUser | null;
  walletBalance: number;
  isAuthChecked: boolean;
  isSigningIn: boolean;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  setWalletBalance: (b: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        try {
          const { user: u, wallet } = await authApi.me();
          setUser(u);
          setWalletBalance(wallet.balance);
        } catch {
          await clearToken();
        }
      }
      setIsAuthChecked(true);
    })();
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    name: string,
    phone?: string,
  ) => {
    setIsSigningIn(true);
    try {
      const { user: u, wallet, token } = await authApi.register({ email, password, name, phone });
      await storeToken(token);
      setWalletBalance(wallet.balance);
      setUser(u);
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsSigningIn(true);
    try {
      const { user: u, wallet, token } = await authApi.login({ email, password });
      await storeToken(token);
      setWalletBalance(wallet.balance);
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
        const { user: u, wallet, token } = await authApi.login({ email: demoEmail, password: demoPass });
        await storeToken(token);
        setWalletBalance(wallet.balance);
        setUser(u);
      } catch {
        const { user: u, wallet, token } = await authApi.register({
          email: demoEmail,
          password: demoPass,
          name: "Alex Mugisha",
          phone: "+250788555999",
        });
        await storeToken(token);
        setWalletBalance(wallet.balance);
        setUser(u);
      }
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {}
    await clearToken();
    setUser(null);
    setWalletBalance(0);
  }, []);

  // Refreshes both balance AND user profile (needed after profile updates)
  const refreshBalance = useCallback(async () => {
    try {
      const { user: u, wallet } = await authApi.me();
      setWalletBalance(wallet.balance);
      setUser(u);
    } catch {}
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        walletBalance,
        isAuthChecked,
        isSigningIn,
        signUp,
        signIn,
        signInDemo,
        signOut,
        refreshBalance,
        setWalletBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
