<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../api'
import { useChildren } from '../composables/children'
import { overlapMinutes } from '../rules'
import { dayKey, fmtMin } from '../format'
import StarRating from '../components/StarRating.vue'

const { children, error: childrenError, refresh: reloadChildren } = useChildren()
const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth()) // 0-based
const selectedDay = ref(dayKey(now.getTime()))
const loadError = ref('')

// dayKey -> { total, perChild: { childId: minutes }, ratings: { childId: score } }
const dayMap = ref(new Map())

const DAY_MS = 86400000
const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日']

const monthLabel = computed(() => `${year.value} 年 ${month.value + 1} 月`)

// 周一开头的 6 行日历格
const cells = computed(() => {
  const first = new Date(year.value, month.value, 1)
  const lead = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate()
  const list = []
  for (let i = 0; i < lead; i++) list.push(null)
  for (let d = 1; d <= daysInMonth; d++) list.push(new Date(year.value, month.value, d))
  return list
})

function entryOf(date) {
  return dayMap.value.get(dayKey(date.getTime()))
}

async function load() {
  try {
    loadError.value = ''
    const from = new Date(year.value, month.value, 1).getTime()
    const to = new Date(year.value, month.value + 1, 1).getTime()
    const fromKey = dayKey(from)
    const toKey = dayKey(to - 1)
    const map = new Map()
    for (const child of children.value) {
      const [sessions, ratings] = await Promise.all([
        api.sessionsInRange(child.id, from, to),
        api.ratings(child.id, fromKey, toKey),
      ])
      for (const s of sessions) {
        // 跨天会话按天拆分
        let cursor = s.startAt
        while (cursor < s.endAt) {
          const d = new Date(cursor)
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
          const mins = overlapMinutes(s.startAt, s.endAt, dayStart, dayStart + DAY_MS)
          if (mins > 0) {
            const key = dayKey(dayStart)
            const entry = map.get(key) ?? { total: 0, perChild: {}, ratings: {} }
            entry.total += mins
            entry.perChild[child.id] = (entry.perChild[child.id] ?? 0) + mins
            map.set(key, entry)
          }
          cursor = dayStart + DAY_MS
        }
      }
      for (const r of ratings) {
        const entry = map.get(r.date) ?? { total: 0, perChild: {}, ratings: {} }
        entry.ratings[child.id] = r.score
        map.set(r.date, entry)
      }
    }
    dayMap.value = map
  } catch (e) {
    loadError.value = e.message
  }
}

async function onRateDay(childId, score) {
  const entry = dayMap.value.get(selectedDay.value) ?? { total: 0, perChild: {}, ratings: {} }
  const prev = entry.ratings[childId]
  if (score > 0) entry.ratings[childId] = score
  else delete entry.ratings[childId]
  dayMap.value.set(selectedDay.value, entry)
  dayMap.value = new Map(dayMap.value) // 触发响应式
  try {
    await api.setRating(childId, selectedDay.value, score || null, '')
    loadError.value = ''
  } catch (e) {
    if (prev) entry.ratings[childId] = prev
    else delete entry.ratings[childId]
    dayMap.value = new Map(dayMap.value)
    loadError.value = `保存评分失败：${e.message}`
  }
}

