<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { api } from '../api'
import { useChildren } from '../composables/children'
import { fmtMin, fmtClock, fmtDateTime, dayKey } from '../format'
import { overlapMinutes } from '../rules'
import StarRating from '../components/StarRating.vue'

const { children } = useChildren()
const currentChildId = ref(null)
const summary = ref(null)
const active = ref(null)
const elapsedSec = ref(0)
const plannedInput = ref(60)
const startError = ref('')

// 总览：未选中具体孩子（currentChildId == null）时展示所有孩子的综合数据
const overviews = ref([])
let lastOverviewRefresh = 0

// 手动补录
const manualDate = ref('')
const manualMin = ref(30)

// 今日评价
const todayRating = ref(0)
const todayNote = ref('')

let ticker = null

const DAY_MS = 86400000
const currentChild = computed(() => children.value.find((c) => c.id === currentChildId.value))

const remainingSec = computed(() =>
  active.value?.plannedMin != null ? active.value.plannedMin * 60 - elapsedSec.value : null,
)

const totalUsed = computed(() => overviews.value.reduce((s, r) => s + r.summary.usedMin, 0))

// 剩余越少越靠前（透支/快超时的排最上）
const sortedRows = computed(() =>
  [...overviews.value].sort((a, b) => a.summary.remainingMin - b.summary.remainingMin),
)

// 本周逐日小条：今天（周一=0…周日=6）
const todayIdx = computed(() => (new Date().getDay() + 6) % 7)
const daysMax = computed(() => Math.max(1, ...overviews.value.map((r) => Math.max(...r.days))))

function pct(s) {
  const total = s.config.weeklyQuotaMin - s.borrowedMin
  if (total <= 0) return 100
  return Math.min(100, Math.round((s.usedMin / total) * 100))
}

function barH(row, i) {
  const v = row.days[i]
  if (!v) return 2
  return Math.max(4, Math.round((v / daysMax.value) * 30))
}

async function refresh() {
  if (currentChildId.value == null) return
  summary.value = await api.summary(currentChildId.value)
  active.value = await api.active(currentChildId.value)
  const today = dayKey(Date.now())
  const r = await api.ratings(currentChildId.value, today, today)
  todayRating.value = r[0]?.score ?? 0
  todayNote.value = r[0]?.note ?? ''
}

/** 拉取所有孩子的本周汇总（含逐日用量）+ 今日评分 + 计时状态 */
async function loadOverview() {
  if (currentChildId.value != null || children.value.length === 0) return
  const today = dayKey(Date.now())
  try {
    const rows = await Promise.all(
      children.value.map(async (child) => {
        const [sum, act, ratings] = await Promise.all([
          api.summary(child.id),
          api.active(child.id),
          api.ratings(child.id, today, today),
        ])
        // 本周已结束会话按自然日拆分，得到周一~周日 7 个用量
        const days = Array.from({ length: 7 }, (_, i) => {
          const dayStart = sum.weekStart + i * DAY_MS
          return sum.sessions.reduce(
            (n, s) => n + overlapMinutes(s.startAt, s.endAt, dayStart, dayStart + DAY_MS),
            0,
          )
        })
        return {
          child,
          summary: sum,
          active: act,
          days,
          todayScore: ratings[0]?.score ?? 0,
          todayNote: ratings[0]?.note ?? '',
        }
      }),
    )
    overviews.value = rows
    lastOverviewRefresh = Date.now()
  } catch (e) {
    console.error('总览加载失败', e)
  }
}

/** 保证存在有效选中：孩子被删除/未选中时，单孩子直接进明细，多孩子回总览 */
function ensureSelection() {
  const list = children.value
  const stillThere = currentChildId.value != null && list.some((c) => c.id === currentChildId.value)
  if (!stillThere) currentChildId.value = list.length === 1 ? list[0].id : null
  // 留在总览时直接拉数据（currentChildId 未变化不会触发上面的 watch）
  if (currentChildId.value == null && list.length > 0) loadOverview()
}

/** 总览行内快速评今日星级（不进入明细） */
async function onQuickRate(row, score) {
  row.todayScore = score
  if (!score) row.todayNote = ''
  await api.setRating(row.child.id, dayKey(Date.now()), score || null, row.todayNote)
}

