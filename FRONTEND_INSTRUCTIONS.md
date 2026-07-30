# ════════════════════════════════════════════════════════════════
# SMART CART — FRONTEND INSTRUCTIONS
# AI Agent Reference Document
#
# CRITICAL: Read this ENTIRE document before writing any code.
# This document reflects the EXACT CURRENT STATE of the project.
# After completing any task, update Sections 3, 11, and 15 ONLY.
# ════════════════════════════════════════════════════════════════

---

## SECTION 1 — AGENT PROTOCOL (READ FIRST)

You are a **senior frontend engineer** on Smart Cart — a production-grade e-commerce UI.
Work step by step. Never dump all code at once.

### Workflow

**Step 1 — Ask clarifying questions before any code.**
- Which role sees this? (ADMIN / SELLER / CUSTOMER / all?)
- New Redux slice, or reuse existing?
- New API file, or extend existing?
- New types needed in `src/types/index.ts`?
- New route in `App.tsx`? New sidebar nav item?
- If this module is in the "Backend + Frontend both needed" table in Section 15:
  confirm with the developer that backend routes exist before writing any API file.

**Step 2 — Show the full plan. Wait for approval.**
```
PLAN: [Feature Name]
Files to create/modify:
  1. src/types/index.ts
  2. src/api/xxxApi.ts
  3. src/store/slices/xxxSlice.ts
  4. src/components/xxx/Component.tsx
  5. src/pages/[role]/XxxPage.tsx
  6. src/App.tsx
  7. src/components/layout/Sidebar.tsx (if nav item needed)

New route:  /xxx → XxxPage  (role: ADMIN / CUSTOMER / SELLER)
Redux:      new slice  OR  extends existingSlice
```

**Step 3 — Write one file or one small group. Stop. Wait.**
- Never move to the next file until the current one is confirmed working.

**Step 4 — Update this document after every completed task.**
- **Section 3** — add every new file to the folder tree with ✅ and a short description
- **Section 11** — mark the module ✅ Complete or ⚠️ Needs Testing
- **Section 15** — overwrite the entire current state snapshot
- **Section 10** — if new backend endpoints were used, add or update them

**If this module is in the "Backend + Frontend both needed" table in Section 15:**
Update its Frontend column from 🔲 to ✅.
Add below the row: `→ Developer: open BACKEND_INSTRUCTIONS.md Section 14 and mark Frontend ✅ for this module.`

---

### ⚑ Hard Rule 0 — Never Modify the Document Structure

You may ONLY add content to Sections 3, 11, 15, and 10 (when new endpoints are used).
NEVER rewrite, condense, reorganize, or remove content from any other section.
Sections 1, 2, 4, 5, 6, 7, 8, 9, 12, 13, 14 are locked — treat them as read-only.
If you believe a locked section is wrong, flag it to the developer. Do not change it yourself.

---

### ⚑ Hard Rule 1 — File Path on Line One (Every File, No Exceptions)

First line of every file = full path as a comment:
```ts
// src/components/shop/ProductCard.tsx
// src/store/slices/wishlistSlice.ts
/* src/index.css */
```

---

### ⚑ Hard Rule 2 — Three States on Every List Page

| State | Condition | What to render |
|---|---|---|
| Loading | `isLoading === true` | Skeleton loaders — see Section 5.3 |
| Empty | Data loaded, zero items | Empty state — see Section 5.3 |
| Error | API call failed | Error + retry button — see Section 5.3 |

---

### All Other Hard Rules
- Never use `any` TypeScript type — use `unknown` then narrow
- Never use inline `style={{}}` — Tailwind classes only
- Never hardcode hex colors in JSX — use Tailwind token classes only
- Never import from external UI libraries (no shadcn, MUI, Ant Design)
- Never use icons from anything other than Lucide React
- Never define types locally — always `src/types/index.ts`
- Never recreate `src/api/client.ts` — import `apiClient` from it
- Never put business logic in API files — that goes in slice thunks
- Never use React Query — Redux Toolkit only
- Never hardcode `http://localhost:8000` — all calls go through `apiClient`
- Never write all files at once — step by step

---

### How the Developer Uses This Document

**Single-side task** (frontend only — backend already done):
Send only `FRONTEND_INSTRUCTIONS.md`.

