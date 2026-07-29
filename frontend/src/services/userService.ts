// src/services/userService.ts
import { apiClient } from "../api/client";
import type { UserProfile, Address } from "../types";   // ← import from types, NOT authSlice

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
}

export interface AddressPayload {
  address_type: "billing" | "shipping" | "both";
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  is_default?: boolean;
}

export const userService = {

  async getProfile(): Promise<UserProfile> {
    const { data } = await apiClient.get("/users/me");
    return data.data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    const { data } = await apiClient.patch("/users/me", payload);
    return data.data;
  },

  async getAddresses(): Promise<Address[]> {
    const { data } = await apiClient.get("/users/me/addresses");
    return data.data;
  },

  async addAddress(payload: AddressPayload): Promise<Address> {
    const { data } = await apiClient.post("/users/me/addresses", payload);
    return data.data;
  },

  async updateAddress(addressId: number, payload: AddressPayload): Promise<Address> {
    const { data } = await apiClient.put(`/users/me/addresses/${addressId}`, payload);
    return data.data;
  },

  async deleteAddress(addressId: number): Promise<void> {
    await apiClient.delete(`/users/me/addresses/${addressId}`);
  },

  async setDefaultAddress(addressId: number): Promise<void> {
    await apiClient.patch(`/users/me/addresses/${addressId}/default`);
  },
};