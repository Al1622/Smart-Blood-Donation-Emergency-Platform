const API_URL = 'http://127.0.0.1:5000/api/profiles'
const AUTH_URL = 'http://127.0.0.1:5000/api/auth'
const ADMIN_URL = 'http://127.0.0.1:5000/api/admin'

async function request(url, options = {}) {
  const token = localStorage.getItem('authToken')

  const headers = {
    ...(options.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const result = await response.json()

  if (!response.ok) {
    const validationErrors = result.errors
      ? Object.values(result.errors).join(' ')
      : ''

    throw new Error(
      validationErrors || result.message || 'Request failed.',
    )
  }

  return result
}

export const authApi = {
  async signup(payload) {
    return request(`${AUTH_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  },

  async login(payload) {
    return request(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  },

  async me() {
    return request(`${AUTH_URL}/me`)
  },

  async logout() {
    return request(`${AUTH_URL}/logout`, {
      method: 'POST',
    })
  },
}

export const profileApi = {
  getAll() {
    return request(API_URL)
  },

  getOne(profileId) {
    return request(`${API_URL}/${profileId}`)
  },

  create(profileData) {
    return request(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    })
  },

  update(profileId, profileData) {
    return request(`${API_URL}/${profileId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    })
  },

  remove(profileId) {
    return request(`${API_URL}/${profileId}`, {
      method: 'DELETE',
    })
  },
}

export const adminApi = {
  getPending() {
    return request(`${ADMIN_URL}/profiles/pending`)
  },

  reviewProfile(profileId, action, reason = '') {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (action === 'reject') {
      return request(`${ADMIN_URL}/profiles/${profileId}/reject`, {
        ...options,
        body: JSON.stringify({ reason }),
      })
    }

    return request(`${ADMIN_URL}/profiles/${profileId}/${action}`, options)
  },
}