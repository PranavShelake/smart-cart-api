// src/api/client.ts
import axios from "axios";
import { config } from "../config";

export const apiClient = axios.create({
  baseURL: config.API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// ── Attach token to every request ─────────────────────────────
apiClient.interceptors.request.use((reqConfig) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// ── Silent token refresh on 401 ───────────────────────────────
let isRefreshing = false;
let failedQueue: { resolve: (t: string) => void; reject: (e: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // ✅ KEY FIX: Never try to refresh if the failing request
    // is itself an auth endpoint (login, refresh, logout, etc.)
    // Without this, a wrong password triggers a refresh attempt
    // which fails and does window.location.href = "/login" (hard reload)
    const isAuthRoute = original?.url?.includes("/auth/");
    if (isAuthRoute || error?.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        })
        .catch((err) => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await apiClient.post("/auth/refresh");
      const newToken: string = data?.data?.access_token ?? data?.access_token;

      localStorage.setItem("access_token", newToken);
      apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);

      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem("access_token");
      // ✅ Dispatch a custom event — let React handle the redirect
      // Never use window.location.href (causes hard reload)
      window.dispatchEvent(new Event("auth:session-expired"));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);