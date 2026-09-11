<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setToken } from '../api'
import { useChildren } from '../composables/children'

const router = useRouter()
const { children, error: childrenError, refresh } = useChildren()

// ---------- 后盖锁 ----------
const locked = ref(null) // null=未知 true=还没设密码 false=已设
const pw1 = ref('')
const pw2 = ref('')
const setupError = ref('')
const statusError = ref('')

async function loadStatus() {
  statusError.value = ''
  try {
    const { hasPassword } = await api.authStatus()
    locked.value = !hasPassword
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
    locked.value = false
  } catch (e) {
    setupError.value = e.message
  }
}

async function onLockUp() {
  await api.logout().catch(() => {})
  setToken(null)
  router.replace('/login')
}

// 401（牌过期）→ 回开锁页；其余错误就印在设置页上，不再用原生弹窗
function guard401(e) {
  if (e.status === 401) { setToken(null); router.replace('/login'); return true }
  return false
}

const errOf = reactive({})
function setErr(id, msg) {
  if (msg) errOf[id] = msg
  else delete errOf[id]
}

// ---------- 名字条 ----------
const newName = ref('')
const addError = ref('')
const pendingDelete = ref(null)

async function onAdd() {
  addError.value = ''
  if (!newName.value.trim()) { addError.value = '先写个名字'; return }
  try {
    await api.addChild(newName.value.trim())
    newName.value = ''
    await refresh()
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

const renameDraft = reactive({})

async function onRename(c) {
  const name = (renameDraft[c.id] ?? c.name).trim()
  if (!name) { setErr(c.id, '名字不能空着'); return }
  if (name === c.name) { delete renameDraft[c.id]; return }
  try {
    await api.updateChild(c.id, { name })
    delete renameDraft[c.id]
    setErr(c.id, '')
    await refresh()
  } catch (e) { if (!guard401(e)) setErr(c.id, e.message) }
}

// ---------- 头像插槽 ----------
const EMOJIS = ['🧒', '👦', '👧', '🧑', '👶', '🐶', '🐱', '🐰', '🐼', '🦊', '🐯', '🦁']
const pickerFor = ref(null)

async function pickEmoji(c, emoji) {
  try {
    await api.updateChild(c.id, { avatar: emoji })
    pickerFor.value = null
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
    api.updateChild(c.id, { avatar: canvas.toDataURL('image/png') })
      .then(() => { pickerFor.value = null; setErr(c.id, ''); refresh() })
      .catch((e) => { if (!guard401(e)) setErr(c.id, `换头像失败：${e.message}`) })
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

// ---------- 额度 ----------
const drafts = reactive({})
const saving = reactive({})
const saved = ref(null)

async function ensureDraft(c) {
  if (drafts[c.id]) return
  try {
    drafts[c.id] = await api.getConfig(c.id)
  } catch (e) {
    if (!guard401(e)) setErr(c.id, `读取额度失败：${e.message}`)
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
    if (!guard401(e)) setErr(c.id, `存不下：${e.message}`)
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
  <section v-if="locked === null && !statusError" class="block muted">正在翻节目单…</section>
  <section v-else-if="statusError" class="block danger" role="alert">
    连不上服务端：{{ statusError }}
    <button class="btn-quiet" @click="loadStatus">重试</button>
  </section>

  <!-- 首次：给后盖上锁 -->
  <section v-else-if="locked" class="block lock-setup">
    <div class="block-head">
      <h2>给后盖上锁</h2>
      <span class="tiny muted">第一次用</span>
    </div>
    <p class="muted">配置和孩子资料都压在后盖里。先定一个管理密码，往后每次拧开后盖都得先输它。</p>
    <label class="fill">
      管理密码
      <input v-model="pw1" class="blank" type="password" placeholder="至少 4 位" autocomplete="new-password" />
    </label>
    <label class="fill">
      再输一次
      <input v-model="pw2" class="blank" type="password" placeholder="再输一次" autocomplete="new-password" @keyup.enter="onSetup" />
    </label>
    <p v-if="setupError" class="danger" role="alert">{{ setupError }}</p>
    <button class="btn" @click="onSetup">上锁</button>
  </section>

  <template v-else>
    <section class="block">
      <div class="block-head">
        <h2>贴一个名字条</h2>
        <span class="tiny muted">贴在遥控器上</span>
      </div>
      <div class="add-row">
        <input v-model="newName" class="blank grow" placeholder="孩子的小名" aria-label="孩子的小名" @keyup.enter="onAdd" />
        <button class="btn" @click="onAdd">放进去</button>
      </div>
      <p v-if="addError" class="danger" role="alert">{{ addError }}</p>
    </section>

    <p v-if="childrenError" class="block danger" role="alert">
      读取孩子档案失败：{{ childrenError }}
      <button class="btn-quiet" @click="loadAll">重试</button>
    </p>

    <section v-for="c in children" :key="c.id" class="block child-sheet" :style="{ '--kid': c.color }">
      <div class="child-head">
        <h2 class="kid-name">
          <i class="kid-dot" aria-hidden="true"></i>
          <template v-if="renameDraft[c.id] !== undefined">
            <input v-model="renameDraft[c.id]" class="blank" aria-label="孩子名字" @keyup.enter="onRename(c)" />
            <button class="btn-quiet" @click="onRename(c)">存下</button>
          </template>
          <template v-else>
            {{ c.name }}
            <button class="btn-quiet" @click="renameDraft[c.id] = c.name">改名</button>
          </template>
        </h2>
        <div class="head-actions">
          <template v-if="pendingDelete === c.id">
            <span class="danger tiny">连记录一起撕掉，确定？</span>
            <button class="btn btn-rec" @click="onDelete(c)">确认删除</button>
            <button class="btn" @click="pendingDelete = null">算了</button>
          </template>
          <button v-else class="btn" @click="pendingDelete = c.id">删除</button>
        </div>
      </div>
      <p v-if="errOf[c.id]" class="danger" role="alert">{{ errOf[c.id] }}</p>

      <div class="socket-row">
        <button class="socket" :aria-label="`更换 ${c.name} 的头像`" @click="pickerFor = pickerFor === c.id ? null : c.id">
          <img v-if="c.avatar?.startsWith('data:')" :src="c.avatar" alt="" />
          <span v-else-if="c.avatar" aria-hidden="true">{{ c.avatar }}</span>
          <span v-else class="socket-empty" aria-hidden="true">＋</span>
        </button>
        <span class="tiny muted">点一下换头像</span>
        <button v-if="c.avatar" class="btn-quiet" @click="clearAvatar(c)">拿走</button>
      </div>
      <div v-if="pickerFor === c.id" class="picker">
        <button v-for="e in EMOJIS" :key="e" class="btn emoji-slot" :aria-label="`用 ${e} 当头像`" @click="pickEmoji(c, e)">{{ e }}</button>
        <label class="btn emoji-slot upload" title="上传一张照片当头像">
          <svg class="cam" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8.6h3.1l1.5-2.1h6.8l1.5 2.1H20v9.9H4z" />
            <circle cx="12" cy="13.3" r="3.5" />
          </svg>
          <input type="file" accept="image/*" hidden aria-label="上传一张照片当头像" @change="onUpload(c, $event)" />
        </label>
      </div>

      <div v-if="drafts[c.id]" class="table quota">
        <div class="row quota-row">
          <span class="cell quota-label">每周放多少</span>
          <span class="cell"><input v-model.number="drafts[c.id].weeklyQuotaMin" class="blank num" type="number" min="0" @keyup.enter="onSave(c)" /></span>
          <span class="cell tiny muted">分钟</span>
        </div>
        <div class="row quota-row">
          <span class="cell quota-label">一次最多投</span>
          <span class="cell"><input v-model.number="drafts[c.id].sessionCapMin" class="blank num" type="number" min="1" @keyup.enter="onSave(c)" /></span>
          <span class="cell tiny muted">分钟</span>
        </div>
        <div class="row quota-row">
          <span class="cell quota-label">最多能欠</span>
          <span class="cell"><input v-model.number="drafts[c.id].maxBorrowMin" class="blank num" type="number" min="0" @keyup.enter="onSave(c)" /></span>
          <span class="cell tiny muted">分钟</span>
        </div>
      </div>
      <div class="save-row">
        <button class="btn" :disabled="saving[c.id]" @click="onSave(c)">{{ saving[c.id] ? '正在记…' : '记下来' }}</button>
        <span v-if="saved === c.id" class="saved-ok">已记下</span>
      </div>
    </section>

    <div class="block drawer-foot">
      <button class="btn" @click="onLockUp">盖上后盖</button>
      <span class="tiny muted">盖上后要重新输管理密码才进得来</span>
    </div>
  </template>
</template>

<style scoped>
.lock-setup { max-width: 420px; }
.lock-setup .fill { display: flex; flex-direction: column; gap: 2px; margin-top: var(--s3); font-size: 13px; color: var(--ink-2); }
.lock-setup .blank { max-width: 260px; font-size: var(--t-body); }
.lock-setup p { margin: var(--s2) 0; }
.lock-setup .btn { align-self: flex-start; margin-top: var(--s3); }

.add-row { display: flex; align-items: flex-end; gap: var(--s2); }
.grow { flex: 1; }

.child-head { display: flex; align-items: center; justify-content: space-between; gap: var(--s2); flex-wrap: wrap; }
.kid-name { display: flex; align-items: center; gap: var(--s1); margin: 0; font-size: 16px; color: var(--ink); letter-spacing: 0.04em; flex-wrap: wrap; }
.head-actions { display: flex; align-items: center; gap: var(--s1); flex-wrap: wrap; }

.socket-row { display: flex; align-items: center; gap: var(--s2); margin-top: var(--s3); flex-wrap: wrap; }
.socket {
  width: 48px; height: 48px; padding: 0; cursor: pointer; font-size: 24px;
  border-radius: 6px; border: 1px solid var(--rule); background: var(--sheet-2);
  display: inline-flex; align-items: center; justify-content: center; overflow: hidden;
}
.socket img { width: 100%; height: 100%; object-fit: cover; }
.socket-empty { color: var(--ink-2); }
.picker { display: flex; flex-wrap: wrap; gap: 5px; margin-top: var(--s2); padding-top: var(--s2); border-top: 1px solid var(--rule); }
.picker .emoji-slot { min-width: 42px; min-height: 42px; padding: 0; font-size: 20px; }
.picker .upload { display: inline-flex; align-items: center; justify-content: center; }
.cam { width: 20px; height: 20px; fill: none; stroke: var(--ink); stroke-width: 1.6; stroke-linejoin: round; }

.quota { margin-top: var(--s3); }
.quota-row { grid-template-columns: 1fr 96px 44px; }
.quota-label { font-size: 13px; color: var(--ink-2); }
.quota .blank { width: 100%; text-align: right; padding-right: 4px; }

.save-row { display: flex; align-items: center; gap: var(--s2); margin-top: var(--s3); }
.saved-ok { color: var(--play-ink); font-size: var(--t-note); font-weight: 700; }
.drawer-foot { display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap; }

@media (max-width: 600px) {
  .quota-row { grid-template-columns: 1fr 80px 40px; }
}
</style>
