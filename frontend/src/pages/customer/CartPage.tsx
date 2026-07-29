import { useEffect } from 'react'
import { ShoppingCart, AlertTriangle, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store'
import {
  fetchCart,
  selectCart,
  selectCartLoading,
  selectCartError,
} from '../../store/slices/cartSlice'
import CartItem from '../../components/cart/CartItem'
import CartSummary from '../../components/cart/CartSummary'

// ── Skeleton ──────────────────────────────────────────────────

function CartSkeleton() {
  return (
    <div className="grid grid-cols-5 gap-6 animate-fade-in">
      <div className="col-span-3 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 bg-surface-hover rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="col-span-2">
        <div className="h-80 bg-surface-hover rounded-2xl animate-pulse" />
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────

function EmptyCart() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="w-20 h-20 rounded-3xl bg-surface-hover flex items-center
                      justify-center mb-6">
        <ShoppingCart size={36} className="text-slate-600" />
      </div>
      <h2 className="text-xl font-bold text-white font-display mb-2">
        Your cart is empty
      </h2>
      <p className="text-slate-400 text-sm font-body mb-8 max-w-xs">
        Looks like you haven't added anything yet.
        Browse our products and find something you love!
      </p>
      <button
        onClick={() => navigate('/shop')}
        className="bg-brand-primary hover:bg-brand-hover text-white px-6 py-3
                   rounded-xl font-medium font-display text-sm transition-colors
                   flex items-center gap-2"
      >
        <Package size={16} />
        Start Shopping
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export default function CartPage() {
  const dispatch  = useAppDispatch()
  const cart      = useAppSelector(selectCart)
  const isLoading = useAppSelector(selectCartLoading)
  const error     = useAppSelector(selectCartError)

  useEffect(() => {
    dispatch(fetchCart())
  }, [dispatch])

  // ── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-400/10 flex items-center
                        justify-center mb-4">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <p className="text-slate-400 text-sm mb-4 font-body">{error}</p>
        <button
          onClick={() => dispatch(fetchCart())}
          className="bg-brand-primary hover:bg-brand-hover text-white px-4 py-2
                     rounded-xl text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────
  if (isLoading && !cart) return <CartSkeleton />

  // ── Empty ─────────────────────────────────────────────────
  if (!cart || cart.items.length === 0) return <EmptyCart />

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white font-display">
          My Cart
        </h1>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold font-display
                         bg-brand-muted text-violet-400 border border-violet-500/20">
          {cart.item_count} item{cart.item_count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Price change warning banner */}
      {cart.price_change_warning && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl
                        bg-yellow-400/10 border border-yellow-400/20">
          <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-400 font-body">
            Some prices have changed since you added these items.
            Review before checkout.
          </p>
        </div>
      )}

      {/* ── Split layout ───────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-6 items-start">

        {/* Left — Cart items (65%) */}
        <div className="col-span-3 space-y-4">
          {cart.items.map(item => (
            <CartItem key={item.id} item={item} />
          ))}
        </div>

        {/* Right — Order summary (35%) */}
        <div className="col-span-2">
          <CartSummary cart={cart} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}