**Both-sides task** (module needs backend routes AND a frontend page):
Send **both** `FRONTEND_INSTRUCTIONS.md` + `BACKEND_INSTRUCTIONS.md`.
Tell the AI: *"FRONTEND_INSTRUCTIONS.md is your primary doc.
Use BACKEND_INSTRUCTIONS.md Section 6 for the new endpoints for this module."*
Always use the backend AI's most recently updated doc so Section 6 has the new routes.

**After every completed task:**
Save the AI's updated section content immediately as the new version of the file.
Never use a stale doc — an outdated doc causes the next AI to build on wrong assumptions.

---

## SECTION 2 — PROJECT OVERVIEW

| Item | Value |
|---|---|
| Project Name | Smart Cart UI |
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS with custom design tokens |
| State | Redux Toolkit (RTK) — NO React Query |
| Icons | Lucide React only |
| Router | React Router DOM v6 |
| HTTP | Axios — `src/api/client.ts` |
| Fonts | Space Grotesk (display) + Inter (body) |
| Payments | Razorpay — tested and working ✅ |
| API Base | `http://localhost:8000/api/v1` via `VITE_API_BASE_URL` |

### Architecture
```
Page → dispatch(thunk) → API file → apiClient → backend
Page → useAppSelector → reads Redux state
```
- Pages: dispatch + read selectors only
- API files: axios calls only, no logic
- Thunks: all try/catch and state updates
- Types: all in `src/types/index.ts`

---

## SECTION 3 — FOLDER STRUCTURE (ALWAYS CURRENT)

> ✅ working | ⚠️ needs testing | 🔲 not built

