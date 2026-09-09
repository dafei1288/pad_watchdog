import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { createStore } from './db.js'
import { hashPassword, verifyPassword, newToken } from './auth.js'

const store = createStore(process.env.PAD_DB || 'data/pad-watchdog.db')
const app = express()
app.use(express.json({ limit: '2mb' })) // 头像为 base64，放宽 JSON 体积

// 生产模式：托管前端构建产物（SPA 回退到 index.html）
const distDir = path.resolve('dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
}

// 内存 token 表：重启服务后需重新登录
const tokens = new Set()

function requireAuth(req, res, next) {
  const token = String(req.headers.authorization ?? '').replace(/^Bearer /, '')
  if (token && tokens.has(token)) return next()
  res.status(401).json({ error: 'unauthorized' })
}

const int = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}

// ---------- 认证（仅保护配置类操作） ----------

app.get('/api/auth/status', (req, res) => {
  res.json({ hasPassword: store.getMeta('passwordHash') != null })
})

app.post('/api/auth/setup', (req, res) => {
  if (store.getMeta('passwordHash') != null) return res.status(409).json({ error: '密码已设置' })
  const password = String(req.body?.password ?? '')
  if (password.length < 4) return res.status(400).json({ error: '密码至少 4 位' })
  store.setMeta('passwordHash', hashPassword(password))
  const token = newToken()
  tokens.add(token)
  res.json({ token })
})

app.post('/api/auth/login', (req, res) => {
  const hash = store.getMeta('passwordHash')
  if (hash == null) return res.status(409).json({ error: '尚未设置密码' })
  if (!verifyPassword(String(req.body?.password ?? ''), hash)) return res.status(401).json({ error: '密码错误' })
  const token = newToken()
  tokens.add(token)
  res.json({ token })
})

app.post('/api/auth/logout', (req, res) => {
  const token = String(req.headers.authorization ?? '').replace(/^Bearer /, '')
  tokens.delete(token)
  res.json({ ok: true })
})

// ---------- 孩子 ----------

app.get('/api/children', (req, res) => res.json(store.listChildren()))

app.post('/api/children', requireAuth, (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  if (!name) return res.status(400).json({ error: 'name required' })
  res.json({ id: store.addChild(name) })
})

app.patch('/api/children/:id', requireAuth, (req, res) => {
  const childId = int(req.params.id)
  const { name, avatar } = req.body ?? {}
  const patch = {}
  if (name != null) {
    const n = String(name).trim()
    if (!n) return res.status(400).json({ error: 'name required' })
    patch.name = n
  }
  if (avatar !== undefined) patch.avatar = avatar === null ? '' : String(avatar)
  store.updateChild(childId, patch)
  res.json({ ok: true })
})

app.delete('/api/children/:id', requireAuth, (req, res) => {
  store.deleteChild(int(req.params.id))
  res.json({ ok: true })
})

// ---------- 配置 ----------

app.get('/api/children/:id/config', (req, res) => res.json(store.getConfig(int(req.params.id))))

app.put('/api/children/:id/config', requireAuth, (req, res) => {
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
// SPA 回退：非 API 的 GET 一律回 index.html（放在所有路由之后）
if (fs.existsSync(distDir)) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(port, () => console.log(`pad-watchdog API listening on http://localhost:${port}`))
