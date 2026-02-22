import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logout } from '../api/requests'
import './Navbar.css'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoggedIn, isAdmin, logout: authLogout } = useAuth()

  const baseLinks = [
    { to: '/', label: 'Home' },
    { to: '/request-help', label: 'Request Help' },
  ]
  const volunteerLink = isLoggedIn ? { to: '/volunteer', label: 'Volunteer' } : null
  const adminLink = isAdmin ? { to: '/admin', label: 'Admin' } : null
  const mapLink = isLoggedIn ? { to: '/map', label: 'Map' } : null
  const navLinks = [...baseLinks, volunteerLink, adminLink, mapLink].filter(Boolean)

  const handleLogout = async () => {
    setMenuOpen(false)
    try {
      await logout()
    } catch (_) {}
    authLogout()
    navigate('/')
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
          <span className="navbar-logo-icon" aria-hidden="true">🆘</span>
          <span className="navbar-logo-text">Disaster Relief</span>
        </Link>

        <button
          type="button"
          className="navbar-toggle"
          aria-expanded={menuOpen}
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="navbar-toggle-bar" />
          <span className="navbar-toggle-bar" />
          <span className="navbar-toggle-bar" />
        </button>

        <nav className={`navbar-nav ${menuOpen ? 'navbar-nav--open' : ''}`}>
          <ul className="navbar-menu">
            {navLinks.map(({ to, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={`navbar-link ${location.pathname === to ? 'navbar-link--active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              </li>
            ))}
            {!isLoggedIn ? (
              <>
                <li><Link to="/login" className={`navbar-link ${location.pathname === '/login' ? 'navbar-link--active' : ''}`} onClick={() => setMenuOpen(false)}>Login</Link></li>
                <li><Link to="/register" className={`navbar-link ${location.pathname === '/register' ? 'navbar-link--active' : ''}`} onClick={() => setMenuOpen(false)}>Register</Link></li>
              </>
            ) : (
              <li>
                <button type="button" className="navbar-link navbar-link--btn" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            )}
          </ul>
          <Link
            to="/request-help"
            className="navbar-cta"
            onClick={() => setMenuOpen(false)}
          >
            Request Help Now
          </Link>
        </nav>
      </div>
    </header>
  )
}