```
smart-cart-ui/
├── .env                            ← VITE_API_BASE_URL only
├── index.html                      ← Razorpay SDK loaded here via <script> tag
├── tailwind.config.ts
│
└── src/
    ├── App.tsx                     ✅ All routes, guards, RoleRedirect
    ├── index.css                   ✅ Glass CSS, fonts, animations
    ├── main.tsx                    ✅ React root + Redux Provider
    ├── config.ts                   ✅ API_BASE_URL from .env
    │
    ├── api/
    │   ├── client.ts               ✅ Axios + token attach + silent 401 refresh
    │   ├── cartApi.ts              ✅ Cart CRUD
    │   ├── categoriesApi.ts        ✅ Category CRUD + tree
    │   ├── ordersApi.ts            ✅ Orders + addresses + coupon
    │   ├── paymentsApi.ts          ✅ Razorpay initiate + verify
    │   ├── productsApi.ts          ✅ Product CRUD
    │   └── userApi.ts              ✅ Profile + password + address CRUD
    │
    ├── components/
    │   ├── cart/
    │   │   ├── CartItem.tsx        ✅ Qty stepper, remove, price-change badge
    │   │   ├── CartSummary.tsx     ✅ Order summary + checkout modal + Razorpay wired
    │   │   ├── CheckoutButton.tsx  ✅
    │   │   └── CouponInput.tsx     ✅ Validate + apply/remove coupon
    │   ├── categories/
    │   │   ├── CategoryForm.tsx    ✅ Add/edit + auto slug
    │   │   └── CategoryTree.tsx    ✅ Collapsible tree + hover actions
    │   ├── layout/
    │   │   ├── Layout.tsx          ✅ Shell — Sidebar + TopBar + Outlet
    │   │   ├── Sidebar.tsx         ✅ Role-aware nav + live cart badge
    │   │   └── TopBar.tsx          ✅ Search, cart icon, profile dropdown
    │   ├── orders/
    │   │   ├── OrderDetail.tsx     ✅ Shared detail view
    │   │   ├── OrderStatusBadge.tsx ✅ Colored badge + ORDER_STATUS_CONFIG
    │   │   └── OrderTimeline.tsx   ✅ Vertical stepper
    │   ├── payments/
    │   │   └── RazorpayCheckout.tsx ✅ Razorpay modal trigger
    │   ├── profile/
    │   │   ├── AddressCard.tsx     ✅ Display + edit/delete/set-default
    │   │   ├── AddressModal.tsx    ✅ Add/edit form + Indian states
    │   │   ├── ProfileForm.tsx     ✅ Edit name/phone, email read-only
    │   │   └── SecurityForm.tsx    ✅ Change password + strength meter
    │   ├── shop/
    │   │   ├── ImageGallery.tsx    ✅ Main image + thumbnails + zoom
    │   │   ├── ProductCard.tsx     ✅ Grid card — image, price, rating, Add to Cart
    │   │   ├── ShopFilters.tsx     ✅ Category, price, sort, stock sidebar
    │   │   ├── StarRating.tsx      ✅ Filled/half/empty stars + count
    │   │   └── VariantSelector.tsx ✅ Size/color pill selectors
    │   └── ui/
    │       └── Toast.tsx           ✅ Success/error toast container
    │
    ├── hooks/
    │   ├── useDebounce.ts          ✅ Generic debounce (400ms default)
    │   └── useRazorpay.ts          ✅ Polls window.Razorpay (loaded via index.html)
    │
    ├── pages/
    │   ├── admin/
    │   │   └── OrdersPage.tsx      ✅ All orders + side panel + state machine
    │   ├── auth/
    │   │   └── LoginPage.tsx       ✅ Email + password login
    │   ├── customer/
    │   │   ├── CartPage.tsx        ✅ Cart + coupon + Razorpay checkout
    │   │   ├── CustomerOrdersPage.tsx ✅ Order history + detail + cancel
    │   │   ├── PaymentPage.tsx     ✅ Razorpay payment page (legacy, flow now in CartSummary)
    │   │   ├── ProductDetailPage.tsx ✅ Gallery + variants + Add to Cart + reviews
    │   │   ├── ProfilePage.tsx     ✅ Profile | Addresses | Security tabs
    │   │   └── ShopPage.tsx        ✅ Product grid + sidebar filters + pagination
    │   └── dashboard/
    │       └── admin/              ← Legacy path — new admin pages go in pages/admin/
    │           ├── CategoriesPage.tsx ✅
    │           ├── DashboardPage.tsx  ✅ KPIs + charts (mock data)
    │           ├── KpiCard.tsx        ✅
    │           ├── mockData.ts        ✅
    │           ├── ProductsPage.tsx   ✅ Full CRUD table + modals
    │           ├── RecentOrders.tsx   ✅
    │           ├── SalesChart.tsx     ✅
    │           └── TopProducts.tsx    ✅
    │
    ├── services/
    │   ├── authService.ts          ✅ Login, register, refresh
    │   └── userService.ts          LEGACY — do not use, use api/userApi.ts
    │
    ├── store/
    │   ├── index.ts                ✅ Store + useAppDispatch + useAppSelector
    │   └── slices/
    │       ├── authSlice.ts        ✅ Auth state, bootstrap, login, logout
    │       ├── cartSlice.ts        ✅ Cart CRUD thunks + selectCartCount
    │       ├── categoriesSlice.ts  ✅ Category CRUD + tree
    │       ├── ordersSlice.ts      ✅ Orders CRUD + cancel + updateOrderState
    │       ├── paymentsSlice.ts    ✅ Razorpay initiate + verify thunks
    │       ├── productsSlice.ts    ✅ Product CRUD + filters + pagination
    │       └── toastSlice.ts       ✅ Toast state + useToast() hook
    │
    ├── types/
    │   ├── index.ts                ✅ ALL shared TypeScript types
    │   └── razorpay.d.ts           ✅ window.Razorpay type declaration
    │
    └── utils/
        ├── formatCurrency.ts       ✅ INR → ₹1,29,990
        └── formatDate.ts           ✅ en-IN → 06 May 2026, 02:30 PM
```

---

## SECTION 4 — TECH STACK & ENVIRONMENT

### Dependencies
```json
{
  "react": "^18.x", "react-dom": "^18.x",
  "react-router-dom": "^6.x",
  "@reduxjs/toolkit": "latest", "react-redux": "latest",
  "axios": "latest", "lucide-react": "latest"
}
```

### Never Add
```
shadcn/ui, MUI, Ant Design, Chakra UI, React Query, styled-components,
emotion, Zustand, Jotai, MobX
```

### Environment
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```
- Only one env var. Never use `import.meta.env` in components — go through `apiClient`.
- Razorpay `key_id` comes from `POST /payments/initiate` at runtime — NOT in `.env`.
- Razorpay SDK loaded via `<script>` tag in `index.html` — not dynamically injected.

---

## SECTION 5 — DESIGN SYSTEM

### 5.1 — Tailwind Token Classes
```
BACKGROUNDS
  bg-surface-base       → #0b1326
  bg-surface-hover      → rgba(255,255,255,0.05)
  bg-surface-overlay    → rgba(0,0,0,0.60)
  bg-brand-primary      → #7c3aed
  bg-brand-hover        → #6d28d9
  bg-brand-muted        → rgba(139,92,246,0.15)

