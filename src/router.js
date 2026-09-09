import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './views/Dashboard.vue'
import CalendarView from './views/CalendarView.vue'
import StatsView from './views/StatsView.vue'
import SettingsView from './views/SettingsView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard, meta: { title: '查看' } },
    { path: '/calendar', name: 'calendar', component: CalendarView, meta: { title: '日历' } },
    { path: '/stats', name: 'stats', component: StatsView, meta: { title: '统计对比' } },
    { path: '/settings', name: 'settings', component: SettingsView, meta: { title: '配置' } },
  ],
})
