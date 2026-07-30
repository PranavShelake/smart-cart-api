// src/pages/customer/CustomerReturnsPage.tsx
import { useEffect, useState } from 'react'
import {
  ChevronRight, RotateCcw, AlertCircle,
  X, Loader2, Plus, PackageOpen,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store'
import {
  fetchMyReturns, createReturn,
  selectReturns, selectReturnsLoading,
  selectReturnsError, selectReturnsMeta,
} from '../../store/slices/returnsSlice'
import { useToast } from '../../store/slices/toastSlice'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'
import { ordersApi } from '../../api/ordersApi'
import type { ReturnListItem, OrderListItem } from '../../types'

// ── Status config ─────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  APPROVED:  { label: 'Approved',  color: 'text-green-400',  bg: 'bg-green-400/10'  },
  REJECTED:  { label: 'Rejected',  color: 'text-red-400',    bg: 'bg-red-400/10'    },
  COMPLETED: { label: 'Completed', color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
}

// ── Raise Return Modal ────────────────────────────────────────
function RaiseReturnModal({
  onClose,
  onSubmit,
  isSubmitting,
}: {
  onClose:      () => void
  onSubmit:     (orderId: number, reason: string) => void
  isSubmitting: boolean
}) {
  const [deliveredOrders, setDeliveredOrders] = useState<OrderListItem[]>([])
  const [isLoading,       setIsLoading]       = useState(true)
  const [selectedOrderId, setSelectedOrderId] = useState<number | ''>('')
  const [reason,          setReason]          = useState('')
  const [error,           setError]           = useState<string | null>(null)

  // Fetch delivered orders on mount
  useEffect(() => {
    ordersApi.getMyOrders({ page: 1, status: 'DELIVERED' })
      .then(({ data }) => setDeliveredOrders(data.data))
      .catch(() => setError('Failed to load your orders'))
      .finally(() => setIsLoading(false))
  }, [])

  function handleSubmit() {
    if (!selectedOrderId) {
      setError('Please select an order')
      return
    }
    if (!reason.trim()) {
      setError('Please provide a reason')
      return
    }
    setError(null)
    onSubmit(Number(selectedOrderId), reason.trim())
  }

  const inputCls = `w-full bg-surface-base border border-border-base rounded-xl
                    px-3 py-2.5 text-sm text-text-primary font-body
                    focus:outline-none focus:border-brand-primary
                    focus:ring-1 focus:ring-violet-500/20 transition-colors`

  return (
    <div className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-50
                    flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel-elevated rounded-2xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-base">
          <h2 className="text-base font-semibold text-white font-display">
            Raise a Return
          </h2>
          <button onClick={onClose}
                  className="text-slate-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 font-body">

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-violet-400" />
            </div>
          ) : (
            <>
              {/* Info banner */}
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl
                              bg-blue-400/10 border border-blue-400/20">
                <RotateCcw size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300 font-body leading-relaxed">
                  Returns are accepted within 7 days of delivery.
                  Only delivered orders are eligible.
                </p>
              </div>

              {/* Order selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                   font-display uppercase tracking-wider">
                  Select Order *
                </label>
                {deliveredOrders.length === 0 ? (
                  <div className="px-3 py-3 rounded-xl bg-surface-hover border
                                  border-border-base text-sm text-slate-500 font-body">
                    No delivered orders found
                  </div>
                ) : (
                  <select
                    className={`${inputCls} appearance-none cursor-pointer`}
                    value={selectedOrderId}
                    onChange={e => setSelectedOrderId(
                      e.target.value ? Number(e.target.value) : ''
                    )}
                  >
                    <option value="">Choose a delivered order…</option>
                    {deliveredOrders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.order_number} — {formatCurrency(o.total_price)}
                        {' '}({formatDate(o.created_at)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Reason */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-400
                                     font-display uppercase tracking-wider">
                    Reason *
                  </label>
                  <span className="text-xs text-slate-600 font-body">
                    {reason.length}/500
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={500}
                  className={`${inputCls} resize-none`}
                  placeholder="Describe why you want to return this order…"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl
                                bg-red-400/10 border border-red-400/20">
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400 font-body">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border-base">
          <button onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white
                             transition-colors font-body">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading || deliveredOrders.length === 0}
            className="btn-primary px-5 py-2 rounded-xl text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Submit Return
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Return card ───────────────────────────────────────────────
function ReturnCard({ ret }: { ret: ReturnListItem }) {
  const cfg = STATUS_CONFIG[ret.status] ?? STATUS_CONFIG.PENDING

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white font-display">
            {ret.return_number}
          </p>
          <p className="text-xs text-slate-500 font-body mt-0.5">
            Order: {ret.order_number}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium font-display
                          flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {ret.reason && (
        <p className="text-sm text-slate-400 font-body leading-relaxed line-clamp-2">
          {ret.reason}
        </p>
      )}

      <div className="flex items-center justify-between pt-1
                      border-t border-border-subtle">
        <span className="text-xs text-slate-500 font-body">
          {formatDate(ret.created_at)}
        </span>
        {ret.refund_amount != null && (
          <span className="text-sm font-semibold text-green-400 font-display">
            Refund: {formatCurrency(ret.refund_amount)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
const STATUS_TABS = [
  { label: 'All',       value: ''         },
  { label: 'Pending',   value: 'PENDING'  },
  { label: 'Approved',  value: 'APPROVED' },
  { label: 'Rejected',  value: 'REJECTED' },
]

export default function CustomerReturnsPage() {
  const dispatch = useAppDispatch()
  const toast    = useToast()

  const returns   = useAppSelector(selectReturns)
  const isLoading = useAppSelector(selectReturnsLoading)
  const error     = useAppSelector(selectReturnsError)
  const meta      = useAppSelector(selectReturnsMeta)

  const [statusFilter,  setStatusFilter]  = useState('')
  const [page,          setPage]          = useState(1)
  const [showModal,     setShowModal]     = useState(false)
  const [isSubmitting,  setIsSubmitting]  = useState(false)

  useEffect(() => {
    dispatch(fetchMyReturns({ page, status: statusFilter || undefined }))
  }, [dispatch, page, statusFilter])

  async function handleSubmitReturn(orderId: number, reason: string) {
    setIsSubmitting(true)
    try {
      await dispatch(createReturn({ order_id: orderId, reason })).unwrap()
      toast.success('Return request submitted successfully')
      setShowModal(false)
      dispatch(fetchMyReturns({ page: 1 }))
      setPage(1)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit return')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span>Account</span>
        <ChevronRight size={12} />
        <span className="text-slate-300">My Returns</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">My Returns</h1>
          <p className="text-slate-400 text-sm mt-1 font-body">
            Track your return requests
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                     font-medium font-display bg-brand-primary
                     hover:bg-brand-hover text-white transition-colors"
        >
          <Plus size={15} />
          Raise Return
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1) }}
            className={`px-4 py-2 rounded-full text-xs font-medium font-display
                        transition-colors border
                        ${statusFilter === tab.value
                          ? 'bg-brand-muted text-violet-400 border-violet-500/30'
                          : 'text-slate-400 border-border-base hover:text-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle size={44} className="text-red-400/60 mb-4" />
          <p className="text-slate-300 font-semibold font-display mb-1">
            Failed to load
          </p>
          <p className="text-slate-500 text-sm font-body mb-5">{error}</p>
          <button
            onClick={() => dispatch(fetchMyReturns({ page }))}
            className="px-4 py-2 rounded-xl text-sm border border-border-base
                       text-slate-300 hover:bg-surface-hover transition-colors font-display"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && !error && (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 bg-surface-hover rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && returns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageOpen size={44} className="text-slate-700 mb-4" />
          <p className="text-slate-300 font-semibold font-display mb-1">
            No returns yet
          </p>
          <p className="text-slate-500 text-sm font-body mb-5">
            If you're not happy with a delivered order, raise a return request.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary px-4 py-2 rounded-xl text-sm"
          >
            Raise Return
          </button>
        </div>
      )}

      {/* Returns grid */}
      {!isLoading && !error && returns.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            {returns.map(ret => (
              <ReturnCard key={ret.id} ret={ret} />
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between pt-4
                            border-t border-border-base">
              <p className="text-xs text-slate-500 font-body">
                Showing {((meta.page - 1) * meta.per_page) + 1}–
                {Math.min(meta.page * meta.per_page, meta.total)} of {meta.total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white
                             hover:bg-surface-hover disabled:opacity-30 transition-colors"
                >←</button>
                <span className="text-xs text-slate-500 px-2 font-body">
                  {page} / {meta.total_pages}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)} disabled={page >= meta.total_pages}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white
                             hover:bg-surface-hover disabled:opacity-30 transition-colors"
                >→</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Raise return modal */}
      {showModal && (
        <RaiseReturnModal
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitReturn}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}