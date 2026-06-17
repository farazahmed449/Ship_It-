// Format a numeric value as PKR money with thousands separators, e.g. "Rs 50,000".
export function formatMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 'Rs 0'
  const sign = n < 0 ? '-' : ''
  return `${sign}Rs ${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

// Month names for headings.
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
