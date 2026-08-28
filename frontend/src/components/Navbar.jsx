import { useCallback, useEffect, useState } from 'react'
import { emergencyApi } from '../services/profileApi'

export default function Navbar({ user, activePage, onNavigate, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeRequestCount, setActiveRequestCount] = useState(0)

  const navItems = [
    { id: 'directory', label: '🔍 Find Donors' },
    { id: 'emergency', label: '🚨 Emergency', badge: activeRequestCount },
    { id: 'profile', label: '👤 My Profile' },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: '⚙️ Admin' }] : []),
  ]

  // Topbar shadow on scroll
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Fetch active emergency count for badge
  const fetchCount = useCallback(() => {
    if (!user) return
    emergencyApi.getAll()
      .then((r) => setActiveRequestCount((r.data || []).length))
      .catch(() => {})
  }, [user])

  useEffect(() => { fetchCount() }, [fetchCount])

  // Close drawer on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function handleNav(id) {
    onNavigate(id)
    setMenuOpen(false)
  }

  return (
    <>
      <header className={`topbar${scrolled ? ' topbar-scrolled' : ''}`}>
        <div className="brand">
          <span className="brand-icon">❤</span>
          <div>
            <h1>Smart Blood Donation</h1>
            <p>Emergency donor management platform</p>
          </div>
        </div>

        {/* Desktop nav */}
        {user && (
          <nav className="topbar-nav desktop-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-btn ${activePage === item.id ? 'nav-btn-active' : ''}`}
                onClick={() => handleNav(item.id)}
              >
                {item.label}
                {item.id === 'emergency' && item.badge > 0 && (
                  <span className="nav-emergency-badge">{item.badge}</span>
                )}
              </button>
            ))}
          </nav>
        )}

        <div className="topbar-right">
          {user ? (
            <>
              <span className="user-pill">
                <span className={`role-dot ${user.role}`} />
                {user.username}
                {user.role === 'admin' && <span className="admin-badge">Admin</span>}
              </span>
              <button type="button" className="secondary-button" onClick={onLogout}>
                Logout
              </button>
              {/* Hamburger — mobile only */}
              <button
                type="button"
                className="hamburger-btn"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span className={`hamburger-icon${menuOpen ? ' open' : ''}`} />
              </button>
            </>
          ) : (
            <span className="feature-badge">Emergency Platform</span>
          )}
        </div>
      </header>

      {/* Mobile drawer */}
      {user && menuOpen && (
        <>
          <div className="mobile-overlay" onClick={() => setMenuOpen(false)} />
          <nav className="mobile-nav-drawer" role="navigation" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mobile-nav-btn ${activePage === item.id ? 'nav-btn-active' : ''}`}
                onClick={() => handleNav(item.id)}
              >
                {item.label}
                {item.id === 'emergency' && item.badge > 0 && (
                  <span className="nav-emergency-badge">{item.badge}</span>
                )}
              </button>
            ))}
          </nav>
        </>
      )}
    </>
  )
}
