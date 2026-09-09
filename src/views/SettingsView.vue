<script setup>
import { ref, watch, onMounted } from 'vue'
import { api } from '../api'
import { useChildren } from '../composables/children'

const { children, refresh } = useChildren()
const newChildName = ref('')
// childId -> 编辑中的配置副本
const forms = ref(new Map())
const savedTip = ref('')

async function loadForms() {
  const map = new Map()
  for (const c of children.value) {
    map.set(c.id, { ...(await api.getConfig(c.id)) })
  }
  forms.value = map
}

async function onAddChild() {
  const name = newChildName.value.trim()
  if (!name) return
  await api.addChild(name)
  newChildName.value = ''
  await refresh()
}

async function onDeleteChild(child) {
  if (!confirm(`删除「${child.name}」及其全部记录？不可恢复。`)) return
  await api.deleteChild(child.id)
  await refresh()
}

async function onSave(childId) {
  const f = forms.value.get(childId)
  await api.saveConfig(childId, {
    weeklyQuotaMin: Math.max(0, Math.round(f.weeklyQuotaMin)),
    sessionCapMin: Math.max(1, Math.round(f.sessionCapMin)),
    maxBorrowMin: Math.max(0, Math.round(f.maxBorrowMin)),
  })
  savedTip.value = childId
  setTimeout(() => (savedTip.value = ''), 1500)
}

watch(children, loadForms)
onMounted(loadForms)
</script>

<template>
  <section class="card">
    <h2>添加孩子</h2>
    <input v-model="newChildName" placeholder="孩子名字" @keyup.enter="onAddChild" />
    <button class="primary" @click="onAddChild">＋添加</button>
  </section>

  <section v-for="c in children" :key="c.id" class="card">
    <h2><i class="dot" :style="{ background: c.color }"></i>{{ c.name }}</h2>
    <template v-if="forms.get(c.id)">
      <label>每周额度（分钟）<input v-model.number="forms.get(c.id).weeklyQuotaMin" type="number" min="0" /></label>
      <label>单次上限（分钟）<input v-model.number="forms.get(c.id).sessionCapMin" type="number" min="1" /></label>
      <label>透支上限（分钟）<input v-model.number="forms.get(c.id).maxBorrowMin" type="number" min="0" /></label>
      <button class="primary" @click="onSave(c.id)">保存配置</button>
      <span v-if="savedTip === c.id" class="saved">已保存</span>
      <button class="link" @click="onDeleteChild(c)">删除该孩子</button>
    </template>
  </section>
</template>

<style scoped>
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
label { display: block; margin-bottom: 8px; }
label input { margin-left: 8px; width: 6em; }
.saved { color: #52c41a; margin-left: 8px; }
</style>
