<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../api'
import { useChildren } from '../composables/children'
import { overlapMinutes } from '../rules'
import { dayKey, fmtMin, fmtDateTime } from '../format'
import StarMark from '../components/StarMark.vue'

const { children, error: childrenError, refresh: reloadChildren } = useChildren()
const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth()) // 0-based
const selectedDay = ref(dayKey(now.getTime()))
const loadError = ref('')

// dayKey -> { perChild: { id: {min, score} }, total }
const dayMap = ref(new Map())

const DAY_MS = 86400000
const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

const monthLabel = computed(() => `${year.value} 年 ${month.value + 1} 月`)

/** 一页一周：周一开头的整周，共 6 行 */
const weeks = computed(() => {
  const first = new Date(year.value, month.value, 1)
  const lead = (first.getDay() + 6) % 7
  const start = new Date(year.value, month.value, 1 - lead)
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i)
      return {
        date: d,
        key: dayKey(d.getTime()),
        day: d.getDate(),
        inMonth: d.getMonth() === month.value,
      }
    }),
  )
})

function entryOf(key) {
  return dayMap.value.get(key)
}

function dayTotal(key) {
  const e = entryOf(key)
  if (!e) return 0
  return Object.values(e.perChild).reduce((n, x) => n + x.min, 0)
}

function kidsOn(key) {
  const e = entryOf(key)
  if (!e) return []
  return children.value.filter((c) => e.perChild[c.id])
}

/** 选中那天里每个孩子的明细（展开的整天） */
const rawByChild = ref({}) // childId -> 本月该孩子的原始记录（用来一条条列出来）

const openDay = computed(() => {
  const e = entryOf(selectedDay.value)
  return children.value.map((c) => ({
    child: c,
    min: e?.perChild[c.id]?.min ?? 0,
    score: e?.perChild[c.id]?.score ?? 0,
  }))
})

/** 选中那天的每一条记录（跨天的按落在这一天的分钟算，和上面的合计对得上） */
const dayEntries = computed(() => {
  const [y, m, d] = selectedDay.value.split('-').map(Number)
  const dayStart = new Date(y, m - 1, d).getTime()
  const out = []
  for (const child of children.value) {
    for (const s of rawByChild.value[child.id] ?? []) {
      const mins = overlapMinutes(s.startAt, s.endAt, dayStart, dayStart + DAY_MS)
      if (mins > 0) out.push({ child, session: s, mins })
    }
  }
  return out.sort((a, b) => a.session.startAt - b.session.startAt)
})

async function onDeleteEntry(id) {
  try {
    await api.deleteSession(id)
    await load()
  } catch (e) {
    loadError.value = `划掉失败：${e.message}`
  }
}

async function load() {
  try {
    loadError.value = ''
    const from = new Date(year.value, month.value, 1).getTime()
    const to = new Date(year.value, month.value + 1, 1).getTime()
    const fromKey = dayKey(from)
    const toKey = dayKey(to - 1)
    const map = new Map()
    const raw = {}
    for (const child of children.value) {
      const [sessions, ratings] = await Promise.all([
        api.sessionsInRange(child.id, from, to),
        api.ratings(child.id, fromKey, toKey),
      ])
      raw[child.id] = sessions
      for (const s of sessions) {
        // 跨天会话按天拆开
        let cursor = s.startAt
        while (cursor < s.endAt) {
          const d = new Date(cursor)
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
          const mins = overlapMinutes(s.startAt, s.endAt, dayStart, dayStart + DAY_MS)
          if (mins > 0) {
            const key = dayKey(dayStart)
            const entry = map.get(key) ?? { perChild: {} }
            const cell = (entry.perChild[child.id] ??= { min: 0, score: 0 })
            cell.min += mins
            map.set(key, entry)
          }
          cursor = dayStart + DAY_MS
        }
      }
      for (const r of ratings) {
        const entry = map.get(r.date) ?? { perChild: {} }
        const cell = (entry.perChild[child.id] ??= { min: 0, score: 0 })
        cell.score = r.score
        map.set(r.date, entry)
      }
    }
    dayMap.value = map
    rawByChild.value = raw
  } catch (e) {
    loadError.value = e.message
  }
}

