import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { acceptRequest, completeRequest, confirmRequest, getRequest, HELP_TYPES } from '../api/requests'
import { useNotifications, TYPES } from '../context/NotificationContext'
import './VolunteerDashboard.css'

const REQUESTS_URL = 'http://localhost:5000/api/requests'

const STATUS_CONFIG = {
  pending: { label: 'Pending', className: 'status-badge--pending' },
  accepted: { label: 'Accepted', className: 'status-badge--accepted' },
  completed: { label: 'Completed', className: 'status-badge--completed' },
}

function getTrustBadge(score) {
  const s = Number(score) || 0
  if (s >= 80) return { label: 'Verified', className: 'trust-badge--verified' }
  if (s >= 60) return { label: 'Community Confirmed', className: 'trust-badge--confirmed' }
  if (s >= 40) return { label: 'Needs Validation', className: 'trust-badge--needs-validation' }
  return { label: 'Suspicious', className: 'trust-badge--suspicious' }
}

const CREDIBILITY_TOOLTIP = 'Credibility score calculated using: • behavior analysis • location consistency • volunteer confirmations • completion validation'

export default function VolunteerDashboard() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [confirmedIds, setConfirmedIds] = useState(new Set())
  const [actionLoading, setActionLoading] = useState({})
  const { addNotification } = useNotifications()

  async function loadRequests() {
    setLoading(true)
    try {
      const res = await fetch(REQUESTS_URL)
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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const setBusy = (id, busy) => {
    setActionLoading((prev) => (busy ? { ...prev, [id]: true } : { ...prev, [id]: false }))
  }

  const handleAccept = async (id) => {
    setBusy(id, true)
    try {
      await acceptRequest(id)
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'accepted' } : r)))
      addNotification({ type: TYPES.VOLUNTEER_ACCEPTED, title: 'Request accepted', message: 'You have accepted this help request.' })
    } catch (err) {
      addNotification({ type: TYPES.ERROR, title: 'Could not accept', message: err.message })
    } finally {
      setBusy(id, false)
    }
  }

  const handleComplete = async (id) => {
    setBusy(id, true)
    try {
      await completeRequest(id)
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'completed', accuracyScore: 100, accuracy_score: 100 } : r)))
      addNotification({ type: TYPES.REQUEST_COMPLETED, title: 'Request completed', message: 'Marked as completed.' })
    } catch (err) {
      addNotification({ type: TYPES.ERROR, title: 'Could not complete', message: err.message })
    } finally {
      setBusy(id, false)
    }
  }

  const handleConfirm = async (id) => {
    setBusy(id, true)
    try {
      const res = await confirmRequest(id)
      const newScore = res?.accuracy_score ?? res?.accuracyScore ?? 60
      setConfirmedIds((prev) => new Set([...prev, id]))
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, accuracy_score: newScore, accuracyScore: newScore, confirmation_count: (r.confirmation_count ?? r.confirmationCount ?? 0) + 1, confirmationCount: (r.confirmation_count ?? r.confirmationCount ?? 0) + 1 } : r)))
      addNotification({ type: TYPES.SUCCESS, title: 'Confirmed', message: 'You confirmed the situation nearby. Trust score updated.' })
      try {
        const updated = await getRequest(id)
        if (updated) setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)))
      } catch (_) {}
    } catch (err) {
      addNotification({ type: TYPES.ERROR, title: 'Could not confirm', message: err.message })
    } finally {
      setBusy(id, false)
    }
  }

  const filtered = requests.filter((r) => {
    const matchType = !filter || r.helpType === filter
    const matchSearch = !search || [r.fullName, r.helpType, r.disasterType, r.disaster_type, r.description].some((s) => String(s || '').toLowerCase().includes(search.toLowerCase()))
    return matchType && matchSearch
  })

  return (
    <div className="volunteer-dashboard">
      <aside className="volunteer-sidebar">
        <h2 className="volunteer-sidebar-title">Volunteer Dashboard</h2>
        <nav className="volunteer-sidebar-nav">
          <a href="#requests" className="volunteer-sidebar-link volunteer-sidebar-link--active">Help Requests</a>
          <Link to="/map" className="volunteer-sidebar-link">Map View</Link>
        </nav>
        <div className="volunteer-filter">
          <label className="volunteer-filter-label">Filter by help type</label>
          <select
            className="volunteer-filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All</option>
            {HELP_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="volunteer-search-wrap">
          <label className="volunteer-filter-label">Search</label>
          <input
            type="search"
            className="volunteer-search"
            placeholder="Name, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </aside>

      <div className="volunteer-main">
        <header className="volunteer-header">
          <h1 className="volunteer-heading">Help Requests</h1>
          <p className="volunteer-subheading">Accept and complete requests. Stay updated.</p>
        </header>

        {loading ? (
          <div className="volunteer-loading">
            <span className="volunteer-spinner" aria-hidden="true" />
            <span>Loading requests...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="volunteer-empty">No requests match your filters.</div>
        ) : (
          <div className="volunteer-list" id="requests">
            {filtered.map((req) => {
              const statusConf = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
              const score = req.accuracy_score ?? req.accuracyScore ?? 50
              const trustBadge = getTrustBadge(score)
              const isConfirmed = confirmedIds.has(req.id)
              const busy = actionLoading[req.id]
              return (
                <article key={req.id} className="volunteer-card">
                  <div className="volunteer-card-header">
                    <span className="volunteer-card-icon" aria-hidden="true" data-type={req.helpType} />
                    <span className={"volunteer-card-status status-badge " + statusConf.className}>{statusConf.label}</span>
                  </div>
                  <h3 className="volunteer-card-name">{req.fullName}</h3>
                  <div className="volunteer-card-badges">
                    <span className="volunteer-badge volunteer-badge--disaster">{req.disasterType || req.disaster_type || 'Unknown'}</span>
                    <span className="volunteer-badge volunteer-badge--help">{req.helpType || req.help_type}</span>
                    <span
                      className={"volunteer-badge trust-badge " + trustBadge.className}
                      title={CREDIBILITY_TOOLTIP}
                    >
                      {trustBadge.label}
                    </span>
                  </div>
                  <div className="volunteer-trust-bar-wrap" title={CREDIBILITY_TOOLTIP}>
                    <span className="volunteer-trust-label">Trust Level: {Math.round(score)}%</span>
                    <div className="volunteer-trust-bar">
                      <div className="volunteer-trust-fill" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
                    </div>
                  </div>
                  <div className="volunteer-timeline">
                    <span className="volunteer-timeline-item volunteer-timeline--pending">Pending</span>
                    {req.accepted_at || req.acceptedAt ? (
                      <span className="volunteer-timeline-item volunteer-timeline--accepted">Accepted {req.accepted_at || req.acceptedAt}</span>
                    ) : (
                      <span className="volunteer-timeline-item volunteer-timeline--muted">Accepted</span>
                    )}
                    {req.completed_at || req.completedAt ? (
                      <span className="volunteer-timeline-item volunteer-timeline--completed">Completed {req.completed_at || req.completedAt}</span>
                    ) : (
                      <span className="volunteer-timeline-item volunteer-timeline--muted">Completed</span>
                    )}
                  </div>
                  <p className="volunteer-card-location">
                    {[req.latitude, req.longitude].filter(Boolean).length ? req.latitude + ", " + req.longitude : 'Location not set'}
                  </p>
                  {req.description && <p className="volunteer-card-desc">{req.description}</p>}
                  <div className="volunteer-card-actions">
                    {req.status === 'pending' && (
                      <button type="button" className="volunteer-btn volunteer-btn--confirm" onClick={() => handleConfirm(req.id)} disabled={isConfirmed || busy} title={CREDIBILITY_TOOLTIP}>
                        {busy ? '...' : isConfirmed ? 'Confirmed' : 'Confirm Situation Nearby'}
                      </button>
                    )}
                    {req.status === 'pending' && (
                      <button type="button" className="volunteer-btn volunteer-btn--accept" onClick={() => handleAccept(req.id)} disabled={busy}>
                        Accept Request
                      </button>
                    )}
                    {req.status === 'accepted' && (
                      <button type="button" className="volunteer-btn volunteer-btn--complete" onClick={() => handleComplete(req.id)} disabled={busy}>
                        {busy ? '...' : 'Mark Completed'}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
