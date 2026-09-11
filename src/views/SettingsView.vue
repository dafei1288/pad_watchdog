<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setToken } from '../api'
import { useChildren } from '../composables/children'

const router = useRouter()
const { children, error: childrenError, refresh } = useChildren()

// ---------- 首次设置密码 ----------
const needsSetup = ref(null) // null=未知 true=需设密码 false=已有
const pw1 = ref('')
const pw2 = ref('')
const setupError = ref('')
const statusError = ref('')

async function loadStatus() {
  statusError.value = ''
  try {
    const { hasPassword } = await api.authStatus()
    needsSetup.value = !hasPassword
  } catch (e) {
    statusError.value = e.message
  }
}
loadStatus()

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

// 401（token 失效）→ 回登录页；其余错误就地显示，不再用 alert
function guard401(e) {
  if (e.status === 401) { setToken(null); router.replace('/login'); return true }
  return false
}

const errOf = reactive({}) // childId -> 消息
function setErr(id, msg) {
  if (msg) errOf[id] = msg
  else delete errOf[id]
}

// ---------- 添加/删除孩子 ----------
const newName = ref('')
const addError = ref('')
const pendingDelete = ref(null) // 正在二次确认删除的孩子 id

async function onAdd() {
  addError.value = ''
  if (!newName.value.trim()) { addError.value = '请先填写名字'; return }
  try {
    await api.addChild(newName.value.trim())
    newName.value = ''
    await refresh()
    // 新孩子的配置草稿随后补齐
    for (const c of children.value) if (!drafts[c.id]) await ensureDraft(c)
  } catch (e) { if (!guard401(e)) addError.value = e.message }
}

async function onDelete(c) {
  pendingDelete.value = null
  try {
    await api.deleteChild(c.id)
    setErr(c.id, '')
    await refresh()
  } catch (e) { if (!guard401(e)) setErr(c.id, e.message) }
}

// ---------- 改名 ----------
const renameDraft = reactive({}) // id -> 编辑中的名字

async function onRename(c) {
  const name = (renameDraft[c.id] ?? c.name).trim()
  if (!name) { setErr(c.id, '名字不能为空'); return }
  if (name === c.name) { delete renameDraft[c.id]; return }
  try {
    await api.updateChild(c.id, { name })
    delete renameDraft[c.id]
    setErr(c.id, '')
    await refresh()
  } catch (e) { if (!guard401(e)) setErr(c.id, e.message) }
}

// ---------- 头像 ----------
const EMOJIS = ['🧒', '👦', '👧', '🧑', '👶', '🐶', '🐱', '🐰', '🐼', '🦊', '🐯', '🦁']
const avatarPickerFor = ref(null) // 正在选头像的孩子 id

async function pickEmoji(c, emoji) {
  try {
    await api.updateChild(c.id, { avatar: emoji })
    avatarPickerFor.value = null
    setErr(c.id, '')
    await refresh()
  } catch (e) { if (!guard401(e)) setErr(c.id, e.message) }
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
      .then(() => { avatarPickerFor.value = null; setErr(c.id, ''); refresh() })
      .catch((e) => { if (!guard401(e)) setErr(c.id, `头像上传失败：${e.message}`) })
    URL.revokeObjectURL(img.src)
  }
  img.onerror = () => setErr(c.id, '这个文件读不出来，换一张图片试试')
  img.src = URL.createObjectURL(file)
}

async function clearAvatar(c) {
  try {
    await api.updateChild(c.id, { avatar: '' })
    setErr(c.id, '')
    await refresh()
  } catch (e) { if (!guard401(e)) setErr(c.id, e.message) }
}

// ---------- 额度配置 ----------
const drafts = reactive({})
const saving = reactive({})
const saved = ref(null)

async function ensureDraft(c) {
  if (drafts[c.id]) return
  try {
    drafts[c.id] = await api.getConfig(c.id)
  } catch (e) {
    if (!guard401(e)) setErr(c.id, `读取配置失败：${e.message}`)
  }
}

async function onSave(c) {
  saving[c.id] = true
  try {
    await api.saveConfig(c.id, drafts[c.id])
    setErr(c.id, '')
    saved.value = c.id
    setTimeout(() => (saved.value = null), 2000)
  } catch (e) {
    if (!guard401(e)) setErr(c.id, `保存失败：${e.message}`)
  } finally {
    saving[c.id] = false
  }
}

async function loadAll() {
  await refresh()
  if (childrenError.value) return
  for (const c of children.value) await ensureDraft(c)
}
loadAll()
</script>

