/**
 * API base URL - set in env or default for development.
 * Replace with your backend URL when deploying.
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`
  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body)
  }
  const res = await fetch(url, config)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || res.statusText || 'Request failed')
  // Standardized API: { success: true, data } -> return data for convenience
  if (data && data.success === true && typeof data.data !== 'undefined') return data.data
  return data
}

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
}

export default api
