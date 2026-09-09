import { createRouter, createWebHistory } from 'vue-router'
import { api, getToken } from './api'
import Dashboard from './views/Dashboard.vue'
import CalendarView from './views/CalendarView.vue'
import StatsView from './views/StatsView.vue'
import SettingsView from './views/SettingsView.vue'
import LoginView from './views/LoginView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard, meta: { title: '查看' } },
    { path: '/calendar', name: 'calendar', component: CalendarView, meta: { title: '日历' } },
    { path: '/stats', name: 'stats', component: StatsView, meta: { title: '统计对比' } },
    { path: '/settings', name: 'settings', component: SettingsView, meta: { title: '配置' } },
    { path: '/login', name: 'login', component: LoginView, meta: { title: '登录' } },
  ],
})

// 配置页需要密码：未设密码 → 放行（进入设置密码流程）；已设密码且无 token → 去登录
router.beforeEach(async (to) => {
  if (to.path !== '/settings') return true
  try {
    const { hasPassword } = await api.authStatus()
    if (hasPassword && !getToken()) return { path: '/login' }
  } catch {
    // 服务端不可达时放行，页面内操作会报错提示
  }
  return true
})
