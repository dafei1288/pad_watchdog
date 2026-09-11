<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { api } from '../api'
import { useChildren } from '../composables/children'
import { WEEK_MS, weekStartOf, weekUsedMin, overlapMinutes } from '../rules'

const { children, error: childrenError, refresh: reloadChildren } = useChildren()
const loadError = ref('')
const hasData = ref(null) // null = 还没算出来

const WEEK_COUNT = 8
const DAY_MS = 86400000
const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

/** 窄屏只排最近 5 周：8 列在 390px 上会挤成一团 */
const compact = ref(false)
let mq = null
function syncCompact(e) {
  compact.value = e.matches
}
const shown = computed(() => (compact.value ? 5 : WEEK_COUNT))

const rows = ref([]) // [{ child, weekly:[], daily:[] }]
const weekStarts = ref([])

const todayIdx = computed(() => (new Date().getDay() + 6) % 7)

const shownStarts = computed(() => weekStarts.value.slice(-shown.value))

async function load() {
  try {
    loadError.value = ''
    const currentWs = weekStartOf(Date.now())
    const from = currentWs - (WEEK_COUNT - 1) * WEEK_MS
    const to = currentWs + WEEK_MS
    const starts = Array.from({ length: WEEK_COUNT }, (_, i) => from + i * WEEK_MS)
    weekStarts.value = starts
    const built = []
    for (const child of children.value) {
      const [sessions, sum] = await Promise.all([
        api.sessionsInRange(child.id, from, to),
        api.summary(child.id),
      ])
      const weekly = starts.map((ws) => weekUsedMin(sessions, ws))
      const daily = Array.from({ length: 7 }, (_, i) => {
        const dayStart = currentWs + i * DAY_MS
        return sessions.reduce((n, s) => n + overlapMinutes(s.startAt, s.endAt, dayStart, dayStart + DAY_MS), 0)
      })
      built.push({ child, weekly, daily, sum })
    }
    rows.value = built
    hasData.value = built.some((r) => r.weekly.some((v) => v > 0))
  } catch (e) {
    loadError.value = e.message
  }
}

function weekLabel(ws) {
  const d = new Date(ws)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

watch(children, load)
onMounted(() => {
  load()
  mq = window.matchMedia('(max-width: 600px)')
  compact.value = mq.matches
  mq.addEventListener('change', syncCompact)
})
onUnmounted(() => mq?.removeEventListener('change', syncCompact))
</script>

<template>
  <p v-if="childrenError" class="block danger" role="alert">
    读取孩子档案失败：{{ childrenError }}
    <button class="btn-quiet" @click="reloadChildren">重试</button>
  </p>
  <p v-if="loadError" class="block danger" role="alert">
    读取出账失败：{{ loadError }}
    <button class="btn-quiet" @click="load">重试</button>
  </p>
  <p v-if="children.length === 0 && !childrenError" class="block">
    后盖里还没有孩子，去 <RouterLink to="/settings">设置</RouterLink> 放一个名字条。
  </p>

  <template v-if="children.length > 0">
    <p v-if="hasData === false" class="block muted">
      还是空的：按播放或补一行之后，这里会按周和按天记下来。
    </p>

    <!-- 并排：本周七天，一列一天，今天那列底下压一道红 -->
    <section class="block">
      <div class="block-head">
        <h2>并排 · 本周七天</h2>
        <span class="tiny muted">单位：分钟</span>
      </div>
      <div class="table cmp" role="table" aria-label="本周每天用量">
        <div class="row head-row" role="row">
          <span class="cell kid-cell" role="columnheader">孩子</span>
          <span
            v-for="(w, i) in WEEK_LABELS"
            :key="w"
            class="cell day-head"
            :class="{ today: i === todayIdx, redpen: i === todayIdx }"
            role="columnheader"
          >{{ w }}</span>
          <span class="cell total-head" role="columnheader">合计</span>
        </div>
        <div v-for="r in rows" :key="r.child.id" class="row" role="row">
          <span class="cell kid-cell" role="rowheader">
            <i class="kid-dot" :style="{ '--kid': r.child.color }" aria-hidden="true"></i>
            <span class="kid-name">{{ r.child.name }}</span>
          </span>
          <span
            v-for="(v, i) in r.daily"
            :key="i"
            class="cell num"
            role="cell"
            :title="`周${WEEK_LABELS[i]}：${v} 分钟`"
          >{{ v }}</span>
          <span class="cell total-cell" role="cell">
            <span class="read num">{{ r.weekly[WEEK_COUNT - 1] }}</span>
          </span>
        </div>
      </div>
    </section>

    <!-- 每周用量：一周一栏，只印数字；本周那格用红笔圈住 -->
    <section class="block">
      <div class="block-head">
        <h2>近 {{ shown }} 周每周用量</h2>
        <span class="tiny muted">单位：分钟</span>
      </div>
      <div class="table led" :style="{ '--cols': shown }" role="table" aria-label="最近每周用量">
        <div class="row head-row" role="row">
          <span class="cell kid-cell" role="columnheader">孩子</span>
          <span
            v-for="(ws, i) in shownStarts"
            :key="ws"
            class="cell week-head num"
            :class="{ redpen: i === shown - 1 }"
            role="columnheader"
          >{{ weekLabel(ws) }}</span>
        </div>
        <div v-for="r in rows" :key="r.child.id" class="row" role="row">
          <span class="cell kid-cell" role="rowheader">
            <i class="kid-dot" :style="{ '--kid': r.child.color }" aria-hidden="true"></i>
            <span class="kid-name">{{ r.child.name }}</span>
          </span>
          <span
            v-for="(v, i) in r.weekly.slice(-shown)"
            :key="i"
            class="cell num"
            role="cell"
            :title="`${weekLabel(shownStarts[i])} 起：${v} 分钟`"
          >
            <span class="led-num" :class="{ circled: i === shown - 1 }">{{ v }}</span>
          </span>
        </div>
      </div>
    </section>
  </template>
</template>

<style scoped>
/* 并排表：孩子 + 七天 + 合计 */
.cmp .cell, .led .cell { text-align: center; }
.cmp .row { grid-template-columns: 7.6em repeat(7, minmax(0, 1fr)) 4.4em; }
.cmp .day-head { text-align: center; }
.cmp .total-head { text-align: right; }
.cmp .head-row .cell.today { box-shadow: inset 0 -3px 0 var(--rec); }

/* 每周用量：孩子 + 每周一栏 */
.led .row { grid-template-columns: 7.6em repeat(var(--cols, 8), minmax(0, 1fr)); }

.cmp .kid-cell, .led .kid-cell {
  display: flex; align-items: center; gap: 5px;
  text-align: left; font-weight: 700; line-height: 1.25;
}
.kid-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }

.total-cell { display: flex; justify-content: flex-end; }
.led-num { display: inline-block; padding: 3px 8px; }

@media (max-width: 600px) {
  .cmp .row { grid-template-columns: 5.6em repeat(7, minmax(0, 1fr)) 3.6em; }
  .led .row { grid-template-columns: 5.6em repeat(var(--cols, 5), minmax(0, 1fr)); }
  .cmp .cell, .led .cell { padding: 4px 2px; font-size: 12px; }
  .cmp .kid-cell, .led .kid-cell { font-size: 12px; gap: 4px; }
  .cmp .read { font-size: 15px; }
  .cmp .head-row .cell.today { box-shadow: inset 0 -2px 0 var(--rec); }
}
</style>
