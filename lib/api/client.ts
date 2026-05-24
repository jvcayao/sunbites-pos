import { useAuthStore } from "@/lib/store/auth";

import type { ApiError } from "@/types/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;
  const store = useAuthStore.getState();

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (store.token) {
    headers["Authorization"] = `Bearer ${store.token}`;
  }

  if (store.activeBranch) {
    headers["X-Branch-Id"] = String(store.activeBranch.id);
  }

  const response = await fetch(url.toString(), { ...init, headers });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw { message: "Session expired. Please log in again." } as ApiError;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "An error occurred." }));
    if (response.status === 422 && typeof error.message === "string" && error.message.includes("No active branch")) {
      useAuthStore.getState().setActiveBranch(null);
      if (typeof window !== "undefined") window.location.href = "/branch";
    }
    throw error as ApiError;
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
