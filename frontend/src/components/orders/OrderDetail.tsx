import { Copy, MapPin, Package } from 'lucide-react'
import { useToast } from '../../store/slices/toastSlice'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'
import OrderStatusBadge from './OrderStatusBadge'
import OrderTimeline from './OrderTimeline'
import type { Order } from '../../types'

interface Props {
  order: Order
}

export default function OrderDetail({ order }: Props) {
  const toast = useToast()

  function copyTracking() {
    if (!order.tracking_number) return
    navigator.clipboard.writeText(order.tracking_number)
    toast.success('Tracking number copied!')
  }

  return (
    <div className="space-y-6 font-body">

      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 font-body mb-1">Order Number</p>
          <p className="text-lg font-bold text-white font-display">
            {order.order_number}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Placed on {formatDate(order.created_at)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Timeline */}
      <div>
        <p className="text-xs font-semibold text-slate-400 font-display
                       uppercase tracking-wider mb-4">
          Order Journey
        </p>
        <OrderTimeline status={order.status} />
      </div>

      {/* Tracking number */}
      {order.tracking_number && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl
                        bg-surface-hover border border-border-base">
          <div>
            <p className="text-xs text-slate-500 font-body">Tracking Number</p>
            <p className="text-sm font-medium text-text-primary font-display mt-0.5">
              {order.tracking_number}
            </p>
          </div>
          <button
            onClick={copyTracking}
            className="p-2 hover:bg-surface-base rounded-lg transition-colors
                       text-slate-400 hover:text-violet-400"
            title="Copy tracking number"
          >
            <Copy size={15} />
          </button>
        </div>
      )}

      {/* Items */}
      <div>
        <p className="text-xs font-semibold text-slate-400 font-display
                       uppercase tracking-wider mb-3">
          Items ({order.items.length})
        </p>
        <div className="space-y-2">
          {order.items.map(item => (
            <div key={item.id}
                 className="flex items-center gap-3 px-4 py-3 rounded-xl
                            bg-surface-hover border border-border-subtle">
              <div className="w-10 h-10 rounded-lg bg-surface-base flex items-center
                              justify-center flex-shrink-0">
                <Package size={16} className="text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary font-display
                               truncate">
                  {item.product_name}
                </p>
                {item.variant_details && (
                  <p className="text-xs text-slate-500 font-body mt-0.5">
                    {item.variant_details}
                  </p>
                )}
                <p className="text-xs text-slate-500 font-body">
                  Qty: {item.quantity} × {formatCurrency(item.price_per_unit)}
                </p>
              </div>
              <p className="text-sm font-semibold text-white font-display flex-shrink-0">
                {formatCurrency(item.total_price)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Price breakdown */}
      <div>
        <p className="text-xs font-semibold text-slate-400 font-display
                       uppercase tracking-wider mb-3">
          Price Breakdown
        </p>
        <div className="glass-panel rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Subtotal</span>
            <span className="text-text-primary">{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Discount</span>
              <span className="text-green-400">−{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Tax</span>
            <span className="text-text-primary">{formatCurrency(order.tax)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Shipping</span>
            <span className={order.shipping_charge === 0
              ? 'text-green-400' : 'text-text-primary'}>
              {order.shipping_charge === 0
                ? 'FREE'
                : formatCurrency(order.shipping_charge)}
            </span>
          </div>
          <div className="border-t border-border-base pt-2.5 flex justify-between
                          font-display">
            <span className="text-white font-semibold">Total</span>
            <span className="text-white font-bold text-base">
              {formatCurrency(order.total_price)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl
                      bg-surface-hover border border-border-base">
        <MapPin size={15} className="text-slate-500 flex-shrink-0" />
        <div>
          <p className="text-xs text-slate-500 font-body">Payment Method</p>
          <p className="text-sm font-medium text-text-primary font-display mt-0.5">
            {order.payment_method}
          </p>
        </div>
        <div className="ml-auto">
          <p className="text-xs text-slate-500 font-body text-right">
            Payment Status
          </p>
          <p className={`text-sm font-medium font-display mt-0.5 text-right
                         ${order.payment_status === 'PAID'
                           ? 'text-green-400'
                           : order.payment_status === 'FAILED'
                             ? 'text-red-400'
                             : 'text-yellow-400'}`}>
            {order.payment_status}
          </p>
        </div>
      </div>

      {/* Order notes */}
      {order.order_notes && (
        <div className="px-4 py-3 rounded-xl bg-surface-hover border border-border-base">
          <p className="text-xs text-slate-500 font-body mb-1">Order Notes</p>
          <p className="text-sm text-text-primary font-body">{order.order_notes}</p>
        </div>
      )}
    </div>
  )
}