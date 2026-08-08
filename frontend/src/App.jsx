import { useCallback, useEffect, useState } from 'react'
import { adminApi, authApi, profileApi } from './services/profileApi'
import './App.css'

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  blood_group: '',
  address: '',
  location: '',
  gender: '',
  nid_number: '',
  nid_document_reference: '',
  date_of_birth: '',
  last_donation_date: '',
  is_available: true,
}

const bloodGroups = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
]

function profileToForm(profile) {
  return {
    full_name: profile.full_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    blood_group: profile.blood_group || '',
    address: profile.address || '',
    location: profile.location || '',
    gender: profile.gender || '',
    nid_number: profile.nid_number || '',
    nid_document_reference: profile.nid_document_reference || '',
    date_of_birth: profile.date_of_birth || '',
    last_donation_date: profile.last_donation_date || '',
    is_available: Boolean(profile.is_available),
  }
}

function App() {
  const [profiles, setProfiles] = useState([])
  const [selectedProfileId, setSelectedProfileId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
  })
  const [user, setUser] = useState(null)
  const [pendingProfiles, setPendingProfiles] = useState([])
  const [reviewReason, setReviewReason] = useState('')
  const [isAuthReady, setIsAuthReady] = useState(false)

  const loadProfiles = useCallback(async (preferredId = null) => {
    setLoading(true)
    setError('')

    try {
      const result = await profileApi.getAll()
      const profileList = result.data || []

      setProfiles(profileList)

      const selectedProfile = preferredId
        ? profileList.find((profile) => profile.id === preferredId)
        : profileList[0]

      if (selectedProfile) {
        setSelectedProfileId(selectedProfile.id)
        setForm(profileToForm(selectedProfile))
      } else {
        setSelectedProfileId(null)
        setForm(emptyForm)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPendingProfiles = useCallback(async () => {
    try {
      const result = await adminApi.getPending()
      setPendingProfiles(result.data || [])
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('authToken')

    if (!token) {
      setIsAuthReady(true)
      return
    }

    async function bootstrapAuth() {
      try {
        const result = await authApi.me()
        setUser(result.data)
      } catch {
        localStorage.removeItem('authToken')
        setUser(null)
      } finally {
        setIsAuthReady(true)
      }
    }

    bootstrapAuth()
  }, [])

  useEffect(() => {
    if (isAuthReady && user) {
      loadProfiles()

      if (user.role === 'admin') {
        loadPendingProfiles()
      }
    }
  }, [isAuthReady, user, loadProfiles, loadPendingProfiles])

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function selectProfile(profile) {
    setSelectedProfileId(profile.id)
    setForm(profileToForm(profile))
    setMessage('')
    setError('')
  }

  function createNewProfile() {
    setSelectedProfileId(null)
    setForm(emptyForm)
    setMessage('')
    setError('')
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (authMode === 'signup' && authForm.password !== authForm.confirm_password) {
      setError('Passwords do not match.')
      return
    }

    try {
      const result = authMode === 'signup'
        ? await authApi.signup(authForm)
        : await authApi.login({ email: authForm.email, password: authForm.password })

      localStorage.setItem('authToken', result.token)
      setUser(result.data)
      setMessage(result.message)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function handleAuthChange(event) {
    const { name, value } = event.target
    setAuthForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  async function handleLogout() {
    try {
      await authApi.logout()
    } catch {
      // ignore logout errors and clear local auth state
    }

    localStorage.removeItem('authToken')
    setUser(null)
    setPendingProfiles([])
    setMessage('Logged out successfully')
    window.location.href = '/'
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    const payload = {
      ...form,
      location: form.location || null,
      gender: form.gender || null,
      nid_number: form.nid_number || null,
      nid_document_reference: form.nid_document_reference || null,
      date_of_birth: form.date_of_birth || null,
      last_donation_date: form.last_donation_date || null,
    }

    try {
      const result = isAdmin && selectedProfileId
        ? await profileApi.update(selectedProfileId, payload)
        : await profileApi.create(payload)

      setMessage(result.message)

      const savedProfileId = result.data.id
      await loadProfiles(savedProfileId)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleReview(profileId, action) {
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const result = await adminApi.reviewProfile(profileId, action, reviewReason)
      setMessage(result.message)
      await loadProfiles()
      await loadPendingProfiles()
      setReviewReason('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedProfileId) {
      return
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this profile?',
    )

    if (!confirmed) {
      return
    }

    setSaving(true)
    setMessage('')
    setError('')

    try {
      const result = await profileApi.remove(selectedProfileId)
      setMessage(result.message)
      await loadProfiles()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const isAdmin = user?.role === 'admin'
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) || null

  const availableDonors = profiles.filter(
    (profile) => profile.is_available,
  ).length

  const uniqueBloodGroups = new Set(
    profiles.map((profile) => profile.blood_group),
  ).size

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">❤</span>
          <div>
            <h1>Smart Blood Donation</h1>
            <p>Emergency donor management platform</p>
          </div>
        </div>

        <span className="feature-badge">Profile Management</span>
      </header>

      <main className="page">
        {!isAuthReady ? (
          <p className="empty-state">Loading authentication...</p>
        ) : !user ? (
          <section className="auth-card">
            <div className="auth-header">
              <h2>{authMode === 'signup' ? 'Create your account' : 'Log in to continue'}</h2>
              <p>Users can add profiles. Admins can manage all profiles.</p>
            </div>

            <form className="profile-form" onSubmit={handleAuthSubmit}>
              {authMode === 'signup' && (
                <label className="field">
                  <span>Username</span>
                  <input
                    type="text"
                    name="username"
                    value={authForm.username}
                    onChange={handleAuthChange}
                    required
                  />
                </label>
              )}

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={authForm.email}
                  onChange={handleAuthChange}
                  required
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  value={authForm.password}
                  onChange={handleAuthChange}
                  required
                />
              </label>

              {authMode === 'signup' && (
                <label className="field">
                  <span>Confirm Password</span>
                  <input
                    type="password"
                    name="confirm_password"
                    value={authForm.confirm_password}
                    onChange={handleAuthChange}
                    required
                  />
                </label>
              )}

              <div className="form-actions">
                <button type="submit" className="save-button">
                  {authMode === 'signup' ? 'Sign up' : 'Log in'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setAuthMode(authMode === 'signup' ? 'login' : 'signup')
                    setError('')
                    setMessage('')
                  }}
                >
                  {authMode === 'signup' ? 'Already have an account?' : 'Create account'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <>
            <section className="summary-grid">
          <article className="summary-card">
            <span>Total Profiles</span>
            <strong>{profiles.length}</strong>
          </article>

          <article className="summary-card">
            <span>Available Donors</span>
            <strong>{availableDonors}</strong>
          </article>

          <article className="summary-card">
            <span>Blood Groups</span>
            <strong>{uniqueBloodGroups}</strong>
          </article>
        </section>

            <section className="workspace">
              <aside className="profile-panel">
            <div className="panel-heading">
              <div>
                <h2>Donor Profiles</h2>
                <p>Select a donor to edit</p>
              </div>

              <div className="panel-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleLogout}
                >
                  Logout
                </button>
                <button
                  type="button"
                  className="new-button"
                  onClick={createNewProfile}
                >
                  + New
                </button>
              </div>
            </div>

            <div className="profile-list">
              {loading && (
                <p className="empty-state">Loading profiles...</p>
              )}

              {!loading && profiles.length === 0 && (
                <p className="empty-state">
                  No profile found. Create your first donor profile.
                </p>
              )}

              {!loading &&
                profiles.map((profile) => (
                  <button
                    type="button"
                    key={profile.id}
                    className={`profile-item ${
                      selectedProfileId === profile.id
                        ? 'active'
                        : ''
                    }`}
                    onClick={() => selectProfile(profile)}
                  >
                    <span className="avatar">
                      {profile.full_name.charAt(0).toUpperCase()}
                    </span>

                    <span className="profile-item-text">
                      <strong>{profile.full_name}</strong>
                      <small>
                        {profile.blood_group} · {profile.phone}
                      </small>
                    </span>

                    <span className={`verification-badge ${String(profile.verification_status || 'pending').toLowerCase()}`}>
                      {profile.verification_status || 'PENDING'}
                    </span>

                    <span
                      className={`availability-dot ${
                        profile.is_available
                          ? 'available'
                          : 'unavailable'
                      }`}
                      title={
                        profile.is_available
                          ? 'Available'
                          : 'Unavailable'
                      }
                    />
                  </button>
                ))}
            </div>
              </aside>

              <section className="editor-panel">
            <div className="editor-heading">
              <div>
                <p className="eyebrow">
                  {selectedProfileId
                    ? `Profile ID: ${selectedProfileId}`
                    : 'New donor'}
                </p>

                <h2>
                  {selectedProfileId
                    ? 'Edit donor profile'
                    : 'Create donor profile'}
                </h2>

                <p>
                  {isAdmin
                    ? 'Admin can manage all profiles.'
                    : 'Users can add new profiles only.'}
                </p>
                {selectedProfile && (
                  <p className="verification-line">
                    Verification status: {selectedProfile.verification_status || 'PENDING'}
                  </p>
                )}
              </div>

              {selectedProfileId && isAdmin && (
                <button
                  type="button"
                  className="delete-button"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Delete Profile
                </button>
              )}
            </div>

            {message && (
              <div className="alert success-alert">{message}</div>
            )}

            {isAdmin && (
              <section className="review-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Pending verification requests</h3>
                    <p>Review donor submissions before they become visible to others.</p>
                  </div>
                </div>

                {pendingProfiles.length === 0 ? (
                  <p className="empty-state">No pending requests right now.</p>
                ) : (
                  pendingProfiles.map((profile) => (
                    <div className="review-card" key={profile.id}>
                      <div className="review-card-header">
                        <strong>{profile.full_name}</strong>
                        <span className="verification-badge pending">{profile.verification_status || 'PENDING'}</span>
                      </div>
                      <p>{profile.email}</p>
                      <label className="field review-field">
                        <span>Rejection reason</span>
                        <textarea
                          value={reviewReason}
                          onChange={(event) => setReviewReason(event.target.value)}
                          rows="2"
                          placeholder="Optional note for rejection"
                        />
                      </label>
                      <div className="review-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleReview(profile.id, 'reject')}
                          disabled={saving}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="save-button"
                          onClick={() => handleReview(profile.id, 'approve')}
                          disabled={saving}
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </section>
            )}

            {error && (
              <div className="alert error-alert">{error}</div>
            )}

            <form className="profile-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span>Full Name</span>
                  <input
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    required
                  />
                </label>

                <label className="field">
                  <span>Email Address</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="donor@example.com"
                    required
                  />
                </label>

                <label className="field">
                  <span>Phone Number</span>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="01XXXXXXXXX"
                    required
                  />
                </label>

                <label className="field">
                  <span>Blood Group</span>
                  <select
                    name="blood_group"
                    value={form.blood_group}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select blood group</option>

                    {bloodGroups.map((bloodGroup) => (
                      <option key={bloodGroup} value={bloodGroup}>
                        {bloodGroup}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Date of Birth</span>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={form.date_of_birth}
                    onChange={handleChange}
                  />
                </label>

                <label className="field">
                  <span>Last Donation Date</span>
                  <input
                    type="date"
                    name="last_donation_date"
                    value={form.last_donation_date}
                    onChange={handleChange}
                  />
                </label>

                <label className="field">
                  <span>Location</span>
                  <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="General location"
                  />
                </label>

                <label className="field">
                  <span>Gender</span>
                  <input
                    type="text"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    placeholder="Gender"
                  />
                </label>

                <label className="field">
                  <span>NID Number</span>
                  <input
                    type="text"
                    name="nid_number"
                    value={form.nid_number}
                    onChange={handleChange}
                    placeholder="Sensitive identity number"
                  />
                </label>

                <label className="field">
                  <span>NID Document Ref.</span>
                  <input
                    type="text"
                    name="nid_document_reference"
                    value={form.nid_document_reference}
                    onChange={handleChange}
                    placeholder="Internal reference only"
                  />
                </label>

                <label className="field full-width">
                  <span>Address</span>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter donor address"
                    rows="3"
                    required
                  />
                </label>
              </div>

              <label className="availability-control">
                <input
                  type="checkbox"
                  name="is_available"
                  checked={form.is_available}
                  onChange={handleChange}
                />

                <span>
                  <strong>Available for blood donation</strong>
                  <small>
                    Turn this off when the donor is temporarily
                    unavailable.
                  </small>
                </span>
              </label>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={createNewProfile}
                >
                  Clear Form
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : selectedProfileId
                      ? 'Update Profile'
                      : 'Create Profile'}
                </button>
              </div>
            </form>
              </section>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App