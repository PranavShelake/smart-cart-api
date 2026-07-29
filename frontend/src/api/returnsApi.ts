// src/api/returnsApi.ts
import { apiClient } from './client'
import type {
  ApiResponse, ReturnListItem, ReturnDetail,
  CreateReturnPayload, ProcessReturnPayload,
} from '../types'

export const returnsApi = {
  // Customer
  getMyReturns: (params: { page?: number; status?: string }) =>
    apiClient.get<ApiResponse<ReturnListItem[]>>('/returns', { params }),

  getById: (id: number) =>
    apiClient.get<ApiResponse<ReturnDetail>>(`/returns/${id}`),

  create: (payload: CreateReturnPayload) =>
    apiClient.post<ApiResponse<ReturnDetail>>('/returns', payload),

  // Admin
  getAllReturns: (params: { page?: number; status?: string }) =>
    apiClient.get<ApiResponse<ReturnListItem[]>>('/returns/admin/all', { params }),

  process: (id: number, payload: ProcessReturnPayload) =>
    apiClient.post<ApiResponse<ReturnDetail>>(`/returns/admin/${id}/process`, payload),
}