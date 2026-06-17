import { MONTH_NAMES } from '../utils/format'
import styles from './MonthYearPicker.module.css'

// Controlled month/year selector. Calls onChange(month, year).
export default function MonthYearPicker({ month, year, onChange }) {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = currentYear + 1; y >= currentYear - 5; y--) years.push(y)

  return (
    <div className={styles.picker}>
      <select
        className={styles.select}
        value={month}
        onChange={(e) => onChange(Number(e.target.value), year)}
      >
        {MONTH_NAMES.map((name, i) => (
          <option key={i} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        className={styles.select}
        value={year}
        onChange={(e) => onChange(month, Number(e.target.value))}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}
