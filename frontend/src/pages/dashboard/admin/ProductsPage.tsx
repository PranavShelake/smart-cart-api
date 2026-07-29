import { useEffect, useState, useMemo } from 'react'
import {
  Plus, Search, ChevronRight, Package,
  AlertCircle, RotateCcw, ChevronLeft, ChevronDown,Pencil, Trash2, 
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../../store'
import {
  fetchProducts, createProduct, updateProduct,
  deleteProduct, setFilters, setPage, resetFilters,
  selectProducts, selectProductsMeta,
  selectProductsLoading, selectProductsError, selectProductFilters,
} from '../../../store/slices/productsSlice'
import {
  fetchCategories,
  selectCategories,
} from '../../../store/slices/categoriesSlice'
import { useToast } from '../../../store/slices/toastSlice'
import { useDebounce } from '../../../hooks/useDebounce'
import { formatCurrency } from '../../../utils/formatCurrency'
import type {
  ProductListItem,
  ProductCreatePayload,
  ProductUpdatePayload,
  ProductFilterParams,
} from '../../../types'

// ── Helpers ───────────────────────────────────────────────────

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

function getStockStatus(item: ProductListItem): StockStatus {
  if (item.stock === 0)   return 'out_of_stock'
  if (item.stock <= 5)    return 'low_stock'
  return 'in_stock'
}

function StockBadge({ item }: { item: ProductListItem }) {
  const status = getStockStatus(item)
  if (status === 'out_of_stock')
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-medium font-display
                       bg-red-400/10 text-red-400">
        Out of Stock
      </span>
    )
  if (status === 'low_stock')
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-medium font-display
                       bg-yellow-400/10 text-yellow-400">
        Low Stock ({item.stock})
      </span>
    )
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium font-display
                     bg-green-400/10 text-green-400">
      In Stock
    </span>
  )
}

// ── Table Skeleton ────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 bg-surface-hover rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

// ── Stats Cards ───────────────────────────────────────────────

interface StatCardProps {
  label:  string
  value:  number
  icon:   React.ReactNode
  accent: string
}

function StatCard({ label, value, icon, accent }: StatCardProps) {
  return (
    <div className="glass-panel rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white font-display">{value}</p>
        <p className="text-xs text-slate-400 font-body">{label}</p>
      </div>
    </div>
  )
}

// ── Add / Edit Modal ──────────────────────────────────────────

interface ProductModalProps {
  mode:       'add' | 'edit'
  initial?:   ProductListItem | null
  categories: { id: number; name: string }[]
  onClose:    () => void
  onSave:     (payload: ProductCreatePayload | ProductUpdatePayload, id?: number) => void
  isSaving:   boolean
}

