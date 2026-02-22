import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNotifications, TYPES } from '../context/NotificationContext'
import './LoginPage.css'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [organization, setOrganization] = useState('')
  const [isSolo, setIsSolo] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { addNotification } = useNotifications()
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault() // VERY IMPORTANT

    setSubmitting(true)
    console.log('Register clicked')

    const payload = {
      name,
      email,
      password,
      phone,
      organization: isSolo ? 'Independent' : organization,
    }

    const res = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const result = await res.json()
    console.log('Register response:', result)

    setSubmitting(false)
    if (res.ok) {
      addNotification({ type: TYPES.SUCCESS, title: 'Registered', message: 'You can now log in.' })
      navigate('/login', { replace: true })
    } else {
      addNotification({ type: TYPES.ERROR, title: 'Registration failed', message: result?.message || 'Could not register.' })
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Volunteer Registration</h1>
          <p className="auth-subtitle">Create an account to help</p>
        </div>
        <form onSubmit={handleRegister} className="auth-form">
          <label className="auth-label">Name <span className="required">*</span></label>
          <input
            type="text"
            className="auth-input"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label className="auth-label">Email <span className="required">*</span></label>
          <input
            type="email"
            className="auth-input"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="auth-label">Phone Number <span className="required">*</span></label>
          <input
            type="tel"
            className="auth-input"
            placeholder="e.g. +1 234 567 8900"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <label className="auth-label auth-label--checkbox">
            <input
              type="checkbox"
              checked={isSolo}
              onChange={(e) => {
                setIsSolo(e.target.checked)
                if (e.target.checked) setOrganization('Independent')
              }}
            />
            I am an Independent/Solo Volunteer
          </label>
          <label className="auth-label">Organization / NGO <span className="required">*</span></label>
          <input
            type="text"
            className="auth-input"
            placeholder="Your organization name"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            disabled={isSolo}
            required={!isSolo}
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
          <button type="submit" className="auth-submit" disabled={submitting} aria-label="Register">
            {submitting ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  )
}
