import { useState, useEffect } from 'react'
import { getAdminStats, getActivity, createAdmin, blockVolunteer, activateVolunteer, deleteVolunteer } from '../api/requests'
import { useNotifications, TYPES } from '../context/NotificationContext'
import './AdminDashboard.css'

const REQUESTS_URL = 'http://localhost:5000/api/requests'
const VOLUNTEERS_URL = 'http://localhost:5000/api/admin/volunteers'

const STATUS_OPTIONS = ['', 'pending', 'accepted', 'completed']

export default function AdminDashboard() {
  const [theme, setTheme] = useState('light')
  const [createAdminForm, setCreateAdminForm] = useState({ name: '', email: '', password: '' })
  const [createAdminSubmitting, setCreateAdminSubmitting] = useState(false)
  const [volunteers, setVolunteers] = useState([])
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    activeVolunteers: 0,
    completedRequests: 0,
  })
  const [requests, setRequests] = useState([])
  const [activity, setActivity] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const { addNotification } = useNotifications()

  useEffect(() => {
    document.documentElement.setAttribute('data-admin-theme', theme)
    return () => document.documentElement.removeAttribute('data-admin-theme')
  }, [theme])

  async function loadVolunteers() {
    try {
      const res = await fetch(VOLUNTEERS_URL, { credentials: 'include' })
      const json = await res.json()

      console.log('Loaded volunteers:', json)

      const list = Array.isArray(json)
        ? json
        : (json.success && Array.isArray(json.data) ? json.data : [])
      setVolunteers(list)
    } catch (err) {
      console.error('Failed to load volunteers', err)
    }
  }

  useEffect(() => {
    loadVolunteers()

    const interval = setInterval(loadVolunteers, 5000)

    return () => clearInterval(interval)
  }, [])

  async function loadRequests() {
    try {
      const res = await fetch(REQUESTS_URL, { credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        setRequests(Array.isArray(json.data) ? json.data : [])
      } else {
        setRequests([])
      }
      console.log('Loaded requests:', json.data)
    } catch (err) {
      addNotification({ type: TYPES.ERROR, title: 'Failed to load requests', message: err.message })
      setRequests([])
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const [statsRes, activityRes] = await Promise.all([
        getAdminStats().catch(() => ({})),
        getActivity().catch(() => []),
      ])
      setStats({
        totalRequests: statsRes.totalRequests ?? 0,
        pendingRequests: statsRes.pendingRequests ?? 0,
        activeVolunteers: statsRes.activeVolunteers ?? 0,
        completedRequests: statsRes.completedRequests ?? 0,
      })
      setActivity(Array.isArray(activityRes) ? activityRes : activityRes?.items || [])
      await loadRequests()
    } catch (err) {
      addNotification({ type: TYPES.ERROR, title: 'Failed to load dashboard', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredRequests = statusFilter
    ? requests.filter((r) => r.status === statusFilter)
    : requests

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    if (!createAdminForm.name.trim() || !createAdminForm.email.trim() || !createAdminForm.password) {
      addNotification({ type: TYPES.ERROR, title: 'Validation', message: 'Name, email and password required.' })
      return
    }
    setCreateAdminSubmitting(true)
    try {
      await createAdmin(createAdminForm)
      addNotification({ type: TYPES.SUCCESS, title: 'Admin created', message: 'New admin can log in.' })
      setCreateAdminForm({ name: '', email: '', password: '' })
    } catch (err) {
      addNotification({ type: TYPES.ERROR, title: 'Failed to create admin', message: err.message })
    } finally {
      setCreateAdminSubmitting(false)
    }
  }

  const handleBlockVolunteer = async (id) => {
    try {
      await blockVolunteer(id)
      addNotification({ type: TYPES.SUCCESS, title: 'Volunteer blocked' })
      loadVolunteers()
    } catch (err) {
      addNotification({ type: TYPES.ERROR, title: 'Failed to block', message: err.message })
    }
  }

  const handleActivateVolunteer = async (id) => {
    try {
      await activateVolunteer(id)
      addNotification({ type: TYPES.SUCCESS, title: 'Volunteer activated' })
      loadVolunteers()
    } catch (err) {
      addNotification({ type: TYPES.ERROR, title: 'Failed to activate', message: err.message })
    }
  }

  const handleDeleteVolunteerClick = (id) => setDeleteConfirmId(id)
  const handleDeleteVolunteerCancel = () => setDeleteConfirmId(null)
  const handleDeleteVolunteerConfirm = async () => {
    if (!deleteConfirmId) return
    try {
      await deleteVolunteer(deleteConfirmId)
      addNotification({ type: TYPES.SUCCESS, title: 'Volunteer deleted' })
      setDeleteConfirmId(null)
      loadVolunteers()
    } catch (err) {
      addNotification({ type: TYPES.ERROR, title: 'Failed to delete', message: err.message })
    }
  }

  return (
    <div className="admin-dashboard" data-theme={theme}>
      <header className="admin-header">
        <h1 className="admin-title">Admin Monitoring Dashboard</h1>
        <button
          type="button"
          className="admin-theme-toggle"
          onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          aria-label="Toggle dark mode"
        >
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </header>

      {loading ? (
        <div className="admin-loading">Loading dashboard...</div>
      ) : (
        <>
          <section className="admin-stats">
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.totalRequests}</span>
              <span className="admin-stat-label">Total Requests</span>
            </div>
            <div className="admin-stat-card admin-stat-card--warning">
              <span className="admin-stat-value">{stats.pendingRequests}</span>
              <span className="admin-stat-label">Pending Requests</span>
            </div>
            <div className="admin-stat-card admin-stat-card--info">
              <span className="admin-stat-value">{stats.activeVolunteers}</span>
              <span className="admin-stat-label">Active Volunteers</span>
            </div>
            <div className="admin-stat-card admin-stat-card--success">
              <span className="admin-stat-value">{stats.completedRequests}</span>
              <span className="admin-stat-label">Completed Requests</span>
            </div>
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">Volunteer Management</h2>
            {console.log('Rendering volunteers:', volunteers)}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Organization</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(volunteers) ? volunteers : []).map((v) => (
                    <tr key={v.id}>
                      <td>{v.name}</td>
                      <td>{v.email}</td>
                      <td>{v.phone || '-'}</td>
                      <td>{v.organization || '-'}</td>
                      <td>
                        <span className={v.is_active ? 'admin-vol-status admin-vol-status--active' : 'admin-vol-status admin-vol-status--blocked'}>
                          {v.is_active ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-vol-actions">
                          {v.is_active ? (
                            <button type="button" className="admin-vol-btn admin-vol-btn--block" onClick={() => handleBlockVolunteer(v.id)}>Block</button>
                          ) : (
                            <button type="button" className="admin-vol-btn admin-vol-btn--activate" onClick={() => handleActivateVolunteer(v.id)}>Activate</button>
                          )}
                          <button type="button" className="admin-vol-btn admin-vol-btn--delete" onClick={() => handleDeleteVolunteerClick(v.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="admin-content">
            <section className="admin-section">
              <h2 className="admin-section-title">Create Admin</h2>
              <form onSubmit={handleCreateAdmin} className="admin-create-admin-form">
                <label className="admin-form-label">Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={createAdminForm.name}
                  onChange={(e) => setCreateAdminForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Full name"
                  required
                />
                <label className="admin-form-label">Email <span className="required">*</span></label>
                <input
                  type="email"
                  className="admin-form-input"
                  value={createAdminForm.email}
                  onChange={(e) => setCreateAdminForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="admin@example.com"
                  required
                />
                <label className="admin-form-label">Password <span className="required">*</span></label>
                <input
                  type="password"
                  className="admin-form-input"
                  value={createAdminForm.password}
                  onChange={(e) => setCreateAdminForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                />
                <button type="submit" className="admin-form-submit" disabled={createAdminSubmitting}>
                  {createAdminSubmitting ? 'Creating...' : 'Create Admin'}
                </button>
              </form>
            </section>

            <section className="admin-section">
              <h2 className="admin-section-title">Requests Overview</h2>
              <div className="admin-filters">
                <label>
                  Status:{" "}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="admin-select"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s || 'All'}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Disaster Type</th>
                      <th>Help Type</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((r) => (
                      <tr key={r.id}>
                        <td>{r.fullName}</td>
                        <td>
                          <span className="admin-tag admin-tag--disaster">{r.disasterType || r.disaster_type || 'Unknown'}</span>
                        </td>
                        <td>
                          <span className="admin-tag admin-tag--help">{r.helpType || r.help_type}</span>
                          <span
                            className="admin-tag admin-tag--priority"
                            style={{
                              marginLeft: '6px',
                              backgroundColor: (r.priority || 'LOW') === 'HIGH' ? '#dc2626' : (r.priority || 'LOW') === 'MEDIUM' ? '#ea580c' : '#16a34a',
                              color: '#fff',
                            }}
                          >
                            {r.priority || 'LOW'}
                          </span>
                        </td>
                        <td><span className={"admin-status admin-status--" + (r.status || 'pending')}>{r.status || 'pending'}</span></td>
                        <td>
                          <span className="admin-tag admin-tag--assigned">
                            Handled by: {r.assigned_organization || '—'}
                            <br />
                            Volunteer: {r.volunteer_name || 'Volunteer not assigned'}
                          </span>
                        </td>
                        <td>{r.latitude && r.longitude ? r.latitude + ", " + r.longitude : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-section">
              <h2 className="admin-section-title">Activity Timeline</h2>
              <ul className="admin-timeline">
                {activity.length === 0 ? (
                  <li className="admin-timeline-item">No recent activity.</li>
                ) : (
                  activity.map((item, i) => (
                    <li key={item.id || i} className="admin-timeline-item">
                      <span className="admin-timeline-dot" />
                      <div>
                        <strong>{item.title || item.type}</strong>
                        {item.message && <p className="admin-timeline-desc">{item.message}</p>}
                        {item.createdAt && <time className="admin-timeline-time">{item.createdAt}</time>}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        </>
      )}

      {deleteConfirmId && (
        <div className="admin-modal-overlay" onClick={handleDeleteVolunteerCancel}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-modal-title">Delete volunteer?</h3>
            <p className="admin-modal-text">This action cannot be undone.</p>
            <div className="admin-modal-actions">
              <button type="button" className="admin-vol-btn admin-vol-btn--delete" onClick={handleDeleteVolunteerConfirm}>Delete</button>
              <button type="button" className="admin-vol-btn admin-vol-btn--cancel" onClick={handleDeleteVolunteerCancel}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
