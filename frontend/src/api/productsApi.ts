import { apiClient } from './client'
import type {
  ApiResponse,
  ProductListItem,
  Product,
  ProductFilterParams,
  ProductCreatePayload,
  ProductUpdatePayload,
} from '../types'

export const productsApi = {
  getAll: (params: ProductFilterParams) =>
    apiClient.get<ApiResponse<ProductListItem[]>>('/products', { params }),

  getById: (id: number) =>
    apiClient.get<ApiResponse<Product>>(`/products/${id}`),

  create: (payload: ProductCreatePayload) =>
    apiClient.post<ApiResponse<Product>>('/products', payload),

  update: (id: number, payload: ProductUpdatePayload) =>
    apiClient.patch<ApiResponse<Product>>(`/products/${id}`, payload),

  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/products/${id}`),

  toggleStatus: (id: number, is_active: boolean) =>
    apiClient.patch<ApiResponse<Product>>(`/products/${id}`, { is_active }),

  toggleFeatured: (id: number, is_featured: boolean) =>
    apiClient.patch<ApiResponse<Product>>(`/products/${id}`, { is_featured }),
}