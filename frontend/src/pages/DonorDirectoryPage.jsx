import { useCallback, useEffect, useMemo, useState } from 'react'
import { profileApi } from '../services/profileApi'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

// ── Donor contact modal ──────────────────────────────────────────────────────

function DonorModal({ profile, onClose }) {
  // Close on backdrop click or Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const avail = profile.is_available

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Contact ${profile.full_name}`}>
      <div className="donor-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="donor-modal-header">
          <div className="donor-modal-avatar">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="donor-modal-name">{profile.full_name}</h2>
            <div className="donor-modal-sub">
              <span
                className={`blood-group-badge bg-${(profile.blood_group || '').replace('+', 'pos').replace('-', 'neg')}`}
              >
                {profile.blood_group}
              </span>
              <span
                className="availability-dot"
                style={{ width: 8, height: 8 }}
                title={avail ? 'Available' : 'Unavailable'}
                data-avail={avail ? 'available' : 'unavailable'}
              />
              {avail ? 'Available to donate' : 'Currently unavailable'}
            </div>
          </div>
          <button type="button" className="donor-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Details */}
        <div className="donor-modal-body">
          {profile.location && (
            <div className="donor-modal-row">
              <span className="donor-modal-row-icon">📍</span>
              <div>
                <span className="donor-modal-row-label">Location</span>
                <span className="donor-modal-row-value">{profile.location}</span>
              </div>
            </div>
          )}
          {profile.gender && (
            <div className="donor-modal-row">
              <span className="donor-modal-row-icon">👤</span>
              <div>
                <span className="donor-modal-row-label">Gender</span>
                <span className="donor-modal-row-value">{profile.gender}</span>
              </div>
            </div>
          )}
          {profile.last_donation_date && (
            <div className="donor-modal-row">
              <span className="donor-modal-row-icon">🩸</span>
              <div>
                <span className="donor-modal-row-label">Last Donation</span>
                <span className="donor-modal-row-value">
                  {new Date(profile.last_donation_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          )}
          {profile.phone && (
            <div className="donor-modal-row">
              <span className="donor-modal-row-icon">📞</span>
              <div>
                <span className="donor-modal-row-label">Phone</span>
                <span className="donor-modal-row-value">{profile.phone}</span>
              </div>
            </div>
          )}
          {profile.email && (
            <div className="donor-modal-row">
              <span className="donor-modal-row-icon">📧</span>
              <div>
                <span className="donor-modal-row-label">Email</span>
                <span className="donor-modal-row-value">{profile.email}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="donor-modal-actions">
          {profile.phone && (
            <a
              href={`tel:${profile.phone}`}
              className="donor-modal-action-btn donor-modal-call"
            >
              📞 Call Now
            </a>
          )}
          {profile.email && (
            <a
              href={`mailto:${profile.email}?subject=Blood%20Donation%20Request&body=Hi%20${encodeURIComponent(profile.full_name)}%2C%0A%0AI%20would%20like%20to%20request%20a%20blood%20donation.`}
              className="donor-modal-action-btn donor-modal-email"
            >
              ✉️ Email
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function DonorDirectoryPage({ user }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDonor, setSelectedDonor] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [bloodGroupFilter, setBloodGroupFilter] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await profileApi.getAll()
      setProfiles(result.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return profiles.filter((p) => {
      // Non-admin users only see APPROVED profiles
      if (user?.role !== 'admin' && p.verification_status !== 'APPROVED') return false

      if (q && !(
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q)
      )) return false

      if (bloodGroupFilter && p.blood_group !== bloodGroupFilter) return false

      if (availabilityFilter === 'available' && !p.is_available) return false
      if (availabilityFilter === 'unavailable' && p.is_available) return false

      if (locationFilter && !p.location?.toLowerCase().includes(locationFilter.toLowerCase())) return false

      return true
    })
  }, [profiles, search, bloodGroupFilter, availabilityFilter, locationFilter, user?.role])

  function clearFilters() {
    setSearch('')
    setBloodGroupFilter('')
    setAvailabilityFilter('all')
    setLocationFilter('')
  }

  const hasFilters = search || bloodGroupFilter || availabilityFilter !== 'all' || locationFilter

  return (
    <>
      {/* Donor contact modal */}
      {selectedDonor && (
        <DonorModal profile={selectedDonor} onClose={() => setSelectedDonor(null)} />
      )}

      <div className="page-section">
        <div className="page-section-header">
          <div>
            <h2 className="page-section-title">Donor Directory</h2>
            <p className="page-section-subtitle">
              {loading ? 'Loading donors…' : `${filtered.length} verified donor${filtered.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <button type="button" className="secondary-button" onClick={load} disabled={loading}>
            ↺ Refresh
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="search-bar-row">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              id="directory-search"
              type="search"
              className="search-input"
              placeholder="Search by name, email, or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            id="directory-blood-group-filter"
            className="filter-select"
            value={bloodGroupFilter}
            onChange={(e) => setBloodGroupFilter(e.target.value)}
          >
            <option value="">All blood groups</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>

          <select
            id="directory-availability-filter"
            className="filter-select"
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
          >
            <option value="all">All availability</option>
            <option value="available">Available only</option>
            <option value="unavailable">Unavailable</option>
          </select>

          <input
            id="directory-location-filter"
            type="text"
            className="filter-select"
            placeholder="Filter by location…"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            style={{ minWidth: 160 }}
          />

          {hasFilters && (
            <button type="button" className="secondary-button" onClick={clearFilters}>
              ✕ Clear
            </button>
          )}
        </div>

        {error && <div className="alert error-alert">{error}</div>}

        {loading ? (
          <div className="donor-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="donor-card donor-card-skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: 40 }}>🩸</span>
            <p>No donors match your current filters.</p>
            {hasFilters && (
              <button type="button" className="secondary-button" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="donor-grid">
            {filtered.map((profile, index) => (
              <article
                key={profile.id}
                className="donor-card donor-card-animated"
                style={{ animationDelay: `${Math.min(index * 60, 480)}ms` }}
                data-clickable="true"
                onClick={() => setSelectedDonor(profile)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedDonor(profile) }}
                aria-label={`View contact details for ${profile.full_name}`}
              >
                <div className="donor-card-top">
                  <div className="donor-avatar-wrap">
                    <span className="avatar">{profile.full_name.charAt(0).toUpperCase()}</span>
                    <span
                      className={`availability-dot ${profile.is_available ? 'available' : 'unavailable'}`}
                      title={profile.is_available ? 'Available' : 'Unavailable'}
                    />
                  </div>

                  <div className="donor-meta">
                    <strong className="donor-name">{profile.full_name}</strong>
                    <span className={`blood-group-badge bg-${(profile.blood_group || '').replace('+', 'pos').replace('-', 'neg')}`}>
                      {profile.blood_group}
                    </span>
                  </div>

                  {user?.role === 'admin' && (
                    <span className={`verification-badge ${(profile.verification_status || 'pending').toLowerCase()}`}>
                      {profile.verification_status || 'PENDING'}
                    </span>
                  )}
                </div>

                <div className="donor-card-body">
                  {profile.location && (
                    <p className="donor-info-row">📍 {profile.location}</p>
                  )}
                  {profile.gender && (
                    <p className="donor-info-row">👤 {profile.gender}</p>
                  )}
                  {profile.last_donation_date && (
                    <p className="donor-info-row">
                      🩸 Last donation: {new Date(profile.last_donation_date).toLocaleDateString()}
                    </p>
                  )}
                  <p className="donor-info-row" style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
                    Tap to view contact →
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
