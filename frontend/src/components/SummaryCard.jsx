import { formatMoney } from '../utils/format'
import styles from './SummaryCard.module.css'

// A single overview metric card. `value` is a number formatted as money.
// `valueColor` optionally overrides the value text color (e.g. green/red).
export default function SummaryCard({ label, value, valueColor }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value} style={valueColor ? { color: valueColor } : undefined}>
        {formatMoney(value)}
      </span>
    </div>
  )
}
