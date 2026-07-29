// src/components/cart/CartSummary.tsx
import { useState, useEffect } from 'react'
import {
  ShoppingBag, MapPin, CreditCard, Smartphone,
  Landmark, Truck, Wallet, ChevronDown, X, Loader2,
  AlertTriangle,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store'
import { placeOrder }    from '../../store/slices/ordersSlice'
import { clearCartState } from '../../store/slices/cartSlice'
import {
  initiatePayment,
  verifyPayment,
  setCapturing,
  clearPayment,
} from '../../store/slices/paymentsSlice'
import { useToast }      from '../../store/slices/toastSlice'
import { useNavigate }   from 'react-router-dom'
import { useRazorpay }   from '../../hooks/useRazorpay'
import { ordersApi }     from '../../api/ordersApi'
import { formatCurrency } from '../../utils/formatCurrency'
import { selectUser }    from '../../store/slices/authSlice'
import CouponInput       from './CouponInput'
import type { Address, Cart, PaymentMethod } from '../../types'

// ── Constants ─────────────────────────────────────────────────

const COD_METHOD_ID = 6   // matches backend payment_method table id

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 1, name: 'UPI'         },
  { id: 2, name: 'CREDIT_CARD' },
  { id: 3, name: 'DEBIT_CARD'  },
  { id: 4, name: 'NET_BANKING' },
  { id: 5, name: 'WALLET'      },
]

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  UPI:         <Smartphone size={16} />,
  CREDIT_CARD: <CreditCard size={16} />,
  DEBIT_CARD:  <CreditCard size={16} />,
  NET_BANKING: <Landmark   size={16} />,
  WALLET:      <Wallet     size={16} />,
  COD:         <Truck      size={16} />,
}

const PAYMENT_LABELS: Record<string, string> = {
  UPI:         'UPI',
  CREDIT_CARD: 'Credit Card',
  DEBIT_CARD:  'Debit Card',
  NET_BANKING: 'Net Banking',
  WALLET:      'Wallet',
  COD:         'Cash on Delivery',
}

// ── Checkout Modal ────────────────────────────────────────────

interface CheckoutModalProps {
  cart:    Cart
  coupon:  { code: string; discount: number } | null
  onClose: () => void
}

