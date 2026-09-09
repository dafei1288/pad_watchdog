const TOKEN_KEY = 'pad-token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function req(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const r = await fetch(`/api${path}`, { ...opts, headers })
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    const err = new Error(body.error || `HTTP ${r.status}`)
    err.status = r.status
    throw err
  }
  return r.json()
}

export const api = {
  authStatus: () => req('/auth/status'),
  setup: (password) => req('/auth/setup', { method: 'POST', body: JSON.stringify({ password }) }),
  login: (password) => req('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => req('/auth/logout', { method: 'POST' }),

  listChildren: () => req('/children'),
  addChild: (name) => req('/children', { method: 'POST', body: JSON.stringify({ name }) }),
  updateChild: (id, patch) => req(`/children/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteChild: (id) => req(`/children/${id}`, { method: 'DELETE' }),
  getConfig: (id) => req(`/children/${id}/config`),
  saveConfig: (id, cfg) => req(`/children/${id}/config`, { method: 'PUT', body: JSON.stringify(cfg) }),
  summary: (id) => req(`/children/${id}/summary`),
  active: (childId) => req(`/children/${childId}/active`),
  start: (childId, plannedMin) => req('/sessions/start', { method: 'POST', body: JSON.stringify({ childId, plannedMin }) }),
  stop: (id) => req(`/sessions/${id}/stop`, { method: 'POST' }),
  deleteSession: (id) => req(`/sessions/${id}`, { method: 'DELETE' }),
  addManual: (childId, startAt, durationMin) =>
    req(`/children/${childId}/sessions`, { method: 'POST', body: JSON.stringify({ startAt, durationMin }) }),
  sessionsInRange: (childId, from, to) => req(`/children/${childId}/sessions?from=${from}&to=${to}`),
  setRating: (childId, date, score, note) =>
    req(`/children/${childId}/ratings`, { method: 'PUT', body: JSON.stringify({ date, score, note }) }),
  ratings: (childId, from, to) => req(`/children/${childId}/ratings?from=${from}&to=${to}`),
}
