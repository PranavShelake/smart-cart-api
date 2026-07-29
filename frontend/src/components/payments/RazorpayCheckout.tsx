// src/components/payments/RazorpayCheckout.tsx
//
// Handles the complete Razorpay payment flow:
// 1. Receives orderId as prop (order already created in DB)
// 2. Calls POST /payments/initiate → gets Razorpay order credentials
// 3. Loads Razorpay script → opens checkout widget
// 4. On success → calls POST /payments/verify → navigates to success page
// 5. On failure/dismiss → shows error, allows retry

import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2, ShieldCheck, RefreshCw } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store'
import {
  initiatePayment,
  verifyPayment,
  setCapturing,
  clearPayment,
} from '../../store/slices/paymentsSlice'
import { useToast } from '../../store/slices/toastSlice'
import { useRazorpay } from '../../hooks/useRazorpay'
import { formatCurrency } from '../../utils/formatCurrency'

interface RazorpayCheckoutProps {
  orderId:     number
  orderNumber: string
  amount:      number          // INR (not paise)
  onCancel:    () => void      // called when user dismisses without paying
}

export default function RazorpayCheckout({
  orderId,
  orderNumber,
  amount,
  onCancel,
}: RazorpayCheckoutProps) {
  const dispatch   = useAppDispatch()
  const navigate   = useNavigate()
  const toast      = useToast()
  const { loadRazorpay } = useRazorpay()

  const { razorpayOrder, isInitiating, isVerifying, isCapturing, error } =
    useAppSelector((s) => s.payments)

  // ── Step 1: Initiate on mount ─────────────────────────────
  useEffect(() => {
    dispatch(initiatePayment(orderId))
    return () => { dispatch(clearPayment()) }
  }, [dispatch, orderId])

  // ── Step 2: Open widget once we have razorpay order ───────
  useEffect(() => {
    if (!razorpayOrder || isCapturing) return
    openRazorpayWidget()
  }, [razorpayOrder])

  const openRazorpayWidget = useCallback(async () => {
    if (!razorpayOrder) return

    const loaded = await loadRazorpay()
    if (!loaded) {
      toast.error('Failed to load payment gateway. Check your internet connection.')
      return
    }

    dispatch(setCapturing(true))

    const options: RazorpayOptions = {
      key:      razorpayOrder.razorpay_key_id,
      amount:   razorpayOrder.amount,         // paise from backend
      currency: razorpayOrder.currency,
      order_id: razorpayOrder.razorpay_order_id,
      name:     'Smart Cart',
      description: `Order ${razorpayOrder.order_number}`,
      prefill:  razorpayOrder.prefill,
      theme:    { color: '#7c3aed' },         // brand violet

      modal: {
        // User closed without paying
        ondismiss: () => {
          dispatch(setCapturing(false))
          toast.error('Payment cancelled.')
          onCancel()
        },
        escape: false,
      },

      // ── Success handler ──────────────────────────────────
      handler: async (response) => {
        try {
          await dispatch(verifyPayment({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          })).unwrap()

          toast.success('Payment successful! 🎉')
          navigate(`/orders/${orderId}?payment=success`, { replace: true })
        } catch (err) {
          toast.error('Payment verification failed. Contact support if amount was debited.')
          navigate(`/orders/${orderId}?payment=failed`, { replace: true })
        }
      },
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', () => {
      dispatch(setCapturing(false))
      toast.error('Payment failed. Please try again.')
    })
    rzp.open()
  }, [razorpayOrder, dispatch, navigate, toast, onCancel, loadRazorpay])

  // ── UI: Loading state while initiating ────────────────────
  if (isInitiating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-muted flex items-center justify-center">
          <Loader2 size={28} className="text-violet-400 animate-spin" />
        </div>
        <p className="text-slate-400 text-sm font-body">Setting up payment gateway...</p>
      </div>
    )
  }

  // ── UI: Widget is open ────────────────────────────────────
  if (isCapturing && !isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-green-400/10 flex items-center justify-center">
          <ShieldCheck size={28} className="text-green-400" />
        </div>
        <p className="text-white font-display font-semibold">Complete payment in the popup</p>
        <p className="text-slate-500 text-xs font-body">
          Don't close this page. Complete the payment in the Razorpay window.
        </p>
      </div>
    )
  }

  // ── UI: Verifying after widget success ────────────────────
  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 size={28} className="text-violet-400 animate-spin" />
        <p className="text-slate-400 text-sm font-body">Confirming payment...</p>
      </div>
    )
  }

  // ── UI: Error state ───────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="w-14 h-14 rounded-2xl bg-red-400/10 flex items-center justify-center">
          <AlertCircle size={24} className="text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-white font-display font-semibold mb-1">Payment Error</p>
          <p className="text-slate-400 text-sm font-body">{error}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => dispatch(initiatePayment(orderId))}
            className="flex items-center gap-2 bg-brand-primary hover:bg-brand-hover
                       text-white px-4 py-2 rounded-xl text-sm font-medium
                       font-display transition-colors"
          >
            <RefreshCw size={14} />
            Retry Payment
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm text-slate-400
                       hover:text-white transition-colors font-display"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── UI: Idle — waiting for widget to open ─────────────────
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 size={24} className="text-violet-400 animate-spin" />
      <p className="text-slate-500 text-sm font-body">Opening payment gateway...</p>
    </div>
  )
}