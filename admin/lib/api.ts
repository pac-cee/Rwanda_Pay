const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

let adminToken: string | null = null;

export function setAdminToken(token: string) {
  adminToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('admin_token', token);
  }
}

export function getAdminToken(): string | null {
  if (adminToken) return adminToken;
  if (typeof window !== 'undefined') {
    adminToken = localStorage.getItem('admin_token');
  }
  return adminToken;
}

export function clearAdminToken() {
  adminToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_token');
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAdminToken();
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Request failed');
    return (data.data ?? data) as T;
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please ensure the backend is running.');
    }
    throw error;
  }
}

// Admin API
export const adminApi = {
  // Auth
  login: (email: string, password: string) =>
    request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Users
  getUsers: (params?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    return request<{ users: any[]; total: number }>(`/admin/users?${q}`);
  },

  getUserById: (id: string) => request<{ user: any }>(`/admin/users/${id}`),

  updateUser: (id: string, data: { name: string; phone: string }) =>
    request<{ user: any }>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteUser: (id: string) =>
    request<{ message: string }>(`/admin/users/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: (params?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    return request<{ transactions: any[]; total: number }>(`/admin/transactions?${q}`);
  },

  // Merchants
  getMerchants: () => request<{ merchants: any[] }>('/admin/merchants'),
  
  addMerchant: (data: {
    name: string;
    email?: string;
    phone?: string;
    category: string;
    description?: string;
    address?: string;
    city?: string;
  }) => request<{ merchant: any }>('/admin/merchants', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateMerchant: (id: string, data: { name: string; email: string; phone: string; description: string }) =>
    request<{ message: string }>(`/admin/merchants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteMerchant: (id: string) =>
    request<{ message: string }>(`/admin/merchants/${id}`, { method: 'DELETE' }),

  // System Stats
  getStats: () => request<{
    total_users: number;
    total_transactions: number;
    total_volume: number;
    active_users_today: number;
  }>('/admin/stats'),

  // Activity Logs
  getLogs: (params?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    return request<{ logs: any[]; total: number }>(`/admin/logs?${q}`);
  },
};
