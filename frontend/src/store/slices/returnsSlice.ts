// src/store/slices/returnsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { returnsApi } from '../../api/returnsApi'
import type {
  ReturnListItem, CreateReturnPayload, ProcessReturnPayload,
} from '../../types'
import type { RootState } from '../index'

interface ReturnsState {
  items:     ReturnListItem[]
  isLoading: boolean
  error:     string | null
  meta:      { page: number; per_page: number; total: number; total_pages: number } | null
}

const initialState: ReturnsState = {
  items:     [],
  isLoading: false,
  error:     null,
  meta:      null,
}

export const fetchAllReturns = createAsyncThunk(
  'returns/fetchAll',
  async (params: { page?: number; status?: string }, { rejectWithValue }) => {
    try {
      const { data } = await returnsApi.getAll(params)
      return data
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch returns')
    }
  }
)

export const fetchMyReturns = createAsyncThunk(
  'returns/fetchMine',
  async (params: { page?: number; status?: string }, { rejectWithValue }) => {
    try {
      const { data } = await returnsApi.getMine(params)
      return data
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch returns')
    }
  }
)

export const createReturn = createAsyncThunk(
  'returns/create',
  async (payload: CreateReturnPayload, { rejectWithValue }) => {
    try {
      const { data } = await returnsApi.create(payload)
      return data.data
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to create return')
    }
  }
)

export const processReturn = createAsyncThunk(
  'returns/process',
  async (
    { id, payload }: { id: number; payload: ProcessReturnPayload },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await returnsApi.process(id, payload)
      return data.data
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to process return')
    }
  }
)

const returnsSlice = createSlice({
  name: 'returns',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    const setLoading = (s: ReturnsState) => { s.isLoading = true; s.error = null }
    const setError   = (s: ReturnsState, a: { payload: unknown }) => {
      s.isLoading = false; s.error = a.payload as string
    }

    builder
      .addCase(fetchAllReturns.pending,   setLoading)
      .addCase(fetchAllReturns.fulfilled, (s, a) => {
        s.isLoading = false
        s.items     = a.payload.data
        s.meta      = a.payload.meta ?? null
      })
      .addCase(fetchAllReturns.rejected,  setError)

    builder
      .addCase(fetchMyReturns.pending,   setLoading)
      .addCase(fetchMyReturns.fulfilled, (s, a) => {
        s.isLoading = false
        s.items     = a.payload.data
        s.meta      = a.payload.meta ?? null
      })
      .addCase(fetchMyReturns.rejected,  setError)

    builder
      .addCase(processReturn.fulfilled, (s, a) => {
        const idx = s.items.findIndex(r => r.id === a.payload.id)
        if (idx !== -1) s.items[idx].status = a.payload.status
      })
  },
})

export default returnsSlice.reducer
export const selectReturns        = (s: RootState) => s.returns.items
export const selectReturnsLoading = (s: RootState) => s.returns.isLoading
export const selectReturnsError   = (s: RootState) => s.returns.error
export const selectReturnsMeta    = (s: RootState) => s.returns.meta