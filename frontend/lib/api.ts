import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "rp_token";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `http://${process.env.EXPO_PUBLIC_DOMAIN}/api/v1`
  : "/api/v1";

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return localStorage.getItem(TOKEN_KEY);
    return SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function storeToken(token: string): Promise<void> {
  if (!token || typeof token !== "string") return;
  if (Platform.OS === "web") localStorage.setItem(TOKEN_KEY, token);
  else await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === "web") localStorage.removeItem(TOKEN_KEY);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as any).error ?? "Request failed");
  // Backend wraps responses in { success, data } — unwrap
  return ((data as any).data ?? data) as T;
}

// ── Types matching backend domain exactly ──────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  initials: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiWallet {
  balance: number;
  currency: string;
  frozen?: boolean;
}

export interface ApiCard {
  id: string;
  user_id: string;
  last4: string;
  expiry_date: string;
  holder_name: string;
  network: "visa" | "mastercard" | "amex";
  label: string;
  color: string;
  balance: number;
  is_default: boolean;
  status: "active" | "frozen" | "expired" | "cancelled";
  created_at: string;
}

export interface ApiTransaction {
  id: string;
  user_id: string;
  type: "topup" | "payment" | "send" | "receive" | "refund" | "withdrawal";
  status: "pending" | "success" | "failed" | "reversed";
  amount: number;
  fee: number;
  description: string;
  category: string;
  reference: string | null;
  card_id: string | null;
  merchant_id: string | null;
  recipient_id: string | null;
  recipient_name: string | null;
  balance_before: number | null;
  balance_after: number | null;
  is_nfc: boolean;
  created_at: string;
}

// ── Auth API ───────────────────────────────────────────────────────────────

export const authApi = {
  register: (body: { email: string; password: string; name: string; phone?: string }) =>
    request<{ user: ApiUser; wallet: ApiWallet; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ user: ApiUser; wallet: ApiWallet; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request<{ user: ApiUser; wallet: ApiWallet }>("/auth/me"),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  updateProfile: (body: { name?: string; phone?: string }) =>
    request<{ user: ApiUser }>("/auth/profile", { method: "PUT", body: JSON.stringify(body) }),
};

// ── Wallet API ─────────────────────────────────────────────────────────────

export const walletApi = {
  get: () => request<{ balance: number; currency: string; frozen: boolean }>("/wallet"),
  topup: (body: { card_id: string; amount: number }) =>
    request<{ transaction: ApiTransaction; balance: number }>("/wallet/topup", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  transfer: (body: { recipient_email: string; amount: number; description: string }) =>
    request<{ transaction: ApiTransaction; balance: number }>("/wallet/transfer", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  pay: (body: { amount: number; description: string; category?: string; merchant_code?: string; is_nfc?: boolean }) =>
    request<{ transaction: ApiTransaction; balance: number }>("/wallet/pay", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ── Cards API ──────────────────────────────────────────────────────────────

export const cardsApi = {
  list: () => request<{ cards: ApiCard[] }>("/cards"),
  add: (body: {
    card_number: string;
    expiry_date: string;
    cvv: string;
    holder_name: string;
    network: "visa" | "mastercard" | "amex";
    label?: string;
    color?: string;
    balance?: number;
  }) => request<{ card: ApiCard }>("/cards", { method: "POST", body: JSON.stringify(body) }),
  remove: (id: string) => request<{ success: boolean }>(`/cards/${id}`, { method: "DELETE" }),
  setDefault: (id: string) => request<{ card: ApiCard }>(`/cards/${id}/default`, { method: "PUT" }),
  addBalance: (id: string, amount: number) =>
    request<{ card: ApiCard }>(`/cards/${id}/balance`, { method: "PUT", body: JSON.stringify({ amount }) }),
};

// ── Transactions API ───────────────────────────────────────────────────────

export const transactionsApi = {
  list: (params?: { limit?: number; offset?: number; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit !== undefined) q.set("limit", String(params.limit));
    if (params?.offset !== undefined) q.set("offset", String(params.offset));
    if (params?.type) q.set("type", params.type);
    return request<{ transactions: ApiTransaction[]; total: number; limit: number; offset: number }>(
      `/transactions?${q.toString()}`
    );
  },
  analytics: (period = 30) =>
    request<{
      by_category: Record<string, number>;
      monthly: Array<{ month: string; in: number; out: number }>;
      total_in: number;
      total_out: number;
      days: number;
    }>(`/transactions/analytics?period=${period}`),
};
