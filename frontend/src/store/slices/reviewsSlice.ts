// src/store/slices/reviewsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { reviewsApi } from '../../api/reviewsApi'
import type { ReviewListItem } from '../../types'
import type { RootState } from '../index'

interface ReviewsState {
  pending: ReviewListItem[]
  isLoading: boolean
  error: string | null
  meta: { page: number; per_page: number; total: number; total_pages: number } | null
}

const initialState: ReviewsState = {
  pending: [],
  isLoading: false,
  error: null,
  meta: null,
}

export const fetchPendingReviews = createAsyncThunk(
  'reviews/fetchPending',
  async (params: { page?: number; per_page?: number }, { rejectWithValue }) => {
    try {
      const { data } = await reviewsApi.getPending(params)
      return data
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch reviews')
    }
  }
)

export const approveReview = createAsyncThunk(
  'reviews/approve',
  async (id: number, { rejectWithValue }) => {
    try {
      await reviewsApi.approve(id)
      return id
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to approve')
    }
  }
)

export const deleteReview = createAsyncThunk(
  'reviews/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await reviewsApi.delete(id)
      return id
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to delete')
    }
  }
)

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPendingReviews.pending, (s) => {
        s.isLoading = true
        s.error = null
      })
      .addCase(fetchPendingReviews.fulfilled, (s, a) => {
        s.isLoading = false
        s.pending = a.payload.data
        s.meta = a.payload.meta ?? null
      })
      .addCase(fetchPendingReviews.rejected, (s, a) => {
        s.isLoading = false
        s.error = a.payload as string
      })

    builder
      .addCase(approveReview.fulfilled, (s, a) => {
        s.pending = s.pending.filter((r) => r.id !== a.payload)
      })

    builder
      .addCase(deleteReview.fulfilled, (s, a) => {
        s.pending = s.pending.filter((r) => r.id !== a.payload)
      })
  },
})

export default reviewsSlice.reducer
export const selectPendingReviews = (s: RootState) => s.reviews.pending
export const selectReviewsLoading = (s: RootState) => s.reviews.isLoading
export const selectReviewsError = (s: RootState) => s.reviews.error
export const selectReviewsMeta = (s: RootState) => s.reviews.meta
