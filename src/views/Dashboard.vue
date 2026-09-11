<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { api } from '../api'
import { useChildren } from '../composables/children'
import { fmtClock, fmtDateTime, dayKey } from '../format'
import { overlapMinutes } from '../rules'
import RemoteControl from '../components/RemoteControl.vue'
import StarMark from '../components/StarMark.vue'
import { STAR_PATHS } from '../components/starPath'

const { children, error: childrenError, refresh: reloadChildren } = useChildren()
const currentChildId = ref(null)
const summary = ref(null)
const weekRatings = ref({}) // 'YYYY-MM-DD' -> score
const active = ref(null)
const elapsedSec = ref(0)
const plannedInput = ref('') // 遥控器上按出来的这次定时（分钟）
const typed = ref(false) // 首位数字替换掉预填值，而不是接在它后面
const actionError = ref('')
const busy = ref(false)

// 补一行：家长说的是「看了多久」和「大概什么时候」，不是时间戳
const manualMin = ref(40)
const manualWhen = ref('now')
const manualCustomDay = ref('today')
const manualCustomTime = ref('20:00')
const manualOpen = ref(false)
const openDay = ref(null)

const MIN_CHIPS = [15, 30, 45, 60]
const WHEN_CHIPS = [
  { id: 'now', label: '刚刚' },
  { id: 'morning', label: '今天早上' },
  { id: 'afternoon', label: '今天下午' },
  { id: 'evening', label: '今天傍晚' },
  { id: 'yesterday', label: '昨天晚上' },
  { id: 'custom', label: '别的时间' },
]

/** 补一行的起点：家长说的是「大概什么时候」 */
function manualAnchor() {
  const at = (dayOffset, h, m) => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayOffset, h, m).getTime()
  }
  switch (manualWhen.value) {
    case 'morning': return at(0, 7, 30)
    case 'afternoon': return at(0, 14, 0)
    case 'evening': return at(0, 17, 30)
    case 'yesterday': return at(-1, 19, 30)
    case 'custom': {
      const [h, m] = String(manualCustomTime.value).split(':').map(Number)
      if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN
      return at(manualCustomDay.value === 'yesterday' ? -1 : 0, h, m)
    }
    default: return Date.now() - manualMin.value * 60000
  }
}

/** 落笔前先把「会记成什么」写在纸面上 */
const manualPreview = computed(() => {
  if (!(manualMin.value > 0)) return '填一下看了多久'
  const start = manualAnchor()
  if (Number.isNaN(start)) return '时间填得不对'
  return `记成 ${fmtDateTime(Math.min(start, Date.now() - manualMin.value * 60000))} 起 ${Math.round(manualMin.value)} 分钟`
})

// 睡眠定时到点：循环响到家长按下「知道了」
const bellActive = ref(false)
const bellInfo = ref(null)
const bellBtn = ref(null)
let audioCtx = null
let bellTimer = null
const origTitle = document.title

function primeAudio() {
  audioCtx ??= new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
}

/** 按遥控器的键：一声轻响 */
function keyTick() {
  const ctx = audioCtx
  if (!ctx) return
  const t0 = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(1180, t0)
  osc.frequency.exponentialRampToValueAtTime(880, t0 + 0.03)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + 0.06)
}

/** 睡眠定时到点：三声短铃 */
function timerChime() {
  const ctx = audioCtx
  if (!ctx) return
  const t0 = ctx.currentTime
  for (const [dt, f] of [[0, 1320], [0.22, 1320], [0.44, 990]]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = f
    gain.gain.setValueAtTime(0.0001, t0 + dt)
    gain.gain.exponentialRampToValueAtTime(0.28, t0 + dt + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.34)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0 + dt)
    osc.stop(t0 + dt + 0.36)
  }
}

function startBell() {
  if (bellActive.value) return
  bellActive.value = true
  timerChime()
  nextTick(() => bellBtn.value?.focus())
  bellTimer = setInterval(() => {
    timerChime()
    document.title = document.title === origTitle ? '⏰ 时间到！' : origTitle
  }, 1500)
}

function stopBell() {
  bellActive.value = false
  bellInfo.value = null
  if (bellTimer) {
    clearInterval(bellTimer)
    bellTimer = null
  }
  document.title = origTitle
}

