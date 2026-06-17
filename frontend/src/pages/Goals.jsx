import { useEffect, useState } from 'react'
import client from '../api/client'
import Navbar from '../components/Navbar'
import { formatMoney } from '../utils/format'
import s from '../styles/page.module.css'

const EMPTY_GOAL = {
  title: '',
  target_amount: '',
  saved_amount: '0',
  deadline: '',
  status: 'active',
}

function GoalCard({ goal, onUpdated }) {
  const [saved, setSaved] = useState(String(goal.saved_amount ?? 0))
  const [busy, setBusy] = useState('')
  const pct = goal.target_amount
    ? Math.min(100, Math.round((Number(goal.saved_amount) / Number(goal.target_amount)) * 100))
    : 0

  const badgeClass =
    goal.status === 'completed'
      ? s.badgeCompleted
      : goal.status === 'abandoned'
        ? s.badgeAbandoned
        : s.badgeActive

  async function saveAmount() {
    const amt = Number(saved)
    if (saved === '' || Number.isNaN(amt) || amt < 0) return
    setBusy('save')
    try {
      const res = await client.put(`/saving-goals/${goal.id}`, { saved_amount: amt })
      onUpdated(res.data)
    } finally {
      setBusy('')
    }
  }

  async function markComplete() {
    setBusy('complete')
    try {
      const res = await client.put(`/saving-goals/${goal.id}`, { status: 'completed' })
      onUpdated(res.data)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className={s.card} style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className={s.cardTitle} style={{ margin: 0 }}>{goal.title}</h3>
        <span className={`${s.badge} ${badgeClass}`}>{goal.status}</span>
      </div>

      <div className={s.progressTrack}>
        <div className={s.progressFill} style={{ width: `${pct}%` }} />
      </div>
      <div className={s.muted}>
        {formatMoney(goal.saved_amount)} of {formatMoney(goal.target_amount)} ({pct}%)
      </div>
      {goal.deadline && (
        <div className={s.muted} style={{ marginTop: 4 }}>
          Deadline: {goal.deadline}
        </div>
      )}

      <div className={s.row} style={{ marginTop: 14 }}>
        <div className={s.field} style={{ minWidth: 100 }}>
          <label className={s.label}>Update saved (Rs)</label>
          <input
            className={s.input}
            type="number"
            min="0"
            step="0.01"
            value={saved}
            onChange={(e) => setSaved(e.target.value)}
          />
        </div>
        <button
          className={`${s.btn} ${s.btnPrimary}`}
          onClick={saveAmount}
          disabled={busy === 'save'}
        >
          {busy === 'save' ? 'Saving…' : 'Save'}
        </button>
        {goal.status !== 'completed' && (
          <button
            className={`${s.btn} ${s.btnSecondary}`}
            onClick={markComplete}
            disabled={busy === 'complete'}
          >
            {busy === 'complete' ? '…' : 'Mark complete'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Goals() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [goals, setGoals] = useState([])

  const [form, setForm] = useState(EMPTY_GOAL)
  const [errors, setErrors] = useState({})
  const [adding, setAdding] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await client.get('/saving-goals')
      setGoals(res.data)
    } catch {
      setError('Failed to load saving goals. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function validate() {
    const next = {}
    if (!form.title.trim()) next.title = 'Title is required.'
    const target = Number(form.target_amount)
    if (form.target_amount === '' || Number.isNaN(target) || target <= 0)
      next.target_amount = 'Enter a target greater than 0.'
    const saved = Number(form.saved_amount)
    if (form.saved_amount !== '' && (Number.isNaN(saved) || saved < 0))
      next.saved_amount = 'Saved amount must be 0 or more.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!validate()) return
    setAdding(true)
    try {
      await client.post('/saving-goals', {
        title: form.title.trim(),
        target_amount: Number(form.target_amount),
        saved_amount: Number(form.saved_amount || 0),
        deadline: form.deadline || null,
        status: form.status,
      })
      setForm(EMPTY_GOAL)
      setErrors({})
      await load()
    } catch (err) {
      setErrors({ title: err.response?.data?.detail || 'Failed to create goal.' })
    } finally {
      setAdding(false)
    }
  }

  function handleUpdated(updated) {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
  }

  return (
    <div className={s.shell}>
      <Navbar />
      <div className={s.content}>
        <div className={s.header}>
          <div>
            <h1>Saving Goals</h1>
            <p>Track progress toward what you're saving for</p>
          </div>
        </div>

        {error && <div className={s.errorBox}>{error}</div>}

        <div className={s.card}>
          <h3 className={s.cardTitle}>Add Goal</h3>
          <form className={s.row} onSubmit={handleAdd}>
            <div className={s.field}>
              <label className={s.label}>Title</label>
              <input
                className={`${s.input} ${errors.title ? s.inputError : ''}`}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. New laptop"
              />
              {errors.title && <span className={s.fieldError}>{errors.title}</span>}
            </div>
            <div className={s.field}>
              <label className={s.label}>Target (Rs)</label>
              <input
                className={`${s.input} ${errors.target_amount ? s.inputError : ''}`}
                type="number"
                min="0"
                step="0.01"
                value={form.target_amount}
                onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                placeholder="e.g. 80000"
              />
              {errors.target_amount && (
                <span className={s.fieldError}>{errors.target_amount}</span>
              )}
            </div>
            <div className={s.field}>
              <label className={s.label}>Already saved (Rs)</label>
              <input
                className={`${s.input} ${errors.saved_amount ? s.inputError : ''}`}
                type="number"
                min="0"
                step="0.01"
                value={form.saved_amount}
                onChange={(e) => setForm({ ...form, saved_amount: e.target.value })}
              />
              {errors.saved_amount && (
                <span className={s.fieldError}>{errors.saved_amount}</span>
              )}
            </div>
            <div className={s.field}>
              <label className={s.label}>Deadline</label>
              <input
                className={s.input}
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
            <button className={`${s.btn} ${s.btnPrimary}`} disabled={adding}>
              {adding ? 'Adding…' : 'Add Goal'}
            </button>
          </form>
        </div>

        {loading ? (
          <div className={s.center}>
            <div className={s.spinner} />
            <p>Loading goals…</p>
          </div>
        ) : goals.length === 0 ? (
          <div className={s.card}>
            <div className={s.empty}>
              No saving goals yet. Create one above to start tracking your progress.
            </div>
          </div>
        ) : (
          <div className={s.cards}>
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} onUpdated={handleUpdated} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
