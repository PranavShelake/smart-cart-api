import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { categoriesApi } from '../../api/categoriesApi'
import type { CategoriesState, CategoryCreatePayload, CategoryUpdatePayload } from '../../types'

const initialState: CategoriesState = {
  items:            [],
  tree:             [],
  selectedCategory: null,
  isLoading:        false,
  error:            null,
}

// ── Thunks ────────────────────────────────────────────────────

export const fetchCategories = createAsyncThunk(
  'categories/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await categoriesApi.getAll()
      return data.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch categories'
      return rejectWithValue(msg)
    }
  }
)

export const fetchCategoryTree = createAsyncThunk(
  'categories/fetchTree',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await categoriesApi.getTree()
      return data.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch category tree'
      return rejectWithValue(msg)
    }
  }
)

export const createCategory = createAsyncThunk(
  'categories/create',
  async (payload: CategoryCreatePayload, { rejectWithValue }) => {
    try {
      const { data } = await categoriesApi.create(payload)
      return data.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create category'
      return rejectWithValue(msg)
    }
  }
)

export const updateCategory = createAsyncThunk(
  'categories/update',
  async (
    { id, payload }: { id: number; payload: CategoryUpdatePayload },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await categoriesApi.update(id, payload)
      return data.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update category'
      return rejectWithValue(msg)
    }
  }
)

export const deleteCategory = createAsyncThunk(
  'categories/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await categoriesApi.delete(id)
      return id
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete category'
      return rejectWithValue(msg)
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    setSelectedCategory(state, action) {
      state.selectedCategory = action.payload
    },
    clearSelectedCategory(state) {
      state.selectedCategory = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending,   (state) => { state.isLoading = true; state.error = null })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false
        state.items     = action.payload
      })
      .addCase(fetchCategories.rejected,  (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })

    builder
      .addCase(fetchCategoryTree.pending,   (state) => { state.isLoading = true; state.error = null })
      .addCase(fetchCategoryTree.fulfilled, (state, action) => {
        state.isLoading = false
        state.tree      = action.payload
      })
      .addCase(fetchCategoryTree.rejected,  (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })

    builder
      .addCase(createCategory.pending,  (state) => { state.isLoading = true })
      .addCase(createCategory.fulfilled,(state) => { state.isLoading = false })
      .addCase(createCategory.rejected, (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })

    builder
      .addCase(updateCategory.pending,  (state) => { state.isLoading = true })
      .addCase(updateCategory.fulfilled,(state) => { state.isLoading = false })
      .addCase(updateCategory.rejected, (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })

    builder
      .addCase(deleteCategory.pending,  (state) => { state.isLoading = true })
      .addCase(deleteCategory.fulfilled,(state) => { state.isLoading = false })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.isLoading = false
        state.error     = action.payload as string
      })
  },
})

export const { setSelectedCategory, clearSelectedCategory } = categoriesSlice.actions
export default categoriesSlice.reducer

// ── Selectors ─────────────────────────────────────────────────
import type { RootState } from '../index'

export const selectCategories        = (s: RootState) => s.categories.items
export const selectCategoryTree      = (s: RootState) => s.categories.tree
export const selectCategoriesLoading = (s: RootState) => s.categories.isLoading
export const selectCategoriesError   = (s: RootState) => s.categories.error
export const selectSelectedCategory  = (s: RootState) => s.categories.selectedCategory