function shiftMonth(delta) {
  const d = new Date(year.value, month.value + delta, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth()
  // 选中日跟着月份走，否则下方「评价」面板会停在别的月份
  const today = new Date()
  const sameMonth = today.getFullYear() === year.value && today.getMonth() === month.value
  selectedDay.value = dayKey(sameMonth ? today.getTime() : new Date(year.value, month.value, 1).getTime())
}

function isToday(date) {
  return date && dayKey(date.getTime()) === dayKey(Date.now())
}

function fmtDayLabel(key) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${m} 月 ${d} 日 周${WEEK_DAYS[(date.getDay() + 6) % 7]}`
}

function cellLabel(date) {
  const e = entryOf(date)
  const parts = [`${date.getMonth() + 1} 月 ${date.getDate()} 日`]
  if (e?.total) parts.push(`共 ${fmtMin(e.total)}`)
  for (const c of children.value) {
    if (e?.perChild[c.id]) parts.push(`${c.name} ${e.perChild[c.id]} 分钟`)
    if (e?.ratings[c.id]) parts.push(`${c.name} ${e.ratings[c.id]} 星`)
  }
  return parts.join('，')
}

watch([year, month, children], load)
onMounted(load)
</script>

<template>
  <p v-if="childrenError" class="card danger" role="alert">
    读取孩子档案失败：{{ childrenError }}
    <button class="link" @click="reloadChildren">重试</button>
  </p>
  <p v-if="loadError" class="card danger" role="alert">
    读取日历数据失败：{{ loadError }}
    <button class="link" @click="load">重试</button>
  </p>

  <section class="card">
    <div class="cal-header">
      <button @click="shiftMonth(-1)">← 上月</button>
      <h2>{{ monthLabel }}</h2>
      <button @click="shiftMonth(1)">下月 →</button>
    </div>
    <div class="legend" v-if="children.length > 0">
      <span v-for="c in children" :key="c.id">
        <img v-if="c.avatar?.startsWith('data:')" class="lg-avatar" :src="c.avatar" alt="" aria-hidden="true" />
        <span v-else-if="c.avatar" aria-hidden="true">{{ c.avatar }} </span>
        <i v-else aria-hidden="true" :style="{ '--c': c.color }"></i>{{ c.name }}
      </span>
    </div>
    <div class="grid head" aria-hidden="true">
      <span v-for="w in WEEK_DAYS" :key="w">{{ w }}</span>
    </div>
    <div class="grid">
      <template v-for="(cell, i) in cells" :key="i">
        <button
          v-if="cell"
          type="button"
          class="cell"
          :class="{ today: isToday(cell), selected: dayKey(cell.getTime()) === selectedDay }"
          :aria-current="isToday(cell) ? 'date' : undefined"
          :aria-pressed="dayKey(cell.getTime()) === selectedDay"
          :aria-label="cellLabel(cell)"
          @click="selectedDay = dayKey(cell.getTime())"
        >
          <span class="day-num" aria-hidden="true">{{ cell.getDate() }}</span>
          <template v-if="entryOf(cell)">
            <span
              v-if="entryOf(cell).total > 0"
              class="day-total"
              :title="`共 ${fmtMin(entryOf(cell).total)}`"
            >
              <span class="dt-full">{{ fmtMin(entryOf(cell).total) }}</span>
              <span class="dt-compact">{{ entryOf(cell).total }}分</span>
            </span>
            <span class="chips">
              <span
                v-for="c in children.filter((ch) => entryOf(cell).perChild[ch.id])"
                :key="c.id"
                class="chip"
                :style="{ '--c': c.color }"
                :title="`${c.name}: ${entryOf(cell).perChild[c.id]} 分钟`"
              >
                {{ entryOf(cell).perChild[c.id] }}
              </span>
              <span
                v-for="c in children.filter((ch) => entryOf(cell).ratings[ch.id])"
                :key="'r' + c.id"
                class="chip star-chip"
                :style="{ '--c': c.color }"
                :title="`${c.name}: ${entryOf(cell).ratings[c.id]} 星`"
              >
                ★{{ entryOf(cell).ratings[c.id] }}
              </span>
            </span>
          </template>
        </button>
        <div v-else class="cell empty" aria-hidden="true"></div>
      </template>
    </div>
  </section>

  <section v-if="children.length > 0" class="card">
    <h2>{{ fmtDayLabel(selectedDay) }} 评价</h2>
    <div v-for="c in children" :key="c.id" class="rate-row">
      <span class="rate-name">
        <img v-if="c.avatar?.startsWith('data:')" class="lg-avatar" :src="c.avatar" alt="" aria-hidden="true" />
        <span v-else-if="c.avatar" aria-hidden="true">{{ c.avatar }} </span>
        <i v-else aria-hidden="true" :style="{ background: c.color }"></i>{{ c.name }}
      </span>
      <StarRating
        size="24px"
        :label="`${c.name} ${fmtDayLabel(selectedDay)} 评分`"
        :model-value="dayMap.get(selectedDay)?.ratings[c.id] ?? 0"
        @update:model-value="onRateDay(c.id, $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px; }
.cal-header h2 { font-size: 17px; color: var(--ink); font-weight: 700; letter-spacing: 0; }
.legend { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; font-size: 13px; }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; background: var(--c); }
.grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.grid.head { margin-bottom: 4px; }
.grid.head span { text-align: center; font-size: 12px; color: var(--ink-2); }
.cell {
  display: block; min-height: 84px; padding: 6px; text-align: left;
  border: 1px solid var(--line); border-radius: 10px; background: #fff;
  font: inherit; color: var(--ink); cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.cell.empty { border: none; cursor: default; background: none; }
.cell:not(.empty):hover { border-color: var(--brand-2); color: var(--ink); transform: none; }
.cell.today { border-color: var(--brand); }
.cell.selected { border-color: var(--brand); box-shadow: 0 0 0 2px var(--ring); }
.day-num { display: block; font-size: 12px; color: var(--ink-2); }
.day-total { display: block; font-weight: 700; font-size: 14px; margin: 2px 0; white-space: nowrap; }
.dt-compact { display: none; }
.chips { display: flex; flex-wrap: wrap; gap: 2px; }
.chip {
  font-size: 11px; border-radius: 4px; padding: 0 4px;
  background: #f1f1f7; color: var(--ink);
  background: color-mix(in srgb, var(--c) 16%, #fff);
  color: color-mix(in srgb, var(--c) 62%, #000);
}
.star-chip {
  border: 1px solid #dededf;
  border-color: color-mix(in srgb, var(--c) 35%, #fff);
  background: #fff;
}
.rate-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; flex-wrap: wrap; }
.rate-name { display: inline-flex; align-items: center; min-width: 4em; font-weight: 600; }
.rate-name i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
.lg-avatar { width: 16px; height: 16px; border-radius: 50%; object-fit: cover; margin-right: 4px; vertical-align: -3px; }

@media (max-width: 600px) {
  .grid { gap: 3px; }
  .cell { min-height: 62px; padding: 5px 4px 8px; border-radius: 8px; }
  .day-total { font-size: 11px; }
  .chip { font-size: 10px; padding: 0 3px; }
  .dt-full { display: none; }
  .dt-compact { display: inline; }
}
</style>
