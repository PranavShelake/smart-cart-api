// src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { apiClient } from '../../api/client'
import type { UserProfile, UserRole } from '../../types'

interface AuthState {
  user:            UserProfile | null
  isAuthenticated: boolean
  isBootstrapped:  boolean
  status:          'idle' | 'loading' | 'pending' | 'failed'
  error:           string | null
}

const initialState: AuthState = {
  user:            null,
  isAuthenticated: false,
  isBootstrapped:  false,
  status:          'idle',
  error:           null,
}

// ── Thunks ────────────────────────────────────────────────────

export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrap',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return rejectWithValue('No token')
      const { data } = await apiClient.get('/users/me')
      return data.data as UserProfile
    } catch {
      return rejectWithValue('Session expired')
    }
  }
)

export const loginSuccess = createAsyncThunk(
  'auth/loginSuccess',
  async (
    payload: { access_token: string; user: UserProfile },
    { rejectWithValue }
  ) => {
    try {
      localStorage.setItem('access_token', payload.access_token)
      return payload.user
    } catch {
      return rejectWithValue('Failed to save session')
    }
  }
)

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await apiClient.post('/auth/logout')
  } catch {
    // Even if API fails, clear local state
  } finally {
    localStorage.removeItem('access_token')
  }
})

// ── Slice ─────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    updateUserLocally(state, action: PayloadAction<Partial<UserProfile>>) {
      if (state.user) state.user = { ...state.user, ...action.payload }
    },
    clearError(state) {
      state.error = null
    },
    sessionExpired(state) {
      state.user            = null
      state.isAuthenticated = false
      state.isBootstrapped  = true
      state.status          = 'idle'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.pending,   (state) => { state.status = 'loading' })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.user            = action.payload
        state.isAuthenticated = true
        state.isBootstrapped  = true
        state.status          = 'idle'
      })
      .addCase(bootstrapAuth.rejected,  (state) => {
        state.user            = null
        state.isAuthenticated = false
        state.isBootstrapped  = true
        state.status          = 'idle'
      })

    builder
      .addCase(loginSuccess.pending,    (state) => { state.status = 'pending' })
      .addCase(loginSuccess.fulfilled,  (state, action) => {
        state.user            = action.payload
        state.isAuthenticated = true
        state.isBootstrapped  = true
        state.status          = 'idle'
      })
      .addCase(loginSuccess.rejected,   (state, action) => {
        state.status = 'failed'
        state.error  = action.payload as string
      })

    builder.addCase(logout.fulfilled, (state) => {
      state.user            = null
      state.isAuthenticated = false
      state.status          = 'idle'
      state.error           = null
    })
  },
})

export const { updateUserLocally, clearError, sessionExpired } = authSlice.actions
export default authSlice.reducer

// ── Selectors ─────────────────────────────────────────────────

export const selectUser            = (s: { auth: AuthState }) => s.auth.user
export const selectIsAuthenticated = (s: { auth: AuthState }) => s.auth.isAuthenticated
export const selectAuthStatus      = (s: { auth: AuthState }) => s.auth.status
export const selectIsBootstrapped  = (s: { auth: AuthState }) => s.auth.isBootstrapped

export const selectDisplayName = (s: { auth: AuthState }) => {
  const u = s.auth.user
  if (!u) return ''
  return `${u.first_name} ${u.last_name}`.trim()
}

// ── FIXED: matches UPPERCASE roles from backend ───────────────
// Backend sends: 'ADMIN' | 'SELLER' | 'CUSTOMER'
export const selectPrimaryRole = (s: { auth: AuthState }): UserRole | null => {
  const roles = s.auth.user?.roles ?? []
  if (roles.includes('ADMIN'))    return 'ADMIN'
  if (roles.includes('SELLER'))   return 'SELLER'
  if (roles.includes('CUSTOMER')) return 'CUSTOMER'
  return null
}

// Human-readable label for display in TopBar
export const selectRoleLabel = (s: { auth: AuthState }): string => {
  const role = selectPrimaryRole(s)
  const labels: Record<string, string> = {
    ADMIN:    'Administrator',
    SELLER:   'Seller',
    CUSTOMER: 'Customer',
  }
  return role ? (labels[role] ?? role) : ''
}

// Route prefix per role — used by ProtectedRoute for redirects
export const selectRoleDashboardPath = (s: { auth: AuthState }): string => {
  const role = selectPrimaryRole(s)
  if (role === 'ADMIN')    return '/admin/dashboard'
  if (role === 'SELLER')   return '/seller/dashboard'
  return '/shop'
}