import { ref } from 'vue'
import { api } from '../api'

// 模块级共享：所有页面共用同一份孩子列表
const children = ref([])
const loaded = ref(false)
const loading = ref(false)
const error = ref('')

let inflight = null

export function useChildren() {
  async function refresh() {
    if (inflight) return inflight
    loading.value = true
    error.value = ''
    inflight = api
      .listChildren()
      .then((list) => {
        children.value = list
        loaded.value = true
      })
      .catch((e) => {
        // 区分「服务端读不到」与「一个孩子都还没建」：前者不能谎报成空档案
        error.value = e.message || '加载失败'
      })
      .finally(() => {
        loading.value = false
        inflight = null
      })
    return inflight
  }
  if (!loaded.value && !error.value) refresh()
  return { children, loading, error, refresh }
}