const todayNote = ref('')
let ticker = null

const DAY_MS = 86400000
const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const currentChild = computed(() => children.value.find((c) => c.id === currentChildId.value))

const remainingSec = computed(() =>
  active.value?.plannedMin != null ? active.value.plannedMin * 60 - elapsedSec.value : null,
)

/** 遥控器显示窗：没在录就是这次定时多少分钟，在录就是倒计时 */
const readout = computed(() => {
  if (active.value) return active.value.plannedMin != null ? fmtClock(remainingSec.value ?? 0) : fmtClock(elapsedSec.value)
  return plannedInput.value ? `${plannedInput.value}分` : '—'
})

/** 本周还剩：印在节目单右上角的大读数（h:mm） */
function fmtHM(min) {
  const sign = min < 0 ? '-' : ''
  const abs = Math.abs(Math.round(min))
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
}

const remainingMin = computed(() => (summary.value ? summary.value.remainingMin : 0))
const jarTotal = computed(() =>
  summary.value ? summary.value.config.weeklyQuotaMin - summary.value.borrowedMin : 0,
)

/** 透支或超单次上限＝红笔已经划上去了 */
const stalled = computed(() => !!summary.value && (remainingMin.value < 0 || summary.value.overdraftMin > 0))

/** 本周七格：每天的分钟数、有没有超单次上限、评分、是不是今天 */
const week = computed(() => {
  if (!summary.value) return []
  const ws = summary.value.weekStart
  return Array.from({ length: 7 }, (_, i) => {
    const dayStart = ws + i * DAY_MS
    const key = dayKey(dayStart)
    const min = summary.value.sessions.reduce(
      (n, s) => n + overlapMinutes(s.startAt, s.endAt, dayStart, dayStart + DAY_MS),
      0,
    )
    const overCap = summary.value.sessions.some(
      (s) => dayKey(s.startAt) === key && s.durationMin > summary.value.config.sessionCapMin,
    )
    return { i, key, label: WEEK_LABELS[i], min, overCap, score: weekRatings.value[key] ?? 0, today: key === dayKey(Date.now()) }
  })
})

const todayIdx = computed(() => (new Date().getDay() + 6) % 7)

const todayLines = computed(() => (summary.value ? summary.value.sessions.filter((s) => dayKey(s.startAt) === dayKey(Date.now())) : []))

const daySessions = (key) =>
  summary.value ? summary.value.sessions.filter((s) => dayKey(s.startAt) === key) : []

/** 并排：每个孩子一行——本周逐日 + 还剩；按还剩升序（快用完的排前面） */
const shelf = ref([])
let lastShelf = 0

async function loadShelf() {
  if (children.value.length === 0) {
    shelf.value = []
    return
  }
  try {
    const today = dayKey(Date.now())
    const rows = await Promise.all(
      children.value.map(async (child) => {
        const [s, a, r] = await Promise.all([
          api.summary(child.id),
          api.active(child.id),
          api.ratings(child.id, today, today),
        ])
        const days = Array.from({ length: 7 }, (_, i) => {
          const dayStart = s.weekStart + i * DAY_MS
          return s.sessions.reduce((n, x) => n + overlapMinutes(x.startAt, x.endAt, dayStart, dayStart + DAY_MS), 0)
        })
        return { child, summary: s, active: a, days, todayScore: r[0]?.score ?? 0 }
      }),
    )
    shelf.value = rows
    lastShelf = Date.now()
  } catch (e) {
    actionError.value = `读取并排失败：${e.message}`
  }
}

const shelfSorted = computed(() =>
  [...shelf.value].sort((a, b) => a.summary.remainingMin - b.summary.remainingMin),
)
const shelfUsed = computed(() => shelf.value.reduce((n, r) => n + r.summary.usedMin, 0))

/** 行内直接给今天打星，不用进详情 */
async function onQuickRate(row, score) {
  const prev = row.todayScore
  row.todayScore = score
  try {
    await api.setRating(row.child.id, dayKey(Date.now()), score || null, '')
    if (row.child.id === currentChildId.value) await refresh()
  } catch (e) {
    row.todayScore = prev
    actionError.value = `打星失败：${e.message}`
  }
}

