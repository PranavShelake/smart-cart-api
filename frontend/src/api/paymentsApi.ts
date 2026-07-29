import { apiClient } from './client'
import type { ApiResponse } from '../types'

export interface InitiatePaymentPayload {
  order_id: number
}

export interface RazorpayOrderData {
  razorpay_order_id: string
  razorpay_key_id:   string
  amount:            number     // paise (INR × 100)
  currency:          string
  order_number:      string
  prefill: {
    name:    string
    email:   string
    contact: string
  }
}

export interface VerifyPaymentPayload {
  razorpay_order_id:   string
  razorpay_payment_id: string
  razorpay_signature:  string
}

export interface PaymentStatus {
  payment_id:          number
  order_id:            number
  razorpay_order_id:   string
  razorpay_payment_id: string | null
  amount:              number
  status:              'created' | 'authorized' | 'captured' | 'failed' | 'refunded'
  method:              string | null
}

export const paymentsApi = {

  async initiate(payload: InitiatePaymentPayload): Promise<RazorpayOrderData> {
    const { data } = await apiClient.post<ApiResponse<RazorpayOrderData>>(
      '/payments/initiate', payload,
    )
    return data.data
  },

  async verify(payload: VerifyPaymentPayload): Promise<{ status: string; order_id: number }> {
    const { data } = await apiClient.post<ApiResponse<{ status: string; order_id: number }>>(
      '/payments/verify', payload,
    )
    return data.data
  },

  async getStatus(orderId: number): Promise<PaymentStatus> {
    const { data } = await apiClient.get<ApiResponse<PaymentStatus>>(
      `/payments/status/${orderId}`,
    )
    return data.data
  },
}