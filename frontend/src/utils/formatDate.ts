// src/utils/formatDate.ts
export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-IN', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
// → "06 May 2026, 02:30 PM"

export const formatDateShort = (iso: string): string =>
  new Intl.DateTimeFormat('en-IN', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  }).format(new Date(iso))
// → "06 May 2026"