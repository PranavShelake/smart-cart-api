// src/styles/tokens.ts
//
// ─── SMART CART — GLOBAL DESIGN TOKENS ───────────────────────
// Single source of truth for every color, spacing, and typography
// value used across the entire application.
//
// WHY BOTH tokens.ts + tailwind.config.ts?
//   tokens.ts  → used in TypeScript logic (conditional styles, JS calcs)
//   tailwind   → generates className strings (bg-brand-surface, text-brand-muted)
//   Changing ONE color here updates BOTH your logic AND your Tailwind classes.
//
// USAGE:
//   import { tokens } from '@/styles/tokens'
//   style={{ background: tokens.colors.surface.card }}  ← in JS
//   className="bg-brand-surface text-brand-muted"        ← in Tailwind
// ─────────────────────────────────────────────────────────────

export const tokens = {
  colors: {
    // ── Backgrounds ──────────────────────────────────────────
    surface: {
      base:     '#0b1326',   // body background — deepest layer
      nav:      '#0b1326',   // sidebar + topbar (glass effect on top)
      card:     'rgba(30, 41, 59, 0.70)',   // glass-panel cards
      elevated: 'rgba(51, 65, 85, 0.80)',   // modals, dropdowns
      overlay:  'rgba(0, 0, 0, 0.60)',      // modal backdrop
      hover:    'rgba(255, 255, 255, 0.05)',
      active:   'rgba(139, 92, 246, 0.15)', // active nav item bg
    },

    // ── Borders ───────────────────────────────────────────────
    border: {
      base:    'rgba(255, 255, 255, 0.08)',
      subtle:  'rgba(255, 255, 255, 0.06)',
      strong:  'rgba(255, 255, 255, 0.18)',
      focus:   '#7c3aed',  // violet-600
    },

    // ── Brand / Accent ────────────────────────────────────────
    brand: {
      primary:     '#7c3aed',   // violet-600
      primaryHover: '#6d28d9',  // violet-700
      secondary:   '#3b82f6',   // blue-500
      gradient:    'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
    },

    // ── Text ──────────────────────────────────────────────────
    text: {
      primary:   '#dae2fd',   // main body text
      secondary: '#94a3b8',   // slate-400
      muted:     '#64748b',   // slate-500
      disabled:  '#334155',   // slate-700
      inverse:   '#ffffff',
      accent:    '#a78bfa',   // violet-400 — active nav, highlights
    },

    // ── Semantic States ───────────────────────────────────────
    status: {
      success:     '#34d399',   // green-400
      successBg:   'rgba(52, 211, 153, 0.10)',
      warning:     '#fbbf24',   // yellow-400
      warningBg:   'rgba(251, 191, 36, 0.10)',
      danger:      '#f87171',   // red-400
      dangerBg:    'rgba(248, 113, 113, 0.10)',
      info:        '#60a5fa',   // blue-400
      infoBg:      'rgba(96, 165, 250, 0.10)',
    },

    // ── Stock-specific (Products module) ─────────────────────
    stock: {
      inStock:    { text: '#34d399', bg: 'rgba(52, 211, 153, 0.10)' },
      lowStock:   { text: '#fbbf24', bg: 'rgba(251, 191, 36, 0.10)' },
      outOfStock: { text: '#f87171', bg: 'rgba(248, 113, 113, 0.10)' },
    },

    // ── Role colors ───────────────────────────────────────────
    roles: {
      ADMIN:    { text: '#a78bfa', bg: 'rgba(167, 139, 250, 0.10)' },
      SELLER:   { text: '#60a5fa', bg: 'rgba(96, 165, 250, 0.10)'  },
      CUSTOMER: { text: '#34d399', bg: 'rgba(52, 211, 153, 0.10)'  },
    },
  },

  // ── Typography ────────────────────────────────────────────
  fonts: {
    display: '"Space Grotesk", sans-serif',  // headings, labels, nav
    body:    '"Inter", sans-serif',           // paragraphs, inputs
  },

  // ── Glass effects (mirrors index.css CSS vars) ────────────
  glass: {
    nav:      'rgba(11, 19, 38, 0.80)',
    card:     'rgba(30, 41, 59, 0.70)',
    elevated: 'rgba(51, 65, 85, 0.80)',
    blur:     '20px',
    blurLg:   '40px',
  },

  // ── Layout constants ──────────────────────────────────────
  layout: {
    sidebarWidth: '280px',
    topbarHeight: '72px',
  },

  // ── Radius ────────────────────────────────────────────────
  radius: {
    sm:   '8px',
    md:   '12px',
    lg:   '16px',
    xl:   '20px',
    full: '9999px',
  },
} as const

// ── Type exports ─────────────────────────────────────────────
export type TokenColors   = typeof tokens.colors
export type StatusColor   = keyof typeof tokens.colors.status
export type RoleKey       = keyof typeof tokens.colors.roles

// ── Helper: get stock status label + token key ────────────────
export function getStockStatus(stock: number, threshold: number): {
  label: string
  tokenKey: 'inStock' | 'lowStock' | 'outOfStock'
} {
  if (stock === 0)          return { label: 'Out of Stock', tokenKey: 'outOfStock' }
  if (stock <= threshold)   return { label: 'Low Stock',    tokenKey: 'lowStock'   }
  return                           { label: 'In Stock',     tokenKey: 'inStock'    }
}