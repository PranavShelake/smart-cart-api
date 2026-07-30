// src/api/reviewsApi.ts
import { apiClient } from './client'
import type { ApiResponse, ReviewListItem } from '../types'

export const reviewsApi = {
  getPending: (params: { page?: number; per_page?: number }) =>
    apiClient.get<ApiResponse<ReviewListItem[]>>('/admin/reviews/pending', { params }),

  getForProduct: (productId: number, params: { page?: number }) =>
    apiClient.get<ApiResponse<{ reviews: ReviewListItem[] }>>(
      `/products/${productId}/reviews`, { params }
    ),

  approve: (id: number) =>
    apiClient.patch<ApiResponse<null>>(`/admin/reviews/${id}/approve`, {}),

  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/reviews/${id}`),
}