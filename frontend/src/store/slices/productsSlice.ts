import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { productsApi } from '../../api/productsApi'
import type {
  ProductsState,
  ProductFilterParams,
  ProductCreatePayload,
  ProductUpdatePayload,
} from '../../types'

const initialFilters: ProductFilterParams = {
  page:     1,
  per_page: 10,
  sort:     'created_at_desc',
}

const initialState: ProductsState = {
  items:           [],
  total:           0,
  totalPages:      1,
  selectedProduct: null,
  filters:         initialFilters,
  isLoading:       false,
  error:           null,
}

// ── Thunks ────────────────────────────────────────────────────

export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async (params: ProductFilterParams, { rejectWithValue }) => {
    try {
      const { data } = await productsApi.getAll(params)
      return data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch products'
      return rejectWithValue(msg)
    }
  }
)

export const createProduct = createAsyncThunk(
  'products/create',
  async (payload: ProductCreatePayload, { rejectWithValue }) => {
    try {
      const { data } = await productsApi.create(payload)
      return data.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create product'
      return rejectWithValue(msg)
    }
  }
)

export const updateProduct = createAsyncThunk(
  'products/update',
  async (
    { id, payload }: { id: number; payload: ProductUpdatePayload },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await productsApi.update(id, payload)
      return data.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update product'
      return rejectWithValue(msg)
    }
  }
)

export const deleteProduct = createAsyncThunk(
  'products/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await productsApi.delete(id)
      return id
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete product'
      return rejectWithValue(msg)
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload, page: 1 }
    },
    setPage(state, action) {
      state.filters.page = action.payload
    },
    resetFilters(state) {
      state.filters = initialFilters
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true
        state.error     = null
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading  = false
        state.items      = action.payload.data
        state.total      = action.payload.meta?.total      ?? 0
        state.totalPages = action.payload.meta?.total_pages ?? 1
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })

    // create / update / delete just flip loading —
    // the page will refetch after each action via dispatch(fetchProducts)
    builder
      .addCase(createProduct.pending,  (state) => { state.isLoading = true })
      .addCase(createProduct.fulfilled,(state) => { state.isLoading = false })
      .addCase(createProduct.rejected, (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })

    builder
      .addCase(updateProduct.pending,  (state) => { state.isLoading = true })
      .addCase(updateProduct.fulfilled,(state) => { state.isLoading = false })
      .addCase(updateProduct.rejected, (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })

    builder
      .addCase(deleteProduct.pending,  (state) => { state.isLoading = true })
      .addCase(deleteProduct.fulfilled,(state) => { state.isLoading = false })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })
  },
})

export const { setFilters, setPage, resetFilters } = productsSlice.actions
export default productsSlice.reducer

// ── Selectors ─────────────────────────────────────────────────
import type { RootState } from '../index'

export const selectProducts    = (s: RootState) => s.products.items
export const selectProductsMeta = (s: RootState) => ({
  total:      s.products.total,
  totalPages: s.products.totalPages,
  page:       s.products.filters.page ?? 1,
})
export const selectProductsLoading = (s: RootState) => s.products.isLoading
export const selectProductsError   = (s: RootState) => s.products.error
export const selectProductFilters  = (s: RootState) => s.products.filters