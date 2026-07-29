interface Props {
  rating:    number   // 0–5, supports decimals
  count?:    number   // review count
  size?:     'sm' | 'md'
  showCount?: boolean
}

export default function StarRating({
  rating,
  count,
  size = 'md',
  showCount = true,
}: Props) {
  const starSize  = size === 'sm' ? 'text-[11px]' : 'text-sm'
  const countSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <div className="flex items-center gap-1.5">
      {/* Stars */}
      <div className={`flex items-center gap-0.5 ${starSize}`}>
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i + 1 <= Math.floor(rating)
          const half   = !filled && i < rating && rating % 1 >= 0.5

          return (
            <span
              key={i}
              className={
                filled ? 'text-yellow-400' :
                half   ? 'text-yellow-400 opacity-60' :
                         'text-slate-700'
              }
            >
              ★
            </span>
          )
        })}
      </div>

      {/* Rating number */}
      <span className={`text-slate-400 font-body ${countSize}`}>
        {rating > 0 ? rating.toFixed(1) : '—'}
      </span>

      {/* Review count */}
      {showCount && count != null && (
        <span className={`text-slate-600 font-body ${countSize}`}>
          ({count})
        </span>
      )}
    </div>
  )
}