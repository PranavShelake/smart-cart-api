import { useState } from 'react'
import { ChevronLeft, ChevronRight, Package, ZoomIn } from 'lucide-react'

interface GalleryImage {
  id:         number
  image_url:  string
  alt_text:   string | null
  is_primary: boolean
}

interface Props {
  images:      GalleryImage[]
  productName: string
}

export default function ImageGallery({ images, productName }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [zoomed,    setZoomed]    = useState(false)

  // Sort so primary image comes first
  const sorted = [...images].sort((a, b) =>
    a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1
  )

  const active = sorted[activeIdx]

  function prev() {
    setActiveIdx(i => (i === 0 ? sorted.length - 1 : i - 1))
  }

  function next() {
    setActiveIdx(i => (i === sorted.length - 1 ? 0 : i + 1))
  }

  // ── No images fallback ────────────────────────────────────
  if (sorted.length === 0) {
    return (
      <div className="glass-panel rounded-2xl aspect-square flex items-center
                      justify-center">
        <div className="flex flex-col items-center gap-3">
          <Package size={56} className="text-slate-700" />
          <p className="text-xs text-slate-600 font-body">No image available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Main image ─────────────────────────────────────── */}
      <div className="relative glass-panel rounded-2xl overflow-hidden
                      aspect-square group">
        <img
          src={active.image_url}
          alt={active.alt_text ?? productName}
          className="w-full h-full object-cover transition-transform duration-500
                     group-hover:scale-105 cursor-zoom-in"
          onClick={() => setZoomed(true)}
        />

        {/* Zoom hint */}
        <div className="absolute top-3 right-3 p-2 rounded-xl bg-black/30
                        backdrop-blur-sm opacity-0 group-hover:opacity-100
                        transition-opacity">
          <ZoomIn size={16} className="text-white" />
        </div>

        {/* Navigation arrows — only when multiple images */}
        {sorted.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9
                         rounded-xl bg-black/30 backdrop-blur-sm flex items-center
                         justify-center text-white hover:bg-black/50
                         transition-colors opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9
                         rounded-xl bg-black/30 backdrop-blur-sm flex items-center
                         justify-center text-white hover:bg-black/50
                         transition-colors opacity-0 group-hover:opacity-100"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {sorted.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2
                          flex items-center gap-1.5">
            {sorted.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`rounded-full transition-all duration-200
                            ${i === activeIdx
                              ? 'w-5 h-1.5 bg-white'
                              : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Thumbnail strip ─────────────────────────────────── */}
      {sorted.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIdx(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden
                          border-2 transition-all duration-200
                          ${i === activeIdx
                            ? 'border-violet-500 opacity-100'
                            : 'border-border-base opacity-50 hover:opacity-80'}`}
            >
              <img
                src={img.image_url}
                alt={img.alt_text ?? `${productName} ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Zoom lightbox ───────────────────────────────────── */}
      {zoomed && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50
                     flex items-center justify-center p-6 cursor-zoom-out
                     animate-fade-in"
          onClick={() => setZoomed(false)}
        >
          <img
            src={active.image_url}
            alt={active.alt_text ?? productName}
            className="max-w-full max-h-full object-contain rounded-2xl
                       shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          {/* Navigation in lightbox */}
          {sorted.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev() }}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11
                           rounded-xl bg-white/10 flex items-center justify-center
                           text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next() }}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-11 h-11
                           rounded-xl bg-white/10 flex items-center justify-center
                           text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}