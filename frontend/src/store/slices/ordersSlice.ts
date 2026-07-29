import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { ordersApi } from '../../api/ordersApi'
import type { OrdersState } from '../../types'
import type { PlaceOrderPayload, UpdateOrderStatePayload } from '../../api/ordersApi'

const initialState: OrdersState = {
  items:           [],
  total:           0,
  totalPages:      1,
  selectedOrder:   null,
  isLoading:       false,
  isLoadingDetail: false,
  error:           null,
  filters: {
    page:   1,
    status: null,
  },
}

// ── Thunks ────────────────────────────────────────────────────

export const fetchMyOrders = createAsyncThunk(
  'orders/fetchMine',
  async (
    params: { page?: number; status?: string | null },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await ordersApi.getMyOrders(params)
      return data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch orders'
      return rejectWithValue(msg)
    }
  }
)

export const fetchAllOrders = createAsyncThunk(
  'orders/fetchAll',
  async (
    params: { page?: number; status?: string | null; search?: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await ordersApi.getAllOrders(params)
      return data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch orders'
      return rejectWithValue(msg)
    }
  }
)

export const fetchOrderById = createAsyncThunk(
  'orders/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      const { data } = await ordersApi.getOrderById(id)
      return data.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch order'
      return rejectWithValue(msg)
    }
  }
)

export const placeOrder = createAsyncThunk(
  'orders/place',
  async (payload: PlaceOrderPayload, { rejectWithValue }) => {
    try {
      const { data } = await ordersApi.placeOrder(payload)
      return data.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place order'
      return rejectWithValue(msg)
    }
  }
)

export const cancelOrder = createAsyncThunk(
  'orders/cancel',
  async (
    { id, reason }: { id: number; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await ordersApi.cancelOrder(id, reason)
      return data.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel order'
      return rejectWithValue(msg)
    }
  }
)

export const updateOrderState = createAsyncThunk(
  'orders/updateState',
  async (
    { id, payload }: { id: number; payload: UpdateOrderStatePayload },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await ordersApi.updateOrderState(id, payload)
      return data.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update order state'
      return rejectWithValue(msg)
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setOrderFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload }
    },
    setSelectedOrder(state, action) {
      state.selectedOrder = action.payload
    },
    clearSelectedOrder(state) {
      state.selectedOrder = null
    },
  },
  extraReducers: (builder) => {
    // fetchMyOrders + fetchAllOrders share same shape
    const fetchFulfilled = (
      state: OrdersState,
      action: ReturnType<
        typeof fetchMyOrders.fulfilled | typeof fetchAllOrders.fulfilled
      >
    ) => {
      state.isLoading  = false
      state.items      = action.payload.data
      state.total      = action.payload.meta?.total      ?? 0
      state.totalPages = action.payload.meta?.total_pages ?? 1
    }

    builder
      .addCase(fetchMyOrders.pending,   (state) => { state.isLoading = true; state.error = null })
      .addCase(fetchMyOrders.fulfilled, fetchFulfilled)
      .addCase(fetchMyOrders.rejected,  (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })

    builder
      .addCase(fetchAllOrders.pending,   (state) => { state.isLoading = true; state.error = null })
      .addCase(fetchAllOrders.fulfilled, fetchFulfilled)
      .addCase(fetchAllOrders.rejected,  (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })

    // fetchOrderById
    builder
      .addCase(fetchOrderById.pending,   (state) => { state.isLoadingDetail = true })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.isLoadingDetail = false
        state.selectedOrder   = action.payload
      })
      .addCase(fetchOrderById.rejected,  (state, action) => {
        state.isLoadingDetail = false
        state.error           = action.payload as string
      })

    // placeOrder
    builder
      .addCase(placeOrder.pending,   (state) => { state.isLoading = true })
      .addCase(placeOrder.fulfilled, (state) => { state.isLoading = false })
      .addCase(placeOrder.rejected,  (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })

    // cancelOrder
    builder
      .addCase(cancelOrder.pending,   (state) => { state.isLoading = true })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.isLoading = false
        // Update the item in the list if it exists
        const idx = state.items.findIndex(o => o.id === action.payload.id)
        if (idx !== -1) state.items[idx].status = action.payload.status
        // Update selected order if open
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload
        }
      })
      .addCase(cancelOrder.rejected,  (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })

    // updateOrderState
    builder
      .addCase(updateOrderState.pending,   (state) => { state.isLoading = true })
      .addCase(updateOrderState.fulfilled, (state, action) => {
        state.isLoading = false
        const idx = state.items.findIndex(o => o.id === action.payload.id)
        if (idx !== -1) state.items[idx].status = action.payload.status
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload
        }
      })
      .addCase(updateOrderState.rejected,  (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })
  },
})

export const {
  setOrderFilters,
  setSelectedOrder,
  clearSelectedOrder,
} = ordersSlice.actions
export default ordersSlice.reducer

// ── Selectors ─────────────────────────────────────────────────
import type { RootState } from '../index'

export const selectOrders          = (s: RootState) => s.orders.items
export const selectOrdersTotal     = (s: RootState) => s.orders.total
export const selectOrdersTotalPages = (s: RootState) => s.orders.totalPages
export const selectOrdersLoading   = (s: RootState) => s.orders.isLoading
export const selectOrdersError     = (s: RootState) => s.orders.error
export const selectSelectedOrder   = (s: RootState) => s.orders.selectedOrder
export const selectOrderFilters    = (s: RootState) => s.orders.filters
export const selectIsLoadingDetail = (s: RootState) => s.orders.isLoadingDetail