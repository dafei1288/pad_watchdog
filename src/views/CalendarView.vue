<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../api'
import { useChildren } from '../composables/children'
import { overlapMinutes } from '../rules'
import { dayKey, fmtMin } from '../format'
import StarRating from '../components/StarRating.vue'

const { children } = useChildren()
const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth()) // 0-based
const selectedDay = ref(dayKey(now.getTime()))

// dayKey -> { total, perChild: { childId: minutes }, ratings: { childId: score } }
const dayMap = ref(new Map())

const DAY_MS = 86400000

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

async function load() {
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
}

async function onRateDay(childId, score) {
  const entry = dayMap.value.get(selectedDay.value) ?? { total: 0, perChild: {}, ratings: {} }
  if (score > 0) entry.ratings[childId] = score
  else delete entry.ratings[childId]
  dayMap.value.set(selectedDay.value, entry)
  dayMap.value = new Map(dayMap.value) // 触发响应式
  await api.setRating(childId, selectedDay.value, score || null, '')
}

function shiftMonth(delta) {
  const d = new Date(year.value, month.value + delta, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth()
}

function isToday(date) {
  return date && dayKey(date.getTime()) === dayKey(Date.now())
}

watch([year, month, children], load)
onMounted(load)
</script>

<template>
  <section class="card">
    <div class="cal-header">
      <button @click="shiftMonth(-1)">← 上月</button>
      <h2>{{ monthLabel }}</h2>
      <button @click="shiftMonth(1)">下月 →</button>
    </div>
    <div class="legend" v-if="children.length > 0">
      <span v-for="c in children" :key="c.id"><i :style="{ background: c.color }"></i>{{ c.name }}</span>
    </div>
    <div class="grid head">
      <span v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w">{{ w }}</span>
    </div>
    <div class="grid">
      <div
        v-for="(cell, i) in cells"
        :key="i"
        class="cell"
        :class="{ empty: !cell, today: isToday(cell), selected: cell && dayKey(cell.getTime()) === selectedDay }"
        @click="cell && (selectedDay = dayKey(cell.getTime()))"
      >
        <template v-if="cell">
          <div class="day-num">{{ cell.getDate() }}</div>
          <template v-if="dayMap.get(dayKey(cell.getTime()))">
            <div v-if="dayMap.get(dayKey(cell.getTime())).total > 0" class="day-total">
              {{ fmtMin(dayMap.get(dayKey(cell.getTime())).total) }}
            </div>
            <div class="chips">
              <span
                v-for="c in children.filter((ch) => dayMap.get(dayKey(cell.getTime())).perChild[ch.id])"
                :key="c.id"
                class="chip"
                :style="{ background: c.color }"
                :title="`${c.name}: ${dayMap.get(dayKey(cell.getTime())).perChild[c.id]} 分钟`"
              >
                {{ dayMap.get(dayKey(cell.getTime())).perChild[c.id] }}
              </span>
              <span
                v-for="c in children.filter((ch) => dayMap.get(dayKey(cell.getTime())).ratings[ch.id])"
                :key="'r' + c.id"
                class="chip star-chip"
                :style="{ borderColor: c.color, color: c.color }"
                :title="`${c.name}: ${dayMap.get(dayKey(cell.getTime())).ratings[c.id]} 星`"
              >
                ★{{ dayMap.get(dayKey(cell.getTime())).ratings[c.id] }}
              </span>
            </div>
          </template>
        </template>
      </div>
    </div>
  </section>

  <section v-if="children.length > 0" class="card">
    <h2>{{ selectedDay }} 评价</h2>
    <div v-for="c in children" :key="c.id" class="rate-row">
      <span class="rate-name"><i :style="{ background: c.color }"></i>{{ c.name }}</span>
      <StarRating
        size="24px"
        :model-value="dayMap.get(selectedDay)?.ratings[c.id] ?? 0"
        @update:model-value="onRateDay(c.id, $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.legend { display: flex; gap: 12px; margin-bottom: 8px; font-size: 13px; }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; }
.grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.grid.head span { text-align: center; font-size: 12px; color: #888; }
.cell { min-height: 84px; border: 1px solid #eee; border-radius: 10px; padding: 6px; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
.cell.empty { border: none; cursor: default; }
.cell:not(.empty):hover { border-color: #b3c6ff; }
.cell.today { border-color: #2f54eb; }
.cell.selected { border-color: #2f54eb; box-shadow: 0 0 0 2px rgba(47, 84, 235, 0.15); }
.day-num { font-size: 12px; color: #666; }
.day-total { font-weight: 700; font-size: 14px; margin: 2px 0; }
.chips { display: flex; flex-wrap: wrap; gap: 2px; }
.chip { color: #fff; font-size: 11px; border-radius: 4px; padding: 0 4px; }
.star-chip { background: #fff; border: 1px solid; }
.rate-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
.rate-name { display: inline-flex; align-items: center; min-width: 4em; font-weight: 600; }
.rate-name i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
</style>
