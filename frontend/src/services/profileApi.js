const API_URL = 'http://127.0.0.1:8000/api/profiles'

async function request(url, options = {}) {
  const response = await fetch(url, options)
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