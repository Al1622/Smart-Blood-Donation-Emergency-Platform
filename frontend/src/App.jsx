import { useCallback, useEffect, useState } from 'react'
import { profileApi } from './services/profileApi'
import './App.css'

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  blood_group: '',
  address: '',
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

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

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

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    const payload = {
      ...form,
      date_of_birth: form.date_of_birth || null,
      last_donation_date: form.last_donation_date || null,
    }

    try {
      const result = selectedProfileId
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

              <button
                type="button"
                className="new-button"
                onClick={createNewProfile}
              >
                + New
              </button>
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
                  Update personal information and donation availability.
                </p>
              </div>

              {selectedProfileId && (
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
      </main>
    </div>
  )
}

export default App