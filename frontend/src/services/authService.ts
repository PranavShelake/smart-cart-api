// src/services/authService.ts
import { apiClient } from "../api/client";
import type { UserProfile } from "../types"; 

// ── Request payloads ──────────────────────────────────────────
export interface LoginPayload {
  email:    string;
  password: string;
}

export interface RegisterPayload {
  email:      string;
  password:   string;
  first_name: string;
  last_name:  string;
  phone?:     string;
}

export interface ResetPasswordPayload {
  token:            string;
  new_password:     string;
  confirm_password: string;
}

// ── Response shapes (mirrors FastAPI exactly) ─────────────────
export interface LoginResponse {
  access_token: string;
  token_type:   string;
  expires_in:   number;
  user:         UserProfile;   
}

export interface RegisterResponse {
  user_id: number;
  message: string;
}

export interface MessageResponse {
  message: string;
}

// ── Service ───────────────────────────────────────────────────
export const authService = {

  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await apiClient.post("/auth/login", payload);
    return data.data as LoginResponse;
  },

  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    const { data } = await apiClient.post("/auth/register", payload);
    return data.data as RegisterResponse;
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  async forgotPassword(email: string): Promise<MessageResponse> {
    const { data } = await apiClient.post("/auth/forgot-password", { email });
    return data as MessageResponse;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<MessageResponse> {
    const { data } = await apiClient.post("/auth/reset-password", payload);
    return data as MessageResponse;
  },

  async refreshToken(): Promise<{ access_token: string }> {
    const { data } = await apiClient.post("/auth/refresh");
    return data.data;
  },
};