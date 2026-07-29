// src/utils/formatCurrency.ts
export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style:              'currency',
    currency:           'INR',
    maximumFractionDigits: 0,
  }).format(amount)

