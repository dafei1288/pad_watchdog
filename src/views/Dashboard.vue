<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { api } from '../api'
import { useChildren } from '../composables/children'
import { fmtMin, fmtClock, fmtDateTime, dayKey } from '../format'
import StarRating from '../components/StarRating.vue'

const { children } = useChildren()
const currentChildId = ref(null)
const summary = ref(null)
const active = ref(null)
const elapsedSec = ref(0)
const plannedInput = ref(60)
const startError = ref('')

// 手动补录
const manualDate = ref('')
const manualMin = ref(30)

// 今日评价
const todayRating = ref(0)
const todayNote = ref('')

let ticker = null

const currentChild = computed(() => children.value.find((c) => c.id === currentChildId.value))

const remainingSec = computed(() =>
  active.value?.plannedMin != null ? active.value.plannedMin * 60 - elapsedSec.value : null,
)

const quotaPercent = computed(() => {
  if (!summary.value) return 0
  const total = summary.value.config.weeklyQuotaMin - summary.value.borrowedMin
  if (total <= 0) return 100
  return Math.min(100, Math.round((summary.value.usedMin / total) * 100))
})

async function refresh() {
  if (currentChildId.value == null) return
  summary.value = await api.summary(currentChildId.value)
  active.value = await api.active(currentChildId.value)
  const today = dayKey(Date.now())
  const r = await api.ratings(currentChildId.value, today, today)
  todayRating.value = r[0]?.score ?? 0
  todayNote.value = r[0]?.note ?? ''
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
  if (id == null) return
  const cfg = await api.getConfig(id)
  plannedInput.value = cfg.sessionCapMin
  await refresh()
})

watch(children, (list) => {
  if (currentChildId.value == null && list.length > 0) currentChildId.value = list[0].id
})

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
  ticker = setInterval(async () => {
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
    <button
      v-for="c in children"
      :key="c.id"
      :class="{ primary: c.id === currentChildId }"
      @click="currentChildId = c.id"
    >
      <i class="dot" :style="{ background: c.id === currentChildId ? '#fff' : c.color }"></i>{{ c.name }}
    </button>
  </div>

  <p v-if="children.length === 0" class="card">
    还没有孩子档案，请先到 <RouterLink to="/settings">配置页</RouterLink> 添加。
  </p>

  <template v-if="currentChild && summary">
    <section class="card">
      <h2>本周（{{ fmtDateTime(summary.weekStart).split(' ')[0] }} 起）</h2>
      <div class="big" :class="{ danger: summary.remainingMin < 0 }">
        剩余 {{ fmtMin(summary.remainingMin) }}
      </div>
      <div class="bar"><div class="fill" :style="{ width: quotaPercent + '%' }"></div></div>
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
</template>

<style scoped>
.child-tabs { display: flex; gap: 8px; flex-wrap: wrap; padding: 12px 16px; }
.child-tabs button { display: inline-flex; align-items: center; gap: 6px; }
.dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; }
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
</style>
