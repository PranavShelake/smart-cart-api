// src/components/cart/CheckoutButton.tsx
//
// Handles the checkout → payment handoff:
// 1. User clicks "Proceed to Pay"
// 2. POST /orders → creates order in DB (status: PENDING)
// 3. Navigate to /payment/:orderId → RazorpayCheckout takes over
//
// WHY create order first, THEN open Razorpay?
//   The order must exist in our DB before we create a Razorpay order.
//   Razorpay order references our order_number as receipt.
//   If payment fails, order stays in DB with PENDING status — user can retry.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store'
import { useToast } from '../../store/slices/toastSlice'

interface CheckoutButtonProps {
  shippingAddressId:  number | null
  billingAddressId:   number | null
  paymentMethodId:    number | null
  couponCode:         string | null
  orderNotes:         string
  disabled:           boolean
  onOrderCreated?:    (orderId: number) => void   // optional callback
}

export default function CheckoutButton({
  shippingAddressId,
  billingAddressId,
  paymentMethodId,
  couponCode,
  orderNotes,
  disabled,
  onOrderCreated,
}: CheckoutButtonProps) {
  const dispatch  = useAppDispatch()
  const navigate  = useNavigate()
  const toast     = useToast()
  const [loading, setLoading] = useState(false)

  // Import from ordersSlice dynamically to avoid circular dep
  const handleCheckout = async () => {
    if (!shippingAddressId || !billingAddressId || !paymentMethodId) {
      toast.error('Please fill in all required details before proceeding.')
      return
    }

    setLoading(true)
    try {
      // Dynamic import to keep this component lightweight
      const { placeOrder } = await import('../../store/slices/ordersSlice')
      const result = await dispatch(
        placeOrder({
          shipping_address_id: shippingAddressId,
          billing_address_id:  billingAddressId,
          payment_method_id:   paymentMethodId,
          coupon_code:         couponCode ?? undefined,
          order_notes:         orderNotes || undefined,
        })
      ).unwrap()

      onOrderCreated?.(result.id)

      // For COD (payment_method_id === 6): skip payment page
      if (paymentMethodId === 6) {
        toast.success('Order placed successfully!')
        navigate(`/orders/${result.id}`, { replace: true })
        return
      }

      // For all online payment methods: go to payment page
      navigate(`/payment/${result.id}`)

    } catch (err: any) {
      toast.error(err ?? 'Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={disabled || loading}
      className="btn-primary w-full py-3 rounded-xl flex items-center
                 justify-center gap-2 text-sm disabled:opacity-50
                 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Placing Order...
        </>
      ) : (
        <>
          <ShieldCheck size={16} />
          Proceed to Pay
        </>
      )}
    </button>
  )
}