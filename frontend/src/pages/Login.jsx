import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import client, { TOKEN_KEY } from '../api/client'
import styles from '../styles/auth.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function validate() {
    const next = {}
    if (!form.email.trim()) {
      next.email = 'Email is required.'
    } else if (!EMAIL_RE.test(form.email)) {
      next.email = 'Enter a valid email address.'
    }
    if (!form.password) next.password = 'Password is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setApiError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await client.post('/auth/login', {
        email: form.email.trim(),
        password: form.password,
      })
      localStorage.setItem(TOKEN_KEY, res.data.access_token)
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      setApiError(
        typeof detail === 'string'
          ? detail
          : 'Login failed. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <h1>PocketAI</h1>
          <p>Welcome back — sign in to your account</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {apiError && <div className={styles.alert}>{apiError}</div>}

          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className={errors.email ? styles.inputError : undefined}
              placeholder="you@university.edu"
            />
            {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className={errors.password ? styles.inputError : undefined}
              placeholder="Your password"
            />
            {errors.password && (
              <span className={styles.fieldError}>{errors.password}</span>
            )}
          </div>

          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className={styles.footer}>
          New here? <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  )
}
