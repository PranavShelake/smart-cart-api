// src/api/userApi.ts
import { apiClient } from './client'
import type {
  ApiResponse,
  UserProfile,
  Address,
  UpdateProfilePayload,
  ChangePasswordPayload,
  AddressCreatePayload,
  AddressUpdatePayload,
} from '../types'

export const userApi = {
  // ── Profile ─────────────────────────────────────────────
  getProfile: () =>
    apiClient.get<ApiResponse<UserProfile>>('/users/me'),

  updateProfile: (payload: UpdateProfilePayload) =>
    apiClient.patch<ApiResponse<UserProfile>>('/users/me', payload),

  changePassword: (payload: ChangePasswordPayload) =>
    apiClient.post<ApiResponse<null>>('/auth/change-password', payload),

  // ── Addresses ────────────────────────────────────────────
  getAddresses: () =>
    apiClient.get<ApiResponse<Address[]>>('/users/me/addresses'),

  addAddress: (payload: AddressCreatePayload) =>
    apiClient.post<ApiResponse<Address>>('/users/me/addresses', payload),

  updateAddress: (id: number, payload: AddressUpdatePayload) =>
    apiClient.put<ApiResponse<Address>>(`/users/me/addresses/${id}`, payload),

  deleteAddress: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/users/me/addresses/${id}`),

  setDefaultAddress: (id: number) =>
    apiClient.patch<ApiResponse<Address>>(
      `/users/me/addresses/${id}/default`, {}
    ),
}