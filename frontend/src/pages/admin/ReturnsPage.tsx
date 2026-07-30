// src/pages/admin/ReturnsPage.tsx
import { useEffect, useState } from 'react'
import {
  ChevronRight, RotateCcw, AlertCircle,
  X, Loader2, Eye,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store'
import {
  fetchAllReturns, processReturn,
  selectReturns, selectReturnsLoading,
  selectReturnsError, selectReturnsMeta,
} from '../../store/slices/returnsSlice'
import { useToast } from '../../store/slices/toastSlice'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'
import type { ReturnListItem, ProcessReturnPayload } from '../../types'

// ── Status config ─────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  APPROVED:  { label: 'Approved',  color: 'text-green-400',  bg: 'bg-green-400/10'  },
  REJECTED:  { label: 'Rejected',  color: 'text-red-400',    bg: 'bg-red-400/10'    },
  COMPLETED: { label: 'Completed', color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
}

// ── Process Modal ─────────────────────────────────────────────
function ProcessModal({
  ret, onClose, onSubmit, isProcessing,
}: {
  ret:          ReturnListItem
  onClose:      () => void
  onSubmit:     (payload: ProcessReturnPayload) => void
  isProcessing: boolean
}) {
  const [action,       setAction]       = useState<'approve' | 'reject'>('approve')
  const [refundAmount, setRefundAmount] = useState<string>('')
  const [notes,        setNotes]        = useState('')

  function handleSubmit() {
    onSubmit({
      action,
      refund_amount: action === 'approve' && refundAmount
        ? Number(refundAmount) : undefined,
      notes: notes.trim() || undefined,
    })
  }

  const inputCls = `w-full bg-surface-base border border-border-base rounded-xl
                    px-3 py-2.5 text-sm text-text-primary font-body
                    focus:outline-none focus:border-brand-primary
                    focus:ring-1 focus:ring-violet-500/20 transition-colors`

  return (
    <div className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-50
                    flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel-elevated rounded-2xl w-full max-w-md shadow-2xl">

        <div className="flex items-center justify-between p-6 border-b border-border-base">
          <h2 className="text-base font-semibold text-white font-display">
            Process Return
          </h2>
          <button onClick={onClose}
                  className="text-slate-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 font-body">

          {/* Return info */}
          <div className="glass-panel rounded-xl p-3 space-y-1">
            <p className="text-xs text-slate-500 font-body">Return Number</p>
            <p className="text-sm font-semibold text-white font-display">
              {ret.return_number}
            </p>
            {ret.reason && (
              <p className="text-xs text-slate-400 font-body mt-1">
                Reason: {ret.reason}
              </p>
            )}
          </div>

          {/* Action */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2
                               font-display uppercase tracking-wider">
              Decision
            </label>
            <div className="flex gap-2">
              {(['approve', 'reject'] as const).map(a => (
                <button
                  key={a}
                  onClick={() => setAction(a)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold
                              font-display border transition-colors capitalize
                              ${action === a
                                ? a === 'approve'
                                  ? 'bg-green-400/15 border-green-400/30 text-green-400'
                                  : 'bg-red-400/15 border-red-400/30 text-red-400'
                                : 'border-border-base text-slate-400 hover:border-border-strong'
                              }`}
                >
                  {a === 'approve' ? '✓ Approve' : '✕ Reject'}
                </button>
              ))}
            </div>
          </div>

          {/* Refund amount — only when approving */}
          {action === 'approve' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                 font-display uppercase tracking-wider">
                Refund Amount (₹)
              </label>
              <input
                type="number"
                min={0}
                className={inputCls}
                placeholder="Enter refund amount"
                value={refundAmount}
                onChange={e => setRefundAmount(e.target.value)}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5
                               font-display uppercase tracking-wider">
              Notes
              <span className="text-slate-600 normal-case ml-1">(optional)</span>
            </label>
            <textarea
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Internal note or reason for customer"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-border-base">
          <button onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white
                             transition-colors font-body">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className={`px-5 py-2 rounded-xl text-sm font-display font-semibold
                        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center gap-2
                        ${action === 'approve'
                          ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30'
                          : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                        }`}
          >
            {isProcessing && <Loader2 size={14} className="animate-spin" />}
            {action === 'approve' ? 'Approve Return' : 'Reject Return'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────
function ReturnStatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium font-display
                      ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────
const STATUS_FILTERS = [
  { label: 'All',       value: ''         },
  { label: 'Pending',   value: 'PENDING'  },
  { label: 'Approved',  value: 'APPROVED' },
  { label: 'Rejected',  value: 'REJECTED' },
  { label: 'Completed', value: 'COMPLETED'},
]

export default function AdminReturnsPage() {
  const dispatch = useAppDispatch()
  const toast    = useToast()

  const returns   = useAppSelector(selectReturns)
  const isLoading = useAppSelector(selectReturnsLoading)
  const error     = useAppSelector(selectReturnsError)
  const meta      = useAppSelector(selectReturnsMeta)

  const [statusFilter,  setStatusFilter]  = useState('')
  const [page,          setPage]          = useState(1)
  const [processTarget, setProcessTarget] = useState<ReturnListItem | null>(null)
  const [isProcessing,  setIsProcessing]  = useState(false)

  useEffect(() => {
    dispatch(fetchAllReturns({ page, status: statusFilter || undefined }))
  }, [dispatch, page, statusFilter])

  async function handleProcess(payload: ProcessReturnPayload) {
    if (!processTarget) return
    setIsProcessing(true)
    try {
      await dispatch(processReturn({ id: processTarget.id, payload })).unwrap()
      toast.success(`Return ${payload.action === 'approve' ? 'approved' : 'rejected'}`)
      setProcessTarget(null)
      dispatch(fetchAllReturns({ page, status: statusFilter || undefined }))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to process')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span>Admin</span>
        <ChevronRight size={12} />
        <span className="text-slate-300">Returns</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-display">Returns</h1>
        <p className="text-slate-400 text-sm mt-1 font-body">
          Review and process customer return requests
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1) }}
            className={`px-4 py-2 rounded-full text-xs font-medium font-display
                        transition-colors border
                        ${statusFilter === f.value
                          ? 'bg-brand-muted text-violet-400 border-violet-500/30'
                          : 'text-slate-400 border-border-base hover:text-slate-200'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle size={44} className="text-red-400/60 mb-4" />
          <p className="text-slate-300 font-semibold font-display mb-1">Failed to load</p>
          <p className="text-slate-500 text-sm font-body mb-5">{error}</p>
          <button
            onClick={() => dispatch(fetchAllReturns({ page }))}
            className="px-4 py-2 rounded-xl text-sm border border-border-base
                       text-slate-300 hover:bg-surface-hover transition-colors font-display"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border-base">
              <tr>
                {['Return #', 'Order #', 'Reason', 'Refund', 'Status', 'Date', ''].map(h => (
                  <th key={h}
                      className="text-left text-[11px] font-semibold text-slate-500
                                 uppercase tracking-wider px-5 py-4 font-display">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {isLoading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="space-y-2 p-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i}
                             className="h-12 bg-surface-hover rounded-xl animate-pulse" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16">
                      <RotateCcw size={36} className="text-slate-700 mb-3" />
                      <p className="text-slate-400 text-sm font-body">
                        No returns found
                      </p>
                    </div>
                  </td>
                </tr>
              ) : returns.map(ret => (
                <tr key={ret.id}
                    className="hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold text-violet-400 font-display">
                      {ret.return_number}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-400 font-body">
                    {ret.order_number}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-text-primary font-body max-w-[200px]
                                  truncate">
                      {ret.reason ?? '—'}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-sm text-text-primary font-body">
                    {ret.refund_amount != null
                      ? formatCurrency(ret.refund_amount)
                      : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <ReturnStatusBadge status={ret.status} />
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500 font-body">
                    {formatDate(ret.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    {ret.status === 'PENDING' && (
                      <button
                        onClick={() => setProcessTarget(ret)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                   text-xs font-medium font-display text-slate-400
                                   hover:text-violet-400 hover:bg-surface-hover
                                   border border-border-base transition-colors"
                      >
                        <Eye size={12} />
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {!isLoading && meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4
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
        </div>
      )}

      {/* Process modal */}
      {processTarget && (
        <ProcessModal
          ret={processTarget}
          onClose={() => setProcessTarget(null)}
          onSubmit={handleProcess}
          isProcessing={isProcessing}
        />
      )}
    </div>
  )
}