function ProductModal({
  mode, initial, categories, onClose, onSave, isSaving,
}: ProductModalProps) {
  const [name,              setName]              = useState(initial?.name              ?? '')
  const [sku,               setSku]               = useState('')
  const [categoryId,        setCategoryId]        = useState<number | ''>(initial?.category_id ?? '')
  const [price,             setPrice]             = useState(initial?.price             ?? 0)
  const [compareAtPrice,    setCompareAtPrice]    = useState(initial?.compare_at_price  ?? '')
  const [shortDescription,  setShortDescription]  = useState('')
  const [description,       setDescription]       = useState('')
  const [stock,             setStock]             = useState(initial?.stock             ?? 0)
  const [lowStockThreshold, setLowStockThreshold] = useState(5)
  const [isActive,          setIsActive]          = useState(true)
  const [isFeatured,        setIsFeatured]        = useState(initial?.is_featured       ?? false)
  const [errors,            setErrors]            = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())  e.name  = 'Name is required'
    if (price <= 0)    e.price = 'Price must be greater than 0'
    if (stock < 0)     e.stock = 'Stock cannot be negative'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const payload: ProductCreatePayload = {
      name:                name.trim(),
      sku:                 sku.trim()   || undefined,
      category_id:         categoryId   || undefined,
      price,
      compare_at_price:    compareAtPrice !== '' ? Number(compareAtPrice) : undefined,
      short_description:   shortDescription.trim() || undefined,
      description:         description.trim()      || undefined,
      stock,
      low_stock_threshold: lowStockThreshold,
      is_active:           isActive,
      is_featured:         isFeatured,
    }
    onSave(payload, initial?.id)
  }

  const inputCls = (field: string) =>
    `w-full bg-surface-base border rounded-xl px-3 py-2.5 text-sm text-text-primary
     placeholder:text-slate-600 font-body focus:outline-none focus:ring-1
     focus:ring-violet-500/20 transition-colors
     ${errors[field] ? 'border-red-500/60' : 'border-border-base focus:border-brand-primary'}`

  return (
    <div className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-50
                    flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel-elevated rounded-2xl w-full max-w-xl
                      shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-base">
          <h2 className="text-base font-semibold text-white font-display">
            {mode === 'add' ? 'Add Product' : 'Edit Product'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 font-body">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5
                               font-display uppercase tracking-wider">
              Product Name *
            </label>
            <input
              className={inputCls('name')}
              placeholder="Enter product name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* SKU + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                 font-display uppercase tracking-wider">SKU</label>
              <input
                className={inputCls('sku')}
                placeholder="e.g. PROD-001"
                value={sku}
                onChange={e => setSku(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                 font-display uppercase tracking-wider">Category</label>
              <div className="relative">
                <select
                  className="w-full bg-surface-base border border-border-base rounded-xl
                             px-3 py-2.5 text-sm text-text-primary focus:outline-none
                             focus:border-brand-primary transition-colors appearance-none
                             cursor-pointer font-body"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">No Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2
                                                   text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Price + Compare At */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                 font-display uppercase tracking-wider">Price (₹) *</label>
              <input
                type="number" min={0}
                className={inputCls('price')}
                placeholder="0"
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
              />
              {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                 font-display uppercase tracking-wider">Compare At (₹)</label>
              <input
                type="number" min={0}
                className={inputCls('compare_at_price')}
                placeholder="Original price"
                value={compareAtPrice}
                onChange={e => setCompareAtPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5
                               font-display uppercase tracking-wider">Short Description</label>
            <input
              className={inputCls('short_description')}
              placeholder="Brief product summary"
              value={shortDescription}
              onChange={e => setShortDescription(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5
                               font-display uppercase tracking-wider">Description</label>
            <textarea
              rows={3}
              className={`${inputCls('description')} resize-none`}
              placeholder="Full product description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Stock + Threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                 font-display uppercase tracking-wider">Stock *</label>
              <input
                type="number" min={0}
                className={inputCls('stock')}
                placeholder="0"
                value={stock}
                onChange={e => setStock(Number(e.target.value))}
              />
              {errors.stock && <p className="text-red-400 text-xs mt-1">{errors.stock}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5
                                 font-display uppercase tracking-wider">Low Stock At</label>
              <input
                type="number" min={0}
                className={inputCls('low_stock_threshold')}
                placeholder="5"
                value={lowStockThreshold}
                onChange={e => setLowStockThreshold(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setIsActive(v => !v)}
                className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer
                            ${isActive ? 'bg-violet-600' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow
                                  transition-transform
                                  ${isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-slate-300 font-body">Active</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setIsFeatured(v => !v)}
                className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer
                            ${isFeatured ? 'bg-violet-600' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow
                                  transition-transform
                                  ${isFeatured ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-slate-300 font-body">Featured</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border-base">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="btn-primary px-5 py-2 rounded-xl text-sm disabled:opacity-50
                       disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving…' : mode === 'add' ? 'Add Product' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────

function DeleteModal({
  product,
  onClose,
  onConfirm,
  isDeleting,
}: {
  product:    ProductListItem
  onClose:    () => void
  onConfirm:  () => void
  isDeleting: boolean
}) {
  return (
    <div className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-50
                    flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel-elevated rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-400/10 flex items-center justify-center">
            <AlertCircle size={22} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white font-display mb-1">
              Delete Product?
            </h3>
            <p className="text-sm text-slate-400 font-body">
              Are you sure you want to delete{' '}
              <span className="text-white font-medium">{product.name}</span>?
              This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 w-full pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-slate-400 border border-border-base
                         rounded-xl hover:text-white hover:border-border-strong transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-xl
                         hover:bg-red-500/30 border border-red-500/30 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export default function ProductsPage() {
  const dispatch   = useAppDispatch()
  const toast      = useToast()

  const products   = useAppSelector(selectProducts)
  const meta       = useAppSelector(selectProductsMeta)
  const isLoading  = useAppSelector(selectProductsLoading)
  const error      = useAppSelector(selectProductsError)
  const filters    = useAppSelector(selectProductFilters)
  const categories = useAppSelector(selectCategories)

  // ── Local UI state ─────────────────────────────────────────
  const [searchInput,   setSearchInput]   = useState(filters.search ?? '')
  const [stockFilter,   setStockFilter]   = useState<'all' | 'in_stock' | 'low' | 'out'>('all')
  const [showModal,     setShowModal]     = useState(false)
  const [editTarget,    setEditTarget]    = useState<ProductListItem | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<ProductListItem | null>(null)
  const [isSaving,      setIsSaving]      = useState(false)
  const [isDeleting,    setIsDeleting]    = useState(false)
  const [selected,      setSelected]      = useState<Set<number>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<{ id: number; slug: string; name: string } | null>(null)

  const debouncedSearch = useDebounce(searchInput, 400)

  // ── Fetch on mount + filter changes ───────────────────────
  useEffect(() => {
    dispatch(fetchCategories())
  }, [dispatch])

  useEffect(() => {
    dispatch(fetchProducts({ ...filters, search: debouncedSearch || undefined }))
  }, [dispatch, filters, debouncedSearch])

  // ── Stats (computed from fetched list) ─────────────────────
  const stats = useMemo(() => ({
    total:      meta.total,
    active:     products.filter(p => p.stock > 0).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    featured:   products.filter(p => p.is_featured).length,
  }), [products, meta.total])

  // ── Filter helpers ─────────────────────────────────────────
  const isFiltersActive =
    !!filters.search || !!selectedCategory || stockFilter !== 'all' ||
    filters.sort !== 'created_at_desc'

  function handleReset() {
    setSearchInput('')
    setStockFilter('all')
    setSelectedCategory(null)   
    dispatch(resetFilters())
  }

  // ── Filtered products (stock filter is client-side) ────────
  const displayedProducts = useMemo(() => {
    if (stockFilter === 'all') return products
    if (stockFilter === 'in_stock')  return products.filter(p => p.stock > 5)
    if (stockFilter === 'low')       return products.filter(p => p.stock > 0 && p.stock <= 5)
    if (stockFilter === 'out')       return products.filter(p => p.stock === 0)
    return products
  }, [products, stockFilter])

  // ── Bulk select ────────────────────────────────────────────
  function toggleAll() {
    if (selected.size === displayedProducts.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(displayedProducts.map(p => p.id)))
    }
  }

  function toggleOne(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── CRUD handlers ──────────────────────────────────────────
  async function handleSave(
    payload: ProductCreatePayload | ProductUpdatePayload,
    id?: number
  ) {
    setIsSaving(true)
    try {
      if (id) {
        await dispatch(updateProduct({ id, payload })).unwrap()
        toast.success('Product updated successfully')
      } else {
        await dispatch(createProduct(payload as ProductCreatePayload)).unwrap()
        toast.success('Product created successfully')
      }
      setShowModal(false)
      setEditTarget(null)
      dispatch(fetchProducts(filters))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await dispatch(deleteProduct(deleteTarget.id)).unwrap()
      toast.success(`"${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
      dispatch(fetchProducts(filters))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleToggleStatus(product: ProductListItem) {
  try {
    await dispatch(updateProduct({
      id:      product.id,
      payload: { is_active: !product.is_active },
    })).unwrap()
      toast.success('Status updated')
      dispatch(fetchProducts(filters))
    } catch {
      toast.error('Failed to update status')
    }
  }

  async function handleToggleFeatured(product: ProductListItem) {
    try {
      await dispatch(updateProduct({
        id:      product.id,
        payload: { is_featured: !product.is_featured },
      })).unwrap()
      dispatch(fetchProducts(filters))
    } catch {
      toast.error('Failed to update featured status')
    }
  }

  // ── Pagination ─────────────────────────────────────────────
  const currentPage = filters.page ?? 1
  const from = ((currentPage - 1) * (filters.per_page ?? 10)) + 1
  const to   = Math.min(currentPage * (filters.per_page ?? 10), meta.total)

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span>Admin</span>
        <ChevronRight size={12} />
        <span className="text-slate-300">Products</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Products</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your product catalog</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true) }}
          className="bg-brand-primary hover:bg-brand-hover text-white px-4 py-2
                     rounded-xl flex items-center gap-2 text-sm font-medium
                     font-display transition-colors"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* ── Stats Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Products"
          value={stats.total}
          icon={<Package size={18} className="text-violet-400" />}
          accent="bg-violet-400/10"
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={<span className="w-2.5 h-2.5 rounded-full bg-green-400 block" />}
          accent="bg-green-400/10"
        />
        <StatCard
          label="Out of Stock"
          value={stats.outOfStock}
          icon={<AlertCircle size={18} className="text-red-400" />}
          accent="bg-red-400/10"
        />
        <StatCard
          label="Featured"
          value={stats.featured}
          icon={<span className="text-yellow-400 text-base">★</span>}
          accent="bg-yellow-400/10"
        />
      </div>

      {/* ── Filters Bar ────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="bg-surface-base border border-border-base rounded-xl pl-9 pr-4 py-2
                         text-sm text-text-primary placeholder:text-slate-600 w-60 font-body
                         focus:outline-none focus:border-brand-primary focus:ring-1
                         focus:ring-violet-500/20 transition-colors"
              placeholder="Search products…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="relative">
            <select
              className="bg-surface-base border border-border-base rounded-xl px-3 py-2 pr-8
                        text-sm text-text-primary focus:outline-none focus:border-brand-primary
                        transition-colors appearance-none cursor-pointer font-body"
              value={selectedCategory?.id ?? ''}
              onChange={e => {
                if (!e.target.value) {
                  setSelectedCategory(null)
                  dispatch(setFilters({ category_id: undefined, category_slug: undefined }))
                } else {
                  const cat = categories.find(c => c.id === Number(e.target.value))
                  if (cat) {
  setSelectedCategory({ id: cat.id, slug: cat.slug, name: cat.name })
  dispatch(setFilters({ category_id: undefined, category_slug: cat.name }))
}
                }
              }}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2
                                              text-slate-500 pointer-events-none" />
          </div>

          {/* Stock filter */}
          <div className="relative">
            <select
              className="bg-surface-base border border-border-base rounded-xl px-3 py-2 pr-8
                         text-sm text-text-primary focus:outline-none focus:border-brand-primary
                         transition-colors appearance-none cursor-pointer font-body"
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value as typeof stockFilter)}
            >
              <option value="all">All Stock</option>
              <option value="in_stock">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2
                                               text-slate-500 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              className="bg-surface-base border border-border-base rounded-xl px-3 py-2 pr-8
                         text-sm text-text-primary focus:outline-none focus:border-brand-primary
                         transition-colors appearance-none cursor-pointer font-body"
              value={filters.sort ?? 'created_at_desc'}
              onChange={e =>
                dispatch(setFilters({ sort: e.target.value as ProductFilterParams['sort'] }))
              }
            >
              <option value="created_at_desc">Newest</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
              <option value="rating_desc">Top Rated</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2
                                               text-slate-500 pointer-events-none" />
          </div>

          {/* Reset */}
          {isFiltersActive && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-400
                         transition-colors font-body"
            >
              <RotateCcw size={13} />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-400/10 flex items-center
                          justify-center mb-4">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => dispatch(fetchProducts(filters))}
            className="bg-brand-primary hover:bg-brand-hover text-white px-4 py-2
                       rounded-xl text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border-base">
              <tr>
                {/* Checkbox */}
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-border-base accent-violet-600 cursor-pointer"
                    checked={selected.size === displayedProducts.length && displayedProducts.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th className="text-left text-[11px] font-semibold text-slate-500 uppercase
                               tracking-wider px-4 py-4 font-display">Product</th>
                <th className="text-left text-[11px] font-semibold text-slate-500 uppercase
                               tracking-wider px-4 py-4 font-display">Category</th>
                <th className="text-left text-[11px] font-semibold text-slate-500 uppercase
                               tracking-wider px-4 py-4 font-display">Price</th>
                <th className="text-left text-[11px] font-semibold text-slate-500 uppercase
                               tracking-wider px-4 py-4 font-display">Stock</th>
                <th className="text-left text-[11px] font-semibold text-slate-500 uppercase
                               tracking-wider px-4 py-4 font-display">Status</th>
                <th className="text-left text-[11px] font-semibold text-slate-500 uppercase
                               tracking-wider px-4 py-4 font-display">Featured</th>
                <th className="px-4 py-4 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {isLoading ? (
                <tr>
                  <td colSpan={8}>
                    <TableSkeleton />
                  </td>
                </tr>
              ) : displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center
                                      justify-center mb-4">
                        <Package size={24} className="text-slate-600" />
                      </div>
                      <p className="text-slate-400 text-sm">No products found</p>
                    </div>
                  </td>
                </tr>
              ) : displayedProducts.map(product => {
                const catName = categories.find(c => c.id === product.category_id)?.name ?? '—'
                return (
                  <tr key={product.id}
                      className="hover:bg-surface-hover transition-colors">

                    {/* Checkbox */}
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        className="rounded border-border-base accent-violet-600 cursor-pointer"
                        checked={selected.has(product.id)}
                        onChange={() => toggleOne(product.id)}
                      />
                    </td>

                    {/* Product */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {product.primary_image ? (
                          <img
                            src={product.primary_image}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-surface-hover flex-shrink-0
                                          flex items-center justify-center">
                            <Package size={16} className="text-slate-600" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-text-primary font-display
                                        leading-snug">
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-500 font-body mt-0.5">
                            #{product.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4 text-sm text-slate-400 font-body">
                      {selectedCategory ? selectedCategory.name : '—'}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-4">
                      {product.compare_at_price && (
                        <p className="text-xs text-slate-500 line-through font-body">
                          {formatCurrency(product.compare_at_price)}
                        </p>
                      )}
                      <p className="text-sm text-text-primary font-medium font-body">
                        {formatCurrency(product.price)}
                      </p>
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-4">
                      <StockBadge item={product} />
                    </td>

                    {/* Status toggle */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggleStatus(product)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium font-display
                                    transition-colors
                                    ${product.stock > 0
                                      ? 'bg-green-400/10 text-green-400 hover:bg-green-400/20'
                                      : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700'}`}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Featured */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggleFeatured(product)}
                        title={product.is_featured ? 'Remove from featured' : 'Mark as featured'}
                        className="transition-colors"
                      >
                        <span className={`text-lg ${product.is_featured
                          ? 'text-yellow-400'
                          : 'text-slate-600 hover:text-slate-400'}`}>
                          {product.is_featured ? '★' : '☆'}
                        </span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditTarget(product); setShowModal(true) }}
                          className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors
                                    text-slate-500 hover:text-blue-400"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors
                                    text-slate-500 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {!isLoading && meta.total > 0 && (
            <div className="flex items-center justify-between px-6 py-4
                            border-t border-border-base">
              <p className="text-xs text-slate-500 font-body">
                Showing{' '}
                <span className="text-slate-300">{from}–{to}</span>
                {' '}of{' '}
                <span className="text-slate-300">{meta.total}</span> results
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => dispatch(setPage(currentPage - 1))}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover
                             disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === meta.totalPages ||
                               Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span key={`ellipsis-${p}`}
                              className="text-slate-600 text-xs px-1">…</span>
                      )}
                      <button
                        key={p}
                        onClick={() => dispatch(setPage(p))}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors
                          ${p === currentPage
                            ? 'bg-brand-muted text-violet-400 font-semibold'
                            : 'text-slate-400 hover:text-white hover:bg-surface-hover'}`}
                      >
                        {p}
                      </button>
                    </>
                  ))}
                <button
                  disabled={currentPage === meta.totalPages}
                  onClick={() => dispatch(setPage(currentPage + 1))}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover
                             disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────── */}
      {showModal && (
        <ProductModal
          mode={editTarget ? 'edit' : 'add'}
          initial={editTarget}
          categories={categories}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}