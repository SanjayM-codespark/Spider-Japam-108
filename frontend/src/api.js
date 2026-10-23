// The backend serves both the site and the API from the same origin under

// const API_URL = import.meta.env.VITE_API_URL || '/api'
const API_URL = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`
const TOKEN_KEY = 'naamjap_token'

// Uploaded files are served from the server root, not from under /api, so the
// admin panel builds those URLs from this instead of API_URL.
const ASSET_URL = API_URL.replace(/\/api\/?$/, '')

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('naamjap_admin')
}

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) }

  // FormData has to keep the Content-Type unset so the browser can add the
  // multipart boundary. Setting application/json here produces a body the
  // server cannot parse.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

  if (!headers['Content-Type'] && options.body && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (response.status === 401) {
    clearSession()
  }

  return response
}

/**
 * Turns a stored image path into something an <img> can load. Paths are kept
 * relative in the database so a row is not tied to one host, which means the
 * caller has to supply the origin.
 */
function assetUrl(storedPath) {
  if (!storedPath) return ''
  if (/^https?:\/\//i.test(storedPath)) return storedPath
  return `${ASSET_URL}${storedPath.startsWith('/') ? '' : '/'}${storedPath}`
}

export { API_URL, ASSET_URL, getToken, clearSession, apiFetch, assetUrl }
