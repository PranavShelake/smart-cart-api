// src/pages/customer/PaymentPage.tsx
//
// Standalone page for Razorpay payment flow.
// Route: /payment/:orderId
//
// WHY a separate page (not inline in cart)?
// - Razorpay widget needs clean DOM focus
// - User can bookmark/return to this URL
// - Keeps CartPage responsibility clean

import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import {
  CheckCircle2, XCircle, ShoppingBag, ArrowLeft,
} from 'lucide-react'
import { useAppDispatch } from '../../store'
import { clearPayment } from '../../store/slices/paymentsSlice'
import { useToast } from '../../store/slices/toastSlice'
import { formatCurrency } from '../../utils/formatCurrency'
import RazorpayCheckout from '../../components/payments/RazorpayCheckout'

// ── Success screen ────────────────────────────────────────────
function PaymentSuccess({ orderId }: { orderId: number }) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
      <div className="w-24 h-24 rounded-3xl bg-green-400/10 border border-green-400/20
                      flex items-center justify-center animate-fade-in">
        <CheckCircle2 size={48} className="text-green-400" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-white font-display mb-2">
          Payment Successful!
        </h1>
        <p className="text-slate-400 text-sm font-body">
          Your order has been confirmed. We'll send you updates via email.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate(`/orders/${orderId}`)}
          className="bg-brand-primary hover:bg-brand-hover text-white px-6 py-2.5
                     rounded-xl text-sm font-medium font-display transition-colors
                     flex items-center gap-2"
        >
          <ShoppingBag size={16} />
          View Order
        </button>
        <button
          onClick={() => navigate('/shop')}
          className="px-6 py-2.5 rounded-xl text-sm text-slate-400
                     hover:text-white border border-border-base hover:border-border-strong
                     font-display transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  )
}

// ── Failure screen ────────────────────────────────────────────
function PaymentFailed({ orderId, onRetry }: { orderId: number; onRetry: () => void }) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
      <div className="w-24 h-24 rounded-3xl bg-red-400/10 border border-red-400/20
                      flex items-center justify-center animate-fade-in">
        <XCircle size={48} className="text-red-400" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-white font-display mb-2">
          Payment Failed
        </h1>
        <p className="text-slate-400 text-sm font-body">
          Don't worry — your order is saved. You can retry the payment anytime.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="bg-brand-primary hover:bg-brand-hover text-white px-6 py-2.5
                     rounded-xl text-sm font-medium font-display transition-colors"
        >
          Retry Payment
        </button>
        <button
          onClick={() => navigate(`/orders/${orderId}`)}
          className="px-6 py-2.5 rounded-xl text-sm text-slate-400
                     hover:text-white border border-border-base
                     font-display transition-colors"
        >
          View Order
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function PaymentPage() {
  const { orderId }          = useParams<{ orderId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate             = useNavigate()
  const dispatch             = useAppDispatch()
  const paymentResult        = searchParams.get('payment')  // 'success' | 'failed' | null

  const orderIdNum = parseInt(orderId ?? '0', 10)

  // Clear payment state when leaving
  useEffect(() => {
    return () => { dispatch(clearPayment()) }
  }, [dispatch])

  if (!orderIdNum) {
    navigate('/orders', { replace: true })
    return null
  }

  // Show result screens (navigated here from Razorpay handler)
  if (paymentResult === 'success') {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <PaymentSuccess orderId={orderIdNum} />
      </div>
    )
  }

  if (paymentResult === 'failed') {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <PaymentFailed
          orderId={orderIdNum}
          onRetry={() => setSearchParams({})}   // clear ?payment=failed → re-render checkout
        />
      </div>
    )
  }

  // Active payment flow
  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-xl mx-auto">

      {/* Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-white
                     text-sm transition-colors mb-4 font-display"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <h1 className="text-2xl font-bold text-white font-display">Complete Payment</h1>
        <p className="text-slate-400 text-sm mt-1 font-body">
          Order #{orderId} — Secure payment via Razorpay
        </p>
      </div>

      {/* Trust badges */}
      <div className="glass-panel rounded-2xl px-6 py-4">
        <div className="flex items-center justify-center gap-8 text-xs text-slate-500 font-body">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            256-bit SSL Encryption
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            PCI DSS Compliant
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Secured by Razorpay
          </span>
        </div>
      </div>

      {/* Razorpay checkout widget area */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <RazorpayCheckout
          orderId={orderIdNum}
          orderNumber={orderId ?? ''}
          amount={0}          // display-only; actual amount comes from backend
          onCancel={() => navigate(`/orders/${orderIdNum}`)}
        />
      </div>

    </div>
  )
}