import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  provider: "google" | "apple" | "phone" | "demo";
  initials: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthChecked: boolean;
  isSigningIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AUTH_KEY = "@rp_auth_user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function storeUser(user: AuthUser) {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(user));
    }
  } catch {}
}

async function loadUser(): Promise<AuthUser | null> {
  try {
    const raw =
      Platform.OS === "web"
        ? localStorage.getItem(AUTH_KEY)
        : await SecureStore.getItemAsync(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

async function clearUser() {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(AUTH_KEY);
    } else {
      await SecureStore.deleteItemAsync(AUTH_KEY);
    }
  } catch {}
}

function makeInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    loadUser().then((u) => {
      setUser(u);
      setIsAuthChecked(true);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsSigningIn(true);
    // Simulate Google OAuth flow
    await new Promise((r) => setTimeout(r, 1600));
    const u: AuthUser = {
      id: `google-${Date.now()}`,
      name: "Alex Mugisha",
      email: "alex.mugisha@gmail.com",
      provider: "google",
      initials: "AM",
    };
    await storeUser(u);
    setUser(u);
    setIsSigningIn(false);
  }, []);

  const signInWithApple = useCallback(async () => {
    setIsSigningIn(true);
    await new Promise((r) => setTimeout(r, 1400));
    const u: AuthUser = {
      id: `apple-${Date.now()}`,
      name: "Alex Mugisha",
      email: "alex@privaterelay.appleid.com",
      provider: "apple",
      initials: "AM",
    };
    await storeUser(u);
    setUser(u);
    setIsSigningIn(false);
  }, []);

  const signInDemo = useCallback(async () => {
    setIsSigningIn(true);
    await new Promise((r) => setTimeout(r, 800));
    const u: AuthUser = {
      id: "demo-001",
      name: "Alex Mugisha",
      email: "demo@rwandapay.rw",
      provider: "demo",
      initials: "AM",
    };
    await storeUser(u);
    setUser(u);
    setIsSigningIn(false);
  }, []);

  const signOut = useCallback(async () => {
    await clearUser();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthChecked,
        isSigningIn,
        signInWithGoogle,
        signInWithApple,
        signInDemo,
        signOut,
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