TEXT
  text-text-primary / text-slate-400 / text-slate-500 / text-slate-600
  text-violet-400       → accent / active nav

BORDERS
  border-border-base / border-border-subtle / border-border-strong

FOCUS (always use all three)
  focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-violet-500/20

FONTS
  font-display → Space Grotesk    font-body → Inter
```

### 5.2 — CSS Classes
```
.glass-panel            cards, panels
.glass-panel-elevated   modals, dropdowns
.glass-nav              sidebar + topbar
.btn-primary            violet→blue gradient CTA
```

### 5.3 — Component Snippets

> No shared EmptyState, ConfirmDialog, or Pagination components.
> Every page implements these inline using the exact patterns below.

**Page wrapper:**
```tsx
<div className="flex flex-col gap-6 animate-fade-in">
  <div className="flex items-center gap-1.5 text-xs text-slate-500">
    <span>Admin</span><ChevronRight size={12} /><span className="text-slate-300">Page</span>
  </div>
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-white font-display">Page Name</h1>
      <p className="text-slate-400 text-sm mt-1 font-body">Subtitle</p>
    </div>
  </div>
</div>
```

**Form input:**
```tsx
<div>
  <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-display uppercase tracking-wider">Label *</label>
  <input className="w-full bg-surface-base border border-border-base rounded-xl px-3 py-2.5
                     text-sm text-text-primary placeholder:text-slate-600 font-body
                     focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-violet-500/20 transition-colors" />
</div>
```

**Toggle:**
```tsx
<div onClick={() => setValue(v => !v)}
     className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${value ? 'bg-violet-600' : 'bg-slate-700'}`}>
  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
</div>
```

**Skeleton — always, never a spinner:**
```tsx
{Array.from({ length: 5 }).map((_, i) => (
  <div key={i} className="h-14 bg-surface-hover rounded-xl animate-pulse" />
))}
```

**Modal:**
```tsx
<div className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
  <div className="glass-panel-elevated rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
    <div className="flex items-center justify-between p-6 border-b border-border-base">
      <h2 className="text-base font-semibold text-white font-display">Title</h2>
      <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X size={18} /></button>
    </div>
    <div className="p-6 space-y-4 font-body">...</div>
    <div className="flex justify-end gap-3 p-6 border-t border-border-base">
      <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
      <button className="btn-primary px-4 py-2 rounded-xl text-sm">Save</button>
    </div>
  </div>
</div>
```

**Table:**
```tsx
<div className="glass-panel rounded-2xl overflow-hidden">
  <table className="w-full">
    <thead className="border-b border-border-base">
      <tr><th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 font-display">Col</th></tr>
    </thead>
    <tbody className="divide-y divide-border-subtle">
      <tr className="hover:bg-surface-hover transition-colors">
        <td className="px-6 py-4 text-sm text-text-primary font-body">...</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Empty state:**
```tsx
<div className="flex flex-col items-center justify-center py-20 text-center">
  <PackageOpen size={44} className="text-slate-700 mb-4" />
  <p className="text-slate-300 font-semibold font-display mb-1">No [items] yet</p>
  <p className="text-slate-500 text-sm font-body">[Context message]</p>
</div>
```

**Error state:**
```tsx
<div className="flex flex-col items-center justify-center py-20 text-center">
  <AlertCircle size={44} className="text-red-400/60 mb-4" />
  <p className="text-slate-300 font-semibold font-display mb-1">Failed to load</p>
  <p className="text-slate-500 text-sm font-body mb-5">{error ?? 'Something went wrong.'}</p>
  <button onClick={handleRetry}
          className="px-4 py-2 rounded-xl text-sm border border-border-base text-slate-300
                     hover:bg-surface-hover hover:text-white transition-colors font-display">
    Try Again
  </button>
