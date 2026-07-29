import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, ShoppingCart, Package,
  Users, BarChart3, Settings, LogOut, Tag, Boxes,
  Ticket, Star, RotateCcw, Store, ClipboardList,
  Heart, User, ShoppingBag,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store'
import { logout, selectPrimaryRole } from '../../store/slices/authSlice'
import { selectCartCount } from '../../store/slices/cartSlice'
import { useToast } from '../../store/slices/toastSlice'
import type { UserRole } from '../../types'

interface NavItem {
  label:  string
  path:   string
  icon:   React.ReactNode
  badge?: number | 'cart'   // 'cart' = live badge from Redux
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',  path: '/admin/dashboard',  icon: <LayoutDashboard size={18} /> },
  { label: 'Products',   path: '/admin/products',   icon: <Package         size={18} /> },
  { label: 'Categories', path: '/admin/categories', icon: <Tag             size={18} /> },
  { label: 'Orders',     path: '/admin/orders',     icon: <ShoppingCart    size={18} /> },
  { label: 'Customers',  path: '/admin/customers',  icon: <Users           size={18} /> },
  { label: 'Inventory',  path: '/admin/inventory',  icon: <Boxes           size={18} /> },
  { label: 'Coupons',    path: '/admin/coupons',    icon: <Ticket          size={18} /> },
  { label: 'Reviews',    path: '/admin/reviews',    icon: <Star            size={18} /> },
  { label: 'Returns',    path: '/admin/returns',    icon: <RotateCcw       size={18} /> },
  { label: 'Analytics',  path: '/admin/analytics',  icon: <BarChart3       size={18} /> },
]

const SELLER_NAV: NavItem[] = [
  { label: 'Dashboard',   path: '/seller/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'My Products', path: '/seller/products',  icon: <Package         size={18} /> },
  { label: 'Orders',      path: '/seller/orders',    icon: <ShoppingCart    size={18} /> },
  { label: 'Analytics',   path: '/seller/analytics', icon: <TrendingUp      size={18} /> },
]

const CUSTOMER_NAV: NavItem[] = [
  { label: 'Shop',      path: '/shop',      icon: <Store         size={18} /> },
  { label: 'Cart',      path: '/cart',      icon: <ShoppingBag   size={18} />, badge: 'cart' },
  { label: 'My Orders', path: '/orders',    icon: <ClipboardList size={18} /> },
  { label: 'Wishlist',  path: '/wishlist',  icon: <Heart         size={18} /> },
  { label: 'Profile',   path: '/profile',   icon: <User          size={18} /> },
]

const SECONDARY_NAV: NavItem[] = [
  { label: 'Settings', path: '/settings', icon: <Settings size={18} /> },
]

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  ADMIN:    ADMIN_NAV,
  SELLER:   SELLER_NAV,
  CUSTOMER: CUSTOMER_NAV,
}

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN:    'Command Center',
  SELLER:   'Seller Panel',
  CUSTOMER: 'My Account',
}

// ── Nav row ───────────────────────────────────────────────────
function NavRow({ item }: { item: NavItem }) {
  const cartCount = useAppSelector(selectCartCount)
  const badgeNum  = item.badge === 'cart' ? cartCount : item.badge

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => [
        'flex items-center gap-3 px-4 py-[10px] rounded-xl text-sm font-medium',
        'transition-all duration-200 relative group font-display tracking-tight',
        isActive
          ? 'bg-brand-muted text-violet-300 border-l-[3px] border-brand-primary pl-[13px]'
          : 'text-slate-400 hover:text-slate-100 hover:bg-surface-hover border-l-[3px] border-transparent',
      ].join(' ')}
    >
      <span className="shrink-0 group-hover:scale-110 transition-transform duration-200">
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {badgeNum != null && badgeNum > 0 && (
        <span className="text-[10px] font-bold bg-brand-primary text-white rounded-full
                         min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {badgeNum > 99 ? '99+' : badgeNum}
        </span>
      )}
    </NavLink>
  )
}

// ── Sidebar ───────────────────────────────────────────────────
export default function Sidebar({ hidePro = false }: { hidePro?: boolean }) {
  const dispatch = useAppDispatch()
  const toast    = useToast()
  const navigate = useNavigate()
  const role     = useAppSelector(selectPrimaryRole)

  const navItems = role ? NAV_BY_ROLE[role] : ADMIN_NAV
  const subtitle = role ? ROLE_LABEL[role]  : 'Smart Cart'

  const handleLogout = async () => {
    try {
      await dispatch(logout())
      toast.success('Logged out successfully')
      navigate('/login', { replace: true })
    } catch {
      toast.error('Logout failed. Please try again.')
    }
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-sidebar flex flex-col z-50
                      glass-nav border-r border-border-base">

      {/* Brand */}
      <div className="px-6 pt-8 pb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-blue-500
                        flex items-center justify-center shrink-0">
          <ShoppingCart size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-[17px] font-bold text-white font-display">Smart Cart</h1>
          <p className="text-[10px] uppercase text-slate-500 tracking-widest">{subtitle}</p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        <p className="text-[10px] uppercase text-slate-600 px-4 pb-2 tracking-widest">
          {role === 'CUSTOMER' ? 'Navigation' : 'Main Menu'}
        </p>
        {navItems.map(item => (
          <NavRow key={item.path} item={item} />
        ))}
      </nav>

      {/* Pro card — admin only */}
      {!hidePro && role === 'ADMIN' && (
        <div className="px-4 pb-4">
          <div className="glass-panel rounded-2xl p-4">
            <p className="text-xs text-slate-400 font-display font-semibold">
              Unlock all features
            </p>
            <p className="text-[11px] text-slate-500 mb-3 mt-0.5">
              Advanced analytics, exports &amp; more
            </p>
            <button className="btn-primary w-full py-2 rounded-lg text-xs">
              Upgrade to Pro
            </button>
          </div>
        </div>
      )}

      {/* Bottom */}
      <div className="px-3 pb-6 border-t border-border-subtle pt-3 space-y-0.5">
        {SECONDARY_NAV.map(item => (
          <NavRow key={item.path} item={item} />
        ))}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-[10px] rounded-xl w-full text-sm
                     font-medium text-red-400 hover:bg-red-500/10 transition-all duration-200
                     border-l-[3px] border-transparent font-display tracking-tight"
        >
          <LogOut size={18} className="shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}