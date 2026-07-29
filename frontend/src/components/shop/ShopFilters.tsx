import { useState } from 'react'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { useAppSelector } from '../../store'
import { selectCategories } from '../../store/slices/categoriesSlice'
import type { ProductFilterParams } from '../../types'

interface Props {
  filters:   ProductFilterParams
  onChange:  (patch: Partial<ProductFilterParams> & { category_slug?: string }) => void
  onReset:   () => void
  isActive:  boolean
}

const SORT_OPTIONS = [
  { value: 'created_at_desc', label: 'Newest First'  },
  { value: 'price_asc',       label: 'Price: Low → High' },
  { value: 'price_desc',      label: 'Price: High → Low' },
  { value: 'rating_desc',     label: 'Top Rated'     },
  { value: 'sales_desc',      label: 'Best Selling'  },
]

const PRICE_RANGES = [
  { label: 'Under ₹500',         min: 0,     max: 500   },
  { label: '₹500 – ₹2,000',     min: 500,   max: 2000  },
  { label: '₹2,000 – ₹10,000',  min: 2000,  max: 10000 },
  { label: '₹10,000 – ₹50,000', min: 10000, max: 50000 },
  { label: 'Above ₹50,000',      min: 50000, max: undefined },
]

// ── Collapsible section ───────────────────────────────────────
function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title:       string
  children:    React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-border-subtle pb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full py-2
                   text-xs font-semibold text-slate-400 font-display
                   uppercase tracking-wider hover:text-white transition-colors"
      >
        {title}
        {open
          ? <ChevronDown  size={13} />
          : <ChevronRight size={13} />}
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  )
}

export default function ShopFilters({ filters, onChange, onReset, isActive }: Props) {
  const categories = useAppSelector(selectCategories)

  const selectedPriceRange = PRICE_RANGES.find(
    r => r.min === filters.min_price && r.max === filters.max_price
  )

  function handleCategoryClick(id: number, name: string) {
    const isSame = filters.category_id === id
    onChange({
      category_id:   isSame ? undefined : id,
      category_slug: isSame ? undefined : name,
    })
  }

  function handlePriceRange(min: number, max: number | undefined) {
    const isSame = filters.min_price === min && filters.max_price === max
    onChange({
      min_price: isSame ? undefined : min,
      max_price: isSame ? undefined : max,
    })
  }

  return (
    <aside className="glass-panel rounded-2xl p-5 space-y-4 sticky top-24">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white font-display">Filters</h2>
        {isActive && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] text-violet-400
                       hover:text-violet-300 transition-colors font-body"
          >
            <RotateCcw size={11} />
            Reset all
          </button>
        )}
      </div>

      {/* Sort */}
      <FilterSection title="Sort By">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange({ sort: opt.value as ProductFilterParams['sort'] })}
            className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl
                        text-xs transition-colors font-body
                        ${filters.sort === opt.value
                          ? 'bg-brand-muted text-violet-400 border border-violet-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-surface-hover'}`}
          >
            {filters.sort === opt.value && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
            )}
            {opt.label}
          </button>
        ))}
      </FilterSection>

      {/* Categories */}
      <FilterSection title="Category">
        <button
          onClick={() => onChange({ category_id: undefined, category_slug: undefined })}
          className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl
                      text-xs transition-colors font-body
                      ${!filters.category_id
                        ? 'bg-brand-muted text-violet-400 border border-violet-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-surface-hover'}`}
        >
          All Categories
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id, cat.name)}
            className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl
                        text-xs transition-colors font-body
                        ${filters.category_id === cat.id
                          ? 'bg-brand-muted text-violet-400 border border-violet-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-surface-hover'}`}
          >
            {filters.category_id === cat.id && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
            )}
            {cat.name}
          </button>
        ))}
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price Range">
        {PRICE_RANGES.map(range => (
          <button
            key={range.label}
            onClick={() => handlePriceRange(range.min, range.max)}
            className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl
                        text-xs transition-colors font-body
                        ${selectedPriceRange?.label === range.label
                          ? 'bg-brand-muted text-violet-400 border border-violet-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-surface-hover'}`}
          >
            {selectedPriceRange?.label === range.label && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
            )}
            {range.label}
          </button>
        ))}
      </FilterSection>

      {/* Availability */}
      <FilterSection title="Availability">
        {[
          { label: 'All Products',  value: undefined },
          { label: 'In Stock Only', value: true      },
        ].map(opt => (
          <button
            key={opt.label}
            onClick={() => onChange({ in_stock: opt.value })}
            className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl
                        text-xs transition-colors font-body
                        ${filters.in_stock === opt.value
                          ? 'bg-brand-muted text-violet-400 border border-violet-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-surface-hover'}`}
          >
            {filters.in_stock === opt.value && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
            )}
            {opt.label}
          </button>
        ))}
      </FilterSection>

      {/* Featured */}
      <FilterSection title="Collection" defaultOpen={false}>
        {[
          { label: 'All Products', value: undefined },
          { label: 'Featured',     value: true      },
        ].map(opt => (
          <button
            key={opt.label}
            onClick={() => onChange({ is_featured: opt.value })}
            className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl
                        text-xs transition-colors font-body
                        ${filters.is_featured === opt.value
                          ? 'bg-brand-muted text-violet-400 border border-violet-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-surface-hover'}`}
          >
            {filters.is_featured === opt.value && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
            )}
            {opt.label}
          </button>
        ))}
      </FilterSection>
    </aside>
  )
}