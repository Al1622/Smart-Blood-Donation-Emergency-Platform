import { useCallback, useEffect, useMemo, useState } from 'react'
import { profileApi } from '../services/profileApi'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function statusColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'approved': return 'approved'
    case 'rejected': return 'rejected'
    case 'suspended': return 'suspended'
    default: return 'pending'
  }
}

export default function DonorDirectoryPage({ user }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
  }, [profiles, search, bloodGroupFilter, availabilityFilter, locationFilter])

  function clearFilters() {
    setSearch('')
    setBloodGroupFilter('')
    setAvailabilityFilter('all')
    setLocationFilter('')
  }

  const hasFilters = search || bloodGroupFilter || availabilityFilter !== 'all' || locationFilter

  return (
    <div className="page-section">
      <div className="page-section-header">
        <div>
          <h2 className="page-section-title">Donor Directory</h2>
          <p className="page-section-subtitle">
            {loading ? 'Loading donors…' : `${filtered.length} donor${filtered.length !== 1 ? 's' : ''} found`}
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
          {filtered.map((profile) => (
            <article key={profile.id} className="donor-card">
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

                <span className={`verification-badge ${statusColor(profile.verification_status)}`}>
                  {profile.verification_status || 'PENDING'}
                </span>
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
              </div>

              {user?.role === 'admin' && (
                <div className="donor-card-footer">
                  <span className="donor-contact">📧 {profile.email}</span>
                  <span className="donor-contact">📞 {profile.phone}</span>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
