// src/App.tsx
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useAppDispatch, useAppSelector } from "./store";
import {
  bootstrapAuth,
  sessionExpired,
  selectIsAuthenticated,
  selectIsBootstrapped,
  selectRoleDashboardPath,
} from "./store/slices/authSlice";

import Layout from "./components/layout/Layout";
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/dashboard/admin/DashboardPage";
import ProductsPage from "./pages/dashboard/admin/ProductsPage";
import CategoriesPage from './pages/dashboard/admin/CategoriesPage'
import CartPage             from './pages/customer/CartPage'
import CustomerOrdersPage   from './pages/customer/CustomerOrdersPage'
import AdminOrdersPage      from './pages/admin/OrdersPage'
import ToastContainer from "./components/ui/Toast";
import ShopPage           from './pages/customer/ShopPage'
import ProductDetailPage  from './pages/customer/ProductDetailPage'
import ProfilePage from './pages/customer/ProfilePage'

// ── Placeholder ───────────────────────────────────────────────
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-surface-card border border-border-base
                      flex items-center justify-center">
        <ShoppingCart size={28} className="text-slate-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-400 font-display">{label}</h2>
      <p className="text-slate-600 text-sm">This module is coming soon.</p>
    </div>
  );
}

// ── Bootstrap spinner ─────────────────────────────────────────
function BootstrapSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-blue-500
                        flex items-center justify-center animate-pulse">
          <ShoppingCart size={20} className="text-white" />
        </div>
        <p className="text-slate-500 text-sm font-display tracking-wide">Loading...</p>
      </div>
    </div>
  );
}

// ── Guards ────────────────────────────────────────────────────
// WHY flat guards and NOT nested RoleRoute components?
//   Nested components that call useSelector + return <Navigate> inside
//   a Route tree cause "Maximum update depth exceeded" because React
//   detects state changes during render triggered by the redirect.
//   Flat routes with simple ProtectedRoute/GuestRoute is the correct pattern.

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isBootstrapped  = useAppSelector(selectIsBootstrapped);

  if (!isBootstrapped)  return <BootstrapSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isBootstrapped  = useAppSelector(selectIsBootstrapped);
  const dashboardPath   = useAppSelector(selectRoleDashboardPath);

  if (!isBootstrapped) return <BootstrapSpinner />;
  if (isAuthenticated) return <Navigate to={dashboardPath} replace />;
  return <>{children}</>;
}
// Add this component in App.tsx (above Root)
function RoleRedirect() {
  const dashboardPath = useAppSelector(selectRoleDashboardPath)
  return <Navigate to={dashboardPath} replace />
}
// ── Root ──────────────────────────────────────────────────────
function Root() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Only makes API call if token exists in localStorage (guard is inside thunk)
    dispatch(bootstrapAuth());

    // Listen for session expiry from axios interceptor — no hard reload
    const handler = () => dispatch(sessionExpired());
    window.addEventListener("auth:session-expired", handler);
    return () => window.removeEventListener("auth:session-expired", handler);
  }, [dispatch]);

  return (
    <>
      <Routes>
        {/* ── Public ── */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />

        {/* ── All authenticated routes share one Layout ── */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RoleRedirect />} />

          {/* ADMIN */}
          <Route path="/admin/dashboard"  element={<DashboardPage />} />
          <Route path="/admin/products"   element={<ProductsPage />} />
          <Route path="/admin/categories" element={<CategoriesPage />} />
          <Route path="/admin/orders"     element={<AdminOrdersPage />} />       
          <Route path="/admin/customers"  element={<ComingSoon label="Customers" />} />
          <Route path="/admin/inventory"  element={<ComingSoon label="Inventory" />} />
          <Route path="/admin/coupons"    element={<ComingSoon label="Coupons" />} />
          <Route path="/admin/reviews"    element={<ComingSoon label="Reviews" />} />
          <Route path="/admin/returns"    element={<ComingSoon label="Returns" />} />
          <Route path="/admin/analytics"  element={<ComingSoon label="Analytics" />} />

          {/* SELLER */}
          <Route path="/seller/dashboard" element={<ComingSoon label="Seller Dashboard" />} />
          <Route path="/seller/products"  element={<ComingSoon label="My Products" />} />
          <Route path="/seller/orders"    element={<ComingSoon label="My Orders" />} />
          <Route path="/seller/analytics" element={<ComingSoon label="Analytics" />} />

          {/* CUSTOMER */}
          <Route path="/shop"       element={<ShopPage />} />
          <Route path="/shop/:slug" element={<ProductDetailPage />} />
          <Route path="/cart"             element={<CartPage />} />               
          <Route path="/orders"           element={<CustomerOrdersPage />} />     
          <Route path="/orders/:id"       element={<CustomerOrdersPage />} />     
          <Route path="/wishlist"         element={<ComingSoon label="Wishlist" />} />

          {/* Shared */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings"         element={<ComingSoon label="Settings" />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  );
}