async function onRateDay(childId, score) {
  const entry = dayMap.value.get(selectedDay.value) ?? { perChild: {} }
  const cell = (entry.perChild[childId] ??= { min: 0, score: 0 })
  const prev = cell.score
  cell.score = score
  dayMap.value = new Map(dayMap.value)
  try {
    await api.setRating(childId, selectedDay.value, score || null, '')
    loadError.value = ''
  } catch (e) {
    cell.score = prev
    dayMap.value = new Map(dayMap.value)
    loadError.value = `盖章失败：${e.message}`
  }
}

function shiftMonth(delta) {
  const d = new Date(year.value, month.value + delta, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth()
  // 选中日跟着月份走，否则下面的明细会停在别的月份
  const today = new Date()
  const sameMonth = today.getFullYear() === year.value && today.getMonth() === month.value
  selectedDay.value = dayKey(sameMonth ? today.getTime() : new Date(year.value, month.value, 1).getTime())
}

function isToday(key) {
  return key === dayKey(Date.now())
}

function fmtDayLabel(key) {
  const [y, m, d] = key.split('-').map(Number)
  return `${m} 月 ${d} 日 周${WEEK_LABELS[(new Date(y, m - 1, d).getDay() + 6) % 7]}`
}

watch([year, month, children], load)
onMounted(load)
</script>

<template>
  <p v-if="childrenError" class="err danger" role="alert">
    读取孩子档案失败：{{ childrenError }}
    <button class="btn-quiet" @click="reloadChildren">重试</button>
  </p>
  <p v-if="loadError" class="err danger" role="alert">
    读取月表失败：{{ loadError }}
    <button class="btn-quiet" @click="load">重试</button>
  </p>

  <!-- 月表：一列一天，印满格子的节目单 -->
  <section class="block month-sheet">
    <div class="block-head nav-head">
      <button type="button" class="btn" @click="shiftMonth(-1)">← 上月</button>
      <h2 class="month">{{ monthLabel }}</h2>
      <button type="button" class="btn" @click="shiftMonth(1)">下月 →</button>
    </div>

    <p v-if="children.length > 0" class="legend tiny">
      <span v-for="c in children" :key="c.id">
        <i class="kid-dot" :style="{ '--kid': c.color }" aria-hidden="true"></i>{{ c.name }}
      </span>
    </p>

    <div class="table month-table">
      <div class="row head-row" aria-hidden="true">
        <span v-for="w in WEEK_LABELS" :key="w" class="cell wk">{{ w }}</span>
      </div>

      <!-- 一行一周：号数 + 当天总分钟 + 用过的人 -->
      <div v-for="(week, wi) in weeks" :key="wi" class="row week">
        <button
          v-for="d in week"
          :key="d.key"
          type="button"
          class="day"
          :class="{ out: !d.inMonth, on: d.key === selectedDay }"
          :aria-current="isToday(d.key) ? 'date' : undefined"
          :aria-pressed="d.key === selectedDay"
          :aria-label="`${d.date.getMonth() + 1} 月 ${d.day} 日，共 ${dayTotal(d.key)} 分钟`"
          @click="selectedDay = d.key"
        >
          <span class="day-no num" :class="{ circled: isToday(d.key) }">{{ d.day }}</span>
          <span v-if="dayTotal(d.key) > 0" class="day-amt num read">{{ dayTotal(d.key) }}</span>
          <span class="day-kids" aria-hidden="true">
            <i v-for="c in kidsOn(d.key)" :key="c.id" class="kid-dot tiny" :style="{ '--kid': c.color }"></i>
          </span>
        </button>
      </div>
    </div>
  </section>

  <!-- 选中那天：一行一个孩子，末尾合计 -->
  <section v-if="children.length > 0" class="block day-block">
    <h2>{{ fmtDayLabel(selectedDay) }} 的明细</h2>
    <p v-if="dayTotal(selectedDay) === 0" class="muted">这天没有记录</p>
    <div v-else class="table per-kid">
      <div class="row head-row" aria-hidden="true">
        <span class="cell">孩子</span>
        <span class="cell col-min">分钟</span>
        <span class="cell">评分</span>
      </div>
      <div v-for="row in openDay.filter((r) => r.min > 0)" :key="row.child.id" class="row kid-row">
        <span class="cell kid-line">
          <i class="kid-dot" :style="{ '--kid': row.child.color }" aria-hidden="true"></i>{{ row.child.name }}
        </span>
        <span class="cell num read amt">{{ row.min }}</span>
        <span class="cell rate">
          <StarMark
            :label="`${row.child.name} ${fmtDayLabel(selectedDay)} 评分`"
            :model-value="row.score"
            @update:model-value="onRateDay(row.child.id, $event)"
          />
        </span>
      </div>
    </div>
    <div v-if="dayEntries.length > 0" class="table entries">
      <div class="row head-row" aria-hidden="true">
        <span class="cell">时间</span>
        <span class="cell">孩子</span>
        <span class="cell col-min">分钟</span>
        <span class="cell"></span>
      </div>
      <div v-for="e in dayEntries" :key="e.session.id" class="row">
        <span class="cell num entry-time">{{ fmtDateTime(e.session.startAt) }}</span>
        <span class="cell kid-line">
          <i class="kid-dot" :style="{ '--kid': e.child.color }" aria-hidden="true"></i>{{ e.child.name }}
        </span>
        <span class="cell num read">{{ e.mins }}<span class="tiny muted"> 分</span></span>
        <span class="cell right">
          <span class="tag">{{ e.session.source === 'timer' ? '计时' : '补记' }}</span>
          <button
            class="btn-quiet tiny"
            :title="e.mins === e.session.durationMin
              ? '删掉这条'
              : `这条跨天，一共 ${e.session.durationMin} 分钟；删掉会连着另一天一起删`"
            @click="onDeleteEntry(e.session.id)"
          >{{ e.mins === e.session.durationMin ? '划掉' : '删整条' }}</button>
        </span>
      </div>
    </div>
    <p v-if="dayTotal(selectedDay) > 0" class="tiny muted total-line">
      合计 <span class="num">{{ dayTotal(selectedDay) }}</span> 分钟 · {{ fmtMin(dayTotal(selectedDay)) }}
    </p>
  </section>
</template>

<style scoped>
.err { border-top: 2px solid var(--rec); padding-top: var(--s2); margin: 0 0 var(--s2); }
.entries { margin-top: var(--s2); }
.entries .row { grid-template-columns: 8.4em minmax(4em, 1fr) 4.6em auto; }
.entry-time { color: var(--ink-2); white-space: nowrap; }
.right { text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: var(--s2); }

.month-sheet .nav-head { align-items: center; margin-bottom: var(--s2); }
.month { font-size: 17px; font-weight: 700; color: var(--ink); letter-spacing: 0.06em; margin: 0; }
.legend { display: flex; flex-wrap: wrap; gap: var(--s3); margin: 0 0 var(--s2); }
.legend span { display: inline-flex; align-items: center; gap: 4px; }

.table.month-table { border-top: 2px solid var(--ink); }
.wk { text-align: center; }
.week, .month-table .head-row { grid-template-columns: repeat(7, 1fr); }
.week { align-items: stretch; }
.day {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  min-height: 58px; padding: 5px 6px; cursor: pointer; font: inherit; text-align: left;
  color: var(--ink); background: none; border: none;
  border-right: 1px solid var(--rule); border-radius: 0;
}
.day:last-child { border-right: none; }
.day:hover { background: var(--sheet-2); }
.day.out { background: var(--sheet-2); }
.day.out:hover { background: var(--sheet); }
.day.on { box-shadow: inset 0 0 0 2px var(--ink); }
.day-no { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; font-size: 12px; color: var(--ink-2); }
.day-amt { line-height: 1.15; }
.day-kids { display: flex; gap: 2px; margin-top: auto; }
.kid-dot.tiny { width: 7px; height: 7px; border-width: 1px; }

.per-kid .row { grid-template-columns: minmax(0, 1fr) 5.5em auto; }
.per-kid .head-row .col-min { text-align: right; }
.kid-line { display: inline-flex; align-items: center; gap: var(--s1); font-weight: 700; }
.amt { text-align: right; }
.rate { display: flex; align-items: center; }
.total-line { margin: var(--s2) 0 0; }

@media (max-width: 600px) {
  .day { min-height: 52px; padding: 4px; }
  .day-amt { font-size: 13px; }
  .per-kid .row { grid-template-columns: minmax(0, 1fr) 3.6em auto; }
}
</style>
