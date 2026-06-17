import { useEffect, useMemo, useState } from 'react'
import client from '../api/client'
import Navbar from '../components/Navbar'
import MonthYearPicker from '../components/MonthYearPicker'
import SummaryCard from '../components/SummaryCard'
import { MONTH_NAMES } from '../utils/format'
import s from '../styles/page.module.css'

export default function Reports() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const [budget, setBudget] = useState(null)
  const [expenses, setExpenses] = useState([])

  const [generating, setGenerating] = useState(false)
  const [generatedMsg, setGeneratedMsg] = useState('')

  // AI suggestions
  const [loadingAi, setLoadingAi] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [disclaimer, setDisclaimer] = useState('')
  const [aiError, setAiError] = useState('')

  async function loadAll() {
    setLoading(true)
    setError('')
    setGeneratedMsg('')
    const [reportRes, budgetRes, expRes] = await Promise.allSettled([
      client.get(`/reports/${month}/${year}`),
      client.get(`/budgets/${month}/${year}`),
      client.get('/expenses', { params: { month, year } }),
    ])

    if (reportRes.status === 'fulfilled') setReport(reportRes.value.data)
    else setError('Failed to load report. Please try again.')

    if (budgetRes.status === 'fulfilled') setBudget(budgetRes.value.data)
    else setBudget(null) // 404 = no budget; categories simply unavailable

    if (expRes.status === 'fulfilled') setExpenses(expRes.value.data)
    else setExpenses([])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    setSuggestions([])
    setDisclaimer('')
    setAiError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  // Build the categories array (name, allocated, spent) for the AI payload.
  const categoriesData = useMemo(() => {
    const cats = budget?.categories ?? []
    return cats.map((c) => {
      const spent = expenses
        .filter((e) => e.category_id === c.id)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0)
      return {
        name: c.name,
        allocated: Math.round(Number(c.allocated_amount || 0)),
        spent: Math.round(spent),
      }
    })
  }, [budget, expenses])

  async function handleGenerate() {
    setGenerating(true)
    setGeneratedMsg('')
    setError('')
    try {
      await client.post(`/reports/${month}/${year}/generate`)
      const res = await client.get(`/reports/${month}/${year}`)
      setReport(res.data)
      setGeneratedMsg('Report generated and saved.')
    } catch {
      setError('Failed to generate report. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSuggestions() {
    if (!report) return
    setLoadingAi(true)
    setAiError('')
    setSuggestions([])
    setDisclaimer('')
    try {
      const res = await client.post('/ai/suggestions', {
        report_data: {
          monthly_income: report.total_income,
          total_spent: report.total_spent,
          categories: categoriesData,
        },
      })
      setSuggestions(res.data.suggestions || [])
      setDisclaimer(res.data.disclaimer || '')
    } catch (err) {
      setAiError(
        err.response?.data?.detail ||
          'Could not get suggestions. The AI service may be unavailable.',
      )
    } finally {
      setLoadingAi(false)
    }
  }

  return (
    <div className={s.shell}>
      <Navbar />
      <div className={s.content}>
        <div className={s.header}>
          <div>
            <h1>Monthly Report</h1>
            <p>
              {MONTH_NAMES[month - 1]} {year}
            </p>
          </div>
          <MonthYearPicker
            month={month}
            year={year}
            onChange={(m, y) => {
              setMonth(m)
              setYear(y)
            }}
          />
        </div>

        {error && <div className={s.errorBox}>{error}</div>}

        {loading ? (
          <div className={s.center}>
            <div className={s.spinner} />
            <p>Loading report…</p>
          </div>
        ) : (
          <>
            <div className={s.card}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
              >
                <h3 className={s.cardTitle} style={{ margin: 0 }}>Summary</h3>
                <button
                  className={`${s.btn} ${s.btnPrimary}`}
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? 'Generating…' : 'Generate Report'}
                </button>
              </div>
              {generatedMsg && <div className={s.ok}>{generatedMsg}</div>}

              <div
                className={s.cards}
                style={{ marginTop: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
              >
                <SummaryCard label="Total Income" value={report?.total_income || 0} />
                <SummaryCard label="Total Spent" value={report?.total_spent || 0} />
                <SummaryCard
                  label="Total Saved"
                  value={report?.total_saved || 0}
                  valueColor="#16a34a"
                />
              </div>
              {report?.generated_at && (
                <div className={s.muted} style={{ marginTop: 12 }}>
                  Last saved: {new Date(report.generated_at).toLocaleString()}
                </div>
              )}
            </div>

            <div className={s.card}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
              >
                <h3 className={s.cardTitle} style={{ margin: 0 }}>
                  AI Saving Suggestions
                </h3>
                <button
                  className={`${s.btn} ${s.btnSecondary}`}
                  onClick={handleSuggestions}
                  disabled={loadingAi || !report}
                >
                  {loadingAi ? 'Thinking…' : '🤖 Get AI Saving Suggestions'}
                </button>
              </div>

              {aiError && <div className={s.errorBox} style={{ marginTop: 12 }}>{aiError}</div>}

              {suggestions.length > 0 ? (
                <>
                  <ul style={{ marginTop: 14, paddingLeft: 18, lineHeight: 1.7 }}>
                    {suggestions.map((tip, i) => (
                      <li key={i}>
                        <span className={s.badge + ' ' + s.badgeActive} style={{ marginRight: 8 }}>
                          Suggestion
                        </span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                  {disclaimer && <div className={s.disclaimer}>{disclaimer}</div>}
                </>
              ) : (
                !aiError && (
                  <p className={s.muted} style={{ marginTop: 12 }}>
                    Generate suggestions to see AI-powered, non-binding saving tips
                    based on this month's numbers.
                  </p>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
