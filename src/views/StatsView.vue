<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { api } from '../api'
import { useChildren } from '../composables/children'
import { WEEK_MS, weekStartOf, weekUsedMin, overlapMinutes } from '../rules'

echarts.use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const { children, error: childrenError, refresh: reloadChildren } = useChildren()
const weeklyEl = ref(null)
const dailyEl = ref(null)
let weeklyChart = null
let dailyChart = null

const loadError = ref('')
const hasData = ref(true)

const WEEK_COUNT = 8
const DAY_MS = 86400000
const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const FONT = "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"

/** 图表字体与配色都取自页面 token，避免图表自带的默认字体和灰度 */
function token(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function weekLabel(ws) {
  const d = new Date(ws)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function baseOption(font, ink, axisInk) {
  return {
    textStyle: { fontFamily: font, color: ink },
    tooltip: { trigger: 'axis', textStyle: { fontFamily: font } },
    legend: { textStyle: { color: ink } },
    grid: { left: 8, right: 8, bottom: 4, top: 44, containLabel: true },
    yAxis: { type: 'value', name: '分钟', nameTextStyle: { color: axisInk }, axisLabel: { color: axisInk } },
    xAxis: { type: 'category', axisLabel: { color: axisInk } },
  }
}

async function render() {
  await nextTick() // 等 v-else 分支的 DOM 挂载后再取 ref
  if (!weeklyEl.value || !dailyEl.value || children.value.length === 0) {
    // 目标 DOM 已被 v-else 卸载：丢掉旧实例，否则下次挂载会把图画进已分离的节点
    weeklyChart?.dispose()
    dailyChart?.dispose()
    weeklyChart = null
    dailyChart = null
    return
  }
  weeklyChart ??= echarts.init(weeklyEl.value)
  dailyChart ??= echarts.init(dailyEl.value)

  const font = FONT
  const ink = token('--ink', '#2d3436')
  const axisInk = token('--ink-2', '#636e72')

  try {
    loadError.value = ''
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

    hasData.value = perChild.some((p) => p.weekly.some((v) => v > 0))

    weeklyChart.setOption(
      {
        ...baseOption(font, ink, axisInk),
        legend: { data: perChild.map((p) => p.child.name), textStyle: { color: ink } },
        xAxis: { type: 'category', data: weekStarts.map(weekLabel), axisLabel: { color: axisInk } },
        series: perChild.map((p) => ({
          name: p.child.name,
          type: 'bar',
          barMaxWidth: 34,
          itemStyle: { color: p.child.color },
          data: p.weekly,
        })),
      },
      // 整体替换：否则删掉一个孩子后旧 series 会留在图上
      { notMerge: true },
    )

    dailyChart.setOption(
      {
        ...baseOption(font, ink, axisInk),
        legend: { data: perChild.map((p) => p.child.name), textStyle: { color: ink } },
        xAxis: { type: 'category', data: DAY_LABELS, axisLabel: { color: axisInk } },
        series: perChild.map((p) => ({
          name: p.child.name,
          type: 'bar',
          barMaxWidth: 34,
          itemStyle: { color: p.child.color },
          data: p.daily,
        })),
      },
      { notMerge: true },
    )
  } catch (e) {
    loadError.value = e.message
  }
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
  <p v-if="childrenError" class="card danger" role="alert">
    读取孩子档案失败：{{ childrenError }}
    <button class="link" @click="reloadChildren">重试</button>
  </p>
  <p v-if="loadError" class="card danger" role="alert">
    读取统计数据失败：{{ loadError }}
    <button class="link" @click="render">重试</button>
  </p>
  <p v-if="children.length === 0 && !childrenError" class="card">
    还没有孩子档案，请先到 <RouterLink to="/settings">配置页</RouterLink> 添加。
  </p>
  <template v-else-if="children.length > 0">
    <p v-if="!hasData" class="card muted">本周和近 8 周都还没有观看记录，开始计时或补录后这里会出现对比图。</p>
    <section class="card">
      <h2>近 8 周每周使用时长对比</h2>
      <div ref="weeklyEl" class="chart" role="img" aria-label="近 8 周每个孩子每周使用分钟数的柱状对比图"></div>
    </section>
    <section class="card">
      <h2>本周逐日对比</h2>
      <div ref="dailyEl" class="chart" role="img" aria-label="本周周一到周日每个孩子每天使用分钟数的柱状对比图"></div>
    </section>
  </template>
</template>

<style scoped>
.chart { width: 100%; height: 320px; }
.muted { color: var(--ink-2); }
@media (max-width: 600px) {
  .chart { height: 260px; }
}
</style>
