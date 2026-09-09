// 纯函数规则引擎：不依赖 Dexie，输入普通对象，便于单元测试。

export const DEFAULTS = {
  weeklyQuotaMin: 150, // 每周额度（分钟）
  sessionCapMin: 90,   // 单次上限（分钟）
  maxBorrowMin: 60,    // 累计透支上限（分钟）
}

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** 所在自然周的周一 00:00（本地时区） */
export function weekStartOf(ts) {
  const d = new Date(ts)
  const day = (d.getDay() + 6) % 7 // 周一=0 ... 周日=6
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime()
}

/** 两个时间区间的重叠分钟数（用于跨周会话拆分） */
export function overlapMinutes(startAt, endAt, rangeStart, rangeEnd) {
  const s = Math.max(startAt, rangeStart)
  const e = Math.min(endAt, rangeEnd)
  return Math.max(0, Math.round((e - s) / 60000))
}

/** 某周的实际使用分钟数；只统计已结束（endAt 非空）的会话 */
export function weekUsedMin(sessions, weekStart) {
  const rangeEnd = weekStart + WEEK_MS
  return sessions.reduce(
    (sum, s) => (s.endAt == null ? sum : sum + overlapMinutes(s.startAt, s.endAt, weekStart, rangeEnd)),
    0,
  )
}

/**
 * 本周剩余可用分钟数。
 * borrowedMin：上周透支、本周预扣的部分（来自周账本）。
 * 结果可能为负，表示已在透支。
 */
export function weekRemainingMin({ usedMin, borrowedMin, config }) {
  return config.weeklyQuotaMin - borrowedMin - usedMin
}

/** 本周当前已透支的分钟数（将结转到下周抵扣），封顶 maxBorrowMin */
export function currentOverdraftMin({ usedMin, borrowedMin, config }) {
  const over = usedMin + borrowedMin - config.weeklyQuotaMin
  return Math.min(config.maxBorrowMin, Math.max(0, over))
}

/** 是否还能开始新一次观看：本周硬上限 = 额度 + 透支池 */
export function canStartSession({ usedMin, borrowedMin, config }) {
  return usedMin + borrowedMin < config.weeklyQuotaMin + config.maxBorrowMin
}

/** 周结算：由某周实际使用量算出下周应预扣的透支额，封顶 maxBorrowMin */
export function settleBorrowMin(usedMin, config) {
  return Math.min(config.maxBorrowMin, Math.max(0, usedMin - config.weeklyQuotaMin))
}
