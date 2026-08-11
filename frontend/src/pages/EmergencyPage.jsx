import { useCallback, useEffect, useState } from 'react'
import { emergencyApi } from '../services/profileApi'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const URGENCY_LABELS = { HIGH: '🔴 High', MEDIUM: '🟡 Medium', LOW: '🟢 Low' }

const emptyForm = { blood_group: '', location: '', contact: '', description: '', urgency: 'HIGH' }

function UrgencyBadge({ urgency }) {
  return (
    <span className={`urgency-badge urgency-${(urgency || 'HIGH').toLowerCase()}`}>
      {URGENCY_LABELS[urgency] || urgency}
    </span>
  )
}

function timeAgo(isoString) {
  if (!isoString) return ''
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function EmergencyPage({ user }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [bloodGroupFilter, setBloodGroupFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await emergencyApi.getAll()
      setRequests(result.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await emergencyApi.create(form)
      setMessage('Emergency request posted! Other donors can now see it.')
      setForm(emptyForm)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleClose(id) {
    if (!window.confirm('Mark this emergency request as resolved?')) return
    try {
      await emergencyApi.close(id)
      setMessage('Request closed successfully.')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const filtered = bloodGroupFilter
    ? requests.filter((r) => r.blood_group === bloodGroupFilter)
    : requests

  return (
    <div className="page-section">
      <div className="page-section-header">
        <div>
          <h2 className="page-section-title">🚨 Emergency Blood Requests</h2>
          <p className="page-section-subtitle">
            Active requests for urgent blood donation. Contact donors directly.
          </p>
        </div>
        <button
          type="button"
          className={showForm ? 'secondary-button' : 'save-button'}
          onClick={() => { setShowForm((v) => !v); setError(''); setMessage('') }}
        >
          {showForm ? '✕ Cancel' : '+ New Request'}
        </button>
      </div>

      {/* New Request Form */}
      {showForm && (
        <div className="emergency-form-card">
          <h3 className="emergency-form-title">Post Emergency Request</h3>
          {error && <div className="alert error-alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={{ marginTop: 16 }}>
              <label htmlFor="em-blood-group" className="field">
                <span>Blood Group Needed *</span>
                <select id="em-blood-group" name="blood_group" value={form.blood_group} onChange={handleChange} required>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </label>

              <label htmlFor="em-urgency" className="field">
                <span>Urgency Level *</span>
                <select id="em-urgency" name="urgency" value={form.urgency} onChange={handleChange} required>
                  <option value="HIGH">🔴 High — Critical / Immediate</option>
                  <option value="MEDIUM">🟡 Medium — Within 24 hours</option>
                  <option value="LOW">🟢 Low — Within a few days</option>
                </select>
              </label>

              <label htmlFor="em-location" className="field">
                <span>Hospital / Location *</span>
                <input id="em-location" type="text" name="location" value={form.location} onChange={handleChange} placeholder="e.g. Dhaka Medical College, Ward 5" required />
              </label>

              <label htmlFor="em-contact" className="field">
                <span>Contact Number *</span>
                <input id="em-contact" type="text" name="contact" value={form.contact} onChange={handleChange} placeholder="01XXXXXXXXX" required />
              </label>

              <label htmlFor="em-description" className="field full-width">
                <span>Additional Notes</span>
                <textarea id="em-description" name="description" value={form.description} onChange={handleChange} rows="3" placeholder="Patient condition, bags needed, any special instructions…" />
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-button" disabled={saving}>
                {saving ? 'Posting…' : '🚨 Post Emergency Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {message && <div className="alert success-alert">{message}</div>}

      {/* Filter row */}
      <div className="search-bar-row" style={{ marginTop: 20 }}>
        <select
          id="em-blood-group-filter"
          className="filter-select"
          value={bloodGroupFilter}
          onChange={(e) => setBloodGroupFilter(e.target.value)}
        >
          <option value="">All blood groups</option>
          {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
        </select>
        {bloodGroupFilter && (
          <button type="button" className="secondary-button" onClick={() => setBloodGroupFilter('')}>✕ Clear</button>
        )}
        <span className="filter-count">{filtered.length} active request{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <p className="empty-state">Loading requests…</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: 40 }}>✅</span>
          <p>No active emergency requests right now. That&apos;s great news!</p>
        </div>
      ) : (
        <div className="emergency-grid">
          {filtered.map((req) => (
            <article key={req.id} className={`emergency-card urgency-card-${(req.urgency || 'HIGH').toLowerCase()}`}>
              <div className="emergency-card-top">
                <div className="emergency-blood-group">{req.blood_group}</div>
                <UrgencyBadge urgency={req.urgency} />
                <span className="emergency-time">{timeAgo(req.created_at)}</span>
              </div>

              <div className="emergency-card-body">
                <p className="emergency-location">📍 {req.location}</p>
                <p className="emergency-contact">📞 {req.contact}</p>
                {req.description && (
                  <p className="emergency-description">{req.description}</p>
                )}
              </div>

              {(req.created_by === user.id || user.role === 'admin') && (
                <div className="emergency-card-footer">
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ fontSize: 12 }}
                    onClick={() => handleClose(req.id)}
                  >
                    ✓ Mark Resolved
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
