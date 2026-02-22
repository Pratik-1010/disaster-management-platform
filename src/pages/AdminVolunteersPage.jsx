import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getVolunteers, blockVolunteer, activateVolunteer, deleteVolunteer } from '../api/requests'
import { useNotifications, TYPES } from '../context/NotificationContext'
import './AdminDashboard.css'

export default function AdminVolunteersPage() {
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const { addNotification } = useNotifications()

  const load = async () => {
    setLoading(true)
    try {
      const data = await getVolunteers()
      setVolunteers(Array.isArray(data) ? data : [])
    } catch (err) {
      addNotification({ type: TYPES.ERROR, title: 'Failed to load volunteers', message: err.message })
      setVolunteers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleBlock = async (id) => {
    try {
      await blockVolunteer(id)
      setVolunteers((prev) => prev.map((v) => (v.id === id ? { ...v, is_active: 0 } : v)))
      addNotification({ type: TYPES.SUCCESS, title: 'Volunteer blocked' })
    } catch (err) {
      addNotification({ type: TYPES.ERROR, title: 'Failed to block', message: err.message })
    }
  }

  const handleActivate = async (id) => {
    try {
      await activateVolunteer(id)
      setVolunteers((prev) => prev.map((v) => (v.id === id ? { ...v, is_active: 1 } : v)))
      addNotification({ type: TYPES.SUCCESS, title: 'Volunteer activated' })
    } catch (err) {
      addNotification({ type: TYPES.ERROR, title: 'Failed to activate', message: err.message })
    }
  }

  const handleDeleteClick = (id) => {
    setDeleteConfirmId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return
    try {
      await deleteVolunteer(deleteConfirmId)
      setVolunteers((prev) => prev.filter((v) => v.id !== deleteConfirmId))
      addNotification({ type: TYPES.SUCCESS, title: 'Volunteer deleted' })
      setDeleteConfirmId(null)
    } catch (err) {
      addNotification({ type: TYPES.ERROR, title: 'Failed to delete', message: err.message })
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null)
  }

  return (
    <div className="admin-dashboard" data-theme="light">
      <header className="admin-header">
        <h1 className="admin-title">Manage Volunteers</h1>
        <Link to="/admin" className="admin-theme-toggle">Back to Dashboard</Link>
      </header>

      {loading ? (
        <div className="admin-loading">Loading volunteers...</div>
      ) : (
        <section className="admin-section">
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
                {volunteers.map((v) => (
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
                          <button type="button" className="admin-vol-btn admin-vol-btn--block" onClick={() => handleBlock(v.id)}>Block</button>
                        ) : (
                          <button type="button" className="admin-vol-btn admin-vol-btn--activate" onClick={() => handleActivate(v.id)}>Activate</button>
                        )}
                        <button type="button" className="admin-vol-btn admin-vol-btn--delete" onClick={() => handleDeleteClick(v.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {deleteConfirmId && (
        <div className="admin-modal-overlay" onClick={handleDeleteCancel}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-modal-title">Delete volunteer?</h3>
            <p className="admin-modal-text">This action cannot be undone.</p>
            <div className="admin-modal-actions">
              <button type="button" className="admin-vol-btn admin-vol-btn--delete" onClick={handleDeleteConfirm}>Delete</button>
              <button type="button" className="admin-vol-btn admin-vol-btn--cancel" onClick={handleDeleteCancel}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
