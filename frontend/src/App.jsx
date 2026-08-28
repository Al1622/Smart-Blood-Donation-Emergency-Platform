import { useCallback, useEffect, useState } from 'react'
import { authApi } from './services/profileApi'
import Navbar from './components/Navbar'
import AuthPage from './pages/AuthPage'
import DonorDirectoryPage from './pages/DonorDirectoryPage'
import ProfilePage from './pages/ProfilePage'
import EmergencyPage from './pages/EmergencyPage'
import AdminPage from './pages/AdminPage'
import './App.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [isAuthReady, setIsAuthReady] = useState(() => !localStorage.getItem('authToken'))
  const [activePage, setActivePage] = useState('directory')

  // Bootstrap auth from stored token
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) return

    authApi.me()
      .then((result) => setUser(result.data))
      .catch(() => { localStorage.removeItem('authToken') })
      .finally(() => setIsAuthReady(true))
  }, [])

  function handleLogin(userData) {
    setUser(userData)
    setActivePage('directory')
  }

  const handleLogout = useCallback(async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    localStorage.removeItem('authToken')
    setUser(null)
    setActivePage('directory')
  }, [])

  function navigate(page) {
    setActivePage(page)
  }

  if (!isAuthReady) {
    return (
      <div className="app">
        <div className="loading-screen">
          <span className="brand-icon">❤</span>
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {!user ? (
        <AuthPage onLogin={handleLogin} />
      ) : (
        <>
          <Navbar
            user={user}
            activePage={activePage}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
          <main className="page">
            {activePage === 'directory' && <DonorDirectoryPage user={user} />}
            {activePage === 'profile' && <ProfilePage user={user} />}
            {activePage === 'emergency' && <EmergencyPage user={user} />}
            {activePage === 'admin' && user.role === 'admin' && <AdminPage user={user} />}
          </main>
        </>
      )}
    </div>
  )
}