<template>
  <!-- 读取服务端状态中 / 读不到 -->
  <section v-if="needsSetup === null && !statusError" class="card muted">加载中…</section>
  <section v-else-if="statusError" class="card danger" role="alert">
    无法连接服务端：{{ statusError }}
    <button class="link" @click="loadStatus">重试</button>
  </section>

  <!-- 首次使用：设置密码 -->
  <section v-else-if="needsSetup" class="card setup-card">
    <h2>设置管理密码</h2>
    <p class="hint">首次进入配置页面，请先设置密码。之后进入配置都需要输入密码。</p>
    <input v-model="pw1" type="password" placeholder="密码（至少 4 位）" aria-label="密码" autocomplete="new-password" />
    <input v-model="pw2" type="password" placeholder="再次输入密码" aria-label="再次输入密码" autocomplete="new-password" @keyup.enter="onSetup" />
    <p v-if="setupError" class="danger" role="alert">{{ setupError }}</p>
    <button class="primary" @click="onSetup">设置密码</button>
  </section>

  <template v-else>
    <section class="card">
      <h2>添加孩子</h2>
      <div class="row">
        <input v-model="newName" placeholder="名字" aria-label="孩子名字" @keyup.enter="onAdd" />
        <button class="primary" @click="onAdd">添加</button>
      </div>
      <p v-if="addError" class="danger" role="alert">{{ addError }}</p>
    </section>

    <p v-if="childrenError" class="card danger" role="alert">
      读取孩子档案失败：{{ childrenError }}
      <button class="link" @click="loadAll">重试</button>
    </p>

    <section v-for="c in children" :key="c.id" class="card">
      <div class="head-row">
        <h2>
          <span class="dot" aria-hidden="true" :style="{ background: c.color }"></span>
          <template v-if="renameDraft[c.id] !== undefined">
            <input v-model="renameDraft[c.id]" class="name-input" aria-label="孩子名字" @keyup.enter="onRename(c)" />
            <button @click="onRename(c)">保存</button>
          </template>
          <template v-else>
            {{ c.name }}
            <button @click="renameDraft[c.id] = c.name">改名</button>
          </template>
        </h2>
        <div class="head-actions">
          <template v-if="pendingDelete === c.id">
            <span class="danger">删除后记录一并清空，确定？</span>
            <button class="danger-btn" @click="onDelete(c)">确认删除</button>
            <button @click="pendingDelete = null">取消</button>
          </template>
          <button v-else class="danger-btn" @click="pendingDelete = c.id">删除</button>
        </div>
      </div>
      <p v-if="errOf[c.id]" class="danger" role="alert">{{ errOf[c.id] }}</p>

      <!-- 头像 -->
      <div class="avatar-row">
        <button class="avatar-btn" :aria-label="`更换 ${c.name} 的头像`" @click="avatarPickerFor = avatarPickerFor === c.id ? null : c.id">
          <img v-if="c.avatar?.startsWith('data:')" :src="c.avatar" alt="" />
          <span v-else-if="c.avatar" aria-hidden="true">{{ c.avatar }}</span>
          <span v-else class="avatar-empty" aria-hidden="true">＋</span>
        </button>
        <span class="hint">点击设置头像</span>
        <button v-if="c.avatar" @click="clearAvatar(c)">移除</button>
      </div>
      <div v-if="avatarPickerFor === c.id" class="avatar-picker">
        <button v-for="e in EMOJIS" :key="e" class="emoji" :aria-label="`用 ${e} 作为头像`" @click="pickEmoji(c, e)">{{ e }}</button>
        <label class="emoji upload">
          📷
          <input type="file" accept="image/*" hidden @change="onUpload(c, $event)" />
        </label>
      </div>

      <div v-if="drafts[c.id]" class="grid">
        <label>每周额度（分钟）<input v-model.number="drafts[c.id].weeklyQuotaMin" type="number" min="0" @keyup.enter="onSave(c)" /></label>
        <label>单次上限（分钟）<input v-model.number="drafts[c.id].sessionCapMin" type="number" min="1" @keyup.enter="onSave(c)" /></label>
        <label>最大透支（分钟）<input v-model.number="drafts[c.id].maxBorrowMin" type="number" min="0" max="60" @keyup.enter="onSave(c)" /></label>
      </div>
      <div class="row save-row">
        <button class="primary" :disabled="saving[c.id]" @click="onSave(c)">{{ saving[c.id] ? '保存中…' : '保存' }}</button>
        <span v-if="saved === c.id" class="ok">已保存</span>
      </div>
    </section>

    <div class="page-foot">
      <button @click="onLogout">退出登录</button>
      <span class="hint">退出后需重新输入管理密码才能进入配置页</span>
    </div>
  </template>
</template>

<style scoped>
.setup-card { max-width: 320px; margin: 40px auto; display: flex; flex-direction: column; gap: 12px; text-align: center; }
.head-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.head-row h2 { display: flex; align-items: center; gap: 8px; margin: 0; flex-wrap: wrap; }
.head-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; }
.row { display: flex; gap: 8px; margin-top: 10px; align-items: center; }
.row input { flex: 1; min-width: 8em; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: 12px 16px; margin-top: 14px; }
.grid label { display: flex; flex-direction: column; font-size: 13px; gap: 6px; color: var(--ink-2); font-weight: 600; white-space: nowrap; }
.grid input { width: 100%; min-width: 0; box-sizing: border-box; }
.name-input { width: 7em; font-size: 15px; padding: 4px 8px; }
.avatar-row { display: flex; align-items: center; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.avatar-btn {
  width: 44px; height: 44px; border-radius: 50%; border: 2px dashed var(--line-2);
  background: #fff; font-size: 24px; display: inline-flex; align-items: center;
  justify-content: center; padding: 0; overflow: hidden;
}
.avatar-btn img { width: 100%; height: 100%; object-fit: cover; }
.avatar-empty { color: var(--ink-2); }
.avatar-picker { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; padding: 10px; background: #f8f7ff; border-radius: 10px; }
.emoji { font-size: 24px; background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 4px 8px; min-width: 44px; min-height: 44px; }
.emoji:hover { border-color: var(--brand); transform: scale(1.08); }
.upload { display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.save-row { margin-top: 14px; }
.page-foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 4px 4px 0 6px; }
.hint { color: var(--ink-2); font-size: 13px; margin: 0; }
.muted { color: var(--ink-2); }
.ok { color: var(--ok); font-weight: 600; }
</style>
