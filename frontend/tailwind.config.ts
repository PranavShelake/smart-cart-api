// tailwind.config.ts
// ─────────────────────────────────────────────────────────────
// Extends Tailwind with Smart Cart design tokens.
// Every key here generates a Tailwind class:
//   brand.primary → bg-brand-primary, text-brand-primary, border-brand-primary
//   surface.card  → bg-surface-card
//   text.muted    → text-brand-muted
//
// WHY extend instead of replace?
//   We keep all default Tailwind utilities (slate, gray, violet etc.)
//   AND add our own named tokens on top. Best of both worlds.
// ─────────────────────────────────────────────────────────────

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── Colors ───────────────────────────────────────────
      colors: {
        // Surface backgrounds
        surface: {
          base:     '#0b1326',
          card:     'rgba(30, 41, 59, 0.70)',
          elevated: 'rgba(51, 65, 85, 0.80)',
          hover:    'rgba(255, 255, 255, 0.05)',
          active:   'rgba(139, 92, 246, 0.15)',
          overlay:  'rgba(0, 0, 0, 0.60)',
        },
        // Brand accent
        brand: {
          primary:  '#7c3aed',
          hover:    '#6d28d9',
          secondary:'#3b82f6',
          muted:    'rgba(139, 92, 246, 0.15)',
        },
        // Text
        'text-primary':   '#dae2fd',
        'text-secondary': '#94a3b8',
        'text-muted':     '#64748b',
        'text-accent':    '#a78bfa',
        // Border
        border: {
          base:   'rgba(255, 255, 255, 0.08)',
          subtle: 'rgba(255, 255, 255, 0.06)',
          strong: 'rgba(255, 255, 255, 0.18)',
        },
        // Semantic
        success: '#34d399',
        warning: '#fbbf24',
        danger:  '#f87171',
      },

      // ── Typography ────────────────────────────────────────
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body:    ['"Inter"', 'sans-serif'],
      },

      // ── Layout ────────────────────────────────────────────
      width: {
        sidebar: '280px',
      },
      height: {
        topbar: '72px',
      },
      spacing: {
        sidebar: '280px',
        topbar:  '72px',
      },

      // ── Border Radius ─────────────────────────────────────
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },

      // ── Animations ────────────────────────────────────────
      animation: {
        'pulse-glow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in':   'slideIn 0.2s ease-out',
        'fade-in':    'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}