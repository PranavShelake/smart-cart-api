import { useEffect, useState } from 'react'
import { ChevronRight, AlertCircle, ClipboardList, X, AlertTriangle } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store'
import {
  fetchMyOrders,
  cancelOrder,
  fetchOrderById,
  setOrderFilters,
  selectOrders,
  selectOrdersTotal,
  selectOrdersTotalPages,
  selectOrdersLoading,
  selectOrdersError,
  selectOrderFilters,
  selectSelectedOrder,
  selectIsLoadingDetail,
  setSelectedOrder,
  clearSelectedOrder,
} from '../../store/slices/ordersSlice'
import { useToast } from '../../store/slices/toastSlice'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'
import OrderStatusBadge from '../../components/orders/OrderStatusBadge'
import OrderDetail from '../../components/orders/OrderDetail'
import type { OrderListItem, OrderStatus } from '../../types'

// ── Filter tabs ───────────────────────────────────────────────

const STATUS_TABS: { label: string; value: string | null }[] = [
  { label: 'All',        value: null          },
  { label: 'Pending',    value: 'PENDING'     },
  { label: 'Processing', value: 'PROCESSING'  },
  { label: 'Shipped',    value: 'SHIPPED'     },
  { label: 'Delivered',  value: 'DELIVERED'   },
  { label: 'Cancelled',  value: 'CANCELLED'   },
]

// ── Skeleton ──────────────────────────────────────────────────

function OrderCardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-36 bg-surface-hover rounded-2xl animate-pulse" />
      ))}
    </div>
  )
}

// ── Cancel Modal ──────────────────────────────────────────────

