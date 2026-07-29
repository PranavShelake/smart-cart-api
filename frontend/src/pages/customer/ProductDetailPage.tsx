import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Heart, Share2, ChevronRight,
  Truck, Shield, RotateCcw, Star, AlertCircle,
  Minus, Plus, Package,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store'
import { addToCart } from '../../store/slices/cartSlice'
import {
  selectIsAuthenticated,
  selectPrimaryRole,
} from '../../store/slices/authSlice'
import { useToast } from '../../store/slices/toastSlice'
import { formatCurrency } from '../../utils/formatCurrency'
import ImageGallery from '../../components/shop/ImageGallery'
import VariantSelector from '../../components/shop/VariantSelector'
import StarRating from '../../components/shop/StarRating'
import { apiClient } from '../../api/client'
import type { Product, ProductVariant, ApiResponse } from '../../types'

// ── Skeleton ──────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-10 animate-pulse">
      <div className="aspect-square bg-surface-hover rounded-2xl" />
      <div className="space-y-4 pt-2">
        <div className="h-4 bg-surface-hover rounded-lg w-1/4" />
        <div className="h-7 bg-surface-hover rounded-lg w-3/4" />
        <div className="h-4 bg-surface-hover rounded-lg w-1/2" />
        <div className="h-8 bg-surface-hover rounded-lg w-1/3" />
        <div className="h-32 bg-surface-hover rounded-2xl" />
        <div className="h-12 bg-surface-hover rounded-2xl" />
        <div className="h-12 bg-surface-hover rounded-2xl" />
      </div>
    </div>
  )
}

// ── Trust badges ──────────────────────────────────────────────

function TrustBadges() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { icon: <Truck size={16} />,   label: 'Free Delivery',  sub: 'Orders above ₹499' },
        { icon: <Shield size={16} />,  label: 'Secure Payment', sub: '100% protected'     },
        { icon: <RotateCcw size={16} />, label: 'Easy Returns',  sub: '7-day return policy'},
      ].map(badge => (
        <div key={badge.label}
             className="flex flex-col items-center text-center gap-1.5
                        px-3 py-3 rounded-xl bg-surface-hover border border-border-subtle">
          <span className="text-violet-400">{badge.icon}</span>
          <p className="text-xs font-semibold text-white font-display">{badge.label}</p>
          <p className="text-[10px] text-slate-500 font-body">{badge.sub}</p>
        </div>
      ))}
    </div>
  )
}

// ── Reviews section ───────────────────────────────────────────

