async function req(path, opts = {}) {
  const r = await fetch(`/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json' },
  })
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${r.status}`)
  }
  return r.json()
}

export const api = {
  listChildren: () => req('/children'),
  addChild: (name) => req('/children', { method: 'POST', body: JSON.stringify({ name }) }),
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