function CheckoutModal({ cart, coupon, onClose }: CheckoutModalProps) {
  const dispatch       = useAppDispatch()
  const toast          = useToast()
  const navigate       = useNavigate()
  const user           = useAppSelector(selectUser)
  const { loadRazorpay } = useRazorpay()

  const [addresses,          setAddresses]          = useState<Address[]>([])
  const [shippingAddressId,  setShippingAddressId]  = useState<number | null>(null)
  const [billingAddressId,   setBillingAddressId]   = useState<number | null>(null)
  const [sameAsShipping,     setSameAsShipping]     = useState(true)
  const [paymentMethodId,    setPaymentMethodId]    = useState<number>(1)
  const [orderNotes,         setOrderNotes]         = useState('')
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [isProcessing,       setIsProcessing]       = useState(false)
  const [modalError,         setModalError]         = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'processing' | 'paying'>('form')

  const isCOD = paymentMethodId === COD_METHOD_ID

  // ── Fetch addresses ───────────────────────────────────────
  useEffect(() => {
    ordersApi.getMyAddresses()
      .then(({ data }) => {
        const list = data.data
        setAddresses(list)
        const def = list.find(a => a.is_default) ?? list[0] ?? null
        if (def) {
          setShippingAddressId(def.id)
          setBillingAddressId(def.id)
        }
      })
      .catch(() => setModalError('Failed to load addresses'))
      .finally(() => setIsLoadingAddresses(false))
  }, [])

  useEffect(() => {
    if (sameAsShipping && shippingAddressId) {
      setBillingAddressId(shippingAddressId)
    }
  }, [sameAsShipping, shippingAddressId])

  // ── Pricing ───────────────────────────────────────────────
  const shipping = cart.subtotal >= 499 ? 0 : 49
  const tax      = Math.round(cart.subtotal * 0.18)
  const discount = coupon?.discount ?? 0
  const total    = cart.subtotal + shipping + tax - discount

  // ── Main handler ──────────────────────────────────────────
  async function handlePlaceOrder() {
    if (!shippingAddressId || !billingAddressId) {
      setModalError('Please select shipping and billing addresses')
      return
    }
    if (addresses.length === 0) {
      setModalError('Please add an address first')
      return
    }

    setModalError(null)
    setIsProcessing(true)
    setStep('processing')

    try {
      // ── Step 1: Place order (always) ───────────────────────
      const order = await dispatch(placeOrder({
        shipping_address_id: shippingAddressId,
        billing_address_id:  billingAddressId,
        payment_method_id:   paymentMethodId,
        coupon_code:         coupon?.code,
        order_notes:         orderNotes.trim() || undefined,
      })).unwrap()

      // ── Step 2a: COD — done, navigate ─────────────────────
      if (isCOD) {
        dispatch(clearCartState())
        toast.success('Order placed! Pay on delivery.')
        onClose()
        navigate(`/orders/${order.id}`)
        return
      }

      // ── Step 2b: Online — initiate Razorpay ───────────────
      setStep('paying')

      const sdkLoaded = await loadRazorpay()
      if (!sdkLoaded) {
        setModalError('Failed to load payment gateway. Check your connection.')
        setIsProcessing(false)
        setStep('form')
        return
      }

      const rzpData = await dispatch(initiatePayment(order.id)).unwrap()

      // ── Step 3: Open Razorpay modal ───────────────────────
      dispatch(setCapturing(true))

      const options: RazorpayOptions = {
        key:      rzpData.razorpay_key_id,
        amount:   rzpData.amount,
        currency: rzpData.currency,
        name:     'Smart Cart',
        order_id: rzpData.razorpay_order_id,
        prefill: {
          name:    user?.first_name ? `${user.first_name} ${user.last_name}` : undefined,
          email:   user?.email    ?? undefined,
          contact: user?.phone    ?? undefined,
        },
        theme: { color: '#7c3aed' },

        // ── Payment success ─────────────────────────────────
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            await dispatch(verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            })).unwrap()

            dispatch(clearCartState())
            dispatch(clearPayment())
            toast.success('Payment successful! Order confirmed.')
            onClose()
            navigate(`/orders/${order.id}`)
          } catch {
            // Verification failed after payment — critical, show support message
            setModalError(
              'Payment received but verification failed. ' +
              'Please contact support with your order ID: ' + order.id
            )
            setIsProcessing(false)
            setStep('form')
            dispatch(setCapturing(false))
          }
        },

        // ── Modal dismissed without paying ──────────────────
        modal: {
          ondismiss: () => {
            dispatch(setCapturing(false))
            dispatch(clearPayment())
            setIsProcessing(false)
            setStep('form')
            setModalError(
              `Payment cancelled. Your order #${order.id} is saved. ` +
              'You can complete payment from My Orders.'
            )
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setModalError(msg)
      setIsProcessing(false)
      setStep('form')
      dispatch(setCapturing(false))
    }
  }

  const selectCls = `w-full bg-surface-base border border-border-base rounded-xl
                     px-3 py-2.5 text-sm text-text-primary font-body appearance-none
                     focus:outline-none focus:border-brand-primary transition-colors
                     cursor-pointer`

  // ── Button label based on state ───────────────────────────
  function buttonContent() {
    if (step === 'processing') {
      return <><Loader2 size={15} className="animate-spin" /> Placing Order…</>
    }
    if (step === 'paying') {
      return <><Loader2 size={15} className="animate-spin" /> Opening Payment…</>
    }
    if (isCOD) {
      return <><ShoppingBag size={15} /> Place Order (COD)</>
    }
    return <><CreditCard size={15} /> Proceed to Pay {formatCurrency(total)}</>
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-50
                    flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel-elevated rounded-2xl w-full max-w-lg
                      shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-base">
          <h2 className="text-base font-semibold text-white font-display">
            Complete Your Order
          </h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-500 hover:text-white transition-colors p-1
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 font-body">
          {isLoadingAddresses ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-violet-400" />
            </div>
          ) : (
            <>
              {/* No addresses warning */}
              {addresses.length === 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl
                                bg-yellow-400/10 border border-yellow-400/20">
                  <AlertTriangle size={15} className="text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-yellow-400 font-display">
                      No addresses found
                    </p>
                    <p className="text-xs text-yellow-400/70 font-body mt-0.5">
                      Add an address in your{' '}
                      <a href="/profile"
                         className="underline hover:text-yellow-300">
                        Profile
                      </a>{' '}
                      before checkout.
                    </p>
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {addresses.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                     font-display uppercase tracking-wider">
                    Shipping Address
                  </label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                                                 text-slate-500 pointer-events-none" />
                    <select
                      className={`${selectCls} pl-8`}
                      value={shippingAddressId ?? ''}
                      onChange={e => setShippingAddressId(Number(e.target.value))}
                    >
                      {addresses.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.full_name} — {a.address_line1}, {a.city}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13}
                      className="absolute right-3 top-1/2 -translate-y-1/2
                                 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Billing Address */}
              {addresses.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-400
                                       font-display uppercase tracking-wider">
                      Billing Address
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sameAsShipping}
                        onChange={e => setSameAsShipping(e.target.checked)}
                        className="accent-violet-600 cursor-pointer"
                      />
                      <span className="text-xs text-slate-400 font-body">
                        Same as shipping
                      </span>
                    </label>
                  </div>
                  {!sameAsShipping && (
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                                                   text-slate-500 pointer-events-none" />
                      <select
                        className={`${selectCls} pl-8`}
                        value={billingAddressId ?? ''}
                        onChange={e => setBillingAddressId(Number(e.target.value))}
                      >
                        {addresses.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.full_name} — {a.address_line1}, {a.city}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={13}
                        className="absolute right-3 top-1/2 -translate-y-1/2
                                   text-slate-500 pointer-events-none" />
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2
                                   font-display uppercase tracking-wider">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(pm => (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethodId(pm.id)}
                      disabled={isProcessing}
                      className={`flex flex-col items-center gap-1.5 px-3 py-2.5
                                  rounded-xl border text-xs font-medium font-display
                                  transition-colors disabled:opacity-50
                                  disabled:cursor-not-allowed
                                  ${paymentMethodId === pm.id
                                    ? 'bg-brand-muted border-violet-500/40 text-violet-300'
                                    : 'border-border-base text-slate-400 hover:border-border-strong hover:text-slate-200'
                                  }`}
                    >
                      {PAYMENT_ICONS[pm.name]}
                      {PAYMENT_LABELS[pm.name]}
                    </button>
                  ))}
                </div>

                {/* COD info banner */}
                {isCOD && (
                  <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl
                                  bg-blue-400/10 border border-blue-400/20">
                    <Truck size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-400 font-body leading-relaxed">
                      Pay cash when your order is delivered.
                      No online payment required now.
                    </p>
                  </div>
                )}

                {/* Online payment info */}
                {!isCOD && (
                  <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl
                                  bg-violet-400/10 border border-violet-400/20">
                    <CreditCard size={14} className="text-violet-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-violet-300 font-body leading-relaxed">
                      You'll be redirected to Razorpay's secure
                      payment gateway to complete payment.
                    </p>
                  </div>
                )}
              </div>

              {/* Order Notes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-400
                                     font-display uppercase tracking-wider">
                    Order Notes
                  </label>
                  <span className="text-xs text-slate-600 font-body">
                    {orderNotes.length}/500
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={500}
                  className="w-full bg-surface-base border border-border-base rounded-xl
                             px-3 py-2.5 text-sm text-text-primary placeholder:text-slate-600
                             font-body focus:outline-none focus:border-brand-primary
                             focus:ring-1 focus:ring-violet-500/20 transition-colors resize-none"
                  placeholder="Special instructions? (optional)"
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                />
              </div>

              {/* Order recap */}
              <div className="glass-panel rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-400 font-display
                               uppercase tracking-wider mb-3">
                  Order Summary
                </p>
                <div className="flex justify-between text-sm font-body">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-text-primary">{formatCurrency(cart.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-body">
                  <span className="text-slate-400">Shipping</span>
                  <span className={shipping === 0 ? 'text-green-400' : 'text-text-primary'}>
                    {shipping === 0 ? 'FREE' : formatCurrency(shipping)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-body">
                  <span className="text-slate-400">Tax (18% GST)</span>
                  <span className="text-text-primary">{formatCurrency(tax)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-slate-400">Discount</span>
                    <span className="text-green-400">−{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="border-t border-border-base pt-2 mt-2
                                flex justify-between font-display">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-white font-bold text-lg">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Error / info banner */}
              {modalError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl
                                bg-red-400/10 border border-red-400/20">
                  <AlertTriangle size={14}
                    className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400 font-body">{modalError}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border-base">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 text-sm text-slate-400 hover:text-white
                       transition-colors font-body
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handlePlaceOrder}
            disabled={
              isProcessing        ||
              isLoadingAddresses  ||
              addresses.length === 0
            }
            className="flex-1 btn-primary py-2.5 rounded-xl text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {buttonContent()}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Cart Summary (right column) ───────────────────────────────

interface Props {
  cart:      Cart
  isLoading: boolean
}

export default function CartSummary({ cart, isLoading }: Props) {
  const [coupon,       setCoupon]       = useState<{ code: string; discount: number } | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)

  const shipping = cart.subtotal >= 499 ? 0 : 49
  const tax      = Math.round(cart.subtotal * 0.18)
  const discount = coupon?.discount ?? 0
  const total    = cart.subtotal + shipping + tax - discount

  return (
    <>
      <div className="glass-panel rounded-2xl p-6 space-y-5 sticky top-24">
        <h2 className="text-base font-semibold text-white font-display">
          Order Summary
        </h2>

        <div className="space-y-3">
          <div className="flex justify-between text-sm font-body">
            <span className="text-slate-400">
              Subtotal ({cart.item_count} item{cart.item_count !== 1 ? 's' : ''})
            </span>
            <span className="text-text-primary">{formatCurrency(cart.subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm font-body">
            <span className="text-slate-400">Shipping</span>
            <span className={shipping === 0 ? 'text-green-400 font-medium' : 'text-text-primary'}>
              {shipping === 0 ? 'FREE' : formatCurrency(shipping)}
            </span>
          </div>
          {shipping === 0 && (
            <p className="text-xs text-green-400/70 font-body -mt-1">
              🎉 You qualify for free shipping!
            </p>
          )}

          <div className="flex justify-between text-sm font-body">
            <span className="text-slate-400">Tax (18% GST)</span>
            <span className="text-text-primary">{formatCurrency(tax)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-sm font-body">
              <span className="text-slate-400">Discount</span>
              <span className="text-green-400 font-medium">
                −{formatCurrency(discount)}
              </span>
            </div>
          )}

          <div className="border-t border-border-base pt-3">
            <div className="flex justify-between font-display">
              <span className="text-white font-semibold">Total</span>
              <span className="text-white font-bold text-xl">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-border-subtle pt-4">
          <CouponInput
            subtotal={cart.subtotal}
            applied={coupon}
            onApply={setCoupon}
            onRemove={() => setCoupon(null)}
          />
        </div>

        <div className="space-y-3 pt-1">
          <button
            onClick={() => setShowCheckout(true)}
            disabled={isLoading || cart.item_count === 0}
            className="w-full btn-primary py-3 rounded-xl text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            <ShoppingBag size={16} />
            Proceed to Checkout
          </button>
          <p className="text-center text-xs text-slate-500 font-body">
            <a href="/shop"
               className="text-violet-400 hover:text-violet-300 transition-colors">
              ← Continue Shopping
            </a>
          </p>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal
          cart={cart}
          coupon={coupon}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </>
  )
}