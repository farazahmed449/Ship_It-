import { useEffect, useMemo, useState } from 'react'
import client from '../api/client'
import Navbar from '../components/Navbar'
import MonthYearPicker from '../components/MonthYearPicker'
import { formatMoney, MONTH_NAMES } from '../utils/format'
import s from '../styles/page.module.css'

export default function Budget() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [budget, setBudget] = useState(null)

  // create-budget form
  const [totalAmount, setTotalAmount] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState('')

  // add-category form
  const [cat, setCat] = useState({ name: '', allocated_amount: '', color: '#4f46e5' })
  const [catErrors, setCatErrors] = useState({})
  const [addingCat, setAddingCat] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await client.get(`/budgets/${month}/${year}`)
      setBudget(res.data)
    } catch (err) {
      if (err.response?.status === 404) {
        setBudget(null)
      } else {
        setError('Failed to load budget. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  const allocatedSum = useMemo(
    () =>
      (budget?.categories ?? []).reduce(
        (sum, c) => sum + Number(c.allocated_amount || 0),
        0,
      ),
    [budget],
  )
  const overAllocated = budget && allocatedSum > Number(budget.total_amount || 0)

  async function handleCreateBudget(e) {
    e.preventDefault()
    setCreateErr('')
    const amount = Number(totalAmount)
    if (!totalAmount || Number.isNaN(amount) || amount <= 0) {
      setCreateErr('Enter a total budget amount greater than 0.')
      return
    }
    setCreating(true)
    try {
      await client.post('/budgets', { month, year, total_amount: amount })
      setTotalAmount('')
      await load()
    } catch (err) {
      setCreateErr(err.response?.data?.detail || 'Failed to create budget.')
    } finally {
      setCreating(false)
    }
  }

  function validateCat() {
    const next = {}
    if (!cat.name.trim()) next.name = 'Name is required.'
    const amt = Number(cat.allocated_amount)
    if (cat.allocated_amount === '' || Number.isNaN(amt) || amt < 0)
      next.allocated_amount = 'Enter a valid amount (0 or more).'
    setCatErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleAddCategory(e) {
    e.preventDefault()
    if (!validateCat()) return
    setAddingCat(true)
    try {
      await client.post(`/budgets/${budget.id}/categories`, {
        name: cat.name.trim(),
        allocated_amount: Number(cat.allocated_amount),
        color: cat.color,
      })
      setCat({ name: '', allocated_amount: '', color: '#4f46e5' })
      setCatErrors({})
      await load()
    } catch (err) {
      setCatErrors({ name: err.response?.data?.detail || 'Failed to add category.' })
    } finally {
      setAddingCat(false)
    }
  }

  return (
    <div className={s.shell}>
      <Navbar />
      <div className={s.content}>
        <div className={s.header}>
          <div>
            <h1>Budget</h1>
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
            <p>Loading budget…</p>
          </div>
        ) : !budget ? (
          <div className={s.card}>
            <h3 className={s.cardTitle}>Create Budget</h3>
            <p className={s.muted} style={{ marginTop: -8, marginBottom: 16 }}>
              No budget exists for {MONTH_NAMES[month - 1]} {year}. Set a total to
              get started.
            </p>
            <form className={s.row} onSubmit={handleCreateBudget}>
              <div className={s.field}>
                <label className={s.label}>Total budget amount (Rs)</label>
                <input
                  className={`${s.input} ${createErr ? s.inputError : ''}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="e.g. 50000"
                />
                {createErr && <span className={s.fieldError}>{createErr}</span>}
              </div>
              <button className={`${s.btn} ${s.btnPrimary}`} disabled={creating}>
                {creating ? 'Creating…' : 'Create Budget'}
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Overview</h3>
              <div className={s.row} style={{ gap: 32 }}>
                <div>
                  <div className={s.label}>Total Budget</div>
                  <div className={s.money} style={{ fontSize: '1.4rem' }}>
                    {formatMoney(budget.total_amount)}
                  </div>
                </div>
                <div>
                  <div className={s.label}>Allocated to Categories</div>
                  <div className={s.money} style={{ fontSize: '1.4rem' }}>
                    {formatMoney(allocatedSum)}
                  </div>
                </div>
                <div>
                  <div className={s.label}>Unallocated</div>
                  <div
                    className={s.money}
                    style={{
                      fontSize: '1.4rem',
                      color: overAllocated ? '#dc2626' : '#16a34a',
                    }}
                  >
                    {formatMoney(Number(budget.total_amount || 0) - allocatedSum)}
                  </div>
                </div>
              </div>
              {overAllocated && (
                <div className={s.warn}>
                  ⚠ Your category allocations ({formatMoney(allocatedSum)}) exceed the
                  total budget ({formatMoney(budget.total_amount)}).
                </div>
              )}
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>Categories</h3>
              {(budget.categories ?? []).length === 0 ? (
                <div className={s.empty}>No categories yet. Add one below.</div>
              ) : (
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Allocated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budget.categories.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span
                            className={s.swatch}
                            style={{ background: c.color || '#94a3b8' }}
                          />
                          {c.name}
                        </td>
                        <td>{formatMoney(c.allocated_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>Add Category</h3>
              <form className={s.row} onSubmit={handleAddCategory}>
                <div className={s.field}>
                  <label className={s.label}>Name</label>
                  <input
                    className={`${s.input} ${catErrors.name ? s.inputError : ''}`}
                    value={cat.name}
                    onChange={(e) => setCat({ ...cat, name: e.target.value })}
                    placeholder="e.g. Food"
                  />
                  {catErrors.name && (
                    <span className={s.fieldError}>{catErrors.name}</span>
                  )}
                </div>
                <div className={s.field}>
                  <label className={s.label}>Allocated (Rs)</label>
                  <input
                    className={`${s.input} ${catErrors.allocated_amount ? s.inputError : ''}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={cat.allocated_amount}
                    onChange={(e) =>
                      setCat({ ...cat, allocated_amount: e.target.value })
                    }
                    placeholder="e.g. 10000"
                  />
                  {catErrors.allocated_amount && (
                    <span className={s.fieldError}>{catErrors.allocated_amount}</span>
                  )}
                </div>
                <div className={s.field} style={{ flex: '0 0 auto', minWidth: 0 }}>
                  <label className={s.label}>Color</label>
                  <input
                    className={s.color}
                    type="color"
                    value={cat.color}
                    onChange={(e) => setCat({ ...cat, color: e.target.value })}
                  />
                </div>
                <button className={`${s.btn} ${s.btnPrimary}`} disabled={addingCat}>
                  {addingCat ? 'Adding…' : 'Add Category'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
