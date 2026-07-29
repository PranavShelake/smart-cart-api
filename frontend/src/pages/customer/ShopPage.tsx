import { useEffect, useState, useMemo } from 'react'
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store'
import {
  fetchProducts,
  setFilters,
  setPage,
  resetFilters,
  selectProducts,
  selectProductsMeta,
  selectProductsLoading,
  selectProductsError,
  selectProductFilters,
} from '../../store/slices/productsSlice'
import {
  fetchCategories,
} from '../../store/slices/categoriesSlice'
import { useDebounce } from '../../hooks/useDebounce'
import ProductCard from '../../components/shop/ProductCard'
import ShopFilters from '../../components/shop/ShopFilters'
import type { ProductFilterParams } from '../../types'

// ── Skeleton ──────────────────────────────────────────────────
function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="glass-panel rounded-2xl overflow-hidden animate-pulse">
          <div className="aspect-square bg-surface-hover" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-surface-hover rounded-lg w-3/4" />
            <div className="h-3 bg-surface-hover rounded-lg w-1/2" />
            <div className="h-5 bg-surface-hover rounded-lg w-1/3" />
            <div className="h-9 bg-surface-hover rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────
function EmptyProducts({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="w-20 h-20 rounded-3xl bg-surface-hover flex items-center
                      justify-center mb-6 text-4xl">
        🛍️
      </div>
      <h3 className="text-lg font-bold text-white font-display mb-2">
        No products found
      </h3>
      <p className="text-slate-400 text-sm font-body mb-6 max-w-xs">
        Try adjusting your filters or search term
      </p>
      <button
        onClick={onReset}
        className="bg-brand-primary hover:bg-brand-hover text-white px-5 py-2.5
                   rounded-xl text-sm font-medium font-display transition-colors"
      >
        Clear Filters
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function ShopPage() {
  const dispatch  = useAppDispatch()
  const products  = useAppSelector(selectProducts)
  const meta      = useAppSelector(selectProductsMeta)
  const isLoading = useAppSelector(selectProductsLoading)
  const error     = useAppSelector(selectProductsError)
  const filters   = useAppSelector(selectProductFilters)

  const [searchInput,    setSearchInput]    = useState(filters.search ?? '')
  const [showMobFilters, setShowMobFilters] = useState(false)

  const debouncedSearch = useDebounce(searchInput, 400)

  // ── Fetch on mount + filter change ────────────────────────
  useEffect(() => {
    dispatch(fetchCategories())
  }, [dispatch])

  useEffect(() => {
    dispatch(fetchProducts({
      ...filters,
      per_page: 9,
      search:   debouncedSearch || undefined,
    }))
  }, [dispatch, filters, debouncedSearch])

  // ── Filter helpers ────────────────────────────────────────
  const isFiltersActive = useMemo(() =>
    !!(filters.category_id || filters.min_price || filters.max_price ||
       filters.in_stock || filters.is_featured ||
       filters.sort !== 'created_at_desc' || debouncedSearch),
  [filters, debouncedSearch])

  function handleFilterChange(
    patch: Partial<ProductFilterParams> & { category_slug?: string }
  ) {
    dispatch(setFilters({ ...patch, page: 1 }))
  }

  function handleReset() {
    setSearchInput('')
    dispatch(resetFilters())
  }

  const currentPage = filters.page ?? 1
  const from = ((currentPage - 1) * 9) + 1
  const to   = Math.min(currentPage * 9, meta.total)

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Shop</h1>
          <p className="text-slate-400 text-sm mt-1 font-body">
            {meta.total > 0
              ? `${meta.total} products available`
              : 'Explore our collection'}
          </p>
        </div>

        {/* Mobile filter toggle */}
        <button
          onClick={() => setShowMobFilters(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                     font-medium font-display border border-border-base
                     text-slate-400 hover:text-white hover:border-border-strong
                     transition-colors lg:hidden"
        >
          <SlidersHorizontal size={15} />
          Filters
          {isFiltersActive && (
            <span className="w-2 h-2 rounded-full bg-violet-500" />
          )}
        </button>
      </div>

      {/* ── Search bar ─────────────────────────────────────── */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2
                                      text-slate-500 pointer-events-none" />
        <input
          className="w-full bg-surface-base border border-border-base rounded-2xl
                     pl-11 pr-12 py-3 text-sm text-text-primary
                     placeholder:text-slate-600 font-body focus:outline-none
                     focus:border-brand-primary focus:ring-1
                     focus:ring-violet-500/20 transition-colors"
          placeholder="Search products, brands, categories…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            className="absolute right-4 top-1/2 -translate-y-1/2
                       text-slate-500 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Active filter chips ────────────────────────────── */}
      {isFiltersActive && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.category_id && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full
                             bg-violet-500/15 border border-violet-500/25
                             text-xs text-violet-300 font-display">
              Category
              <button
                onClick={() => handleFilterChange({ category_id: undefined, category_slug: undefined })}
                className="hover:text-white transition-colors"
              >
                <X size={11} />
              </button>
            </span>
          )}
          {(filters.min_price != null || filters.max_price != null) && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full
                             bg-violet-500/15 border border-violet-500/25
                             text-xs text-violet-300 font-display">
              Price range
              <button
                onClick={() => handleFilterChange({ min_price: undefined, max_price: undefined })}
                className="hover:text-white transition-colors"
              >
                <X size={11} />
              </button>
            </span>
          )}
          {filters.in_stock && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full
                             bg-violet-500/15 border border-violet-500/25
                             text-xs text-violet-300 font-display">
              In Stock
              <button
                onClick={() => handleFilterChange({ in_stock: undefined })}
                className="hover:text-white transition-colors"
              >
                <X size={11} />
              </button>
            </span>
          )}
          {filters.is_featured && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full
                             bg-violet-500/15 border border-violet-500/25
                             text-xs text-violet-300 font-display">
              Featured
              <button
                onClick={() => handleFilterChange({ is_featured: undefined })}
                className="hover:text-white transition-colors"
              >
                <X size={11} />
              </button>
            </span>
          )}
          <button
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-violet-400
                       transition-colors font-body underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Main layout — sidebar + grid ───────────────────── */}
      <div className="grid grid-cols-4 gap-6 items-start">

        {/* Left sidebar — filters */}
        <div className="col-span-1 hidden lg:block">
          <ShopFilters
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
            isActive={isFiltersActive}
          />
        </div>

        {/* Right — product grid */}
        <div className="col-span-4 lg:col-span-3">

          {/* Results info */}
          {!isLoading && meta.total > 0 && (
            <p className="text-xs text-slate-500 font-body mb-4">
              Showing{' '}
              <span className="text-slate-300">{from}–{to}</span>
              {' '}of{' '}
              <span className="text-slate-300">{meta.total}</span> products
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-slate-400 text-sm mb-4 font-body">{error}</p>
              <button
                onClick={() => dispatch(fetchProducts({ ...filters, per_page: 9 }))}
                className="bg-brand-primary hover:bg-brand-hover text-white px-4 py-2
                           rounded-xl text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Loading */}
          {isLoading && <ProductGridSkeleton />}

          {/* Empty */}
          {!isLoading && !error && products.length === 0 && (
            <EmptyProducts onReset={handleReset} />
          )}

          {/* Grid */}
          {!isLoading && !error && products.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-5">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 pt-6
                                border-t border-border-base">
                  <p className="text-xs text-slate-500 font-body">
                    Page{' '}
                    <span className="text-slate-300">{currentPage}</span>
                    {' '}of{' '}
                    <span className="text-slate-300">{meta.totalPages}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => dispatch(setPage(currentPage - 1))}
                      className="p-2 rounded-lg text-slate-400 hover:text-white
                                 hover:bg-surface-hover disabled:opacity-30
                                 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                      .filter(p =>
                        p === 1 || p === meta.totalPages ||
                        Math.abs(p - currentPage) <= 1
                      )
                      .map((p, idx, arr) => (
                        <>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span key={`e-${p}`}
                                  className="text-slate-600 text-xs px-1">
                              …
                            </span>
                          )}
                          <button
                            key={p}
                            onClick={() => dispatch(setPage(p))}
                            className={`w-8 h-8 rounded-lg text-xs font-medium
                                        transition-colors
                                        ${p === currentPage
                                          ? 'bg-brand-muted text-violet-400 font-semibold'
                                          : 'text-slate-400 hover:text-white hover:bg-surface-hover'
                                        }`}
                          >
                            {p}
                          </button>
                        </>
                      ))}

                    <button
                      disabled={currentPage === meta.totalPages}
                      onClick={() => dispatch(setPage(currentPage + 1))}
                      className="p-2 rounded-lg text-slate-400 hover:text-white
                                 hover:bg-surface-hover disabled:opacity-30
                                 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showMobFilters && (
        <div className="fixed inset-0 bg-surface-overlay backdrop-blur-sm z-50
                        flex items-end lg:hidden animate-fade-in">
          <div className="glass-panel-elevated w-full rounded-t-3xl p-6
                          max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white font-display">Filters</h3>
              <button
                onClick={() => setShowMobFilters(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <ShopFilters
              filters={filters}
              onChange={(patch) => { handleFilterChange(patch); setShowMobFilters(false) }}
              onReset={() => { handleReset(); setShowMobFilters(false) }}
              isActive={isFiltersActive}
            />
          </div>
        </div>
      )}
    </div>
  )
}