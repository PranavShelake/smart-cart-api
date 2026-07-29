import { apiClient } from './client'
import type { ApiResponse, Cart } from '../types'

export const cartApi = {
  getCart: () =>
    apiClient.get<ApiResponse<Cart>>('/cart'),

  addItem: (payload: {
    product_id:          number
    product_variant_id?: number | null
    quantity:            number
  }) =>
    apiClient.post<ApiResponse<Cart>>('/cart/items', payload),

  updateItem: (id: number, quantity: number) =>
    apiClient.patch<ApiResponse<Cart>>(`/cart/items/${id}`, { quantity }),

  removeItem: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/cart/items/${id}`),

  clearCart: () =>
    apiClient.delete<ApiResponse<null>>('/cart'),
}