import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "rp_token";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `http://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

console.log("[API] BASE_URL:", BASE_URL);

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function storeToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  initials: string;
  createdAt: string;
}

export interface ApiCard {
  id: string;
  last4: string;
  expiryDate: string;
  network: string;
  holderName: string;
  label: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ApiTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  cardId: string | null;
  recipientId: string | null;
  recipientName: string | null;
  category: string;
  createdAt: string;
}

export const authApi = {
  register: (body: { email: string; password: string; name: string; phone?: string }) =>
    request<{ user: ApiUser; wallet: { balance: number }; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ user: ApiUser; wallet: { balance: number }; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request<{ user: ApiUser; wallet: { balance: number } }>("/auth/me"),
  logout: () => request<{ success: boolean }>("/auth/logout", { method: "POST" }),
  updateProfile: (body: { name?: string; phone?: string }) =>
    request<{ user: ApiUser }>("/auth/profile", { method: "PUT", body: JSON.stringify(body) }),
};

export const walletApi = {
  get: () => request<{ balance: number }>("/wallet"),
  topup: (body: { cardId: string; amount: number }) =>
    request<{ transaction: ApiTransaction; balance: number }>("/wallet/topup", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  transfer: (body: { recipientEmail: string; amount: number; description: string }) =>
    request<{ transaction: ApiTransaction; balance: number }>("/wallet/transfer", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  pay: (body: { amount: number; description: string; category?: string }) =>
    request<{ transaction: ApiTransaction; balance: number }>("/wallet/pay", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const cardsApi = {
  list: () => request<{ cards: ApiCard[] }>("/cards"),
  add: (body: { cardNumber: string; expiryDate: string; cvv: string; holderName: string; network: string; label?: string; color?: string }) =>
    request<{ card: ApiCard }>("/cards", { method: "POST", body: JSON.stringify(body) }),
  remove: (id: string) => request<{ success: boolean }>(`/cards/${id}`, { method: "DELETE" }),
  setDefault: (id: string) => request<{ card: ApiCard }>(`/cards/${id}/default`, { method: "PUT" }),
};

export const transactionsApi = {
  list: (params?: { limit?: number; offset?: number; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit !== undefined) q.set("limit", String(params.limit));
    if (params?.offset !== undefined) q.set("offset", String(params.offset));
    if (params?.type) q.set("type", params.type);
    return request<{ transactions: ApiTransaction[]; total: number }>(
      `/transactions?${q.toString()}`
    );
  },
  analytics: (period = 30) =>
    request<{
      byCategory: Record<string, number>;
      monthly: Array<{ month: string; in: number; out: number }>;
      totalIn: number;
      totalOut: number;
    }>(`/transactions/analytics?period=${period}`),
};
