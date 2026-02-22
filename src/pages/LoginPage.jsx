import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../api/requests'
import { useAuth } from '../context/AuthContext'
import { useNotifications, TYPES } from '../context/NotificationContext'
import './LoginPage.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { setUser } = useAuth()
  const { addNotification } = useNotifications()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      addNotification({ type: TYPES.ERROR, title: 'Validation', message: 'Email and password required.' })
      return
    }
    setSubmitting(true)
    try {
      const res = await login({ email: email.trim(), password })
      if (!res || !res.role || !res.name) {
        addNotification({ type: TYPES.ERROR, title: 'Login failed', message: 'Invalid email or password' })
        setSubmitting(false)
        return
      }
      localStorage.setItem('role', res.role)
      localStorage.setItem('name', res.name)
      setUser(res.role, res.name)
      addNotification({ type: TYPES.SUCCESS, title: 'Logged in', message: `Welcome, ${res.name}.` })
      if (res.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/volunteer', { replace: true })
      }
    } catch (err) {
      addNotification({
        type: TYPES.ERROR,
        title: 'Login failed',
        message: err.message || 'Invalid email or password',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Login</h1>
          <p className="auth-subtitle">Volunteer or Admin</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">Email <span className="required">*</span></label>
          <input
            type="email"
            className="auth-input"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="auth-label">Password <span className="required">*</span></label>
          <input
            type="password"
            className="auth-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="auth-footer">
          Volunteer? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  )
}
