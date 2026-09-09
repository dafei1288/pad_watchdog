<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setToken } from '../api'
import { useChildren } from '../composables/children'

const router = useRouter()
const { children, refresh } = useChildren()

// ---------- 首次设置密码 ----------
const needsSetup = ref(null) // null=未知 true=需设密码 false=已有
const pw1 = ref('')
const pw2 = ref('')
const setupError = ref('')

api.authStatus().then(({ hasPassword }) => (needsSetup.value = !hasPassword))

async function onSetup() {
  setupError.value = ''
  if (pw1.value.length < 4) { setupError.value = '密码至少 4 位'; return }
  if (pw1.value !== pw2.value) { setupError.value = '两次输入不一致'; return }
  try {
    const { token } = await api.setup(pw1.value)
    setToken(token)
    needsSetup.value = false
  } catch (e) {
    setupError.value = e.message
  }
}

async function onLogout() {
  await api.logout().catch(() => {})
  setToken(null)
  router.replace('/login')
}

// 401（token 失效）→ 回登录页
function guard401(e) {
  if (e.status === 401) { setToken(null); router.replace('/login'); return true }
  return false
}

// ---------- 添加/删除孩子 ----------
const newName = ref('')

async function onAdd() {
  if (!newName.value.trim()) return
  try {
    await api.addChild(newName.value.trim())
    newName.value = ''
    refresh()
  } catch (e) { if (!guard401(e)) alert(e.message) }
}

async function onDelete(c) {
  if (!confirm(`删除 ${c.name}？其观看记录和评分将一并删除。`)) return
  try {
    await api.deleteChild(c.id)
    refresh()
  } catch (e) { if (!guard401(e)) alert(e.message) }
}

// ---------- 改名 ----------
const renameDraft = reactive({}) // id -> 编辑中的名字

async function onRename(c) {
  const name = (renameDraft[c.id] ?? c.name).trim()
  if (!name || name === c.name) return
  try {
    await api.updateChild(c.id, { name })
    delete renameDraft[c.id]
    refresh()
  } catch (e) { if (!guard401(e)) alert(e.message) }
}

// ---------- 头像 ----------
const EMOJIS = ['🧒', '👦', '👧', '🧑', '👶', '🐶', '🐱', '🐰', '🐼', '🦊', '🐯', '🦁']
const avatarPickerFor = ref(null) // 正在选头像的孩子 id

async function pickEmoji(c, emoji) {
  try {
    await api.updateChild(c.id, { avatar: emoji })
    avatarPickerFor.value = null
    refresh()
  } catch (e) { if (!guard401(e)) alert(e.message) }
}

function onUpload(c, ev) {
  const file = ev.target.files?.[0]
  ev.target.value = ''
  if (!file) return
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')
    const side = Math.min(img.width, img.height)
    ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 64, 64)
    const dataUrl = canvas.toDataURL('image/png')
    api.updateChild(c.id, { avatar: dataUrl })
      .then(() => { avatarPickerFor.value = null; refresh() })
      .catch((e) => { if (!guard401(e)) alert(e.message) })
    URL.revokeObjectURL(img.src)
  }
  img.src = URL.createObjectURL(file)
}

async function clearAvatar(c) {
  try {
    await api.updateChild(c.id, { avatar: '' })
    refresh()
  } catch (e) { if (!guard401(e)) alert(e.message) }
}

// ---------- 额度配置 ----------
const drafts = reactive({})
const saved = ref(null)

async function ensureDraft(c) {
  if (!drafts[c.id]) drafts[c.id] = await api.getConfig(c.id)
}

async function onSave(c) {
  try {
    await api.saveConfig(c.id, drafts[c.id])
    saved.value = c.id
    setTimeout(() => (saved.value = null), 2000)
  } catch (e) { if (!guard401(e)) alert(e.message) }
}

refresh().then(() => children.value.forEach(ensureDraft))
</script>