async function refresh() {
  if (currentChildId.value == null) return
  try {
    actionError.value = ''
    const s = await api.summary(currentChildId.value)
    summary.value = s
    active.value = await api.active(currentChildId.value)
    const today = dayKey(Date.now())
    const r = await api.ratings(currentChildId.value, today, today)
    todayNote.value = r[0]?.note ?? ''
    const from = dayKey(s.weekStart)
    const to = dayKey(s.weekStart + 6 * DAY_MS)
    const wk = await api.ratings(currentChildId.value, from, to)
    weekRatings.value = Object.fromEntries(wk.map((x) => [x.date, x.score]))
  } catch (e) {
    actionError.value = `读取节目单失败：${e.message}`
  }
}

async function onRateDay(key, score) {
  const prev = weekRatings.value[key] ?? 0
  weekRatings.value = { ...weekRatings.value, [key]: score }
  try {
    await api.setRating(currentChildId.value, key, score || null, '')
  } catch (e) {
    weekRatings.value = { ...weekRatings.value, [key]: prev }
    actionError.value = `打星失败：${e.message}`
  }
}

async function onSaveNote() {
  if (!(weekRatings.value[dayKey(Date.now())] > 0)) return
  try {
    await api.setRating(currentChildId.value, dayKey(Date.now()), weekRatings.value[dayKey(Date.now())], todayNote.value)
  } catch (e) {
    actionError.value = `写批注失败：${e.message}`
  }
}

watch(currentChildId, async (id) => {
  if (id == null) return
  openDay.value = null
  try {
    const cfg = await api.getConfig(id)
    plannedInput.value = String(cfg.sessionCapMin)
    typed.value = false
  } catch (e) {
    actionError.value = `读取设置失败：${e.message}`
  }
  await refresh()
})

/** 选中一个孩子：孩子列表是缓存的，从别的页切回来时 watch 不会触发，所以挂载时也要选一次 */
function ensureSelection() {
  const list = children.value
  if (list.length === 0) return
  if (currentChildId.value == null || !list.some((c) => c.id === currentChildId.value)) {
    currentChildId.value = list[0].id
  }
}

watch(children, ensureSelection)

/** 遥控器的数字键：第一位替换预填，后面接着按 */
function onDigit(k) {
  primeAudio()
  keyTick()
  if (!typed.value) {
    plannedInput.value = k
    typed.value = true
  } else if (plannedInput.value.length < 3) {
    plannedInput.value = (plannedInput.value === '0' ? '' : plannedInput.value) + k
  }
}

function onClear() {
  keyTick()
  plannedInput.value = ''
  typed.value = true
}

