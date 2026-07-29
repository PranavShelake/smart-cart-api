import { useState } from 'react'
import { Tag, X, Loader2 } from 'lucide-react'
import { ordersApi } from '../../api/ordersApi'
import type { CouponValidation } from '../../types'

interface Props {
  subtotal:  number
  onApply:   (coupon: { code: string; discount: number }) => void
  onRemove:  () => void
  applied:   { code: string; discount: number } | null
}

export default function CouponInput({ subtotal, onApply, onRemove, applied }: Props) {
  const [code,      setCode]      = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result,    setResult]    = useState<CouponValidation | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  async function handleApply() {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data } = await ordersApi.validateCoupon(trimmed, subtotal)
      const validation = data.data

      if (validation.valid && validation.discount_amount != null) {
        setResult(validation)
        onApply({ code: trimmed, discount: validation.discount_amount })
        setCode('')
      } else {
        setError(validation.message || 'Invalid coupon code')
      }
    } catch {
      setError('Failed to validate coupon. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleRemove() {
    setResult(null)
    setError(null)
    setCode('')
    onRemove()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleApply()
  }

  // ── Applied state ─────────────────────────────────────────
  if (applied) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-400 font-display uppercase tracking-wider">
          Coupon
        </p>
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl
                        bg-green-400/10 border border-green-400/20">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-green-400" />
            <span className="text-sm font-medium text-green-400 font-display">
              {applied.code}
            </span>
            <span className="text-xs text-green-400/70 font-body">
              applied
            </span>
          </div>
          <button
            onClick={handleRemove}
            className="text-green-400/60 hover:text-green-400 transition-colors p-0.5"
            title="Remove coupon"
          >
            <X size={14} />
          </button>
        </div>

        {result?.discount_amount && (
          <p className="text-xs text-green-400 font-body">
            🎉 You save ₹{result.discount_amount.toLocaleString('en-IN')}!
          </p>
        )}
      </div>
    )
  }

  // ── Input state ───────────────────────────────────────────
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-400 font-display uppercase tracking-wider">
        Coupon Code
      </p>

      <div className="flex gap-2">
        <input
          className="flex-1 bg-surface-base border border-border-base rounded-xl
                     px-3 py-2.5 text-sm text-text-primary placeholder:text-slate-600
                     font-body focus:outline-none focus:border-brand-primary
                     focus:ring-1 focus:ring-violet-500/20 transition-colors uppercase"
          placeholder="Enter coupon code"
          value={code}
          onChange={e => { setCode(e.target.value); setError(null) }}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          onClick={handleApply}
          disabled={isLoading || !code.trim()}
          className="bg-brand-primary hover:bg-brand-hover text-white px-4 py-2.5
                     rounded-xl text-sm font-medium font-display transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2
                     whitespace-nowrap"
        >
          {isLoading
            ? <><Loader2 size={14} className="animate-spin" /> Checking…</>
            : 'Apply'
          }
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg
                        bg-red-400/10 border border-red-400/20">
          <X size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400 font-body">{error}</p>
        </div>
      )}
    </div>
  )
}