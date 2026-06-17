import { useEffect, useMemo, useState } from 'react'
import client from '../api/client'
import Navbar from '../components/Navbar'
import MonthYearPicker from '../components/MonthYearPicker'
import { formatMoney, MONTH_NAMES } from '../utils/format'
import s from '../styles/page.module.css'

const EMPTY_ADD = {
  category_id: '',
  amount: '',
  description: '',
  input_method: 'manual',
}

export default function Expenses() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])

  // add form
  const [form, setForm] = useState(EMPTY_ADD)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // smart add (natural language)
  const [smartText, setSmartText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseInfo, setParseInfo] = useState('')

  // AI category suggestion (add form)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestion, setSuggestion] = useState(null) // { category, disclaimer }
  const [aiError, setAiError] = useState('')

  // edit modal
  const [editing, setEditing] = useState(null) // expense being edited
  const [editForm, setEditForm] = useState(EMPTY_ADD)
  const [editErrors, setEditErrors] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [editSuggestion, setEditSuggestion] = useState(null)
  const [editSuggesting, setEditSuggesting] = useState(false)

  const [deletingId, setDeletingId] = useState(null)

  const catName = useMemo(() => {
    const map = {}
    categories.forEach((c) => (map[c.id] = c.name))
    return map
  }, [categories])

  async function loadAll() {
    setLoading(true)
    setError('')
    const [expRes, budgetRes] = await Promise.allSettled([
      client.get('/expenses', { params: { month, year } }),
      client.get(`/budgets/${month}/${year}`),
    ])

    if (expRes.status === 'fulfilled') setExpenses(expRes.value.data)
    else setError('Failed to load expenses. Please try again.')

    if (budgetRes.status === 'fulfilled') {
      setCategories(budgetRes.value.data.categories || [])
    } else if (budgetRes.reason?.response?.status === 404) {
      setCategories([])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  // ---------------------------------------------------------------- smart add
  async function handleParse() {
    if (!smartText.trim()) return
    setParsing(true)
    setParseInfo('')
    setAiError('')
    try {
      const res = await client.post('/ai/parse', { text: smartText })
      const { amount, description, disclaimer } = res.data
      // Pre-fill the form for the user to REVIEW — never auto-submit.
      setForm((prev) => ({
        ...prev,
        amount: amount != null ? String(amount) : prev.amount,
        description: description ?? prev.description,
        input_method: 'natural_language',
      }))
      setParseInfo(disclaimer || '')
    } catch (err) {
      setAiError(
        err.response?.data?.detail ||
          'Could not parse that text. The AI service may be unavailable.',
      )
    } finally {
      setParsing(false)
    }
  }

  // ---------------------------------------------------------- AI categorize
  async function suggestCategory(description, target) {
    if (!description?.trim()) {
      setAiError('Enter a description first to get a category suggestion.')
      return
    }
    const setBusy = target === 'edit' ? setEditSuggesting : setSuggesting
    const setSug = target === 'edit' ? setEditSuggestion : setSuggestion
    setBusy(true)
    setAiError('')
    try {
      const res = await client.post('/ai/categorize', { description })
      setSug({
        category: res.data.suggested_category,
        disclaimer: res.data.disclaimer,
      })
    } catch (err) {
      setAiError(
        err.response?.data?.detail ||
          'Could not get a suggestion. The AI service may be unavailable.',
      )
    } finally {
      setBusy(false)
    }
  }

  // Try to select a category whose name matches the AI suggestion (user-initiated).
  function applySuggestion(name, target) {
    const match = categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    )
    if (!match) {
      setAiError(
        `No category named "${name}" exists yet — create it on the Budget page, ` +
          `or pick another category.`,
      )
      return
    }
    if (target === 'edit') {
      setEditForm((p) => ({ ...p, category_id: match.id }))
    } else {
      setForm((p) => ({ ...p, category_id: match.id }))
    }
  }

  // ---------------------------------------------------------------- add
  function validate(f) {
    const next = {}
    const amt = Number(f.amount)
    if (f.amount === '' || Number.isNaN(amt) || amt <= 0)
      next.amount = 'Enter an amount greater than 0.'
    return next
  }

  async function handleAdd(e) {
    e.preventDefault()
    const errs = validate(form)
    setFormErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      await client.post('/expenses', {
        category_id: form.category_id || null,
        amount: Number(form.amount),
        description: form.description.trim() || null,
        input_method: form.input_method,
      })
      setForm(EMPTY_ADD)
      setSuggestion(null)
      setSmartText('')
      setParseInfo('')
      await loadAll()
    } catch (err) {
      setFormErrors({ amount: err.response?.data?.detail || 'Failed to add expense.' })
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------- edit
  function openEdit(exp) {
    setEditing(exp)
    setEditForm({
      category_id: exp.category_id || '',
      amount: String(exp.amount),
      description: exp.description || '',
      input_method: exp.input_method || 'manual',
    })
    setEditErrors({})
    setEditSuggestion(null)
    setAiError('')
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    const errs = validate(editForm)
    setEditErrors(errs)
    if (Object.keys(errs).length) return

    setSavingEdit(true)
    try {
      await client.put(`/expenses/${editing.id}`, {
        category_id: editForm.category_id || null,
        amount: Number(editForm.amount),
        description: editForm.description.trim() || null,
      })
      setEditing(null)
      await loadAll()
    } catch (err) {
      setEditErrors({ amount: err.response?.data?.detail || 'Failed to update.' })
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await client.delete(`/expenses/${id}`)
      await loadAll()
    } catch {
      setError('Failed to delete expense.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={s.shell}>
      <Navbar />
      <div className={s.content}>
        <div className={s.header}>
          <div>
            <h1>Expenses</h1>
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
        {aiError && <div className={s.errorBox}>{aiError}</div>}

        <div className={s.grid}>
          {/* Smart add */}
          <div className={s.card}>
            <h3 className={s.cardTitle}>✨ Smart Add</h3>
            <p className={s.muted} style={{ marginTop: -8, marginBottom: 12 }}>
              Describe an expense in plain language and let AI draft it. You review
              before saving.
            </p>
            <textarea
              className={s.textarea}
              value={smartText}
              onChange={(e) => setSmartText(e.target.value)}
              placeholder='e.g. "spent 200 on pizza last night"'
            />
            <button
              className={`${s.btn} ${s.btnSecondary}`}
              style={{ marginTop: 10 }}
              onClick={handleParse}
              disabled={parsing || !smartText.trim()}
            >
              {parsing ? 'Parsing…' : 'Parse with AI'}
            </button>
            {parseInfo && <div className={s.disclaimer}>{parseInfo}</div>}
          </div>

          {/* Add expense */}
          <div className={s.card}>
            <h3 className={s.cardTitle}>Add Expense</h3>
            <form className={s.form} onSubmit={handleAdd}>
              <div className={s.field}>
                <label className={s.label}>Category</label>
                <select
                  className={s.select}
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">— Uncategorized —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <span className={s.muted}>
                    No categories for this month — add some on the Budget page.
                  </span>
                )}
              </div>
              <div className={s.field}>
                <label className={s.label}>Amount (Rs)</label>
                <input
                  className={`${s.input} ${formErrors.amount ? s.inputError : ''}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="e.g. 200"
                />
                {formErrors.amount && (
                  <span className={s.fieldError}>{formErrors.amount}</span>
                )}
              </div>
              <div className={s.field}>
                <label className={s.label}>Description</label>
                <input
                  className={s.input}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Pizza"
                />
              </div>

              <div>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnSecondary} ${s.btnSmall}`}
                  onClick={() => suggestCategory(form.description, 'add')}
                  disabled={suggesting}
                >
                  {suggesting ? 'Thinking…' : '🤖 Suggest category'}
                </button>
              </div>
              {suggestion && (
                <div className={s.suggestion}>
                  Suggested category: <strong>{suggestion.category}</strong>{' '}
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnSecondary} ${s.btnSmall}`}
                    onClick={() => applySuggestion(suggestion.category, 'add')}
                  >
                    Use this
                  </button>
                  <div className={s.disclaimer}>{suggestion.disclaimer}</div>
                </div>
              )}

              {form.input_method === 'natural_language' && (
                <span className={s.muted}>
                  Drafted from natural language — review and save.
                </span>
              )}

              <button className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
                {saving ? 'Saving…' : 'Save Expense'}
              </button>
            </form>
          </div>
        </div>

        {/* Expenses table */}
        <div className={s.card}>
          <h3 className={s.cardTitle}>This Month's Expenses</h3>
          {loading ? (
            <div className={s.center}>
              <div className={s.spinner} />
              <p>Loading…</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className={s.empty}>No expenses logged for this month yet.</div>
          ) : (
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td>{e.description || '—'}</td>
                    <td>{e.category_id ? catName[e.category_id] || 'Unknown' : 'Uncategorized'}</td>
                    <td className={s.money}>{formatMoney(e.amount)}</td>
                    <td>
                      <div className={s.actions}>
                        <button
                          className={`${s.btn} ${s.btnSecondary} ${s.btnSmall}`}
                          onClick={() => openEdit(e)}
                        >
                          Edit
                        </button>
                        <button
                          className={`${s.btn} ${s.btnDanger} ${s.btnSmall}`}
                          onClick={() => handleDelete(e.id)}
                          disabled={deletingId === e.id}
                        >
                          {deletingId === e.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className={s.modalOverlay} onClick={() => setEditing(null)}>
          <div className={s.modal} onClick={(ev) => ev.stopPropagation()}>
            <h3>Edit Expense</h3>
            <form className={s.form} onSubmit={handleSaveEdit}>
              <div className={s.field}>
                <label className={s.label}>Category</label>
                <select
                  className={s.select}
                  value={editForm.category_id}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category_id: e.target.value })
                  }
                >
                  <option value="">— Uncategorized —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label}>Amount (Rs)</label>
                <input
                  className={`${s.input} ${editErrors.amount ? s.inputError : ''}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) =>
                    setEditForm({ ...editForm, amount: e.target.value })
                  }
                />
                {editErrors.amount && (
                  <span className={s.fieldError}>{editErrors.amount}</span>
                )}
              </div>
              <div className={s.field}>
                <label className={s.label}>Description</label>
                <input
                  className={s.input}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                />
              </div>

              <div>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnSecondary} ${s.btnSmall}`}
                  onClick={() => suggestCategory(editForm.description, 'edit')}
                  disabled={editSuggesting}
                >
                  {editSuggesting ? 'Thinking…' : '🤖 Suggest category'}
                </button>
              </div>
              {editSuggestion && (
                <div className={s.suggestion}>
                  Suggested: <strong>{editSuggestion.category}</strong>{' '}
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnSecondary} ${s.btnSmall}`}
                    onClick={() => applySuggestion(editSuggestion.category, 'edit')}
                  >
                    Use this
                  </button>
                  <div className={s.disclaimer}>{editSuggestion.disclaimer}</div>
                </div>
              )}

              <div className={s.actions} style={{ justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnSecondary}`}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button className={`${s.btn} ${s.btnPrimary}`} disabled={savingEdit}>
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
