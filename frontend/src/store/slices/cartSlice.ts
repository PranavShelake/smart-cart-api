import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { cartApi } from '../../api/cartApi'
import type { CartState } from '../../types'

const initialState: CartState = {
  cart:          null,
  isLoading:     false,
  error:         null,
  isCheckingOut: false,
}

// ── Thunks ────────────────────────────────────────────────────

export const fetchCart = createAsyncThunk(
  'cart/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await cartApi.getCart()
      return data.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch cart'
      return rejectWithValue(msg)
    }
  }
)

export const addToCart = createAsyncThunk(
  'cart/addItem',
  async (
    payload: { product_id: number; product_variant_id?: number | null; quantity: number },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await cartApi.addItem(payload)
      return data.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add item'
      return rejectWithValue(msg)
    }
  }
)

export const updateCartItem = createAsyncThunk(
  'cart/updateItem',
  async (
    { id, quantity }: { id: number; quantity: number },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await cartApi.updateItem(id, quantity)
      return data.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update item'
      return rejectWithValue(msg)
    }
  }
)

export const removeCartItem = createAsyncThunk(
  'cart/removeItem',
  async (id: number, { rejectWithValue }) => {
    try {
      await cartApi.removeItem(id)
      return id
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove item'
      return rejectWithValue(msg)
    }
  }
)

export const clearCart = createAsyncThunk(
  'cart/clear',
  async (_, { rejectWithValue }) => {
    try {
      await cartApi.clearCart()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clear cart'
      return rejectWithValue(msg)
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCheckingOut(state, action) {
      state.isCheckingOut = action.payload
    },
    clearCartState(state) {
      state.cart          = null
      state.error         = null
      state.isCheckingOut = false
    },
  },
  extraReducers: (builder) => {
    // fetchCart
    builder
      .addCase(fetchCart.pending,   (state) => { state.isLoading = true;  state.error = null })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.isLoading = false
        state.cart      = action.payload
      })
      .addCase(fetchCart.rejected,  (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })

    // addToCart
    builder
      .addCase(addToCart.pending,   (state) => { state.isLoading = true })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.isLoading = false
        state.cart      = action.payload
      })
      .addCase(addToCart.rejected,  (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })

    // updateCartItem — optimistic-feel: update immediately, no full reload needed
    builder
      .addCase(updateCartItem.pending,   (state) => { state.error = null })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.cart = action.payload
      })
      .addCase(updateCartItem.rejected,  (state, action) => {
        state.error = action.payload as string
      })

    // removeCartItem
    builder
      .addCase(removeCartItem.pending,   (state) => { state.isLoading = true })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.isLoading = false
        if (state.cart) {
          state.cart.items = state.cart.items.filter(i => i.id !== action.payload)
          state.cart.item_count    = state.cart.items.length
          state.cart.total_quantity = state.cart.items.reduce((s, i) => s + i.quantity, 0)
          state.cart.subtotal       = state.cart.items.reduce((s, i) => s + i.subtotal, 0)
        }
      })
      .addCase(removeCartItem.rejected,  (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })

    // clearCart
    builder
      .addCase(clearCart.pending,   (state) => { state.isLoading = true })
      .addCase(clearCart.fulfilled, (state) => {
        state.isLoading = false
        state.cart      = null
      })
      .addCase(clearCart.rejected,  (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })
  },
})

export const { setCheckingOut, clearCartState } = cartSlice.actions
export default cartSlice.reducer

// ── Selectors ─────────────────────────────────────────────────
import type { RootState } from '../index'

export const selectCart          = (s: RootState) => s.cart.cart
export const selectCartItems     = (s: RootState) => s.cart.cart?.items     ?? []
export const selectCartLoading   = (s: RootState) => s.cart.isLoading
export const selectCartError     = (s: RootState) => s.cart.error
export const selectIsCheckingOut = (s: RootState) => s.cart.isCheckingOut
export const selectCartCount     = (s: RootState) => s.cart.cart?.item_count ?? 0