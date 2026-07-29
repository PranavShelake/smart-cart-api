// src/types/razorpay.d.ts

interface RazorpayOptions {
  key:         string
  amount:      number
  currency:    string
  name:        string
  description?: string
  order_id:    string
  prefill?: {
    name?:    string
    email?:   string
    contact?: string
  }
  theme?: {
    color?: string
  }
  handler:           (response: RazorpaySuccessResponse) => void
  modal?: {
    ondismiss?: () => void
  }
}

interface RazorpaySuccessResponse {
  razorpay_order_id:   string
  razorpay_payment_id: string
  razorpay_signature:  string
}

interface RazorpayInstance {
  open:  () => void
  close: () => void
}

interface Window {
  Razorpay: new (options: RazorpayOptions) => RazorpayInstance
}