import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const ROLE_KEY = 'role'
const NAME_KEY = 'name'

export function AuthProvider({ children }) {
  const [role, setRoleState] = useState(() => localStorage.getItem(ROLE_KEY))
  const [name, setNameState] = useState(() => localStorage.getItem(NAME_KEY))

  const setUser = (newRole, newName) => {
    if (newRole != null) {
      localStorage.setItem(ROLE_KEY, newRole)
      setRoleState(newRole)
    } else {
      localStorage.removeItem(ROLE_KEY)
      setRoleState(null)
    }
    if (newName != null) {
      localStorage.setItem(NAME_KEY, newName)
      setNameState(newName)
    } else {
      localStorage.removeItem(NAME_KEY)
      setNameState(null)
    }
  }

  const logout = () => {
    setUser(null, null)
  }

  const isLoggedIn = !!role
  const isAdmin = role === 'admin'

  return (
    <AuthContext.Provider value={{ role, name, setUser, logout, isLoggedIn, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
