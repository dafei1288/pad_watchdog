<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { api } from '../api'
import { useChildren } from '../composables/children'
import { WEEK_MS, weekStartOf, weekUsedMin, overlapMinutes } from '../rules'

const { children } = useChildren()
const weeklyEl = ref(null)
const dailyEl = ref(null)
let weeklyChart = null
let dailyChart = null

const WEEK_COUNT = 8
const DAY_MS = 86400000
const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function weekLabel(ws) {
  const d = new Date(ws)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

async function render() {
  await nextTick() // 等 v-else 分支的 DOM 挂载后再取 ref
  if (!weeklyEl.value || !dailyEl.value || children.value.length === 0) return
  weeklyChart ??= echarts.init(weeklyEl.value)
  dailyChart ??= echarts.init(dailyEl.value)

  const currentWs = weekStartOf(Date.now())
  const from = currentWs - (WEEK_COUNT - 1) * WEEK_MS
  const to = currentWs + WEEK_MS
  const weekStarts = Array.from({ length: WEEK_COUNT }, (_, i) => from + i * WEEK_MS)

  const perChild = []
  for (const child of children.value) {
    const sessions = await api.sessionsInRange(child.id, from, to)
    const weekly = weekStarts.map((ws) => weekUsedMin(sessions, ws))
    // 本周逐日：跨天会话按重叠分钟拆分
    const daily = Array.from({ length: 7 }, (_, i) => {
      const dayStart = currentWs + i * DAY_MS
      return sessions.reduce((sum, s) => sum + overlapMinutes(s.startAt, s.endAt, dayStart, dayStart + DAY_MS), 0)
    })
    perChild.push({ child, weekly, daily })
  }

  weeklyChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: perChild.map((p) => p.child.name) },
    xAxis: { type: 'category', data: weekStarts.map(weekLabel) },
    yAxis: { type: 'value', name: '分钟' },
    series: perChild.map((p) => ({
      name: p.child.name,
      type: 'bar',
      itemStyle: { color: p.child.color },
      data: p.weekly,
    })),
  })

  dailyChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: perChild.map((p) => p.child.name) },
    xAxis: { type: 'category', data: DAY_LABELS },
    yAxis: { type: 'value', name: '分钟' },
    series: perChild.map((p) => ({
      name: p.child.name,
      type: 'bar',
      itemStyle: { color: p.child.color },
      data: p.daily,
    })),
  })
}

function onResize() {
  weeklyChart?.resize()
  dailyChart?.resize()
}

watch(children, render, { flush: 'post' })
onMounted(() => {
  render()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  weeklyChart?.dispose()
  dailyChart?.dispose()
})
</script>

<template>
  <p v-if="children.length === 0" class="card">
    还没有孩子档案，请先到 <RouterLink to="/settings">配置页</RouterLink> 添加。
  </p>
  <template v-else>
    <section class="card">
      <h2>近 8 周每周使用时长对比</h2>
      <div ref="weeklyEl" class="chart"></div>
    </section>
    <section class="card">
      <h2>本周逐日对比</h2>
      <div ref="dailyEl" class="chart"></div>
    </section>
  </template>
</template>

<style scoped>
.chart { width: 100%; height: 320px; }
</style>