async function onRate(score) {
  todayRating.value = score
  await api.setRating(currentChildId.value, dayKey(Date.now()), score || null, todayNote.value)
}

async function onSaveNote() {
  if (todayRating.value === 0) return
  await api.setRating(currentChildId.value, dayKey(Date.now()), todayRating.value, todayNote.value)
}

watch(currentChildId, async (id) => {
  if (id == null) {
    active.value = null
    summary.value = null
    await loadOverview()
    return
  }
  const cfg = await api.getConfig(id)
  plannedInput.value = cfg.sessionCapMin
  await refresh()
})

watch(children, ensureSelection)

async function onStart() {
  startError.value = ''
  try {
    await api.start(currentChildId.value, plannedInput.value > 0 ? Math.round(plannedInput.value) : null)
    await refresh()
  } catch (e) {
    startError.value = e.message
  }
}

async function onStop() {
  if (!active.value) return
  await api.stop(active.value.id)
  await refresh()
}

async function onManualAdd() {
  if (!manualDate.value || !(manualMin.value > 0)) return
  const startAt = new Date(manualDate.value).getTime()
  if (Number.isNaN(startAt)) return
  await api.addManual(currentChildId.value, startAt, Math.round(manualMin.value))
  manualMin.value = 30
  await refresh()
}

async function onDeleteSession(id) {
  await api.deleteSession(id)
  await refresh()
}

onMounted(() => {
  ensureSelection()
  ticker = setInterval(async () => {
    if (currentChildId.value == null) {
      // 总览模式低频刷新：保证计划到点自动结算、额度/透支及时更新
      if (Date.now() - lastOverviewRefresh > 15000) await loadOverview()
      return
    }
    if (active.value) {
      elapsedSec.value = Math.floor((Date.now() - active.value.startAt) / 1000)
      // 计划时长到点：自动停止并刷新
      if (remainingSec.value != null && remainingSec.value <= 0) {
        await api.stop(active.value.id)
        await refresh()
      }
    } else {
      elapsedSec.value = 0
    }
  }, 1000)
})

onUnmounted(() => clearInterval(ticker))
</script>

