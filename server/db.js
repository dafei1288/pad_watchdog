import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
// createRequire 绕过 Vite/Vitest 的模块解析（其内建清单不含 node:sqlite）
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite')
import {
  DEFAULTS,
  WEEK_MS,
  weekStartOf,
  weekUsedMin,
  weekRemainingMin,
  currentOverdraftMin,
  canStartSession,
  settleBorrowMin,
} from '../src/rules.js'

const PALETTE = ['#2f54eb', '#eb2f96', '#52c41a', '#fa8c16', '#722ed1', '#13c2c2']

export function createStore(dbPath = 'data/pad-watchdog.db') {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  }
  const db = new DatabaseSync(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS configs (
      childId INTEGER PRIMARY KEY,
      weeklyQuotaMin INTEGER NOT NULL,
      sessionCapMin INTEGER NOT NULL,
      maxBorrowMin INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      childId INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      startAt INTEGER NOT NULL,
      endAt INTEGER,
      durationMin INTEGER,
      plannedMin INTEGER,
      source TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_child ON sessions(childId, startAt);
    CREATE TABLE IF NOT EXISTS weekLedgers (
      childId INTEGER NOT NULL,
      weekStart INTEGER NOT NULL,
      borrowedMin INTEGER NOT NULL,
      PRIMARY KEY (childId, weekStart)
    );
    CREATE TABLE IF NOT EXISTS ratings (
      childId INTEGER NOT NULL,
      date TEXT NOT NULL,
      score INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (childId, date)
    );
  `)

  const q = {
    listChildren: db.prepare('SELECT * FROM children ORDER BY id'),
    insertChild: db.prepare('INSERT INTO children (name, color, createdAt) VALUES (?, ?, ?)'),
    childCount: db.prepare('SELECT COUNT(*) AS n FROM children'),
    deleteChild: db.prepare('DELETE FROM children WHERE id = ?'),
    deleteChildSessions: db.prepare('DELETE FROM sessions WHERE childId = ?'),
    deleteChildLedgers: db.prepare('DELETE FROM weekLedgers WHERE childId = ?'),
    deleteChildConfig: db.prepare('DELETE FROM configs WHERE childId = ?'),
    getConfig: db.prepare('SELECT * FROM configs WHERE childId = ?'),
    putConfig: db.prepare(`INSERT INTO configs (childId, weeklyQuotaMin, sessionCapMin, maxBorrowMin)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(childId) DO UPDATE SET weeklyQuotaMin=excluded.weeklyQuotaMin,
        sessionCapMin=excluded.sessionCapMin, maxBorrowMin=excluded.maxBorrowMin`),
    insertSession: db.prepare('INSERT INTO sessions (childId, startAt, endAt, durationMin, plannedMin, source) VALUES (?, ?, ?, ?, ?, ?)'),
    getSession: db.prepare('SELECT * FROM sessions WHERE id = ?'),
    finishSession: db.prepare('UPDATE sessions SET endAt = ?, durationMin = ? WHERE id = ?'),
    deleteSession: db.prepare('DELETE FROM sessions WHERE id = ?'),
    childSessions: db.prepare('SELECT * FROM sessions WHERE childId = ? ORDER BY startAt'),
    getLedger: db.prepare('SELECT * FROM weekLedgers WHERE childId = ? AND weekStart = ?'),
    putLedger: db.prepare('INSERT OR IGNORE INTO weekLedgers (childId, weekStart, borrowedMin) VALUES (?, ?, ?)'),
    putRating: db.prepare(`INSERT INTO ratings (childId, date, score, note) VALUES (?, ?, ?, ?)
      ON CONFLICT(childId, date) DO UPDATE SET score=excluded.score, note=excluded.note`),
    deleteRating: db.prepare('DELETE FROM ratings WHERE childId = ? AND date = ?'),
    ratingsInRange: db.prepare('SELECT * FROM ratings WHERE childId = ? AND date >= ? AND date <= ? ORDER BY date'),
    deleteChildRatings: db.prepare('DELETE FROM ratings WHERE childId = ?'),
  }

  // ---------- 孩子与配置 ----------

  function listChildren() {
    return q.listChildren.all()
  }

  function addChild(name, now = Date.now()) {
    const color = PALETTE[q.childCount.get().n % PALETTE.length]
    const id = Number(q.insertChild.run(name, color, now).lastInsertRowid)
    q.putConfig.run(id, DEFAULTS.weeklyQuotaMin, DEFAULTS.sessionCapMin, DEFAULTS.maxBorrowMin)
    return id
  }

  function deleteChild(childId) {
    q.deleteChildSessions.run(childId)
    q.deleteChildLedgers.run(childId)
    q.deleteChildConfig.run(childId)
    q.deleteChildRatings.run(childId)
    q.deleteChild.run(childId)
  }

  function getConfig(childId) {
    const row = q.getConfig.get(childId)
    return row
      ? { childId, weeklyQuotaMin: row.weeklyQuotaMin, sessionCapMin: row.sessionCapMin, maxBorrowMin: row.maxBorrowMin }
      : { childId, ...DEFAULTS }
  }

  function saveConfig(childId, patch) {
    const c = { ...getConfig(childId), ...patch }
    q.putConfig.run(childId, c.weeklyQuotaMin, c.sessionCapMin, c.maxBorrowMin)
  }

  // ---------- 会话记录 ----------

  function startSession(childId, plannedMin = null, now = Date.now()) {
    return Number(q.insertSession.run(childId, now, null, null, plannedMin, 'timer').lastInsertRowid)
  }

  function stopSession(sessionId, now = Date.now()) {
    const s = q.getSession.get(sessionId)
    if (!s || s.endAt != null) return
    const durationMin = Math.max(1, Math.round((now - s.startAt) / 60000))
    // endAt 与整分钟时长对齐，保证周统计（按时间戳重叠）与展示时长一致
    q.finishSession.run(s.startAt + durationMin * 60000, durationMin, sessionId)
  }

  /** 到达计划时长的计时会话自动按计划结束时刻结算 */
  function settlePlannedSession(s, now) {
    if (!s || s.endAt != null || s.plannedMin == null) return
    const plannedEnd = s.startAt + s.plannedMin * 60000
    if (now >= plannedEnd) stopSession(s.id, plannedEnd)
  }

  function findActiveSession(childId, now = Date.now()) {
    for (const s of q.childSessions.all(childId)) settlePlannedSession(s, now)
    return q.childSessions.all(childId).find((s) => s.endAt == null) ?? null
  }

  function addManualSession(childId, startAt, durationMin) {
    return Number(q.insertSession.run(childId, startAt, startAt + durationMin * 60000, durationMin, null, 'manual').lastInsertRowid)
  }

  function deleteSession(sessionId) {
    q.deleteSession.run(sessionId)
  }

  /** 与时间区间 [from, to) 有重叠的已结束会话，按开始时间倒序 */
  function sessionsInRange(childId, from, to) {
    return q.childSessions
      .all(childId)
      .filter((s) => s.endAt != null && s.startAt < to && s.endAt > from)
      .sort((a, b) => b.startAt - a.startAt)
  }

  // ---------- 周结算与汇总 ----------

  /** 惰性周结算：幂等，把每周超用（封顶 maxBorrowMin）写入下周账本 */
  function settleLedgers(childId, now = Date.now()) {
    const all = q.childSessions.all(childId)
    if (all.length === 0) return
    const config = getConfig(childId)
    const currentWs = weekStartOf(now)
    let ws = weekStartOf(all[0].startAt)
    while (ws < currentWs) {
      const nextWeekStart = ws + WEEK_MS
      if (!q.getLedger.get(childId, nextWeekStart)) {
        const usedMin = weekUsedMin(sessionsInRange(childId, ws, nextWeekStart), ws)
        q.putLedger.run(childId, nextWeekStart, settleBorrowMin(usedMin, config))
      }
      ws = nextWeekStart
    }
  }

  function getWeekSummary(childId, now = Date.now()) {
    findActiveSession(childId, now) // 顺带结算到点的计划会话
    settleLedgers(childId, now)
    const config = getConfig(childId)
    const ws = weekStartOf(now)
    const borrowedMin = q.getLedger.get(childId, ws)?.borrowedMin ?? 0
    const sessions = sessionsInRange(childId, ws, ws + WEEK_MS)
    const usedMin = weekUsedMin(sessions, ws)
    const ctx = { usedMin, borrowedMin, config }
    return {
      weekStart: ws,
      config,
      usedMin,
      borrowedMin,
      remainingMin: weekRemainingMin(ctx),
      overdraftMin: currentOverdraftMin(ctx),
      canStart: canStartSession(ctx),
      sessions,
    }
  }

  // ---------- 每日评分 ----------

  /** date 为本地日期串 YYYY-MM-DD；score 1-5；score 为 null 表示清除 */
  function setRating(childId, date, score, note = '') {
    if (score == null) {
      q.deleteRating.run(childId, date)
    } else {
      q.putRating.run(childId, date, score, note)
    }
  }

  function ratingsInRange(childId, fromDate, toDate) {
    return q.ratingsInRange.all(childId, fromDate, toDate)
  }

  return {
    listChildren, addChild, deleteChild, getConfig, saveConfig,
    startSession, stopSession, findActiveSession, addManualSession, deleteSession,
    sessionsInRange, settleLedgers, getWeekSummary,
    setRating, ratingsInRange,
    close: () => db.close(),
  }
}
