const API_URL = '/api/profiles'
const AUTH_URL = '/api/auth'
const ADMIN_URL = '/api/admin'
const EMERGENCY_URL = '/api/emergency'

async function request(url, options = {}) {
  const token = localStorage.getItem('authToken')

  const headers = {
    ...(options.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(url, {
      ...options,
      headers,
    })
  } catch (networkError) {
    throw new Error('Network error: Unable to connect to backend server.')
  }

  const contentType = response.headers.get('content-type') || ''
  let result = null

  if (contentType.includes('application/json')) {
    try {
      result = await response.json()
    } catch {
      result = null
    }
  } else {
    const text = await response.text().catch(() => '')
    if (!response.ok) {
      throw new Error(text || `Server error (${response.status}).`)
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('authToken')
    }

    const validationErrors = result?.errors
      ? Object.values(result.errors).join(' ')
      : ''

    const fallbackMessage =
      response.status === 401
        ? 'Your session has expired. Please log in again.'
        : `Request failed with status ${response.status}.`

    throw new Error(validationErrors || result?.message || fallbackMessage)
  }

  return result
}

export const authApi = {
  async signup(payload) {
    return request(`${AUTH_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  async login(payload) {
    return request(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  async me() {
    return request(`${AUTH_URL}/me`)
  },

  async logout() {
    return request(`${AUTH_URL}/logout`, { method: 'POST' })
  },
}

export const profileApi = {
  getAll() {
    return request(API_URL)
  },

  getMine() {
    return request(`${API_URL}/me`)
  },

  getOne(profileId) {
    return request(`${API_URL}/${profileId}`)
  },

  create(profileData) {
    return request(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    })
  },

  update(profileId, profileData) {
    return request(`${API_URL}/${profileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    })
  },

  remove(profileId) {
    return request(`${API_URL}/${profileId}`, { method: 'DELETE' })
  },
}

export const adminApi = {
  getPending() {
    return request(`${ADMIN_URL}/profiles/pending`)
  },

  getStats() {
    return request(`${ADMIN_URL}/stats`)
  },

  getUsers(skip = 0, limit = 50) {
    return request(`${ADMIN_URL}/users?skip=${skip}&limit=${limit}`)
  },

  getAuditLogs(skip = 0, limit = 50) {
    return request(`${ADMIN_URL}/audit-logs?skip=${skip}&limit=${limit}`)
  },

  reviewProfile(profileId, action, reason = '') {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }

    if (action === 'reject') {
      return request(`${ADMIN_URL}/profiles/${profileId}/reject`, {
        ...options,
        body: JSON.stringify({ reason }),
      })
    }

    return request(`${ADMIN_URL}/profiles/${profileId}/${action}`, options)
  },

  deactivateUser(userId) {
    return request(`${ADMIN_URL}/users/${userId}/deactivate`, { method: 'POST' })
  },

  reactivateUser(userId) {
    return request(`${ADMIN_URL}/users/${userId}/reactivate`, { method: 'POST' })
  },
}

export const emergencyApi = {
  getAll() {
    return request(EMERGENCY_URL)
  },

  create(data) {
    return request(EMERGENCY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  close(requestId) {
    return request(`${EMERGENCY_URL}/${requestId}`, { method: 'DELETE' })
  },
}