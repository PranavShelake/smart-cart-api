import { apiClient } from './client'
import type {
  ApiResponse,
  Category,
  CategoryTree,
  CategoryCreatePayload,
  CategoryUpdatePayload,
} from '../types'

export const categoriesApi = {
  getAll: () =>
    apiClient.get<ApiResponse<Category[]>>('/categories'),

  getTree: () =>
    apiClient.get<ApiResponse<CategoryTree[]>>('/categories/tree'),

  getById: (id: number) =>
    apiClient.get<ApiResponse<Category>>(`/categories/${id}`),

  create: (payload: CategoryCreatePayload) =>
    apiClient.post<ApiResponse<Category>>('/categories', payload),

  update: (id: number, payload: CategoryUpdatePayload) =>
    apiClient.patch<ApiResponse<Category>>(`/categories/${id}`, payload),

  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/categories/${id}`),
}