function ReviewsSection({ productId }: { productId: number }) {
  const [reviews,   setReviews]   = useState<{
    id: number; rating: number; title?: string; body?: string
    user_name: string; created_at: string; helpful_count: number
  }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get(`/products/${productId}/reviews`, { params: { page: 1, per_page: 5 } })
      .then(({ data }) => setReviews(data.data?.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setIsLoading(false))
  }, [productId])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-surface-hover rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <Star size={28} className="text-slate-700 mb-3" />
        <p className="text-slate-400 text-sm font-body">No reviews yet</p>
        <p className="text-slate-600 text-xs mt-1 font-body">
          Be the first to review this product
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reviews.map(review => (
        <div key={review.id}
             className="glass-panel rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white font-display">
                {review.user_name}
              </p>
              <StarRating
                rating={review.rating}
                showCount={false}
                size="sm"
              />
            </div>
            <span className="text-[10px] text-slate-600 font-body flex-shrink-0">
              {new Date(review.created_at).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </span>
          </div>
          {review.title && (
            <p className="text-sm font-medium text-text-primary font-display">
              {review.title}
            </p>
          )}
          {review.body && (
            <p className="text-xs text-slate-400 font-body leading-relaxed">
              {review.body}
            </p>
          )}
          {review.helpful_count > 0 && (
            <p className="text-[10px] text-slate-600 font-body">
              {review.helpful_count} people found this helpful
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export default function ProductDetailPage() {
  const { slug }   = useParams<{ slug: string }>()
  const navigate   = useNavigate()
  const dispatch   = useAppDispatch()
  const toast      = useToast()

  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const role            = useAppSelector(selectPrimaryRole)

  const [product,         setProduct]         = useState<Product | null>(null)
  const [isLoading,       setIsLoading]       = useState(true)
  const [error,           setError]           = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity,        setQuantity]        = useState(1)
  const [isAdding,        setIsAdding]        = useState(false)
  const [activeTab,       setActiveTab]       = useState<'description' | 'specs' | 'reviews'>('description')

  // ── Fetch product ─────────────────────────────────────────
  useEffect(() => {
    if (!slug) return
    setIsLoading(true)
    setError(null)

    apiClient
      .get<ApiResponse<Product>>(`/products/${slug}`)
      .then(({ data }) => {
        setProduct(data.data)
        // Auto-select first in-stock variant
        const firstInStock = data.data.variants?.find(v => v.stock > 0)
        if (firstInStock) setSelectedVariant(firstInStock)
      })
      .catch(() => setError('Product not found or unavailable'))
      .finally(() => setIsLoading(false))
  }, [slug])

  if (!product && isLoading) return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span>Shop</span>
        <ChevronRight size={12} />
        <span className="text-slate-600">Loading…</span>
      </div>
      <DetailSkeleton />
    </div>
  )

  if (error || !product) return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-400/10 flex items-center
                      justify-center mb-4">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <p className="text-slate-400 text-sm mb-4 font-body">
        {error ?? 'Product not found'}
      </p>
      <button
        onClick={() => navigate('/shop')}
        className="bg-brand-primary hover:bg-brand-hover text-white px-4 py-2
                   rounded-xl text-sm font-medium transition-colors"
      >
        Back to Shop
      </button>
    </div>
  )

  // ── Derived values ────────────────────────────────────────
  const activePrice    = selectedVariant?.price ?? product.price
  const comparePrice   = selectedVariant?.compare_at_price ?? product.compare_at_price
  const activeStock    = selectedVariant?.stock ?? product.stock
  const isOutOfStock   = activeStock === 0
  const hasVariants    = product.variants && product.variants.length > 0

  const discount = comparePrice && comparePrice > activePrice
    ? Math.round(((comparePrice - activePrice) / comparePrice) * 100)
    : null

  const maxQty = Math.min(activeStock, 10)

  // ── Add to cart ───────────────────────────────────────────
  async function handleAddToCart() {
    if (!isAuthenticated || role !== 'CUSTOMER') {
      toast.error('Please log in as a customer to add items to cart')
      navigate('/login')
      return
    }
    if (isOutOfStock) return
    if (hasVariants && !selectedVariant) {
      toast.error('Please select a variant first')
      return
    }

    setIsAdding(true)
    try {
      if (!product) return
      await dispatch(addToCart({
        product_id:product.id,
        product_variant_id: selectedVariant?.id ?? null,
        quantity,
      })).unwrap()
      toast.success(`"${product.name}" added to cart`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add to cart'
      toast.error(msg)
    } finally {
      setIsAdding(false)
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied to clipboard!')
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8 animate-fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
        <button
          onClick={() => navigate('/shop')}
          className="hover:text-violet-400 transition-colors"
        >
          Shop
        </button>
        <ChevronRight size={12} />
        <span className="text-slate-300 truncate max-w-xs">{product.name}</span>
      </div>

      {/* ── Main detail section ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-10 items-start">

        {/* Left — Image gallery */}
        <div className="sticky top-24">
          <ImageGallery
            images={product.images ?? []}
            productName={product.name}
          />
        </div>

        {/* Right — Product info */}
        <div className="flex flex-col gap-5">

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            {product.is_featured && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold
                               font-display bg-yellow-400/10 text-yellow-400
                               border border-yellow-400/20">
                ★ Featured
              </span>
            )}
            {discount && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold
                               font-display bg-red-500/15 text-red-400
                               border border-red-500/20">
                {discount}% OFF
              </span>
            )}
            {!isOutOfStock && activeStock <= 5 && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold
                               font-display bg-yellow-400/10 text-yellow-400
                               border border-yellow-400/20">
                Only {activeStock} left!
              </span>
            )}
            {isOutOfStock && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold
                               font-display bg-red-400/10 text-red-400
                               border border-red-400/20">
                Out of Stock
              </span>
            )}
          </div>

          {/* Name */}
          <div>
            <h1 className="text-2xl font-bold text-white font-display leading-snug">
              {product.name}
            </h1>
            {product.sku && (
              <p className="text-xs text-slate-600 font-body mt-1">
                SKU: {product.sku}
              </p>
            )}
          </div>

          {/* Rating */}
          <StarRating
            rating={product.average_rating}
            count={product.total_reviews}
            size="md"
          />

          {/* Price */}
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-white font-display">
              {formatCurrency(activePrice)}
            </span>
            {comparePrice && (
              <span className="text-lg text-slate-500 line-through font-body pb-0.5">
                {formatCurrency(comparePrice)}
              </span>
            )}
            {discount && (
              <span className="text-sm text-green-400 font-semibold font-body pb-0.5">
                Save {formatCurrency(comparePrice! - activePrice)}
              </span>
            )}
          </div>

          {/* Short description */}
          {product.short_description && (
            <p className="text-sm text-slate-400 font-body leading-relaxed
                          border-l-2 border-violet-500/30 pl-3">
              {product.short_description}
            </p>
          )}

          {/* Variants */}
          {hasVariants && (
            <div className="glass-panel rounded-2xl p-4">
              <VariantSelector
                variants={product.variants}
                selectedId={selectedVariant?.id ?? null}
                onSelect={v => { setSelectedVariant(v); setQuantity(1) }}
              />
            </div>
          )}

          {/* Quantity selector */}
          {!isOutOfStock && (
            <div className="flex items-center gap-4">
              <p className="text-xs font-semibold text-slate-400 font-display
                             uppercase tracking-wider">
                Quantity
              </p>
              <div className="flex items-center gap-1 bg-surface-base border
                              border-border-base rounded-xl p-1">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg
                             text-slate-400 hover:text-white hover:bg-surface-hover
                             disabled:opacity-30 disabled:cursor-not-allowed
                             transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center text-sm font-semibold text-white
                                 font-display tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty}
                  className="w-8 h-8 flex items-center justify-center rounded-lg
                             text-slate-400 hover:text-white hover:bg-surface-hover
                             disabled:opacity-30 disabled:cursor-not-allowed
                             transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              <p className="text-xs text-slate-600 font-body">
                {activeStock} available
              </p>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={isAdding || isOutOfStock || (hasVariants && !selectedVariant)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5
                         rounded-xl text-sm font-semibold font-display
                         bg-brand-primary hover:bg-brand-hover text-white
                         transition-all hover:shadow-lg hover:shadow-violet-500/25
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={16} />
              {isAdding         ? 'Adding…'                  :
               isOutOfStock     ? 'Out of Stock'             :
               hasVariants && !selectedVariant ? 'Select a Variant' :
               'Add to Cart'}
            </button>

            <button
              onClick={handleShare}
              className="w-12 h-12 flex items-center justify-center rounded-xl
                         border border-border-base text-slate-400
                         hover:text-white hover:border-border-strong
                         transition-colors flex-shrink-0"
              title="Share product"
            >
              <Share2 size={16} />
            </button>

            <button
              className="w-12 h-12 flex items-center justify-center rounded-xl
                         border border-border-base text-slate-400
                         hover:text-red-400 hover:border-red-400/30
                         transition-colors flex-shrink-0"
              title="Add to wishlist"
            >
              <Heart size={16} />
            </button>
          </div>

          {/* Trust badges */}
          <TrustBadges />
        </div>
      </div>

      {/* ── Tab section ─────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl overflow-hidden">

        {/* Tab headers */}
        <div className="flex border-b border-border-base">
          {([
            { key: 'description', label: 'Description'   },
            { key: 'specs',       label: 'Specifications' },
            { key: 'reviews',     label: `Reviews (${product.total_reviews})` },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-4 text-sm font-medium font-display transition-colors
                          border-b-2 -mb-px
                          ${activeTab === tab.key
                            ? 'text-violet-400 border-violet-500'
                            : 'text-slate-400 border-transparent hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">

          {/* Description */}
          {activeTab === 'description' && (
            <div className="prose prose-invert max-w-none">
              {product.description ? (
                <p className="text-sm text-slate-300 font-body leading-relaxed
                               whitespace-pre-line">
                  {product.description}
                </p>
              ) : (
                <p className="text-slate-500 text-sm font-body">
                  No description available.
                </p>
              )}
            </div>
          )}

          {/* Specs */}
          {activeTab === 'specs' && (
            <div className="space-y-3">
              {[
                { label: 'SKU',      value: product.sku ?? '—'           },
                { label: 'Stock',    value: `${product.stock} units`      },
                { label: 'Category', value: product.category_id ? `#${product.category_id}` : '—' },
                { label: 'Rating',   value: `${product.average_rating}/5 (${product.total_reviews} reviews)` },
              ].map(spec => (
                <div
                  key={spec.label}
                  className="flex items-center justify-between py-2.5 border-b
                             border-border-subtle last:border-0"
                >
                  <span className="text-xs font-semibold text-slate-500
                                   font-display uppercase tracking-wider">
                    {spec.label}
                  </span>
                  <span className="text-sm text-text-primary font-body">
                    {spec.value}
                  </span>
                </div>
              ))}

              {/* Variants as specs */}
              {hasVariants && product.variants.slice(0, 3).map(v => (
                <div key={v.id}
                     className="flex items-center justify-between py-2.5 border-b
                                border-border-subtle last:border-0">
                  <span className="text-xs font-semibold text-slate-500
                                   font-display uppercase tracking-wider">
                    {v.variant_name ?? v.sku}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-primary font-body">
                      {formatCurrency(v.price)}
                    </span>
                    <span className={`text-xs font-body
                      ${v.stock === 0 ? 'text-red-400' :
                        v.stock <= 5  ? 'text-yellow-400' : 'text-green-400'}`}>
                      {v.stock === 0 ? 'Out of stock' : `${v.stock} in stock`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {/* Rating summary */}
              {product.total_reviews > 0 && (
                <div className="flex items-center gap-6 p-4 glass-panel rounded-xl mb-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-white font-display">
                      {product.average_rating.toFixed(1)}
                    </p>
                    <StarRating
                      rating={product.average_rating}
                      showCount={false}
                      size="md"
                    />
                    <p className="text-xs text-slate-500 font-body mt-1">
                      {product.total_reviews} reviews
                    </p>
                  </div>
                  <div className="flex-1">
                    {[5, 4, 3, 2, 1].map(star => (
                      <div key={star}
                           className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-500 font-body w-3">
                          {star}
                        </span>
                        <span className="text-yellow-400 text-xs">★</span>
                        <div className="flex-1 h-1.5 bg-surface-hover rounded-full">
                          <div
                            className="h-full bg-yellow-400/60 rounded-full"
                            style={{
                              width: product.total_reviews > 0
                                ? `${(star / 5) * 100 * (product.average_rating / 5)}%`
                                : '0%'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <ReviewsSection productId={product.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}