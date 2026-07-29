import { useEffect, useState, useMemo } from 'react'
import {
  ChevronRight, Search, ChevronDown, Eye, RefreshCw,
  AlertCircle, ClipboardList, X, ChevronLeft, Download,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store'
import {
  fetchAllOrders,
  updateOrderState,
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
import { useDebounce } from '../../hooks/useDebounce'
import OrderStatusBadge, {
  ORDER_STATUS_CONFIG,
} from '../../components/orders/OrderStatusBadge'
import OrderDetail from '../../components/orders/OrderDetail'
import type { OrderListItem, OrderStatus } from '../../types'

// ── State machine ─────────────────────────────────────────────

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:          ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:        ['PROCESSING', 'CANCELLED'],
  PROCESSING:       ['SHIPPED', 'CANCELLED'],
  SHIPPED:          ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED:        ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURN_APPROVED', 'RETURN_REJECTED'],
  RETURN_APPROVED:  ['REFUNDED'],
  CANCELLED:        [],
  REFUNDED:         [],
  RETURN_REJECTED:  [],
}

// Map status label → order_state_id (matches your backend)
const STATUS_TO_STATE_ID: Record<OrderStatus, number> = {
  PENDING:          1,
  CONFIRMED:        2,
  PROCESSING:       3,
  SHIPPED:          4,
  OUT_FOR_DELIVERY: 5,
  DELIVERED:        6,
  CANCELLED:        7,
  RETURN_REQUESTED: 8,
  RETURN_APPROVED:  9,
  RETURN_REJECTED:  10,
  REFUNDED:         11,
}

// ── Stat card ─────────────────────────────────────────────────

function StatCard({
  label, value, accent, sub,
}: {
  label:   string
  value:   string | number
  accent:  string
  sub?:    string
}) {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <p className="text-xs text-slate-500 font-body mb-1">{label}</p>
      <p className={`text-2xl font-bold font-display ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 font-body mt-1">{sub}</p>}
    </div>
  )
}

// ── Table skeleton ────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 bg-surface-hover rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

// ── Side panel ────────────────────────────────────────────────

function SidePanel({ onClose }: { onClose: () => void }) {
  const dispatch        = useAppDispatch()
  const toast           = useToast()
  const selectedOrder   = useAppSelector(selectSelectedOrder)
  const isLoadingDetail = useAppSelector(selectIsLoadingDetail)

  const [nextStatus,  setNextStatus]  = useState<OrderStatus | ''>('')
  const [notes,       setNotes]       = useState('')
  const [isUpdating,  setIsUpdating]  = useState(false)

  // Reset state picker when order changes
  useEffect(() => {
    setNextStatus('')
    setNotes('')
  }, [selectedOrder?.id])

  const validNext = selectedOrder
    ? VALID_TRANSITIONS[selectedOrder.status] ?? []
    : []

  async function handleApply() {
    if (!selectedOrder || !nextStatus) return
    setIsUpdating(true)
    try {
      await dispatch(updateOrderState({
        id:      selectedOrder.id,
        payload: {
          order_state_id: STATUS_TO_STATE_ID[nextStatus],
          notes:          notes.trim() || undefined,
        },
      })).unwrap()
      toast.success(`Order moved to ${ORDER_STATUS_CONFIG[nextStatus].label}`)
      // Refresh detail
      dispatch(fetchOrderById(selectedOrder.id))
      setNextStatus('')
      setNotes('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status'
      toast.error(msg)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5
                      border-b border-border-base flex-shrink-0">
        <h2 className="text-sm font-semibold text-white font-display">
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
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoadingDetail ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}
                   className="h-12 bg-surface-hover rounded-xl animate-pulse" />
            ))}
          </div>
        ) : selectedOrder ? (
          <OrderDetail order={selectedOrder} />
        ) : (
          <p className="text-slate-400 text-sm text-center py-12 font-body">
            Select an order to view details
          </p>
        )}
      </div>

      {/* State update section */}
      {selectedOrder && validNext.length > 0 && (
        <div className="px-6 py-5 border-t border-border-base flex-shrink-0
                        space-y-3">
          <p className="text-xs font-semibold text-slate-400 font-display
                         uppercase tracking-wider">
            Update Status
          </p>

          {/* Current status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-body">Current:</span>
            <OrderStatusBadge status={selectedOrder.status} size="sm" />
          </div>

          {/* Next status dropdown */}
          <div className="relative">
            <select
              className="w-full bg-surface-base border border-border-base rounded-xl
                         px-3 py-2.5 text-sm text-text-primary font-body appearance-none
                         focus:outline-none focus:border-brand-primary transition-colors
                         cursor-pointer"
              value={nextStatus}
              onChange={e => setNextStatus(e.target.value as OrderStatus)}
            >
              <option value="">Select next status…</option>
              {validNext.map(s => (
                <option key={s} value={s}>
                  {ORDER_STATUS_CONFIG[s].label}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2
                                               text-slate-500 pointer-events-none" />
          </div>

          {/* Notes */}
          <textarea
            rows={2}
            className="w-full bg-surface-base border border-border-base rounded-xl
                       px-3 py-2.5 text-sm text-text-primary placeholder:text-slate-600
                       font-body focus:outline-none focus:border-brand-primary
                       focus:ring-1 focus:ring-violet-500/20 transition-colors resize-none"
            placeholder="Optional notes…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <button
            onClick={handleApply}
            disabled={!nextStatus || isUpdating}
            className="w-full btn-primary py-2.5 rounded-xl text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Updating…' : 'Apply Status'}
          </button>
        </div>
      )}

      {/* Terminal state message */}
      {selectedOrder && validNext.length === 0 && (
        <div className="px-6 py-4 border-t border-border-base flex-shrink-0">
          <p className="text-xs text-slate-500 font-body text-center">
            This order has reached its final state
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

const ALL_STATUSES: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
  'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'REFUNDED',
]

const DATE_TABS = [
  { label: 'All Time',   value: 'all'   },
  { label: 'Today',      value: 'today' },
  { label: 'This Week',  value: 'week'  },
  { label: 'This Month', value: 'month' },
]

export default function AdminOrdersPage() {
  const dispatch   = useAppDispatch()
  const toast      = useToast()

  const orders     = useAppSelector(selectOrders)
  const total      = useAppSelector(selectOrdersTotal)
  const totalPages = useAppSelector(selectOrdersTotalPages)
  const isLoading  = useAppSelector(selectOrdersLoading)
  const error      = useAppSelector(selectOrdersError)
  const filters    = useAppSelector(selectOrderFilters)
  const selectedOrder = useAppSelector(selectSelectedOrder)

  const [searchInput, setSearchInput] = useState('')
  const [dateTab,     setDateTab]     = useState('all')
  const [panelOpen,   setPanelOpen]   = useState(false)

  const debouncedSearch = useDebounce(searchInput, 400)

  // ── Fetch ─────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchAllOrders({
      page:   filters.page,
      status: filters.status,
      search: debouncedSearch || undefined,
    }))
  }, [dispatch, filters.page, filters.status, debouncedSearch])

  // ── Stats (client-side from current page) ────────────────
  const stats = useMemo(() => {
    const pending    = orders.filter(o => o.status === 'PENDING').length
    const processing = orders.filter(o => o.status === 'PROCESSING').length
    const revenue    = orders
      .filter(o => o.status === 'DELIVERED')
      .reduce((s, o) => s + o.total_price, 0)
    return { total, pending, processing, revenue }
  }, [orders, total])

  // ── Handlers ──────────────────────────────────────────────

  async function handleViewOrder(order: OrderListItem) {
    setPanelOpen(true)
    await dispatch(fetchOrderById(order.id))
  }

  function handleClosePanel() {
    setPanelOpen(false)
    dispatch(clearSelectedOrder())
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
        <span>Admin</span>
        <ChevronRight size={12} />
        <span className="text-slate-300">Orders</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Orders</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage and track all customer orders
          </p>
        </div>
        <button
          onClick={() => toast.success('Export coming soon!')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                     font-medium font-display border border-border-base
                     text-slate-400 hover:text-white hover:border-border-strong
                     transition-colors"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* ── Stats row ───────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Orders"
          value={stats.total}
          accent="text-white"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          accent="text-yellow-400"
          sub="Awaiting confirmation"
        />
        <StatCard
          label="Processing"
          value={stats.processing}
          accent="text-purple-400"
          sub="Being prepared"
        />
        <StatCard
          label="Revenue (Delivered)"
          value={formatCurrency(stats.revenue)}
          accent="text-green-400"
          sub="Current page"
        />
      </div>

      {/* ── Filters bar ─────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2
                                         text-slate-500" />
            <input
              className="bg-surface-base border border-border-base rounded-xl
                         pl-9 pr-4 py-2 text-sm text-text-primary
                         placeholder:text-slate-600 w-64 font-body
                         focus:outline-none focus:border-brand-primary
                         focus:ring-1 focus:ring-violet-500/20 transition-colors"
              placeholder="Search order number…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>

          {/* Status dropdown */}
          <div className="relative">
            <select
              className="bg-surface-base border border-border-base rounded-xl
                         px-3 py-2 pr-8 text-sm text-text-primary font-body
                         appearance-none cursor-pointer focus:outline-none
                         focus:border-brand-primary transition-colors"
              value={filters.status ?? ''}
              onChange={e =>
                dispatch(setOrderFilters({
                  status: e.target.value || null,
                  page:   1,
                }))
              }
            >
              <option value="">All Statuses</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>
                  {ORDER_STATUS_CONFIG[s].label}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2
                                               -translate-y-1/2 text-slate-500
                                               pointer-events-none" />
          </div>
        </div>

        {/* Date tabs */}
        <div className="flex items-center gap-2">
          {DATE_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setDateTab(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-display
                          transition-colors border
                          ${dateTab === tab.value
                            ? 'bg-brand-muted text-violet-400 border-violet-500/30'
                            : 'text-slate-400 border-border-base hover:text-slate-200'
                          }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content area ────────────────────────────────── */}
      <div className={`transition-all duration-300
                       ${panelOpen ? 'mr-[432px]' : ''}`}>

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-400/10 flex items-center
                            justify-center mb-4">
              <AlertCircle size={24} className="text-red-400" />
            </div>
            <p className="text-slate-400 text-sm mb-4 font-body">{error}</p>
            <button
              onClick={() => dispatch(fetchAllOrders({ page: 1 }))}
              className="bg-brand-primary hover:bg-brand-hover text-white px-4 py-2
                         rounded-xl text-sm font-medium transition-colors"
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
                  {['Order', 'Customer', 'Items', 'Total',
                    'Payment', 'Status', 'Date', ''].map(h => (
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
                    <td colSpan={8}><TableSkeleton /></td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex flex-col items-center justify-center
                                      py-20 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-surface-hover
                                        flex items-center justify-center mb-4">
                          <ClipboardList size={24} className="text-slate-600" />
                        </div>
                        <p className="text-slate-400 text-sm font-body">
                          No orders found
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : orders.map(order => (
                  <tr
                    key={order.id}
                    className={`hover:bg-surface-hover transition-colors cursor-pointer
                                ${selectedOrder?.id === order.id
                                  ? 'bg-brand-muted/50'
                                  : ''}`}
                    onClick={() => handleViewOrder(order)}
                  >
                    {/* Order number */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-violet-400
                                       font-display">
                        {order.order_number}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <p className="text-sm text-text-primary font-body">
                        Customer #{order.id}
                      </p>
                    </td>

                    {/* Items */}
                    <td className="px-5 py-4">
                      <span className="px-2 py-1 rounded-lg bg-surface-hover
                                       text-xs text-slate-300 font-display">
                        {order.item_count}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-white font-display">
                        {formatCurrency(order.total_price)}
                      </span>
                    </td>

                    {/* Payment */}
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium font-display
                        ${order.payment_status === 'PAID'
                          ? 'text-green-400'
                          : order.payment_status === 'FAILED'
                            ? 'text-red-400'
                            : 'text-yellow-400'}`}>
                        {order.payment_status}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <OrderStatusBadge
                        status={order.status as OrderStatus}
                        size="sm"
                      />
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4">
                      <span className="text-xs text-slate-500 font-body">
                        {formatDate(order.created_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1"
                           onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="p-1.5 hover:bg-surface-hover rounded-lg
                                     transition-colors text-slate-500
                                     hover:text-blue-400"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="p-1.5 hover:bg-surface-hover rounded-lg
                                     transition-colors text-slate-500
                                     hover:text-violet-400"
                          title="Update State"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {!isLoading && total > 0 && (
              <div className="flex items-center justify-between px-6 py-4
                              border-t border-border-base">
                <p className="text-xs text-slate-500 font-body">
                  Showing{' '}
                  <span className="text-slate-300">{from}–{to}</span>
                  {' '}of{' '}
                  <span className="text-slate-300">{total}</span> orders
                </p>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() =>
                      dispatch(setOrderFilters({ page: currentPage - 1 }))
                    }
                    className="p-2 rounded-lg text-slate-400 hover:text-white
                               hover:bg-surface-hover disabled:opacity-30
                               disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs text-slate-500 px-2 font-body">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      dispatch(setOrderFilters({ page: currentPage + 1 }))
                    }
                    className="p-2 rounded-lg text-slate-400 hover:text-white
                               hover:bg-surface-hover disabled:opacity-30
                               disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Side panel ──────────────────────────────────────── */}
      <div className={`fixed right-0 top-0 h-full w-[420px] z-40
                       glass-panel-elevated border-l border-border-base
                       transform transition-transform duration-300
                       ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <SidePanel onClose={handleClosePanel} />
      </div>
    </div>
  )
}