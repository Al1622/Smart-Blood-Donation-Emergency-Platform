import { useCallback, useEffect, useState } from 'react'
import { adminApi, profileApi } from '../services/profileApi'

function StatCard({ label, value, icon, accent }) {
  return (
    <article className="summary-card" style={{ '--accent': accent }}>
      <span className="stat-icon">{icon}</span>
      <strong>{value ?? '—'}</strong>
      <span>{label}</span>
    </article>
  )
}

const TABS = [
  { id: 'pending', label: '⏳ Pending Reviews' },
  { id: 'users', label: '👥 All Users' },
  { id: 'profiles', label: '📋 All Profiles' },
  { id: 'audit', label: '📜 Audit Log' },
]

export default function AdminPage({ user }) {
  const [activeTab, setActiveTab] = useState('pending')
  const [stats, setStats] = useState(null)
  const [pendingProfiles, setPendingProfiles] = useState([])
  const [allProfiles, setAllProfiles] = useState([])
  const [users, setUsers] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [reviewReason, setReviewReason] = useState('')

  const loadStats = useCallback(async () => {
    try {
      const result = await adminApi.getStats()
      setStats(result.data)
    } catch {
      /* ignore */
    }
  }, [])

  const loadTab = useCallback(async (tab) => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'pending') {
        const result = await adminApi.getPending()
        setPendingProfiles(result.data || [])
      } else if (tab === 'profiles') {
        const result = await profileApi.getAll()
        setAllProfiles(result.data || [])
      } else if (tab === 'users') {
        const result = await adminApi.getUsers()
        setUsers(result.data || [])
      } else if (tab === 'audit') {
        const result = await adminApi.getAuditLogs()
        setAuditLogs(result.data || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadTab(activeTab)
  }, [activeTab, loadTab])

  function switchTab(tab) {
    setActiveTab(tab)
    setMessage('')
    setError('')
  }

  async function handleReview(profileId, action) {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const result = await adminApi.reviewProfile(profileId, action, reviewReason)
      setMessage(result.message)
      setReviewReason('')
      await loadTab(activeTab)
      await loadStats()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleUser(u) {
    setSaving(true)
    setError('')
    try {
      const result = u.is_active
        ? await adminApi.deactivateUser(u.id)
        : await adminApi.reactivateUser(u.id)
      setMessage(result.message)
      await loadTab('users')
      await loadStats()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteProfile(profileId) {
    if (!window.confirm('Permanently delete this profile?')) return
    setSaving(true)
    setError('')
    try {
      const result = await profileApi.remove(profileId)
      setMessage(result.message)
      await loadTab(activeTab)
      await loadStats()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-section">
      <div className="page-section-header">
        <div>
          <h2 className="page-section-title">⚙️ Admin Dashboard</h2>
          <p className="page-section-subtitle">Manage donors, users, verifications, and audit trails.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => { loadStats(); loadTab(activeTab) }}>
          ↺ Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="summary-grid" style={{ marginBottom: 24 }}>
          <StatCard label="Total Users" value={stats.total_users} icon="👥" />
          <StatCard label="Active Users" value={stats.active_users} icon="✅" />
          <StatCard label="Total Profiles" value={stats.total_profiles} icon="📋" />
          <StatCard label="Pending Review" value={stats.pending_profiles} icon="⏳" />
          <StatCard label="Approved Donors" value={stats.approved_profiles} icon="✔️" />
          <StatCard label="Available Now" value={stats.available_donors} icon="🩸" />
        </div>
      )}

      {message && <div className="alert success-alert" style={{ marginBottom: 16 }}>{message}</div>}
      {error && <div className="alert error-alert" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Tab navigation */}
      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => switchTab(tab.id)}
          >
            {tab.label}
            {tab.id === 'pending' && stats?.pending_profiles > 0 && (
              <span className="tab-badge">{stats.pending_profiles}</span>
            )}
          </button>
        ))}
      </div>

      <div className="admin-tab-content">
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : (
          <>
            {/* PENDING REVIEWS */}
            {activeTab === 'pending' && (
              pendingProfiles.length === 0 ? (
                <div className="empty-state">
                  <span style={{ fontSize: 36 }}>🎉</span>
                  <p>No pending verification requests.</p>
                </div>
              ) : (
                <div className="review-list">
                  {pendingProfiles.map((profile) => (
                    <div className="review-card" key={profile.id}>
                      <div className="review-card-header">
                        <div>
                          <strong>{profile.full_name}</strong>
                          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                            {profile.email} · {profile.blood_group} · {profile.location || 'No location'}
                          </p>
                        </div>
                        <span className="verification-badge pending">{profile.verification_status}</span>
                      </div>

                      <label htmlFor={`reason-${profile.id}`} className="field review-field">
                        <span>Rejection reason (optional)</span>
                        <textarea
                          id={`reason-${profile.id}`}
                          value={reviewReason}
                          onChange={(e) => setReviewReason(e.target.value)}
                          rows="2"
                          placeholder="Enter reason if rejecting…"
                        />
                      </label>

                      <div className="review-actions">
                        <button type="button" className="delete-button" onClick={() => handleReview(profile.id, 'reject')} disabled={saving}>
                          ✕ Reject
                        </button>
                        <button type="button" className="secondary-button" onClick={() => handleReview(profile.id, 'suspend')} disabled={saving}>
                          🚫 Suspend
                        </button>
                        <button type="button" className="save-button" onClick={() => handleReview(profile.id, 'approve')} disabled={saving}>
                          ✓ Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ALL PROFILES */}
            {activeTab === 'profiles' && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Blood Group</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Available</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allProfiles.map((p) => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td><strong>{p.full_name}</strong></td>
                        <td><span className="blood-group-badge">{p.blood_group}</span></td>
                        <td>{p.email}</td>
                        <td>
                          <span className={`verification-badge ${(p.verification_status || 'pending').toLowerCase()}`}>
                            {p.verification_status}
                          </span>
                        </td>
                        <td>{p.is_available ? '✅' : '⭕'}</td>
                        <td>
                          <button
                            type="button"
                            className="delete-button"
                            style={{ padding: '5px 10px', fontSize: 12 }}
                            onClick={() => handleDeleteProfile(p.id)}
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ALL USERS */}
            {activeTab === 'users' && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className={!u.is_active ? 'row-inactive' : ''}>
                        <td>{u.id}</td>
                        <td><strong>{u.username}</strong></td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-pill ${u.role}`}>{u.role}</span>
                        </td>
                        <td>{u.is_active ? <span className="status-active">Active</span> : <span className="status-inactive">Inactive</span>}</td>
                        <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                        <td>
                          {u.id !== user.id && (
                            <button
                              type="button"
                              className={u.is_active ? 'delete-button' : 'secondary-button'}
                              style={{ padding: '5px 10px', fontSize: 12 }}
                              onClick={() => handleToggleUser(u)}
                              disabled={saving}
                            >
                              {u.is_active ? 'Deactivate' : 'Reactivate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* AUDIT LOG */}
            {activeTab === 'audit' && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Actor ID</th>
                      <th>Target</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                        </td>
                        <td><code className="audit-action">{log.action}</code></td>
                        <td>{log.actor_user_id}</td>
                        <td>{log.target_type ? `${log.target_type} #${log.target_id}` : '—'}</td>
                        <td style={{ fontSize: 12, color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
