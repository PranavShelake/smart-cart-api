// src/pages/admin/ReviewsPage.tsx
import { useEffect, useState } from 'react'
import {
  ChevronRight, Check, Trash2,
  AlertCircle, MessageSquare, Loader2,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store'
import {
  fetchPendingReviews, approveReview, deleteReview,
  selectPendingReviews, selectReviewsLoading,
  selectReviewsError, selectReviewsMeta,
} from '../../store/slices/reviewsSlice.ts'
import { useToast } from '../../store/slices/toastSlice'
import { formatDate } from '../../utils/formatDate'
import StarRating from '../../components/shop/StarRating'
import type { ReviewListItem } from '../../types'

// ── Confirm modal ─────────────────────────────────────────────
function ConfirmDeleteModal({
  review, onClose, onConfirm, isDeleting,
}: {
  review:     ReviewListItem
  onClose:    () => void
  onConfirm:  () => void
  isDeleting: boolean
}) {
  return (
    <div className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-50
                    flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel-elevated rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center
                          justify-center flex-shrink-0 mt-0.5">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white font-display">
              Delete Review?
            </h3>
            <p className="text-slate-400 text-sm font-body mt-1">
              Review by <span className="text-white">{review.user_name}</span> on{' '}
              <span className="text-white">{review.product_name}</span> will be
              permanently deleted.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white
                             font-display transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-sm bg-red-500 hover:bg-red-600
                             text-white font-display transition-colors
                             disabled:opacity-50 flex items-center gap-2">
            {isDeleting && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Review card ───────────────────────────────────────────────
function ReviewCard({
  review,
  onApprove,
  onDelete,
  isApproving,
}: {
  review:      ReviewListItem
  onApprove:   (id: number) => void
  onDelete:    (review: ReviewListItem) => void
  isApproving: boolean
}) {
  return (
    <div className="glass-panel rounded-2xl p-5 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white font-display">
            {review.product_name}
          </p>
          <div className="flex items-center gap-2">
            <StarRating rating={review.rating} showCount={false} size="sm" />
            <span className="text-xs text-slate-500 font-body">
              by {review.user_name}
            </span>
            <span className="text-xs text-slate-600 font-body">·</span>
            <span className="text-xs text-slate-500 font-body">
              {formatDate(review.created_at)}
            </span>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-display
                          flex-shrink-0
                          ${review.is_approved
                            ? 'bg-green-400/10 text-green-400'
                            : 'bg-yellow-400/10 text-yellow-400'}`}>
          {review.is_approved ? 'Approved' : 'Pending'}
        </span>
      </div>

      {/* Content */}
      {review.title && (
        <p className="text-sm font-semibold text-text-primary font-display">
          {review.title}
        </p>
      )}
      {review.body && (
        <p className="text-sm text-slate-400 font-body leading-relaxed line-clamp-3">
          {review.body}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
        {!review.is_approved && (
          <button
            onClick={() => onApprove(review.id)}
            disabled={isApproving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                       font-medium font-display text-green-400 hover:bg-green-400/10
                       border border-green-400/20 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApproving
              ? <Loader2 size={12} className="animate-spin" />
              : <Check size={12} />}
            Approve
          </button>
        )}
        <button
          onClick={() => onDelete(review)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                     font-medium font-display text-slate-400 hover:text-red-400
                     hover:bg-red-400/10 border border-border-base
                     hover:border-red-400/20 transition-colors ml-auto"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function ReviewsPage() {
  const dispatch = useAppDispatch()
  const toast    = useToast()

  const reviews = useAppSelector(selectPendingReviews) as ReviewListItem[]
  const isLoading = useAppSelector(selectReviewsLoading)
  const error = useAppSelector(selectReviewsError) as string | null
  const meta = useAppSelector(selectReviewsMeta) as { page: number; per_page: number; total: number; total_pages: number } | null

  const [activeTab,    setActiveTab]    = useState<'pending' | 'approved'>('pending')
  const [page,         setPage]         = useState(1)
  const [approvingId,  setApprovingId]  = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ReviewListItem | null>(null)
  const [isDeleting,   setIsDeleting]   = useState(false)

  useEffect(() => {
    dispatch(fetchPendingReviews({ page, per_page: 10 }))
  }, [dispatch, page])

  async function handleApprove(id: number) {
    setApprovingId(id)
    try {
      await dispatch(approveReview(id)).unwrap()
      toast.success('Review approved and published')
    } catch {
      toast.error('Failed to approve review')
    } finally {
      setApprovingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await dispatch(deleteReview(deleteTarget.id)).unwrap()
      toast.success('Review deleted')
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete review')
    } finally {
      setIsDeleting(false)
    }
  }

  const pendingCount = meta?.total ?? reviews.length

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span>Admin</span>
        <ChevronRight size={12} />
        <span className="text-slate-300">Reviews</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Reviews</h1>
          <p className="text-slate-400 text-sm mt-1 font-body">
            Moderate customer product reviews
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold font-display
                           bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
            {pendingCount} pending approval
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {(['pending', 'approved'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(1) }}
            className={`px-4 py-2 rounded-full text-xs font-medium font-display
                        transition-colors border capitalize
                        ${activeTab === tab
                          ? 'bg-brand-muted text-violet-400 border-violet-500/30'
                          : 'text-slate-400 border-border-base hover:text-slate-200'}`}
          >
            {tab === 'pending' ? `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` : 'Approved'}
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
            onClick={() => dispatch(fetchPendingReviews({ page, per_page: 10 }))}
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
            <div key={i} className="h-40 bg-surface-hover rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && reviews.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare size={44} className="text-slate-700 mb-4" />
          <p className="text-slate-300 font-semibold font-display mb-1">
            No {activeTab} reviews
          </p>
          <p className="text-slate-500 text-sm font-body">
            {activeTab === 'pending'
              ? 'All reviews have been moderated'
              : 'No approved reviews yet'}
          </p>
        </div>
      )}

      {/* Reviews grid */}
      {!isLoading && !error && reviews.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            {reviews.map(review => (
              <ReviewCard
                key={review.id}
                review={review}
                onApprove={handleApprove}
                onDelete={setDeleteTarget}
                isApproving={approvingId === review.id}
              />
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
                  onClick={() => setPage(p => p - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white
                             hover:bg-surface-hover disabled:opacity-30 transition-colors"
                >
                  ←
                </button>
                <span className="text-xs text-slate-500 px-2 font-body">
                  {page} / {meta.total_pages}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= meta.total_pages}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white
                             hover:bg-surface-hover disabled:opacity-30 transition-colors"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDeleteModal
          review={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}