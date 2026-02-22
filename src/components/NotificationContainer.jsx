import { useNotifications } from '../context/NotificationContext'
import './NotificationContainer.css'

const icons = {
  new_request: '🆘',
  volunteer_accepted: '✓',
  request_completed: '✔',
  success: '✓',
  error: '⚠',
}

export default function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications()

  return (
    <div className="notification-container" aria-live="polite">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`notification-toast notification--${n.type}`}
          role="alert"
        >
          <span className="notification-icon" aria-hidden="true">
            {icons[n.type] ?? '•'}
          </span>
          <div className="notification-content">
            <strong className="notification-title">{n.title}</strong>
            {n.message && <p className="notification-message">{n.message}</p>}
          </div>
          <button
            type="button"
            className="notification-close"
            onClick={() => removeNotification(n.id)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