</div>
```

**Confirmation modal:**
```tsx
{showConfirm && (
  <div className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
    <div className="glass-panel-elevated rounded-2xl w-full max-w-sm shadow-2xl p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle size={18} className="text-red-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white font-display">Confirm [Action]</h3>
          <p className="text-slate-400 text-sm font-body mt-1">[Consequence]. This cannot be undone.</p>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white font-display">Cancel</button>
        <button onClick={handleConfirm} disabled={isLoading}
                className="px-4 py-2 rounded-xl text-sm bg-red-500 hover:bg-red-600 text-white font-display
                           disabled:opacity-50 flex items-center gap-2">
          {isLoading && <Loader2 size={14} className="animate-spin" />}
          [Delete / Cancel]
        </button>
      </div>
    </div>
  </div>
)}
```

**Inline pagination:**
```tsx
{meta && meta.total_pages > 1 && (
  <div className="flex items-center justify-between pt-4 border-t border-border-base">
    <p className="text-xs text-slate-500 font-body">
      Showing {((meta.page - 1) * meta.per_page) + 1}–{Math.min(meta.page * meta.per_page, meta.total)} of {meta.total}
    </p>
    <div className="flex items-center gap-1">
      <button onClick={() => handlePageChange(meta.page - 1)} disabled={meta.page <= 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover disabled:opacity-30 transition-colors">
        <ChevronLeft size={16} />
      </button>
      {Array.from({ length: Math.min(meta.total_pages, 5) }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => handlePageChange(p)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold font-display transition-colors
                            ${p === meta.page ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-white hover:bg-surface-hover'}`}>
          {p}
        </button>
      ))}
      <button onClick={() => handlePageChange(meta.page + 1)} disabled={meta.page >= meta.total_pages}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover disabled:opacity-30 transition-colors">
        <ChevronRight size={16} />
      </button>
    </div>
  </div>
)}
```

### 5.4 — Animations

| Class | Effect | Use when |
|---|---|---|
| `animate-fade-in` | opacity 0→1, 0.15s | Every page root div, every modal |
| `animate-slide-in` | opacity + translateY, 0.2s | Side panels |
| `animate-pulse` | Tailwind built-in | Skeleton loaders |
| `animate-spin` | Tailwind built-in | `<Loader2 />` in loading buttons |

---

## SECTION 6 — API CLIENT

```ts
import { apiClient } from '../../api/client'  // NEVER recreate
```

- `baseURL` = `config.API_BASE_URL`
- Attaches `Authorization: Bearer {token}` from localStorage
- On 401: silently calls `POST /auth/refresh`, retries
- On refresh fail: fires `auth:session-expired` window event → redirect to `/login`
- `/auth/*` routes excluded from interceptor

---

## SECTION 7 — REDUX PATTERN

### Store Reducers
```ts
reducer: {
  auth, toast, products, categories, cart, orders, payments
}
```

### Slice Template
```ts
export const fetchItems = createAsyncThunk('x/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const { data } = await xApi.getAll(params)
    return data  // { success, data[], meta }
  } catch (err: unknown) {
    return rejectWithValue(err instanceof Error ? err.message : 'Failed')
  }
})
```

### Toast
```ts
const toast = useToast()
toast.success('Done!') | toast.error('Failed.')
```

### Auth Selectors
```ts
selectUser / selectIsAuthenticated / selectIsBootstrapped
selectDisplayName / selectRoleLabel / selectPrimaryRole / selectRoleDashboardPath
```

---

## SECTION 8 — ROUTING

### Guards
```
ProtectedRoute  → authenticated only, else → /login
GuestRoute      → unauthenticated only, else → role dashboard
RoleRedirect    → reads selectRoleDashboardPath → redirects
```

### All Routes
```
PUBLIC
  /login                    → LoginPage

AUTHENTICATED (all share Layout)
  / (index)                 → RoleRedirect

  ADMIN
  /admin/dashboard          ✅ DashboardPage
  /admin/products           ✅ ProductsPage
  /admin/categories         ✅ CategoriesPage
  /admin/orders             ✅ AdminOrdersPage
  /admin/reviews            🔲
  /admin/returns            🔲
  /admin/customers          🔲
  /admin/coupons            🔲
  /admin/analytics          🔲
  /admin/inventory          🔲

  SELLER
  /seller/dashboard         🔲
  /seller/products          🔲
  /seller/orders            🔲
  /seller/analytics         🔲

  CUSTOMER
  /shop                     ✅ ShopPage
  /shop/:slug               ✅ ProductDetailPage
  /cart                     ✅ CartPage (Razorpay wired in CartSummary)
  /orders                   ✅ CustomerOrdersPage
  /orders/:id               ✅ CustomerOrdersPage
  /returns                  🔲
  /wishlist                 🔲

  ALL ROLES
  /profile                  ✅ ProfilePage
  /settings                 🔲
```

### Known Gaps — Do Not Fix Unless Asked
```
No 403 page — sidebar hides wrong-role links
No 404 page — catch-all redirects to /login
```

### Sidebar Nav — What Is ACTUALLY in Sidebar.tsx Right Now

> ⚠️ Only add nav items to this list when they are physically added to Sidebar.tsx.
> Do not list planned items here. The routes list above shows what is planned.

```
ADMIN (currently in Sidebar.tsx)
  Dashboard, Products, Categories, Orders

SELLER (currently in Sidebar.tsx)
  Dashboard  ← placeholder only, no seller pages built yet

CUSTOMER (currently in Sidebar.tsx)
  Shop, Cart (live badge), My Orders, Profile

ALL ROLES
  Settings (secondary — listed but page not built)
```

---

## SECTION 9 — TYPE SYSTEM

All types in `src/types/index.ts`. Never define locally.

```ts
interface ApiResponse<T> {
  success: boolean; message: string; data: T
  meta?:   { page: number; per_page: number; total: number; total_pages: number }
  error?:  { code: string; message: string; details: Record<string, unknown> | null }
}

type UserRole = 'ADMIN' | 'SELLER' | 'CUSTOMER'   // always UPPERCASE

interface ProductListItem {
  id: number; name: string; slug: string; category_id?: number | null
  price: number; compare_at_price: number | null; stock: number
  is_active?: boolean; is_featured: boolean
  average_rating: number; total_reviews: number; primary_image: string | null
}

interface ProductFilterParams {
  search?: string; category_slug?: string  // pass NAME not slug field
  min_price?: number; max_price?: number
  is_featured?: boolean; in_stock?: boolean
  sort?: 'created_at_desc'|'created_at_asc'|'price_asc'|'price_desc'|'rating_desc'|'sales_desc'
  page?: number; per_page?: number
}

interface Cart {
  cart_id: number | null; items: CartItem[]; item_count: number
  total_quantity: number; subtotal: number; price_change_warning: boolean
}

type OrderStatus = 'PENDING'|'CONFIRMED'|'PROCESSING'|'SHIPPED'|
  'OUT_FOR_DELIVERY'|'DELIVERED'|'CANCELLED'|'RETURN_REQUESTED'|
  'RETURN_APPROVED'|'RETURN_REJECTED'|'REFUNDED'

interface Address {
  id: number; address_type: 'billing'|'shipping'|'both'
  full_name: string; phone: string; address_line1: string; address_line2: string | null
  city: string; state: string; postal_code: string; country: string; is_default: boolean
}
```

---

## SECTION 10 — BACKEND API REFERENCE

```
AUTH
  POST /auth/login → { access_token, user }
  POST /auth/refresh → { access_token }
  POST /auth/logout
  POST /auth/change-password → { current_password, new_password }

USERS
  GET    /users/me
  PATCH  /users/me
  GET/POST /users/me/addresses
  PUT/DELETE /users/me/addresses/:id
  PATCH  /users/me/addresses/:id/default

PRODUCTS
  GET    /products          ⚠️ category_slug = NAME not slug field
  GET    /products/:slug    → full product with variants + images
  POST/PATCH/DELETE /products/:id (admin)

CATEGORIES
  GET /categories / /categories/tree
  POST/PATCH/DELETE /categories/:id (admin)

CART
  GET/DELETE /cart
  POST /cart/items | PATCH /cart/items/:id | DELETE /cart/items/:id

ORDERS
  POST   /orders → { shipping_address_id, billing_address_id, payment_method_id, coupon_code?, order_notes? }
  GET    /orders (own) | GET /orders/admin/all
  GET    /orders/:id
  POST   /orders/:id/cancel
  PATCH  /orders/:id/state (admin)
  GET    /orders/validate-coupon?code=X&subtotal=Y

PAYMENTS ✅ WORKING
  POST /payments/initiate → { razorpay_order_id, amount, currency, key_id }
  POST /payments/verify   → { razorpay_order_id, razorpay_payment_id, razorpay_signature }

REVIEWS (backend ready, frontend 🔲)
  GET  /products/:id/reviews
  POST /products/:id/reviews (verified purchase only)
  GET  /admin/reviews/pending | PATCH /admin/reviews/:id/approve

RETURNS (backend ready, frontend 🔲)
  POST/GET /returns | GET /returns/:id
  GET /returns/admin/all | POST /returns/admin/:id/process
```

### Razorpay Flow (tested and working)
```
1. POST /payments/initiate  → get razorpay_order_id + key_id + amount
2. window.Razorpay (loaded via index.html script tag) opens modal
3. User pays
4. handler() fires with payment_id + signature
5. POST /payments/verify → backend verifies signature
6. Success → clearCart + navigate to /orders/:id
7. Dismiss without paying → order saved, error banner shown,
   user can complete payment later from /orders
```

### Backend Quirks
- `category_slug` = category **name** (e.g. `Electronics`), not the slug field
- `GET /products` does NOT return `category_id`
- Order state IDs stable: PENDING=1…REFUNDED=11

---

## SECTION 11 — MODULE STATUS

| Module | Status | Route | Role | Notes |
|---|---|---|---|---|
| Auth / Login | ✅ | `/login` | Public | Silent refresh, session expiry |
| Admin Dashboard | ✅ | `/admin/dashboard` | ADMIN | Mock data |
| Admin Products | ✅ | `/admin/products` | ADMIN | Full CRUD |
| Admin Categories | ✅ | `/admin/categories` | ADMIN | Tree view |
| Admin Orders | ✅ | `/admin/orders` | ADMIN | State machine + side panel |
| Customer Shop | ✅ | `/shop` | CUSTOMER | Grid + filters + search |
| Product Detail | ✅ | `/shop/:slug` | CUSTOMER | Gallery + variants + reviews |
| Customer Cart | ✅ | `/cart` | CUSTOMER | Qty stepper + coupon + checkout |
| Razorpay Payment | ✅ | `/cart` checkout | CUSTOMER | Tested and working |
| Customer Orders | ✅ | `/orders` | CUSTOMER | History + detail + cancel |
| Profile | ✅ | `/profile` | ALL | Profile \| Addresses \| Security |
| Admin Reviews | 🔲 | `/admin/reviews` | ADMIN | Backend ready |
| Admin Returns | 🔲 | `/admin/returns` | ADMIN | Backend ready |
| Customer Returns | 🔲 | `/returns` | CUSTOMER | Backend ready |
| COD payment | 🔲 | `/seller/orders` | SELLER | Needs seller dashboard first |
| Wishlist | 🔲 | `/wishlist` | CUSTOMER | Backend table exists |
| Admin Customers | 🔲 | `/admin/customers` | ADMIN | — |
| Admin Coupons | 🔲 | `/admin/coupons` | ADMIN | coupon_code table exists |
| Admin Analytics | 🔲 | `/admin/analytics` | ADMIN | — |
| Settings | 🔲 | `/settings` | ALL | — |
| Seller Panel | 🔲 | `/seller/*` | SELLER | COD confirmation belongs here |

---

## SECTION 12 — ADDING A NEW MODULE

```
1. src/types/index.ts — add all new types
2. src/api/xxxApi.ts  — axios calls only, FIRST LINE: // src/api/xxxApi.ts
3. src/store/slices/xxxSlice.ts — thunks + reducers, register in store/index.ts
   FIRST LINE: // src/store/slices/xxxSlice.ts
4. src/components/xxx/ — sub-components first
   FIRST LINE of each: // src/components/xxx/ComponentName.tsx
5. src/pages/[role]/XxxPage.tsx — loading + empty + error states required
   FIRST LINE: // src/pages/[role]/XxxPage.tsx
6. src/App.tsx — add route
7. Sidebar.tsx — add nav item if needed, then update Section 8 Sidebar nav list
8. Update Sections 3, 11, 15 of this document
   Do NOT modify any other section.
```

Inline vs shared: empty states, errors, confirm modals, pagination → always inline.
Create shared component only when identical JSX appears in 3+ pages. Ask developer first.

---

## SECTION 13 — INTEGRATION CONTRACT

### Envelope
```ts
// Success
{ success: true, message: "...", data: T, meta?: { page, per_page, total, total_pages } }
// Error
{ success: false, error: { code: "SCREAMING_SNAKE_CASE", message: "Human readable." } }
```
`data` is the full envelope. Items at `data.data`. Pagination at `data.meta`.

### Images
All `image_url` / `primary_image` fields are absolute URLs — use directly in `<img src>`.
Never prepend `API_BASE_URL`. Always provide fallback for null.

### Formatters
```ts
formatCurrency(129990)              // → "₹1,29,990"
formatDate("2026-05-06T02:30:00Z") // → "06 May 2026, 02:30 PM"
```

### Roles
```ts
// Always UPPERCASE
user.roles.includes('ADMIN')   // ✅
user.roles.includes('admin')   // ❌
```

---

## SECTION 14 — KNOWN GAPS

| Gap | Where | Notes |
|---|---|---|
| COD payment | `CartSummary.tsx` | Intentionally removed — needs seller dashboard to confirm cash received. Add back after `/seller/orders` is built. Payment method id=6. |
| No 403 page | `App.tsx` | Sidebar hides wrong-role links |
| No 404 page | `App.tsx` | Catch-all → /login |
| No global error boundary | App level | Each page handles its own |
| TypeScript strict | `tsconfig.json` | Likely true (Vite default) |
| Product search = ILIKE | Backend | Not full-text |
| Rate limiting not enforced | Backend | Env var exists, no code reads it |
| `services/userService.ts` | `src/services/` | Dead legacy — use `api/userApi.ts` |

---

## SECTION 15 — CURRENT STATE (ALWAYS OVERWRITE THIS)

### What Is Fully Working
- Auth: login, logout, silent refresh, role-based redirect
- Admin: Dashboard, Products (CRUD), Categories (tree), Orders (state machine)
- Customer: Shop (grid + filters), Product Detail (gallery + variants), Cart + Razorpay checkout, Orders, Profile
- Razorpay: order placement → initiate → modal opens → verify → navigate to order ✅

### COD Status — Important
COD (Cash on Delivery) was intentionally removed from the payment options.

**Why:** COD requires a seller to confirm that cash was received on delivery.
Without a Seller Dashboard (`/seller/orders`), there is no UI for the seller to
mark the payment as collected. Adding COD without this creates orders stuck in
`payment_status: PENDING` with no way to resolve them.

**When to add COD back:**
Build `/seller/orders` first. That page needs a "Mark Cash Received" action
calling `PATCH /orders/:id/state`. Once that exists, add COD back to
`CartSummary.tsx` `PAYMENT_METHODS` array with `id: 6`.

### What To Build Next

**Frontend only — backend already complete:**
```
1. Admin Reviews page    /admin/reviews      backend ✅
2. Admin Returns page    /admin/returns      backend ✅
3. Customer Returns      /returns            backend ✅
```

**Backend + Frontend both needed:**

| # | Module | Route | Backend | Frontend | Notes |
|---|---|---|---|---|---|
| 4 | Seller Panel | `/seller/*` | 🔲 | 🔲 | COD confirmation lives here. Start with mock data. |
| 5 | Wishlist | `/wishlist` | 🔲 | 🔲 | DB table exists, no routes yet |
| 6 | Admin Customers | `/admin/customers` | 🔲 | 🔲 | — |
| 7 | Admin Coupons | `/admin/coupons` | 🔲 | 🔲 | coupon_code table exists |

> When you complete Frontend for a row: change 🔲 to ✅ in the Frontend column.
> Add: `→ Developer: open BACKEND_INSTRUCTIONS.md Section 14 and mark Frontend ✅ for this module.`
> When developer confirms Backend is ✅: update this table and move the module to "Frontend only" list above.

**Lower priority:**
```
8. Admin Analytics       /admin/analytics
9. Settings              /settings
10. COD payment          add back after Seller Panel (#4) is built
```

### Watch Out For
- `category_slug` API param = category **name**, not slug field value
- `GET /products` does not return `category_id`
- `ProfilePage` uses `userApi` directly (no Redux) — intentional
- New admin pages → `pages/admin/`, not the legacy `pages/dashboard/admin/`
- Images are absolute URLs — never prepend `API_BASE_URL`
- Razorpay SDK loaded via `index.html` `<script>` tag — not dynamically
- COD removed intentionally — do not add it back without the seller order confirmation UI