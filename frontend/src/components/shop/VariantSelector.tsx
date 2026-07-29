import type { ProductVariant } from '../../types'
import { formatCurrency } from '../../utils/formatCurrency'

interface Props {
  variants:        ProductVariant[]
  selectedId:      number | null
  onSelect:        (variant: ProductVariant) => void
}

// Group variants by type for a clean UI
function groupVariants(variants: ProductVariant[]) {
  const sizes:    ProductVariant[] = []
  const colors:   ProductVariant[] = []
  const others:   ProductVariant[] = []

  variants.forEach(v => {
    if (v.size)       sizes.push(v)
    else if (v.color) colors.push(v)
    else              others.push(v)
  })

  return { sizes, colors, others }
}

interface PillProps {
  label:      string
  selected:   boolean
  disabled:   boolean
  onClick:    () => void
  colorDot?:  string
}

function VariantPill({ label, selected, disabled, onClick, colorDot }: PillProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Out of stock' : label}
      className={`relative px-3.5 py-2 rounded-xl text-xs font-medium font-display
                  border transition-all duration-200 flex items-center gap-2
                  ${selected
                    ? 'bg-brand-muted border-violet-500/50 text-violet-300 shadow-sm shadow-violet-500/20'
                    : disabled
                      ? 'border-border-subtle text-slate-700 cursor-not-allowed'
                      : 'border-border-base text-slate-300 hover:border-border-strong hover:text-white'
                  }`}
    >
      {colorDot && (
        <span
          className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
          style={{ backgroundColor: colorDot }}
        />
      )}
      {label}
      {/* Strikethrough line for out-of-stock */}
      {disabled && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-full h-px bg-slate-700 rotate-[-15deg] absolute" />
        </span>
      )}
    </button>
  )
}

export default function VariantSelector({ variants, selectedId, onSelect }: Props) {
  if (!variants || variants.length === 0) return null

  const { sizes, colors, others } = groupVariants(variants)
  const selected = variants.find(v => v.id === selectedId)

  // Common CSS color names for dots
  const COLOR_MAP: Record<string, string> = {
    black: '#1a1a1a', white: '#ffffff', red: '#ef4444',
    blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
    purple: '#a855f7', pink: '#ec4899', orange: '#f97316',
    gray: '#6b7280', grey: '#6b7280', brown: '#92400e',
    navy: '#1e3a5f', gold: '#d97706', silver: '#9ca3af',
  }

  function getColorDot(colorName: string | null): string | undefined {
    if (!colorName) return undefined
    return COLOR_MAP[colorName.toLowerCase()] ?? colorName
  }

  return (
    <div className="space-y-4">

      {/* Size variants */}
      {sizes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 font-display
                           uppercase tracking-wider">Size</p>
            {selected?.size && (
              <p className="text-xs text-violet-400 font-body">
                Selected: {selected.size}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map(v => (
              <VariantPill
                key={v.id}
                label={v.size ?? ''}
                selected={v.id === selectedId}
                disabled={v.stock === 0}
                onClick={() => onSelect(v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Color variants */}
      {colors.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 font-display
                           uppercase tracking-wider">Color</p>
            {selected?.color && (
              <p className="text-xs text-violet-400 font-body">
                Selected: {selected.color}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {colors.map(v => (
              <VariantPill
                key={v.id}
                label={v.color ?? ''}
                selected={v.id === selectedId}
                disabled={v.stock === 0}
                onClick={() => onSelect(v)}
                colorDot={getColorDot(v.color)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other variants (material, name etc.) */}
      {others.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 font-display
                         uppercase tracking-wider mb-2">Option</p>
          <div className="flex flex-wrap gap-2">
            {others.map(v => (
              <VariantPill
                key={v.id}
                label={v.variant_name ?? v.sku}
                selected={v.id === selectedId}
                disabled={v.stock === 0}
                onClick={() => onSelect(v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Selected variant price diff */}
      {selected && selected.price && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl
                        bg-surface-hover border border-border-subtle">
          <span className="text-xs text-slate-500 font-body">
            Variant price:
          </span>
          <span className="text-sm font-semibold text-white font-display">
            {formatCurrency(selected.price)}
          </span>
          {selected.stock > 0 && selected.stock <= 5 && (
            <span className="ml-auto text-xs text-yellow-400 font-body">
              Only {selected.stock} left!
            </span>
          )}
          {selected.stock === 0 && (
            <span className="ml-auto text-xs text-red-400 font-body">
              Out of stock
            </span>
          )}
        </div>
      )}
    </div>
  )
}