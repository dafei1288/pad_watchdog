import express from 'express'
import { createStore } from './db.js'

const store = createStore(process.env.PAD_DB || 'data/pad-watchdog.db')
const app = express()
app.use(express.json())

const int = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}

// ---------- 孩子 ----------

app.get('/api/children', (req, res) => res.json(store.listChildren()))

app.post('/api/children', (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  if (!name) return res.status(400).json({ error: 'name required' })
  res.json({ id: store.addChild(name) })
})

app.delete('/api/children/:id', (req, res) => {
  store.deleteChild(int(req.params.id))
  res.json({ ok: true })
})

// ---------- 配置 ----------

app.get('/api/children/:id/config', (req, res) => res.json(store.getConfig(int(req.params.id))))

app.put('/api/children/:id/config', (req, res) => {
  const childId = int(req.params.id)
  const { weeklyQuotaMin, sessionCapMin, maxBorrowMin } = req.body ?? {}
  store.saveConfig(childId, {
    ...(weeklyQuotaMin != null && { weeklyQuotaMin: Math.max(0, int(weeklyQuotaMin)) }),
    ...(sessionCapMin != null && { sessionCapMin: Math.max(1, int(sessionCapMin)) }),
    ...(maxBorrowMin != null && { maxBorrowMin: Math.max(0, int(maxBorrowMin)) }),
  })
  res.json(store.getConfig(childId))
})

// ---------- 会话 ----------

app.post('/api/sessions/start', (req, res) => {
  const childId = int(req.body?.childId)
  const plannedMin = req.body?.plannedMin != null ? Math.max(1, int(req.body.plannedMin)) : null
  if (childId == null) return res.status(400).json({ error: 'childId required' })
  if (!store.getWeekSummary(childId).canStart) return res.status(409).json({ error: '本周额度（含透支）已用完' })
  if (store.findActiveSession(childId)) return res.status(409).json({ error: '已有进行中的计时' })
  res.json({ id: store.startSession(childId, plannedMin) })
})

app.post('/api/sessions/:id/stop', (req, res) => {
  store.stopSession(int(req.params.id))
  res.json({ ok: true })
})

app.delete('/api/sessions/:id', (req, res) => {
  store.deleteSession(int(req.params.id))
  res.json({ ok: true })
})

app.get('/api/children/:id/active', (req, res) => {
  res.json(store.findActiveSession(int(req.params.id)) ?? null)
})

app.post('/api/children/:id/sessions', (req, res) => {
  const childId = int(req.params.id)
  const startAt = int(req.body?.startAt)
  const durationMin = int(req.body?.durationMin)
  if (startAt == null || !(durationMin > 0)) return res.status(400).json({ error: 'startAt/durationMin invalid' })
  res.json({ id: store.addManualSession(childId, startAt, durationMin) })
})

app.get('/api/children/:id/sessions', (req, res) => {
  const from = int(req.query.from) ?? 0
  const to = int(req.query.to) ?? Date.now() + 86400000
  res.json(store.sessionsInRange(int(req.params.id), from, to))
})

// ---------- 每日评分 ----------

app.put('/api/children/:id/ratings', (req, res) => {
  const childId = int(req.params.id)
  const date = String(req.body?.date ?? '')
  const score = req.body?.score == null ? null : int(req.body.score)
  const note = String(req.body?.note ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date invalid' })
  if (score != null && (score < 1 || score > 5)) return res.status(400).json({ error: 'score must be 1-5' })
  store.setRating(childId, date, score, note)
  res.json({ ok: true })
})

app.get('/api/children/:id/ratings', (req, res) => {
  const from = String(req.query.from ?? '0000-01-01')
  const to = String(req.query.to ?? '9999-12-31')
  res.json(store.ratingsInRange(int(req.params.id), from, to))
})

// ---------- 汇总 ----------

app.get('/api/children/:id/summary', (req, res) => {
  res.json(store.getWeekSummary(int(req.params.id)))
})

const port = int(process.env.PORT) ?? 5273
app.listen(port, () => console.log(`pad-watchdog API listening on http://localhost:${port}`))
