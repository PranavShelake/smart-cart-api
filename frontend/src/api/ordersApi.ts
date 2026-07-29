import { apiClient } from './client'
import type {
  ApiResponse,
  Order,
  OrderListItem,
  CouponValidation,
  Address,
} from '../types'

export interface PlaceOrderPayload {
  shipping_address_id: number
  billing_address_id:  number
  payment_method_id:   number
  coupon_code?:        string
  order_notes?:        string
}

export interface UpdateOrderStatePayload {
  order_state_id: number
  notes?:         string
}

export const ordersApi = {
  // Customer
  getMyOrders: (params: { page?: number; status?: string | null }) =>
    apiClient.get<ApiResponse<OrderListItem[]>>('/orders', { params }),

  getOrderById: (id: number) =>
    apiClient.get<ApiResponse<Order>>(`/orders/${id}`),

  placeOrder: (payload: PlaceOrderPayload) =>
    apiClient.post<ApiResponse<Order>>('/orders', payload),

  cancelOrder: (id: number, reason?: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/cancel`, { reason }),

  validateCoupon: (code: string, subtotal: number) =>
    apiClient.get<ApiResponse<CouponValidation>>('/orders/validate-coupon', {
      params: { code, subtotal },
    }),

  // Admin
  getAllOrders: (params: { page?: number; status?: string | null; search?: string }) =>
    apiClient.get<ApiResponse<OrderListItem[]>>('/orders/admin/all', { params }),

  updateOrderState: (id: number, payload: UpdateOrderStatePayload) =>
    apiClient.patch<ApiResponse<Order>>(`/orders/${id}/state`, payload),

  // Addresses — needed for checkout dropdown
  getMyAddresses: () =>
    apiClient.get<ApiResponse<Address[]>>('/users/me/addresses'),
}