<template>
  <div class="child-tabs card" v-if="children.length > 0">
    <button :class="{ primary: currentChildId == null }" @click="currentChildId = null">总览</button>
    <button
      v-for="c in children"
      :key="c.id"
      :class="{ primary: c.id === currentChildId }"
      @click="currentChildId = c.id"
    >
      <img v-if="c.avatar?.startsWith('data:')" class="tab-avatar" :src="c.avatar" alt="" />
      <span v-else-if="c.avatar" class="tab-emoji">{{ c.avatar }}</span>
      <i v-else class="dot" :style="{ background: c.id === currentChildId ? '#fff' : c.color }"></i>{{ c.name }}
    </button>
  </div>

  <p v-if="children.length === 0" class="card">
    还没有孩子档案，请先到 <RouterLink to="/settings">配置页</RouterLink> 添加。
  </p>

  <!-- 总览：未选中具体孩子时的默认视图，按剩余分钟从少到多排列 -->
  <section v-if="children.length > 0 && currentChildId == null" class="card">
    <h2>孩子们总览 · 本周</h2>
    <p v-if="overviews.length === 0" class="muted">加载中…</p>
    <template v-else>
      <div class="ov-sum" v-if="children.length > 1">
        {{ children.length }} 个孩子，本周合计已用 <b>{{ fmtMin(totalUsed) }}</b>
      </div>
      <div
        v-for="row in sortedRows"
        :key="row.child.id"
        class="ov-row"
        :title="`点此查看 ${row.child.name} 明细`"
        @click="currentChildId = row.child.id"
      >
        <div class="ov-head">
          <span class="ov-name">
            <img v-if="row.child.avatar?.startsWith('data:')" class="ov-avatar" :src="row.child.avatar" alt="" />
            <span v-else-if="row.child.avatar" class="ov-emoji">{{ row.child.avatar }}</span>
            <i v-else class="ov-dot" :style="{ background: row.child.color }"></i>
            {{ row.child.name }}
            <span v-if="row.active" class="tag live">● 计时中</span>
            <span v-else-if="row.summary.overdraftMin > 0" class="tag tag-danger">已透支</span>
          </span>
          <span class="ov-remaining" :class="{ danger: row.summary.remainingMin < 0 }">
            剩余 {{ fmtMin(row.summary.remainingMin) }}
          </span>
        </div>
        <div class="bar"><div class="fill" :style="{ width: pct(row.summary) + '%' }"></div></div>
        <div class="week-strip">
          <span
            v-for="(d, i) in row.days"
            :key="i"
            class="wk-col"
            :title="`${['一','二','三','四','五','六','日'][i]} ${d} 分钟`"
          >
            <span class="wk-bars">
              <i class="wk-bar" :class="{ today: i === todayIdx }" :style="{ height: barH(row, i) + 'px', background: row.child.color }"></i>
            </span>
            <b class="wk-lab" :class="{ today: i === todayIdx }">{{ ['一','二','三','四','五','六','日'][i] }}</b>
          </span>
        </div>
        <div class="ov-foot">
          <span class="muted">
            已用 {{ row.summary.usedMin }} 分钟 / 额度 {{ row.summary.config.weeklyQuotaMin }} 分钟
            <template v-if="row.summary.borrowedMin > 0">（上周透支预扣 {{ row.summary.borrowedMin }}）</template>
          </span>
          <span class="ov-rate" @click.stop>
            <StarRating size="18px" :model-value="row.todayScore" @update:model-value="onQuickRate(row, $event)" />
            <template v-if="row.todayScore > 0">
              <em v-if="row.todayNote" class="note" :title="row.todayNote">{{ row.todayNote }}</em>
            </template>
            <span v-else class="muted rate-hint">点星评今日</span>
          </span>
        </div>
      </div>
      <p class="hint">点击孩子进入明细：开始/结束观看、补录、每日评价、删记录；点星星可直接评今日分</p>
    </template>
  </section>

  <!-- 单个孩子明细 -->
  <template v-if="currentChild && summary">
    <section class="card">
      <h2>本周（{{ fmtDateTime(summary.weekStart).split(' ')[0] }} 起）</h2>
      <div class="big" :class="{ danger: summary.remainingMin < 0 }">
        剩余 {{ fmtMin(summary.remainingMin) }}
      </div>
      <div class="bar"><div class="fill" :style="{ width: pct(summary) + '%' }"></div></div>
      <p>
        已用 {{ summary.usedMin }} 分钟 / 额度 {{ summary.config.weeklyQuotaMin }} 分钟
        <span v-if="summary.borrowedMin > 0">（上周透支预扣 {{ summary.borrowedMin }} 分钟）</span>
      </p>
      <p v-if="summary.overdraftMin > 0" class="danger">
        本周已透支 {{ summary.overdraftMin }} 分钟，将从下周抵扣（上限 {{ summary.config.maxBorrowMin }} 分钟）
      </p>
    </section>

    <section class="card">
      <h2>计时</h2>
      <div v-if="active">
        <div class="big" :class="{ danger: remainingSec != null && remainingSec < 60 }">
          <template v-if="remainingSec != null">剩余 {{ fmtClock(remainingSec) }}</template>
          <template v-else>{{ fmtClock(elapsedSec) }}</template>
        </div>
        <p>
          开始于 {{ fmtDateTime(active.startAt) }}
          <span v-if="active.plannedMin != null" class="tag">计划 {{ active.plannedMin }} 分钟</span>
        </p>
        <button class="danger-btn" @click="onStop">结束观看</button>
      </div>
      <div v-else class="start-row">
        <label>
          本次计划
          <input v-model.number="plannedInput" type="number" min="1" style="width: 5em" /> 分钟
        </label>
        <button class="primary" :disabled="!summary.canStart" @click="onStart">开始观看</button>
        <p v-if="!summary.canStart" class="danger">本周额度（含透支）已用完</p>
        <p v-if="startError" class="danger">{{ startError }}</p>
      </div>
    </section>

    <section class="card">
      <h2>今日评价</h2>
      <StarRating :model-value="todayRating" @update:model-value="onRate" />
      <div v-if="todayRating > 0" class="note-row">
        <input v-model="todayNote" placeholder="一句话点评（可选）" @keyup.enter="onSaveNote" />
        <button @click="onSaveNote">保存</button>
      </div>
    </section>

    <section class="card">
      <h2>手动补录</h2>
      <input v-model="manualDate" type="datetime-local" />
      <input v-model.number="manualMin" type="number" min="1" style="width: 6em" /> 分钟
      <button @click="onManualAdd">补录</button>
    </section>

    <section class="card">
      <h2>本周记录</h2>
      <p v-if="summary.sessions.length === 0">暂无记录</p>
      <ul>
        <li v-for="s in summary.sessions" :key="s.id">
          {{ fmtDateTime(s.startAt) }} — {{ s.durationMin }} 分钟
          <span v-if="s.durationMin > summary.config.sessionCapMin" class="danger">超单次上限</span>
          <span class="tag">{{ s.source === 'timer' ? '计时' : '补录' }}</span>
          <button class="link" @click="onDeleteSession(s.id)">删除</button>
        </li>
      </ul>
    </section>
  </template>

  <section v-if="currentChild && !summary" class="card">加载中…</section>
