import {
  Clock, CheckCircle2, Package, Truck, MapPin,
  XCircle, RotateCcw, RefreshCcw,
} from 'lucide-react'
import type { OrderStatus } from '../../types'

interface StatusConfig {
  label: string
  color: string
  bg:    string
  icon:  React.ReactNode
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  PENDING:          { label: 'Pending',          color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  icon: <Clock        size={11} /> },
  CONFIRMED:        { label: 'Confirmed',         color: 'text-blue-400',   bg: 'bg-blue-400/10',    icon: <CheckCircle2 size={11} /> },
  PROCESSING:       { label: 'Processing',        color: 'text-purple-400', bg: 'bg-purple-400/10',  icon: <Package      size={11} /> },
  SHIPPED:          { label: 'Shipped',           color: 'text-indigo-400', bg: 'bg-indigo-400/10',  icon: <Truck        size={11} /> },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  color: 'text-cyan-400',   bg: 'bg-cyan-400/10',    icon: <MapPin       size={11} /> },
  DELIVERED:        { label: 'Delivered',         color: 'text-green-400',  bg: 'bg-green-400/10',   icon: <CheckCircle2 size={11} /> },
  CANCELLED:        { label: 'Cancelled',         color: 'text-red-400',    bg: 'bg-red-400/10',     icon: <XCircle      size={11} /> },
  RETURN_REQUESTED: { label: 'Return Requested',  color: 'text-orange-400', bg: 'bg-orange-400/10',  icon: <RotateCcw    size={11} /> },
  RETURN_APPROVED:  { label: 'Return Approved',   color: 'text-teal-400',   bg: 'bg-teal-400/10',    icon: <RotateCcw    size={11} /> },
  RETURN_REJECTED:  { label: 'Return Rejected',   color: 'text-red-400',    bg: 'bg-red-400/10',     icon: <XCircle      size={11} /> },
  REFUNDED:         { label: 'Refunded',          color: 'text-emerald-400',bg: 'bg-emerald-400/10', icon: <RefreshCcw   size={11} /> },
}

interface Props {
  status: OrderStatus
  size?:  'sm' | 'md'
}

export default function OrderStatusBadge({ status, size = 'md' }: Props) {
  const cfg = ORDER_STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium
                      font-display w-fit
                      ${size === 'sm'
                        ? 'px-2 py-0.5 text-[10px]'
                        : 'px-2.5 py-1 text-xs'}
                      ${cfg.bg} ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}