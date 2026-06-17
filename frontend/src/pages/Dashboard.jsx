import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import client from '../api/client'
import Navbar from '../components/Navbar'
import SummaryCard from '../components/SummaryCard'
import AlertsPanel from '../components/AlertsPanel'
import { formatMoney, MONTH_NAMES } from '../utils/format'
import styles from './Dashboard.module.css'

// Fallback palette for categories that have no color set.
const FALLBACK_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4',
  '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#3b82f6',
]
const UNCATEGORIZED_COLOR = '#94a3b8'

export default function Dashboard() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [budget, setBudget] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [forecast, setForecast] = useState(null)
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')

      const [budgetRes, expRes, fcRes, alertRes] = await Promise.allSettled([
        client.get(`/budgets/${month}/${year}`),
        client.get('/expenses', { params: { month, year } }),
        client.get(`/forecast/${month}/${year}`),
        client.get('/alerts'),
      ])

      if (!active) return

      let failed = false

      // Budget: a 404 is expected (no budget yet) and must NOT be an error.
      if (budgetRes.status === 'fulfilled') {
        setBudget(budgetRes.value.data)
      } else if (budgetRes.reason?.response?.status === 404) {
        setBudget(null)
      } else {
        failed = true
      }

      if (expRes.status === 'fulfilled') setExpenses(expRes.value.data)
      else failed = true

      if (fcRes.status === 'fulfilled') setForecast(fcRes.value.data)
      else failed = true

      if (alertRes.status === 'fulfilled') {
        setAlerts(alertRes.value.data.filter((a) => !a.is_read))
      } else {
        failed = true
      }

      if (failed) {
        setError('Something went wrong loading your dashboard. Please try again.')
      }
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [month, year])

  // Map category id -> {name, color} for labelling charts.
  const categoryMeta = useMemo(() => {
    const map = {}
    const cats = budget?.categories ?? []
    cats.forEach((c, i) => {
      map[c.id] = {
        name: c.name,
        color: c.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      }
    })
    return map
  }, [budget])

  // Spending grouped by category (for the pie chart).
  const spendingByCategory = useMemo(() => {
    const totals = {}
    expenses.forEach((e) => {
      const key = e.category_id ?? 'uncategorized'
      totals[key] = (totals[key] || 0) + Number(e.amount || 0)
    })
    return Object.entries(totals).map(([key, value]) => {
      const meta = categoryMeta[key]
      return {
        name: meta?.name ?? 'Uncategorized',
        value: Math.round(value),
        color: meta?.color ?? UNCATEGORIZED_COLOR,
      }
    })
  }, [expenses, categoryMeta])

  // Allocated vs spent per budget category (for the bar chart).
  const allocatedVsSpent = useMemo(() => {
    const cats = budget?.categories ?? []
    return cats.map((c, i) => {
      const spent = expenses
        .filter((e) => e.category_id === c.id)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0)
      return {
        name: c.name,
        allocated: Math.round(Number(c.allocated_amount || 0)),
        spent: Math.round(spent),
        color: c.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      }
    })
  }, [budget, expenses])

  if (loading) {
    return (
      <div className={styles.shell}>
        <Navbar />
        <div className={styles.center}>
          <div className={styles.spinner} />
          <p>Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  const totalBudget = Number(budget?.total_amount || 0)
  const spentSoFar = Number(forecast?.spending_so_far || 0)
  const remaining = totalBudget - spentSoFar
  const projectedBalance = Number(forecast?.projected_balance || 0)
  const totalIncome = Number(forecast?.total_income || 0)

  return (
    <div className={styles.shell}>
      <Navbar />
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>Dashboard</h1>
          <p>
            Overview for {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        {!budget ? (
          <>
            <div className={styles.emptyCard}>
              <h2>No budget for this month yet</h2>
              <p>
                Create a monthly budget to start tracking your spending,
                categories, and forecasts.
              </p>
              <Link className={styles.cta} to="/budget">
                Create a budget
              </Link>
            </div>
            <AlertsPanel alerts={alerts} onChange={(n) => setAlerts(alerts.slice(0, n))} />
          </>
        ) : (
          <>
            <div className={styles.cards}>
              <SummaryCard label="Total Budget" value={totalBudget} />
              <SummaryCard label="Spent So Far" value={spentSoFar} />
              <SummaryCard
                label="Remaining"
                value={remaining}
                valueColor={remaining < 0 ? '#dc2626' : undefined}
              />
              <SummaryCard
                label="Projected Balance"
                value={projectedBalance}
                valueColor={projectedBalance >= 0 ? '#16a34a' : '#dc2626'}
              />
              <SummaryCard label="Total Income" value={totalIncome} />
            </div>

            <div className={styles.section}>
              <AlertsPanel
                alerts={alerts}
                onChange={(n) => setAlerts(alerts.slice(0, n))}
              />
            </div>

            <div className={styles.charts}>
              <div className={styles.chartCard}>
                <h3>Spending by Category</h3>
                {spendingByCategory.length === 0 ? (
                  <div className={styles.chartEmpty}>No expenses logged yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={spendingByCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={(d) => d.name}
                      >
                        {spendingByCategory.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatMoney(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className={styles.chartCard}>
                <h3>Allocated vs Spent</h3>
                {allocatedVsSpent.length === 0 ? (
                  <div className={styles.chartEmpty}>No categories yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={allocatedVsSpent}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => formatMoney(v)} />
                      <Legend />
                      <Bar dataKey="allocated" name="Allocated" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="spent" name="Spent" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