</template>

<style scoped>
.child-tabs { display: flex; gap: 8px; flex-wrap: wrap; padding: 12px 16px; }
.child-tabs button { display: inline-flex; align-items: center; gap: 6px; }
.dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; }
.tab-avatar { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; margin-right: 6px; vertical-align: -4px; }
.tab-emoji { margin-right: 6px; }
.bar { height: 10px; background: #efeff6; border-radius: 999px; overflow: hidden; margin: 10px 0; }
.fill {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, #00b894, #6c5ce7);
  transition: width 0.4s ease;
}
label { margin-right: 12px; }
label input { margin: 0 4px; }
.start-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.start-row label { display: inline-flex; align-items: center; margin: 0; }
.start-row input { height: 36px; box-sizing: border-box; }
.start-row button { font-size: 15px; padding: 0 26px; height: 36px; box-sizing: border-box; }
.start-row p { width: 100%; margin: 6px 0 0; }
.note-row { display: flex; gap: 8px; margin-top: 14px; }
.note-row input { flex: 1; }

/* ---- 总览 ---- */
.ov-sum { font-size: 14px; color: var(--ink-2); margin-bottom: 8px; }
.ov-sum b { color: var(--brand); }
.ov-row {
  border-top: 1px solid var(--line);
  padding: 12px 4px 2px;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.15s, padding 0.15s;
}
.ov-row:hover { background: rgba(108, 92, 231, 0.05); padding-left: 10px; padding-right: 10px; }
.ov-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ov-name { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 15px; min-width: 0; }
.ov-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
.ov-avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }
.ov-emoji { font-size: 18px; }
.ov-remaining { font-size: 15px; font-weight: 700; white-space: nowrap; }
.tag-danger { color: var(--danger); background: rgba(225, 112, 85, 0.12); }

/* 本周逐日小用量条 */
.week-strip {
  display: flex; gap: 6px; margin: 6px 0 2px;
  padding: 6px 4px; border-radius: 8px; background: rgba(108, 92, 231, 0.04);
}
.wk-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.wk-bars { height: 34px; display: flex; align-items: flex-end; width: 100%; justify-content: center; }
.wk-bar {
  width: 55%; max-width: 16px; min-height: 2px;
  border-radius: 4px 4px 0 0; opacity: 0.45; transition: height 0.4s ease, opacity 0.2s;
}
.wk-bar.today { opacity: 1; box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.18); }
.wk-lab { font-size: 9px; color: #b2bec3; font-weight: 600; }
.wk-lab.today { color: var(--brand); }

.ov-foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; margin-top: 4px;
}
.ov-rate { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; }
.ov-rate .rate-hint { color: #b2bec3; font-size: 12px; }
.ov-rate .note {
  color: var(--ink-2); font-style: normal; font-size: 12px;
  max-width: 16em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.hint { color: #b2bec3; font-size: 12px; margin: 10px 0 4px; text-align: center; }
.muted { color: var(--ink-2); font-size: 13px; }
.live { animation: blink 1.2s infinite; color: var(--danger); background: rgba(225, 112, 85, 0.1); }
@keyframes blink { 50% { opacity: 0.35; } }
</style>
