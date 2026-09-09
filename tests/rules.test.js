import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULTS,
  WEEK_MS,
  weekStartOf,
  overlapMinutes,
  weekUsedMin,
  weekRemainingMin,
  currentOverdraftMin,
  canStartSession,
  settleBorrowMin,
} from '../src/rules'
import { createStore } from '../server/db'

const config = { ...DEFAULTS }

// 2026-09-09 是周三
function monday(offsetWeeks = 0) {
  return weekStartOf(new Date(2026, 8, 9).getTime()) + offsetWeeks * WEEK_MS
}

describe('weekStartOf', () => {
  it('周一当天返回当天 00:00', () => {
    expect(weekStartOf(new Date(2026, 8, 7, 10, 30).getTime())).toBe(new Date(2026, 8, 7).getTime())
  })

  it('周日归属本周而非下周', () => {
    expect(weekStartOf(new Date(2026, 8, 13, 23, 59).getTime())).toBe(new Date(2026, 8, 7).getTime())
  })

  it('下周一零点进入新周', () => {
    expect(weekStartOf(new Date(2026, 8, 14, 0, 0).getTime())).toBe(new Date(2026, 8, 14).getTime())
  })
})

describe('weekUsedMin 跨周拆分', () => {
  it('跨周日零点的会话按重叠分钟拆到两周', () => {
    const ws = monday(0)
    const end = ws + WEEK_MS
    const session = { startAt: end - 30 * 60000, endAt: end + 20 * 60000 }
    expect(weekUsedMin([session], ws)).toBe(30)
    expect(weekUsedMin([session], end)).toBe(20)
  })

  it('忽略未结束（计时中）的会话', () => {
    expect(weekUsedMin([{ startAt: monday(0), endAt: null }], monday(0))).toBe(0)
  })
})

describe('透支规则', () => {
  it('额度内可以开始', () => {
    expect(canStartSession({ usedMin: 149, borrowedMin: 0, config })).toBe(true)
  })

  it('用到 额度+透支上限 后禁止开始', () => {
    expect(canStartSession({ usedMin: 210, borrowedMin: 0, config })).toBe(false)
    expect(canStartSession({ usedMin: 209, borrowedMin: 0, config })).toBe(true)
  })

  it('上周预扣后本周可用相应减少', () => {
    expect(weekRemainingMin({ usedMin: 0, borrowedMin: 40, config })).toBe(110)
  })

  it('当前透支 = 已用 + 预扣 - 额度，封顶 60', () => {
    expect(currentOverdraftMin({ usedMin: 200, borrowedMin: 0, config })).toBe(50)
    expect(currentOverdraftMin({ usedMin: 500, borrowedMin: 0, config })).toBe(60)
    expect(currentOverdraftMin({ usedMin: 100, borrowedMin: 0, config })).toBe(0)
  })

  it('周结算透支封顶 60', () => {
    expect(settleBorrowMin(160, config)).toBe(10)
    expect(settleBorrowMin(400, config)).toBe(60)
    expect(settleBorrowMin(100, config)).toBe(0)
  })
})

describe('SQLite 存储与周结算链路', () => {
  let store
  beforeEach(() => {
    store = createStore(':memory:')
  })

  it('上周超用 30 分钟 → 本周账本预扣 30，剩余 120', () => {
    const childId = store.addChild('小明')
    store.addManualSession(childId, monday(-1) + 3600000, 180)
    const summary = store.getWeekSummary(childId, monday(0) + 3600000)
    expect(summary.borrowedMin).toBe(30)
    expect(summary.remainingMin).toBe(120)
  })

  it('上周超用 100 分钟 → 本周只预扣 60（封顶）', () => {
    const childId = store.addChild('小红')
    store.addManualSession(childId, monday(-1) + 3600000, 250)
    const summary = store.getWeekSummary(childId, monday(0) + 3600000)
    expect(summary.borrowedMin).toBe(60)
    expect(summary.remainingMin).toBe(90)
  })

  it('结算幂等：重复汇总不翻倍', () => {
    const childId = store.addChild('小明')
    store.addManualSession(childId, monday(-1) + 3600000, 180)
    const now = monday(0) + 3600000
    const a = store.getWeekSummary(childId, now)
    const b = store.getWeekSummary(childId, now)
    expect(b.borrowedMin).toBe(a.borrowedMin)
  })

  it('计时会话结束后，周统计与展示时长一致', () => {
    const childId = store.addChild('小明')
    const now = monday(0) + 3600000
    const sid = store.startSession(childId, null, now)
    store.stopSession(sid, now + 90 * 1000) // 计了 90 秒
    const summary = store.getWeekSummary(childId, now + 120000)
    expect(summary.usedMin).toBe(2)
    expect(summary.sessions[0].durationMin).toBe(2)
  })

  it('计划时长到点自动结算：页面关闭也不会多计', () => {
    const childId = store.addChild('小明')
    const now = monday(0) + 3600000
    store.startSession(childId, 30, now) // 计划 30 分钟
    // 2 小时后家长才重新打开页面
    const summary = store.getWeekSummary(childId, now + 2 * 3600000)
    expect(summary.usedMin).toBe(30)
    expect(store.findActiveSession(childId, now + 2 * 3600000)).toBeNull()
  })

  it('删除孩子级联清除其会话与账本', () => {
    const childId = store.addChild('小明')
    store.addManualSession(childId, monday(-1) + 3600000, 180)
    store.getWeekSummary(childId, monday(0) + 3600000)
    store.deleteChild(childId)
    expect(store.listChildren()).toHaveLength(0)
    expect(store.sessionsInRange(childId, 0, Date.now() + WEEK_MS)).toHaveLength(0)
  })

  it('评分：写入、覆盖、按区间查询、清除', () => {
    const childId = store.addChild('小明')
    store.setRating(childId, '2026-09-08', 4, '不错')
    store.setRating(childId, '2026-09-09', 5, '很棒')
    store.setRating(childId, '2026-09-08', 2, '反悔了') // 覆盖同日
    const all = store.ratingsInRange(childId, '2026-09-01', '2026-09-30')
    expect(all).toHaveLength(2)
    expect(all.find((r) => r.date === '2026-09-08').score).toBe(2)
    // 区间过滤
    expect(store.ratingsInRange(childId, '2026-09-09', '2026-09-09')).toHaveLength(1)
    // 清除
    store.setRating(childId, '2026-09-09', null)
    expect(store.ratingsInRange(childId, '2026-09-01', '2026-09-30')).toHaveLength(1)
  })
})
