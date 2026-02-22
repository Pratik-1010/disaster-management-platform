import { createContext, useContext, useState, useCallback } from 'react'

const NotificationContext = createContext(null)

const TYPES = {
  NEW_REQUEST: 'new_request',
  VOLUNTEER_ACCEPTED: 'volunteer_accepted',
  REQUEST_COMPLETED: 'request_completed',
  SUCCESS: 'success',
  ERROR: 'error',
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const addNotification = useCallback(({ type = TYPES.SUCCESS, title, message, duration = 5000 }) => {
    const id = Date.now() + Math.random()
    setNotifications((prev) => [...prev, { id, type, title, message, duration }])
    if (duration > 0) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }, duration)
    }
    return id
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const value = {
    notifications,
    addNotification,
    removeNotification,
    TYPES,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

export { TYPES }
