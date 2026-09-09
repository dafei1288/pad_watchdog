import { ref } from 'vue'
import { api } from '../api'

// 模块级共享：所有页面共用同一份孩子列表
const children = ref([])
const loaded = ref(false)

export function useChildren() {
  async function refresh() {
    children.value = await api.listChildren()
    loaded.value = true
  }
  if (!loaded.value) refresh()
  return { children, refresh }
}