function CancelModal({
  order,
  onClose,
  onConfirm,
  isCancelling,
}: {
  order:        OrderListItem
  onClose:      () => void
  onConfirm:    (reason: string) => void
  isCancelling: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-50
                    flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel-elevated rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex flex-col gap-4">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center
                            justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white font-display">
                Cancel Order?
              </h3>
              <p className="text-xs text-slate-500 font-body mt-0.5">
                {order.order_number}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5
                               font-display uppercase tracking-wider">
              Reason (optional)
            </label>
            <textarea
              rows={3}
              className="w-full bg-surface-base border border-border-base rounded-xl
                         px-3 py-2.5 text-sm text-text-primary placeholder:text-slate-600
                         font-body focus:outline-none focus:border-brand-primary
                         focus:ring-1 focus:ring-violet-500/20 transition-colors resize-none"
              placeholder="Tell us why you're cancelling…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm text-slate-400 border
                         border-border-base rounded-xl hover:text-white
                         hover:border-border-strong transition-colors font-body"
            >
              Keep Order
            </button>
            <button
              onClick={() => onConfirm(reason)}
              disabled={isCancelling}
              className="flex-1 px-4 py-2.5 text-sm bg-red-500/20 text-red-400
                         rounded-xl hover:bg-red-500/30 border border-red-500/30
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         font-medium font-display"
            >
              {isCancelling ? 'Cancelling…' : 'Cancel Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Detail Modal ──────────────────────────────────────────────

function DetailModal({ onClose }: { onClose: () => void }) {
  const selectedOrder   = useAppSelector(selectSelectedOrder)
  const isLoadingDetail = useAppSelector(selectIsLoadingDetail)

  return (
    <div className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-50
                    flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel-elevated rounded-2xl w-full max-w-2xl
                      shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-base">
          <h2 className="text-base font-semibold text-white font-display">
            Order Detail
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {isLoadingDetail ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}
                     className="h-12 bg-surface-hover rounded-xl animate-pulse" />
              ))}
            </div>
          ) : selectedOrder ? (
            <OrderDetail order={selectedOrder} />
          ) : (
            <p className="text-slate-400 text-sm text-center py-8 font-body">
              Order not found
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Order Card ────────────────────────────────────────────────

function OrderCard({
  order,
  onViewDetail,
  onCancelClick,
}: {
  order:         OrderListItem
  onViewDetail:  (id: number) => void
  onCancelClick: (order: OrderListItem) => void
}) {
  const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED'

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4">

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white font-display">
            {order.order_number}
          </p>
          <p className="text-xs text-slate-500 font-body mt-0.5">
            {formatDate(order.created_at)}
          </p>
        </div>
        <OrderStatusBadge status={order.status as OrderStatus} />
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-slate-500 font-body">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          {order.item_count} item{order.item_count !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          {order.payment_status}
        </span>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-1
                      border-t border-border-subtle">
        <p className="text-lg font-bold text-white font-display">
          {formatCurrency(order.total_price)}
        </p>
        <div className="flex items-center gap-2">
          {canCancel && (
            <button
              onClick={() => onCancelClick(order)}
              className="px-3 py-1.5 text-xs text-red-400 border border-red-400/30
                         rounded-xl hover:bg-red-400/10 transition-colors font-display"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => onViewDetail(order.id)}
            className="px-3 py-1.5 text-xs bg-brand-muted text-violet-400
                       border border-violet-500/20 rounded-xl hover:bg-violet-500/20
                       transition-colors font-display"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export default function CustomerOrdersPage() {
  const dispatch = useAppDispatch()
  const toast    = useToast()

  const orders     = useAppSelector(selectOrders)
  const total      = useAppSelector(selectOrdersTotal)
  const totalPages = useAppSelector(selectOrdersTotalPages)
  const isLoading  = useAppSelector(selectOrdersLoading)
  const error      = useAppSelector(selectOrdersError)
  const filters    = useAppSelector(selectOrderFilters)

  const [showDetail,    setShowDetail]    = useState(false)
  const [cancelTarget,  setCancelTarget]  = useState<OrderListItem | null>(null)
  const [isCancelling,  setIsCancelling]  = useState(false)

  // ── Fetch on mount + filter change ────────────────────────
  useEffect(() => {
    dispatch(fetchMyOrders({ page: filters.page, status: filters.status }))
  }, [dispatch, filters.page, filters.status])

  // ── Handlers ──────────────────────────────────────────────

  function handleTabChange(status: string | null) {
    dispatch(setOrderFilters({ status, page: 1 }))
  }

  async function handleViewDetail(id: number) {
    setShowDetail(true)
    await dispatch(fetchOrderById(id))
  }

  function handleCloseDetail() {
    setShowDetail(false)
    dispatch(clearSelectedOrder())
  }

  async function handleConfirmCancel(reason: string) {
    if (!cancelTarget) return
    setIsCancelling(true)
    try {
      await dispatch(cancelOrder({ id: cancelTarget.id, reason })).unwrap()
      toast.success(`Order ${cancelTarget.order_number} cancelled`)
      setCancelTarget(null)
      dispatch(fetchMyOrders({ page: filters.page, status: filters.status }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel order'
      toast.error(msg)
    } finally {
      setIsCancelling(false)
    }
  }

  // Pagination
  const currentPage = filters.page
  const from = ((currentPage - 1) * 10) + 1
  const to   = Math.min(currentPage * 10, total)

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span>Account</span>
        <ChevronRight size={12} />
        <span className="text-slate-300">My Orders</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white font-display">My Orders</h1>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold font-display
                         bg-brand-muted text-violet-400 border border-violet-500/20">
          {total} total
        </span>
      </div>

      {/* ── Filter tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.label}
            onClick={() => handleTabChange(tab.value)}
            className={`px-4 py-2 rounded-full text-xs font-medium font-display
                        transition-colors border
                        ${filters.status === tab.value
                          ? 'bg-brand-muted text-violet-400 border-violet-500/30'
                          : 'text-slate-400 border-border-base hover:text-slate-200'
                        }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-400/10 flex items-center
                          justify-center mb-4">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <p className="text-slate-400 text-sm mb-4 font-body">{error}</p>
          <button
            onClick={() =>
              dispatch(fetchMyOrders({ page: filters.page, status: filters.status }))
            }
            className="bg-brand-primary hover:bg-brand-hover text-white px-4 py-2
                       rounded-xl text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────── */}
      {isLoading && <OrderCardSkeleton />}

      {/* ── Empty ───────────────────────────────────────────── */}
      {!isLoading && !error && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center
                          justify-center mb-4">
            <ClipboardList size={24} className="text-slate-600" />
          </div>
          <p className="text-slate-400 text-sm font-body">
            No {filters.status?.toLowerCase() ?? ''} orders found
          </p>
        </div>
      )}

      {/* ── Orders list ─────────────────────────────────────── */}
      {!isLoading && !error && orders.length > 0 && (
        <>
          <div className="space-y-4">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onViewDetail={handleViewDetail}
                onCancelClick={setCancelTarget}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <p className="text-xs text-slate-500 font-body">
                Showing{' '}
                <span className="text-slate-300">{from}–{to}</span>
                {' '}of{' '}
                <span className="text-slate-300">{total}</span> orders
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => dispatch(setOrderFilters({ page: currentPage - 1 }))}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400
                             hover:text-white hover:bg-surface-hover
                             disabled:opacity-30 disabled:cursor-not-allowed
                             transition-colors font-body"
                >
                  ← Prev
                </button>
                <span className="text-xs text-slate-500 px-2 font-body">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => dispatch(setOrderFilters({ page: currentPage + 1 }))}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400
                             hover:text-white hover:bg-surface-hover
                             disabled:opacity-30 disabled:cursor-not-allowed
                             transition-colors font-body"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modals ──────────────────────────────────────────── */}
      {showDetail && (
        <DetailModal onClose={handleCloseDetail} />
      )}

      {cancelTarget && (
        <CancelModal
          order={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleConfirmCancel}
          isCancelling={isCancelling}
        />
      )}
    </div>
  )
}