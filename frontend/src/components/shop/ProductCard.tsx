import { useState } from 'react'
import { ShoppingCart, Package, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store'
import { addToCart } from '../../store/slices/cartSlice'
import { selectIsAuthenticated, selectPrimaryRole } from '../../store/slices/authSlice'
import { useToast } from '../../store/slices/toastSlice'
import { formatCurrency } from '../../utils/formatCurrency'
import StarRating from './StarRating'
import type { ProductListItem } from '../../types'

interface Props {
  product: ProductListItem
}

export default function ProductCard({ product }: Props) {
  const dispatch        = useAppDispatch()
  const navigate        = useNavigate()
  const toast           = useToast()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const role            = useAppSelector(selectPrimaryRole)

  const [isAdding, setIsAdding] = useState(false)
  const [hovered,  setHovered]  = useState(false)

  const discount = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : null

  async function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation()

    if (!isAuthenticated || role !== 'CUSTOMER') {
      toast.error('Please log in as a customer to add items to cart')
      navigate('/login')
      return
    }

    if (product.stock === 0) {
      toast.error('This product is out of stock')
      return
    }

    setIsAdding(true)
    try {
      await dispatch(addToCart({
        product_id: product.id,
        quantity:   1,
      })).unwrap()
      toast.success(`"${product.name}" added to cart`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add to cart'
      toast.error(msg)
    } finally {
      setIsAdding(false)
    }
  }

  function handleCardClick() {
    navigate(`/shop/${product.slug}`)
  }

  const isOutOfStock = product.stock === 0

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="glass-panel rounded-2xl overflow-hidden cursor-pointer
                 transition-all duration-300 hover:border-violet-500/30
                 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-0.5
                 group flex flex-col"
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-surface-hover aspect-square">
        {product.primary_image ? (
          <img
            src={product.primary_image}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500
                        ${hovered ? 'scale-110' : 'scale-100'}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={40} className="text-slate-700" />
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {discount && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold font-display
                             bg-red-500 text-white">
              -{discount}%
            </span>
          )}
          {product.is_featured && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold font-display
                             bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
              ★ Featured
            </span>
          )}
          {isOutOfStock && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold font-display
                             bg-slate-800/80 text-slate-400 border border-slate-700">
              Out of Stock
            </span>
          )}
        </div>

        {/* Quick view button — appears on hover */}
        <div className={`absolute inset-0 flex items-center justify-center
                         bg-black/20 backdrop-blur-[2px] transition-opacity duration-200
                         ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={handleCardClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl
                       bg-white/10 border border-white/20 text-white text-xs
                       font-medium font-display backdrop-blur-sm
                       hover:bg-white/20 transition-colors"
          >
            <Eye size={14} />
            View Details
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">

        {/* Name */}
        <h3 className="text-sm font-semibold text-white font-display leading-snug
                       line-clamp-2 group-hover:text-violet-300 transition-colors">
          {product.name}
        </h3>

        {/* Rating */}
        <StarRating
          rating={product.average_rating}
          count={product.total_reviews}
          size="sm"
        />

        {/* Price row */}
        <div className="flex items-end gap-2 mt-auto pt-1">
          <div className="flex flex-col">
            {product.compare_at_price && (
              <span className="text-xs text-slate-500 line-through font-body">
                {formatCurrency(product.compare_at_price)}
              </span>
            )}
            <span className="text-base font-bold text-white font-display">
              {formatCurrency(product.price)}
            </span>
          </div>
        </div>

        {/* Add to cart button */}
        <button
          onClick={handleAddToCart}
          disabled={isAdding || isOutOfStock}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                      text-xs font-semibold font-display transition-all duration-200
                      ${isOutOfStock
                        ? 'bg-surface-hover text-slate-600 cursor-not-allowed border border-border-base'
                        : 'bg-brand-primary hover:bg-brand-hover text-white hover:shadow-md hover:shadow-violet-500/25'
                      }
                      disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          <ShoppingCart size={14} />
          {isAdding       ? 'Adding…'        :
           isOutOfStock   ? 'Out of Stock'   :
           'Add to Cart'}
        </button>
      </div>
    </div>
  )
}