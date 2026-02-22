import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Protects /admin: requires role === admin.
 */
export default function AdminRoute({ children }) {
  const { isAdmin, isLoggedIn } = useAuth()
  const location = useLocation()
  if (!isLoggedIn || !isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
