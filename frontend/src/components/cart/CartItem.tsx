import { useState, useEffect, useCallback } from 'react'
import { Trash2, Package, Minus, Plus } from 'lucide-react'
import { useAppDispatch } from '../../store'
import { updateCartItem, removeCartItem } from '../../store/slices/cartSlice'
import { useToast } from '../../store/slices/toastSlice'
import { formatCurrency } from '../../utils/formatCurrency'
import type { CartItem as CartItemType } from '../../types'

interface Props {
  item: CartItemType
}

// Simple debounce utility — avoids importing lodash
function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: T) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export default function CartItem({ item }: Props) {
  const dispatch = useAppDispatch()
  const toast    = useToast()

  // Local qty for instant UI feedback before API responds
  const [localQty, setLocalQty] = useState(item.quantity)
  const [isRemoving, setIsRemoving] = useState(false)

  // Keep in sync if Redux updates from elsewhere
  useEffect(() => {
    setLocalQty(item.quantity)
  }, [item.quantity])

  // Debounced API call — 500ms after user stops clicking
  const debouncedUpdate = useCallback(
    debounce((itemId: number, qty: number) => {
      dispatch(updateCartItem({ id: itemId, quantity: qty }))
    }, 500),
    [dispatch]
  )

  function handleIncrease() {
    if (localQty >= 50) return
    const next = localQty + 1
    setLocalQty(next)
    debouncedUpdate(item.id, next)
  }

  function handleDecrease() {
    if (localQty <= 1) return
    const next = localQty - 1
    setLocalQty(next)
    debouncedUpdate(item.id, next)
  }

  async function handleRemove() {
    setIsRemoving(true)
    try {
      await dispatch(removeCartItem(item.id)).unwrap()
      toast.success(`"${item.product_name}" removed from cart`)
    } catch {
      toast.error('Failed to remove item')
      setIsRemoving(false)
    }
  }

  return (
    <div className={`glass-panel rounded-2xl p-5 transition-opacity
                     ${isRemoving ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex items-start gap-4">

        {/* Thumbnail */}
        <div className="flex-shrink-0">
          {item.primary_image ? (
            <img
              src={item.primary_image}
              alt={item.product_name}
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-surface-hover flex items-center
                            justify-center">
              <Package size={22} className="text-slate-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">

            {/* Name + variant */}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white font-display
                            leading-snug truncate">
                {item.product_name}
              </p>
              {item.variant_label && (
                <p className="text-xs text-slate-400 font-body mt-0.5">
                  {item.variant_label}
                </p>
              )}
            </div>

            {/* Remove button */}
            <button
              onClick={handleRemove}
              className="flex-shrink-0 p-1.5 hover:bg-surface-hover rounded-lg
                         transition-colors text-slate-500 hover:text-red-400"
              title="Remove item"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* Price row */}
          <div className="flex items-center gap-2 mt-2">
            {/* If price changed, show current (old) price as strikethrough */}
            {item.price_changed && (
              <span className="text-xs text-slate-500 line-through font-body">
                {formatCurrency(item.current_price)}
              </span>
            )}

            <span className="text-sm font-semibold text-white font-body">
              {formatCurrency(item.price_snapshot)}
            </span>

            {/* Price updated badge */}
            {item.price_changed && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium font-display
                               bg-orange-400/10 text-orange-400 border border-orange-400/20">
                Price updated
              </span>
            )}
          </div>

          {/* Bottom row — qty stepper + subtotal */}
          <div className="flex items-center justify-between mt-3">

            {/* Quantity stepper */}
            <div className="flex items-center gap-1 bg-surface-base border
                            border-border-base rounded-xl p-1">
              <button
                onClick={handleDecrease}
                disabled={localQty <= 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg
                           text-slate-400 hover:text-white hover:bg-surface-hover
                           disabled:opacity-30 disabled:cursor-not-allowed
                           transition-colors"
              >
                <Minus size={13} />
              </button>

              <span className="w-8 text-center text-sm font-medium text-white
                               font-display tabular-nums">
                {localQty}
              </span>

              <button
                onClick={handleIncrease}
                disabled={localQty >= 50}
                className="w-7 h-7 flex items-center justify-center rounded-lg
                           text-slate-400 hover:text-white hover:bg-surface-hover
                           disabled:opacity-30 disabled:cursor-not-allowed
                           transition-colors"
              >
                <Plus size={13} />
              </button>
            </div>

            {/* Subtotal */}
            <div className="text-right">
              <p className="text-xs text-slate-500 font-body">Subtotal</p>
              <p className="text-sm font-bold text-white font-display">
                {formatCurrency(item.price_snapshot * localQty)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}