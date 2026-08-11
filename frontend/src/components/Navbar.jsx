export default function Navbar({ user, activePage, onNavigate, onLogout }) {
  const navItems = [
    { id: 'directory', label: '🔍 Find Donors' },
    { id: 'emergency', label: '🚨 Emergency' },
    { id: 'profile', label: '👤 My Profile' },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: '⚙️ Admin' }] : []),
  ]

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-icon">❤</span>
        <div>
          <h1>Smart Blood Donation</h1>
          <p>Emergency donor management platform</p>
        </div>
      </div>

      {user && (
        <nav className="topbar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-btn ${activePage === item.id ? 'nav-btn-active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
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
          </>
        ) : (
          <span className="feature-badge">Emergency Platform</span>
        )}
      </div>
    </header>
  )
}