function onKeydown(e) {
  const tag = (document.activeElement?.tagName ?? '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return
  if (/^[0-9]$/.test(e.key)) {
    onDigit(e.key)
  } else if (e.key === 'Backspace') {
    plannedInput.value = plannedInput.value.slice(0, -1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    onStart()
  } else if (e.key === 'Escape') {
    onClear()
  }
}

async function onStart() {
  actionError.value = ''
  primeAudio()
  busy.value = true
  const min = Number(plannedInput.value)
  try {
    await api.start(currentChildId.value, min > 0 ? Math.round(min) : null)
    await Promise.all([refresh(), loadShelf()])
  } catch (e) {
    actionError.value = e.message
  } finally {
    busy.value = false
  }
}

async function onStop() {
  if (!active.value) return
  primeAudio()
  busy.value = true
  try {
    await api.stop(active.value.id)
    keyTick()
  } catch (e) {
    actionError.value = `结束失败：${e.message}`
  } finally {
    busy.value = false
  }
  await Promise.all([refresh(), loadShelf()])
}

async function onManualAdd() {
  if (!(manualMin.value > 0)) {
    actionError.value = '补一行要填看了多久'
    return
  }
  let startAt = manualAnchor()
  if (Number.isNaN(startAt)) {
    actionError.value = '时间填得不对'
    return
  }
  startAt = Math.min(startAt, Date.now() - manualMin.value * 60000)
  try {
    await api.addManual(currentChildId.value, startAt, Math.round(manualMin.value))
    manualMin.value = 40
    manualWhen.value = 'now'
    actionError.value = ''
    manualOpen.value = false
    await Promise.all([refresh(), loadShelf()])
  } catch (e) {
    actionError.value = `补一行失败：${e.message}`
  }
}

async function onDeleteSession(id) {
  try {
    await api.deleteSession(id)
  } catch (e) {
    actionError.value = `划掉失败：${e.message}`
  }
  await Promise.all([refresh(), loadShelf()])
}

onMounted(() => {
  ensureSelection()
  loadShelf()
  window.addEventListener('keydown', onKeydown)
  ticker = setInterval(async () => {
    // 任何一个孩子到点都要响：家长可能正站在别的节目单前
    const due = shelf.value.find(
      (r) => r.active?.plannedMin != null && Date.now() - r.active.startAt >= r.active.plannedMin * 60000,
    )
    if (due) {
      if (!bellActive.value) {
        bellInfo.value = { name: due.child.name, plannedMin: due.active.plannedMin }
        startBell()
      }
      await loadShelf()
      await refresh()
      return
    }
    if (active.value) {
      elapsedSec.value = Math.floor((Date.now() - active.value.startAt) / 1000)
    } else {
      elapsedSec.value = 0
    }
    if (Date.now() - lastShelf > 15000) await loadShelf()
  }, 1000)
})

onUnmounted(() => {
  clearInterval(ticker)
  window.removeEventListener('keydown', onKeydown)
  stopBell()
})
</script>

<template>
  <p v-if="childrenError" class="block danger" role="alert">
    读取孩子档案失败：{{ childrenError }}
    <button class="btn-quiet" @click="reloadChildren">重试</button>
  </p>
  <p v-else-if="children.length === 0" class="block">
    后盖里还没有孩子，去 <RouterLink to="/settings">设置</RouterLink> 放一个名字条。
  </p>

  <p v-if="actionError" class="block danger" role="alert">{{ actionError }}</p>

  <template v-if="currentChild && summary">
    <!-- 首屏：遥控器 + 本周节目单 -->
    <section class="block console-block">
      <div class="remote-slot">
        <RemoteControl
          :name="currentChild.name"
          :color="currentChild.color"
          :avatar="currentChild.avatar"
          :readout="readout"
          :running="!!active"
          :busy="busy"
          :can-start="summary.canStart"
          :readout-label="active ? '还剩' : '本次定时'"
          @digit="onDigit"
          @clear="onClear"
          @play="onStart"
          @stop="onStop"
        />
        <div class="stand" aria-hidden="true"></div>
      </div>

      <div class="board">
        <div class="block-head">
          <h2>本周节目单 · {{ fmtDateTime(summary.weekStart).split(' ')[0] }} 起</h2>
          <span class="big-read">
            <span class="tiny muted">还剩</span>
            <span class="num read-big" :class="{ danger: remainingMin < 0 }">{{ fmtHM(remainingMin) }}</span>
          </span>
        </div>

        <div class="table strip">
          <div class="row head-row">
            <span v-for="d in week" :key="d.key" class="cell num day-head" :class="{ today: d.today }">{{ d.label }}</span>
          </div>
          <div class="row">
            <span
              v-for="d in week"
              :key="d.key"
              class="cell num day-cell"
              :class="{ today: d.today, stalled: d.overCap, live: d.today && !!active }"
              :title="`${d.label} ${d.min} 分钟`"
            >
              <span class="cell-num">{{ d.min || '' }}</span>
              <span v-if="d.today && active" class="live-bar" aria-hidden="true"></span>
            </span>
          </div>
          <div class="row">
            <span v-for="d in week" :key="d.key" class="cell star-cell">
              <svg v-for="n in d.score" :key="n" class="pen-star" viewBox="0 0 18 18" aria-hidden="true">
                <path :d="STAR_PATHS[(n - 1) % STAR_PATHS.length]" />
              </svg>
            </span>
          </div>
        </div>

        <p class="tiny muted meter-line">
          已用 <span class="num">{{ summary.usedMin }}</span> 分钟 / 一周放 <span class="num">{{ summary.config.weeklyQuotaMin }}</span> 分钟
          <template v-if="summary.borrowedMin > 0">· 上周先划掉 <span class="num">{{ summary.borrowedMin }}</span> 分钟</template>
        </p>
        <p v-if="summary.overdraftMin > 0" class="tiny danger">
          这周超了 <span class="num">{{ summary.overdraftMin }}</span> 分钟（最多能欠 <span class="num">{{ summary.config.maxBorrowMin }}</span> 分钟）
        </p>
        <p v-if="!summary.canStart" class="tiny danger">这周的额度连着能欠的都看完了，先歇一歇</p>

        <!-- 红笔：透支时在节目单边上夹一张小条 -->
        <p v-if="summary.overdraftMin > 0 || summary.borrowedMin > 0" class="pen-note">
          <template v-if="summary.borrowedMin > 0">下周先划掉 {{ summary.borrowedMin }} 分钟</template>
          <template v-else>超出的 {{ summary.overdraftMin }} 分钟，下周先划掉</template>
        </p>

        <div class="actions">
          <button class="btn-quiet" @click="manualOpen = !manualOpen">{{ manualOpen ? '收起' : '忘了按暂停？补一行' }}</button>
          <span class="tiny muted">定时在遥控器上按：数字键定分钟，绿键播放，方键暂停</span>
        </div>
        <p v-if="active" class="tiny timer-note">
          {{ fmtDateTime(active.startAt) }} 开始
          <template v-if="active.plannedMin != null">· 定时 {{ active.plannedMin }} 分钟，到点响铃</template>
        </p>
      </div>
    </section>

    <!-- 并排：两个以上孩子时，遥控器下面才是这一周谁在看 -->
    <section v-if="shelfSorted.length > 1" class="block">
      <div class="block-head">
        <h2>这周谁在看</h2>
        <span class="tiny muted">合计已用 <span class="num">{{ shelfUsed }}</span> 分钟</span>
      </div>
      <div class="table week-table">
        <div class="row head-row">
          <span class="cell">名字</span>
          <span v-for="w in WEEK_LABELS" :key="w" class="cell num day-head">{{ w }}</span>
          <span class="cell num">还剩</span>
        </div>
        <div
          v-for="r in shelfSorted"
          :key="r.child.id"
          class="row"
          :class="{ 'row-on': r.child.id === currentChildId }"
          :style="{ '--kid': r.child.color }"
        >
          <button
            class="cell kid-cell"
            :aria-pressed="r.child.id === currentChildId"
            @click="currentChildId = r.child.id"
          >
            <span class="kid-line">
              <i class="kid-dot" aria-hidden="true"></i>
              <span class="kid-name">{{ r.child.name }}</span>
              <span v-if="r.active" class="tag tag-rec">在录</span>
            </span>
            <span class="kid-stars">
              <StarMark
                :label="`${r.child.name} 今日评分`"
                :model-value="r.todayScore"
                @update:model-value="onQuickRate(r, $event)"
              />
            </span>
          </button>
          <span
            v-for="(v, i) in r.days"
            :key="i"
            class="cell num day-cell"
            :class="{ today: i === todayIdx }"
          >{{ v || '' }}</span>
          <span class="cell num read" :class="{ danger: r.summary.remainingMin < 0 }">{{ r.summary.remainingMin }}</span>
        </div>
      </div>
      <p class="tiny muted week-foot">点名字看这套节目单；直接打星就是评今天</p>
    </section>

    <!-- 今天这几行：像节目单上的一条条时段 -->
    <section class="block">
      <div class="block-head">
        <h2>今天 · {{ WEEK_LABELS[todayIdx] }}</h2>
        <StarMark :label="`${currentChild.name} 今日评分`" :model-value="weekRatings[dayKey(Date.now())] ?? 0" @update:model-value="onRateDay(dayKey(Date.now()), $event)" />
      </div>
      <div class="table">
        <div v-if="todayLines.length === 0" class="row">
          <span class="cell muted tiny">今天还没有记录</span>
        </div>
        <div v-for="s in todayLines" :key="s.id" class="row">
          <span class="cell num entry-time">{{ fmtDateTime(s.startAt) }}</span>
          <span class="cell num read">{{ s.durationMin }}<span class="tiny muted"> 分</span></span>
          <span class="cell">
            <span v-if="s.durationMin > summary.config.sessionCapMin" class="tiny danger">超单次</span>
            <span class="tag">{{ s.source === 'timer' ? '计时' : '补记' }}</span>
          </span>
          <span class="cell right">
            <button class="btn-quiet tiny" @click="onDeleteSession(s.id)">划掉</button>
          </span>
        </div>
      </div>
      <div v-if="(weekRatings[dayKey(Date.now())] ?? 0) > 0" class="note-row">
        <input v-model="todayNote" class="blank note-input" placeholder="写在今天这行后面" aria-label="今日批注" @keyup.enter="onSaveNote" />
        <button class="btn-quiet" @click="onSaveNote">写上</button>
      </div>
    </section>

    <!-- 补一行 -->
    <section class="unfold" :class="{ open: manualOpen }">
      <div>
        <div class="block">
          <h2>补一行</h2>
          <div class="manual-line">
            <span class="manual-label">看了多久</span>
            <button
              v-for="m in MIN_CHIPS"
              :key="m"
              class="chip-btn"
              :class="{ on: manualMin === m }"
              :aria-pressed="manualMin === m"
              @click="manualMin = m"
            >{{ m }}</button>
            <input v-model.number="manualMin" class="blank num manual-min" type="number" min="1" aria-label="补记分钟数" />
            <span class="tiny muted">分钟</span>
          </div>
          <div class="manual-line">
            <span class="manual-label">什么时候</span>
            <button
              v-for="w in WHEN_CHIPS"
              :key="w.id"
              class="chip-btn"
              :class="{ on: manualWhen === w.id }"
              :aria-pressed="manualWhen === w.id"
              @click="manualWhen = w.id"
            >{{ w.label }}</button>
          </div>
          <div v-if="manualWhen === 'custom'" class="manual-line">
            <span class="manual-label"></span>
            <button class="chip-btn" :class="{ on: manualCustomDay === 'today' }" :aria-pressed="manualCustomDay === 'today'" @click="manualCustomDay = 'today'">今天</button>
            <button class="chip-btn" :class="{ on: manualCustomDay === 'yesterday' }" :aria-pressed="manualCustomDay === 'yesterday'" @click="manualCustomDay = 'yesterday'">昨天</button>
            <input v-model="manualCustomTime" class="blank num" type="time" aria-label="开始时间" />
          </div>
          <div class="manual-line">
            <span class="manual-label"></span>
            <button class="btn btn-play" @click="onManualAdd">记上</button>
            <span class="tiny muted">{{ manualPreview }}</span>
          </div>
        </div>
      </div>
    </section>
  </template>

  <p v-else-if="currentChild && !summary && !actionError" class="block muted">正在打开节目单…</p>
  <p v-else-if="children.length > 0 && !currentChild" class="block muted">正在打开节目单…</p>

  <!-- 睡眠定时到点 -->
  <div v-if="bellActive" class="timer-overlay" role="alertdialog" aria-modal="true" aria-label="时间到提醒">
    <div class="timer-box">
      <p class="timer-lamp" aria-hidden="true"></p>
      <h2>时间到</h2>
      <p v-if="bellInfo" class="timer-text">
        {{ bellInfo.name }} 这次定时 <span class="num">{{ bellInfo.plannedMin }}</span> 分钟到了，已经停下来。
      </p>
      <button ref="bellBtn" class="btn btn-play" @click="stopBell">知道了</button>
    </div>
  </div>
</template>

<style scoped>
/* 并排小表 */
.week-table .row { grid-template-columns: minmax(7em, 1.4fr) repeat(7, minmax(1.6em, 1fr)) minmax(2.6em, 0.7fr); }
.day-head { text-align: center; color: var(--ink-2); font-size: var(--t-note); }
.day-head.today { color: var(--rec-ink); font-weight: 700; }
.kid-cell {
  display: flex; align-items: center; gap: 5px; text-align: left; cursor: pointer;
  background: none; border: none; border-right: 1px solid var(--rule);
  font: inherit; color: var(--ink); padding: 6px;
}
.kid-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-on .kid-name { box-shadow: inset 0 -2px 0 var(--ink); }
.day-cell { text-align: center; min-height: 1.4em; }
.day-cell.today { background: rgba(217, 58, 43, 0.06); }
.day-cell.stalled { color: var(--rec-ink); text-decoration: underline dotted; text-underline-offset: 3px; }
.star-cell { display: flex; align-items: center; justify-content: center; gap: 2px; min-height: 1.2em; }
.pen-star { width: 9px; height: 9px; fill: var(--rec); fill-opacity: 0.85; stroke: var(--rec-ink); stroke-width: 1.2; }
.week-foot { display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap; margin: var(--s2) 0 0; }

/* 遥控器 + 节目单 */
.console-block { display: flex; gap: var(--s4); align-items: flex-start; flex-wrap: wrap; border-top: none; }
.console-block .block-head { border-top: 2px solid var(--ink); padding-top: var(--s2); }
.remote-slot { display: flex; flex-direction: column; flex: none; }
.stand {
  height: 12px; margin: 0 -8px; background: var(--wood);
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 6px rgba(34, 38, 43, 0.18);
}
.board { flex: 1; min-width: 0; }
.strip .row { grid-template-columns: repeat(7, minmax(0, 1fr)); }
.cell-num { display: block; }
/* 今天那一格：正在播出的一条红杠，真的在走 */
.live-bar {
  display: block; height: 3px; margin-top: 2px; background: var(--rec);
  border-radius: 2px; transform-origin: left center;
  animation: live-sweep 2.6s ease-in-out infinite;
}
@keyframes live-sweep { 0% { transform: scaleX(0.22); } 50% { transform: scaleX(1); } 100% { transform: scaleX(0.22); } }
.timer-note { color: var(--timer-ink); }
.big-read { display: inline-flex; align-items: baseline; gap: 6px; }
.actions { display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap; margin-top: var(--s2); }
.note-row { display: flex; align-items: center; gap: var(--s2); margin-top: var(--s2); flex-wrap: wrap; }
.note-input { flex: 1; min-width: 10em; }
.entry-time { color: var(--ink-2); white-space: nowrap; }
.right { text-align: right; }
.meter-line { margin: var(--s2) 0 2px; }
.pen-note { margin: var(--s2) 0 0; }

/* 补一行 */
.manual-line { display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap; margin-bottom: var(--s1); }
.manual-label { min-width: 4.6em; font-size: var(--t-note); color: var(--ink-2); font-weight: 700; }
.manual-min { width: 4em; text-align: center; font-size: var(--t-read); }
.chip-btn {
  font: inherit; font-size: 13px; padding: 7px 13px; min-height: 34px; cursor: pointer;
  color: var(--ink); background: var(--key);
  border: 1px solid var(--key-deep); border-radius: 6px; box-shadow: 0 2px 0 var(--key-deep);
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.chip-btn:hover { transform: translateY(-1px); box-shadow: 0 3px 0 var(--key-deep); }
.chip-btn:active { transform: translateY(1px); box-shadow: 0 0 0 var(--key-deep); }
.chip-btn.on { background: var(--ink); border-color: var(--ink); color: var(--sheet); box-shadow: 0 2px 0 #101317; }

/* 睡眠定时 */
.timer-overlay {
  position: fixed; inset: 0; z-index: 100; padding: 20px;
  background: rgba(34, 38, 43, 0.55);
  display: flex; align-items: center; justify-content: center;
}
.timer-box {
  background: var(--sheet); border: 2px solid var(--ink); border-radius: 10px;
  padding: var(--s4) var(--s4) var(--s3); max-width: 320px; text-align: center;
  box-shadow: 0 8px 24px rgba(34, 38, 43, 0.3);
  animation: timer-pop 0.22s ease;
}
.timer-lamp {
  width: 16px; height: 16px; margin: 0 auto var(--s2); border-radius: 50%;
  background: var(--timer); animation: rec-blink 1.2s ease-in-out infinite;
}
.timer-box h2 { color: var(--ink); font-size: 20px; letter-spacing: 0.06em; }
.timer-text { margin: var(--s1) 0 var(--s3); }
@keyframes timer-pop { from { transform: scale(0.96); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes rec-blink { 50% { opacity: 0.35; } }

@media (max-width: 600px) {
  .week-table .row { grid-template-columns: minmax(5.6em, 1.3fr) repeat(7, minmax(1.3em, 1fr)) minmax(2.2em, 0.7fr); }
  .kid-cell { padding: 5px 4px; font-size: 13px; }
  .day-cell { font-size: 12px; }
  .read-big { font-size: 32px; }
}
</style>
