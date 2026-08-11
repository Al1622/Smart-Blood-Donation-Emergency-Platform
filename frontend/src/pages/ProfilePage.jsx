import { useCallback, useEffect, useState } from 'react'
import { profileApi } from '../services/profileApi'

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

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

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

function VerificationBanner({ status, rejectionReason }) {
  if (!status || status === 'PENDING') {
    return (
      <div className="verification-banner pending">
        <span className="vb-icon">⏳</span>
        <div>
          <strong>Verification Pending</strong>
          <p>Your profile has been submitted and is awaiting admin review. You&apos;ll be visible in the donor directory once approved.</p>
        </div>
      </div>
    )
  }
  if (status === 'APPROVED') {
    return (
      <div className="verification-banner approved">
        <span className="vb-icon">✅</span>
        <div>
          <strong>Profile Verified</strong>
          <p>Your profile is approved and visible in the donor directory.</p>
        </div>
      </div>
    )
  }
  if (status === 'REJECTED') {
    return (
      <div className="verification-banner rejected">
        <span className="vb-icon">❌</span>
        <div>
          <strong>Profile Rejected</strong>
          {rejectionReason && <p>Reason: {rejectionReason}</p>}
          <p>Please update the information below and save to re-submit for review.</p>
        </div>
      </div>
    )
  }
  if (status === 'SUSPENDED') {
    return (
      <div className="verification-banner suspended">
        <span className="vb-icon">🚫</span>
        <div>
          <strong>Profile Suspended</strong>
          <p>Your profile has been suspended by an administrator. Please contact support.</p>
        </div>
      </div>
    )
  }
  return null
}

export default function ProfilePage({ user }) {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const isCreating = !profile

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await profileApi.getAll()
      const all = result.data || []
      const mine = all.find((p) => p.user_id === user.id)
      if (mine) {
        setProfile(mine)
        setForm(profileToForm(mine))
      } else {
        setProfile(null)
        setForm(emptyForm)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => { load() }, [load])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
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
      const result = profile
        ? await profileApi.update(profile.id, payload)
        : await profileApi.create(payload)

      setMessage(result.message)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="page-section"><p className="empty-state">Loading your profile…</p></div>
  }

  return (
    <div className="page-section">
      <div className="page-section-header">
        <div>
          <h2 className="page-section-title">
            {isCreating ? 'Create Donor Profile' : 'My Donor Profile'}
          </h2>
          <p className="page-section-subtitle">
            {isCreating
              ? 'Register as a blood donor. Your profile will be reviewed before being listed.'
              : 'Manage your donor information. Edits to personal data will require re-verification.'}
          </p>
        </div>
      </div>

      {profile && (
        <VerificationBanner
          status={profile.verification_status}
          rejectionReason={profile.rejection_reason}
        />
      )}

      {message && <div className="alert success-alert" style={{ margin: '0 0 20px' }}>{message}</div>}
      {error && <div className="alert error-alert" style={{ margin: '0 0 20px' }}>{error}</div>}

      <div className="profile-editor-card">
        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label htmlFor="pf-full-name" className="field">
              <span>Full Name *</span>
              <input id="pf-full-name" type="text" name="full_name" value={form.full_name} onChange={handleChange} placeholder="Your full name" required />
            </label>

            <label htmlFor="pf-email" className="field">
              <span>Email Address *</span>
              <input id="pf-email" type="email" name="email" value={form.email} onChange={handleChange} placeholder="donor@example.com" required />
            </label>

            <label htmlFor="pf-phone" className="field">
              <span>Phone Number *</span>
              <input id="pf-phone" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="01XXXXXXXXX" required />
            </label>

            <label htmlFor="pf-blood-group" className="field">
              <span>Blood Group *</span>
              <select id="pf-blood-group" name="blood_group" value={form.blood_group} onChange={handleChange} required>
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </label>

            <label htmlFor="pf-dob" className="field">
              <span>Date of Birth</span>
              <input id="pf-dob" type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} />
            </label>

            <label htmlFor="pf-last-donation" className="field">
              <span>Last Donation Date</span>
              <input id="pf-last-donation" type="date" name="last_donation_date" value={form.last_donation_date} onChange={handleChange} />
            </label>

            <label htmlFor="pf-gender" className="field">
              <span>Gender</span>
              <select id="pf-gender" name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label htmlFor="pf-location" className="field">
              <span>Location</span>
              <input id="pf-location" type="text" name="location" value={form.location} onChange={handleChange} placeholder="e.g. Dhaka, Mirpur" />
            </label>

            <label htmlFor="pf-nid" className="field">
              <span>NID Number</span>
              <input id="pf-nid" type="text" name="nid_number" value={form.nid_number} onChange={handleChange} placeholder="National ID number" />
            </label>

            <label htmlFor="pf-nid-ref" className="field">
              <span>NID Document Reference</span>
              <input id="pf-nid-ref" type="text" name="nid_document_reference" value={form.nid_document_reference} onChange={handleChange} placeholder="Internal reference" />
            </label>

            <label htmlFor="pf-address" className="field full-width">
              <span>Address *</span>
              <textarea id="pf-address" name="address" value={form.address} onChange={handleChange} placeholder="Full postal address" rows="3" required />
            </label>
          </div>

          <label htmlFor="pf-available" className="availability-control">
            <input id="pf-available" type="checkbox" name="is_available" checked={form.is_available} onChange={handleChange} />
            <span>
              <strong>Available for blood donation</strong>
              <small>Uncheck when you are temporarily unavailable to donate.</small>
            </span>
          </label>

          <div className="form-actions">
            {!isCreating && (
              <button type="button" className="secondary-button" onClick={() => setForm(profileToForm(profile))}>
                Reset Changes
              </button>
            )}
            <button type="submit" className="save-button" disabled={saving}>
              {saving ? 'Saving…' : isCreating ? 'Register as Donor' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
