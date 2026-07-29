// src/store/slices/paymentsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { paymentsApi, type RazorpayOrderData, type PaymentStatus } from '../../api/paymentsApi'

// ── Thunks ────────────────────────────────────────────────────

export const initiatePayment = createAsyncThunk(
  'payments/initiate',
  async (orderId: number, { rejectWithValue }) => {
    try {
      return await paymentsApi.initiate({ order_id: orderId })
    } catch (err: unknown) {
      if (err instanceof Error) return rejectWithValue(err.message)
      return rejectWithValue('Failed to initiate payment')
    }
  }
)

export const verifyPayment = createAsyncThunk(
  'payments/verify',
  async (
    payload: {
      razorpay_order_id:   string
      razorpay_payment_id: string
      razorpay_signature:  string
    },
    { rejectWithValue }
  ) => {
    try {
      return await paymentsApi.verify(payload)
    } catch (err: unknown) {
      if (err instanceof Error) return rejectWithValue(err.message)
      return rejectWithValue('Payment verification failed')
    }
  }
)

export const fetchPaymentStatus = createAsyncThunk(
  'payments/fetchStatus',
  async (orderId: number, { rejectWithValue }) => {
    try {
      return await paymentsApi.getStatus(orderId)
    } catch (err: unknown) {
      if (err instanceof Error) return rejectWithValue(err.message)
      return rejectWithValue('Failed to fetch payment status')
    }
  }
)

// ── State ─────────────────────────────────────────────────────

interface PaymentsState {
  razorpayOrder: RazorpayOrderData | null
  paymentStatus: PaymentStatus | null
  isInitiating:  boolean
  isVerifying:   boolean
  isCapturing:   boolean
  error:         string | null
  lastOrderId:   number | null
}

const initialState: PaymentsState = {
  razorpayOrder: null,
  paymentStatus: null,
  isInitiating:  false,
  isVerifying:   false,
  isCapturing:   false,
  error:         null,
  lastOrderId:   null,
}

// ── Slice ─────────────────────────────────────────────────────

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setCapturing(state, action) {
      state.isCapturing = action.payload
    },
    clearPayment(state) {
      state.razorpayOrder = null
      state.error         = null
      state.isInitiating  = false
      state.isVerifying   = false
      state.isCapturing   = false
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initiatePayment.pending,   (state) => {
        state.isInitiating = true
        state.error        = null
      })
      .addCase(initiatePayment.fulfilled, (state, action) => {
        state.isInitiating  = false
        state.razorpayOrder = action.payload
      })
      .addCase(initiatePayment.rejected,  (state, action) => {
        state.isInitiating = false
        state.error        = action.payload as string
      })

    builder
      .addCase(verifyPayment.pending,   (state) => { state.isVerifying = true })
      .addCase(verifyPayment.fulfilled, (state, action) => {
        state.isVerifying = false
        state.isCapturing = false
        state.lastOrderId = action.payload.order_id
      })
      .addCase(verifyPayment.rejected,  (state, action) => {
        state.isVerifying = false
        state.error       = action.payload as string
      })

    builder
      .addCase(fetchPaymentStatus.fulfilled, (state, action) => {
        state.paymentStatus = action.payload
      })
  },
})

export const { setCapturing, clearPayment, clearError } = paymentsSlice.actions
export default paymentsSlice.reducer