<template>
  <!-- 首次使用：设置密码 -->
  <section v-if="needsSetup" class="card setup-card">
    <h2>设置管理密码</h2>
    <p class="hint">首次进入配置页面，请先设置密码。之后进入配置都需要输入密码。</p>
    <input v-model="pw1" type="password" placeholder="密码（至少 4 位）" autocomplete="new-password" />
    <input v-model="pw2" type="password" placeholder="再次输入密码" autocomplete="new-password" @keyup.enter="onSetup" />
    <p v-if="setupError" class="danger">{{ setupError }}</p>
    <button class="primary" @click="onSetup">设置密码</button>
  </section>

  <template v-else-if="needsSetup === false">
    <section class="card">
      <div class="head-row">
        <h2>添加孩子</h2>
        <button class="ghost" @click="onLogout">退出登录</button>
      </div>
      <div class="row">
        <input v-model="newName" placeholder="名字" @keyup.enter="onAdd" />
        <button class="primary" @click="onAdd">添加</button>
      </div>
    </section>

    <section v-for="c in children" :key="c.id" class="card">
      <div class="head-row">
        <h2>
          <span class="dot" :style="{ background: c.color }"></span>
          <template v-if="renameDraft[c.id] !== undefined">
            <input v-model="renameDraft[c.id]" class="name-input" @keyup.enter="onRename(c)" />
            <button class="ghost" @click="onRename(c)">保存</button>
          </template>
          <template v-else>
            {{ c.name }}
            <button class="ghost" @click="renameDraft[c.id] = c.name">改名</button>
          </template>
        </h2>
        <button class="danger-btn" @click="onDelete(c)">删除</button>
      </div>

      <!-- 头像 -->
      <div class="avatar-row">
        <button class="avatar-btn" title="更换头像" @click="avatarPickerFor = avatarPickerFor === c.id ? null : c.id">
          <img v-if="c.avatar?.startsWith('data:')" :src="c.avatar" alt="头像" />
          <span v-else-if="c.avatar">{{ c.avatar }}</span>
          <span v-else class="avatar-empty">＋</span>
        </button>
        <span class="hint">点击设置头像</span>
        <button v-if="c.avatar" class="ghost" @click="clearAvatar(c)">移除</button>
      </div>
      <div v-if="avatarPickerFor === c.id" class="avatar-picker">
        <button v-for="e in EMOJIS" :key="e" class="emoji" @click="pickEmoji(c, e)">{{ e }}</button>
        <label class="emoji upload">
          📷
          <input type="file" accept="image/*" hidden @change="onUpload(c, $event)" />
        </label>
      </div>

      <div v-if="drafts[c.id]" class="grid">
        <label>每周额度（分钟）<input v-model.number="drafts[c.id].weeklyQuotaMin" type="number" min="0" /></label>
        <label>单次上限（分钟）<input v-model.number="drafts[c.id].sessionCapMin" type="number" min="0" /></label>
        <label>最大透支（分钟）<input v-model.number="drafts[c.id].maxBorrowMin" type="number" min="0" max="60" /></label>
      </div>
      <div class="row save-row">
        <button class="primary" @click="onSave(c)">保存</button>
        <span v-if="saved === c.id" class="ok">已保存</span>
      </div>
    </section>
  </template>
</template>

<style scoped>
.setup-card { max-width: 320px; margin: 40px auto; display: flex; flex-direction: column; gap: 12px; text-align: center; }
.head-row { display: flex; align-items: center; justify-content: space-between; }
.head-row h2 { display: flex; align-items: center; gap: 8px; margin: 0; }
.row { display: flex; gap: 8px; margin-top: 10px; align-items: center; }
.row input { flex: 1; }
.grid { display: flex; gap: 16px; margin-top: 14px; flex-wrap: wrap; }
.grid label { display: flex; flex-direction: column; font-size: 13px; gap: 6px; color: var(--ink-2); font-weight: 600; }
.grid input { width: 110px; }
.name-input { width: 7em; font-size: 15px; padding: 4px 8px; }
.avatar-row { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.avatar-btn {
  width: 44px; height: 44px; border-radius: 50%; border: 2px dashed #ccc;
  background: #fff; font-size: 24px; display: inline-flex; align-items: center;
  justify-content: center; padding: 0; overflow: hidden;
}
.avatar-btn img { width: 100%; height: 100%; object-fit: cover; }
.avatar-empty { color: #bbb; }
.avatar-picker { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; padding: 10px; background: #f8f7ff; border-radius: 10px; }
.emoji { font-size: 24px; background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 4px 8px; }
.emoji:hover { border-color: var(--brand); transform: scale(1.1); }
.upload { display: inline-flex; align-items: center; cursor: pointer; }
.save-row { margin-top: 14px; }
.hint { color: var(--ink-2); font-size: 13px; margin: 0; }
.ok { color: var(--ok); font-weight: 600; }
</style>
